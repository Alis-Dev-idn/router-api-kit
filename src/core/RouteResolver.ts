import "reflect-metadata";
import { ZodError } from "zod";
import type {
  ControllerMetadata,
  RouteMetadata,
  ParamMetadata,
  MiddlewareFn,
  ResolvedRoute,
  Class,
  AuthType,
} from "../types/index.js";
import { METADATA_KEYS } from "../types/index.js";
import type { BaseAdapter } from "../adapters/BaseAdapter.js";
import { CookieSetter } from "../cookie/CookieSetter.js";
import { BaseException } from "../exceptions/BaseException.js";
import { BadRequestException } from "../exceptions/BadRequestException.js";
import { ServerErrorException } from "../exceptions/ServerErrorException.js";

/**
 * Internal class that reads decorator metadata and registers routes on the framework adapter.
 * Handles parameter injection, validation, middleware resolution, and error handling.
 */
export class RouteResolver {
  /** Track registered routes to detect duplicates */
  private readonly registeredRoutes = new Set<string>();

  /** All resolved routes for Swagger generation */
  readonly resolvedRoutes: ResolvedRoute[] = [];

  constructor(
    private readonly adapter: BaseAdapter,
    private readonly authMiddleware?: MiddlewareFn,
    private readonly refreshMiddleware?: MiddlewareFn
  ) {}

  /**
   * Resolves and registers all routes from a controller class.
   *
   * @param Controller - The controller class to resolve
   * @throws Error if the class is not decorated with @ReqController
   * @throws Error if duplicate routes are detected
   */
  resolve(Controller: Class): void {
    const controllerMeta: ControllerMetadata | undefined = Reflect.getOwnMetadata(
      METADATA_KEYS.CONTROLLER,
      Controller
    );

    if (!controllerMeta) {
      throw new Error(
        `[RouterKit] Class "${Controller.name}" is not decorated with @ReqController. ` +
          `Add @ReqController("/path") to the class definition.`
      );
    }

    const routes: RouteMetadata[] = Reflect.getOwnMetadata(METADATA_KEYS.ROUTES, Controller) ?? [];

    // Create a single instance of the controller
    const controllerInstance = new Controller();

    for (const route of routes) {
      this.registerRoute(Controller, controllerInstance, controllerMeta, route);
    }
  }

  /**
   * Registers a single route from a controller method.
   */
  private registerRoute(
    Controller: Class,
    instance: unknown,
    controllerMeta: ControllerMetadata,
    route: RouteMetadata
  ): void {
    // Build full path
    const fullPath = this.buildFullPath(controllerMeta.basePath, route.path);

    // Check for duplicate routes
    const routeKey = `${route.method.toUpperCase()} ${fullPath}`;
    if (this.registeredRoutes.has(routeKey)) {
      throw new Error(
        `[RouterKit] Duplicate route detected: ${routeKey}. ` +
          `Each route must have a unique method + path combination.`
      );
    }
    this.registeredRoutes.add(routeKey);

    // Resolve authentication middleware
    const authType = this.resolveAuthType(route.options.authentication, controllerMeta.authentication);
    const authMiddlewares = this.resolveAuthMiddleware(authType);

    // Get method-level middlewares
    const methodMiddlewares: MiddlewareFn[] =
      Reflect.getOwnMetadata(METADATA_KEYS.MIDDLEWARES, Controller, route.propertyKey) ?? [];

    // Combine all middlewares
    const allMiddlewares = [...authMiddlewares, ...methodMiddlewares];

    // Get parameter metadata
    const params: ParamMetadata[] =
      Reflect.getOwnMetadata(METADATA_KEYS.PARAMS, Controller, route.propertyKey) ?? [];

    // Get HTTP status code
    const statusFromDecorator: number | undefined = Reflect.getOwnMetadata(
      METADATA_KEYS.HTTP_STATUS,
      Controller,
      route.propertyKey
    );
    const statusCode = route.options.status ?? statusFromDecorator ?? 200;

    // Determine swagger visibility
    const swaggerVisible = controllerMeta.swagger !== false && route.options.swagger !== false;

    // Store resolved route for Swagger
    const resolvedRoute: ResolvedRoute = {
      method: route.method,
      fullPath,
      middlewares: allMiddlewares,
      params,
      handler: (instance as Record<string, Function>)[route.propertyKey],
      statusCode,
      controllerTag: controllerMeta.tag,
      swagger: swaggerVisible,
      routeOptions: route.options,
    };
    this.resolvedRoutes.push(resolvedRoute);

    // Create the route handler
    const handler = this.createHandler(instance, route.propertyKey, params, statusCode);

    // Register on the adapter
    this.adapter.registerRoute(route.method, fullPath, allMiddlewares, handler);
  }

  /**
   * Builds the full route path from controller base path and method path.
   */
  private buildFullPath(basePath: string, methodPath: string): string {
    // Remove trailing slash from base
    const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    // Ensure method path starts with /
    const method = methodPath.startsWith("/") ? methodPath : "/" + methodPath;
    return base + method;
  }

  /**
   * Resolves the effective auth type (method-level overrides controller-level).
   */
  private resolveAuthType(
    methodAuth: AuthType | false | undefined,
    controllerAuth: AuthType | false
  ): AuthType | false {
    // If method explicitly defines authentication, use it
    if (methodAuth !== undefined) {
      return methodAuth;
    }
    // Otherwise inherit from controller
    return controllerAuth;
  }

  /**
   * Resolves authentication middleware based on auth type.
   */
  private resolveAuthMiddleware(authType: AuthType | false): MiddlewareFn[] {
    if (authType === false) return [];

    if (authType === "auth" && this.authMiddleware) {
      return [this.authMiddleware];
    }
    if (authType === "refresh" && this.refreshMiddleware) {
      return [this.refreshMiddleware];
    }

    return [];
  }

  /**
   * Creates the actual route handler function that handles parameter injection,
   * response wrapping, and error handling.
   */
  private createHandler(
    instance: unknown,
    propertyKey: string,
    params: ParamMetadata[],
    statusCode: number
  ): (req: unknown, res: unknown) => void {
    const adapter = this.adapter;

    return async (req: unknown, res: unknown) => {
      try {
        // Resolve parameter values
        const args = this.resolveParams(params, req, res);

        // Call the controller method
        const method = (instance as Record<string, Function>)[propertyKey];
        const result = await method.apply(instance, args);

        // Wrap and send response
        adapter.sendResponse(res, statusCode, {
          message: "OK",
          data: result ?? null,
        });
      } catch (error: unknown) {
        this.handleError(error, res);
      }
    };
  }

  /**
   * Resolves parameter values from the request based on parameter metadata.
   * Parameters are resolved in order of their index in the method signature.
   */
  private resolveParams(params: ParamMetadata[], req: unknown, res: unknown): unknown[] {
    // Sort by parameter index to ensure correct order
    const sorted = [...params].sort((a, b) => a.index - b.index);
    const args: unknown[] = [];

    // Fill in the args array based on index
    for (const param of sorted) {
      args[param.index] = this.resolveParam(param, req, res);
    }

    return args;
  }

  /**
   * Resolves a single parameter value.
   */
  private resolveParam(param: ParamMetadata, req: unknown, res: unknown): unknown {
    switch (param.type) {
      case "body": {
        const body = this.adapter.getBody(req);
        if (param.schema) {
          return this.validateWithZod(param.schema, body);
        }
        return body;
      }

      case "query": {
        const query = this.adapter.getQuery(req);
        if (param.schema) {
          return this.validateWithZod(param.schema, query);
        }
        return query;
      }

      case "param": {
        const params = this.adapter.getParams(req);
        return param.key ? params[param.key] : undefined;
      }

      case "req":
        return req;

      case "cookie":
        return new CookieSetter(this.adapter, req, res);

      default:
        return undefined;
    }
  }

  /**
   * Validates data against a Zod schema.
   * Throws BadRequestException with field-level errors on failure.
   */
  private validateWithZod(schema: ParamMetadata["schema"], data: unknown): unknown {
    if (!schema) return data;

    try {
      return schema.parse(data);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        throw new BadRequestException("Validation failed", { errors });
      }
      throw error;
    }
  }

  /**
   * Handles errors thrown during route execution.
   * BaseException instances are sent with their status code.
   * Unknown errors are wrapped as ServerErrorException.
   */
  private handleError(error: unknown, res: unknown): void {
    if (error instanceof BaseException) {
      this.adapter.sendResponse(res, error.status, {
        message: error.message,
        data: error.data,
      });
      return;
    }

    // Wrap unknown errors as ServerErrorException
    const serverError = new ServerErrorException(
      error instanceof Error ? error.message : "Internal server error"
    );
    this.adapter.sendResponse(res, serverError.status, {
      message: serverError.message,
      data: serverError.data,
    });
  }
}
