import "reflect-metadata";
import type { MappingOptions, RouteMetadata, HttpMethod } from "../../types/index.js";
import { METADATA_KEYS } from "../../types/index.js";

/**
 * Creates a method mapping decorator for the specified HTTP method.
 * @internal
 */
function createMappingDecorator(method: HttpMethod) {
  return function (path: string, options?: MappingOptions): MethodDecorator {
    return function (_target: Object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
      const normalizedPath = normalizePath(path);

      const route: RouteMetadata = {
        method,
        path: normalizedPath,
        propertyKey: String(propertyKey),
        options: options ?? {},
      };

      // Get existing routes or create new array
      const existingRoutes: RouteMetadata[] =
        Reflect.getOwnMetadata(METADATA_KEYS.ROUTES, _target.constructor) ?? [];

      existingRoutes.push(route);
      Reflect.defineMetadata(METADATA_KEYS.ROUTES, existingRoutes, _target.constructor);
    };
  };
}

/**
 * Normalizes a path to ensure it starts with "/".
 */
function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return path;
}

/**
 * Maps a method to handle HTTP GET requests.
 *
 * @param path - The route path
 * @param options - Optional mapping configuration
 *
 * @example
 * ```typescript
 * @GetMapping("/", { summary: "Get all users" })
 * async getAll() { ... }
 * ```
 */
export const GetMapping = createMappingDecorator("get");

/**
 * Maps a method to handle HTTP POST requests.
 *
 * @param path - The route path
 * @param options - Optional mapping configuration
 *
 * @example
 * ```typescript
 * @PostMapping("/", { summary: "Create a user" })
 * async create(@Body(schema) body: ICreateUser) { ... }
 * ```
 */
export const PostMapping = createMappingDecorator("post");

/**
 * Maps a method to handle HTTP PUT requests.
 *
 * @param path - The route path
 * @param options - Optional mapping configuration
 */
export const PutMapping = createMappingDecorator("put");

/**
 * Maps a method to handle HTTP PATCH requests.
 *
 * @param path - The route path
 * @param options - Optional mapping configuration
 */
export const PatchMapping = createMappingDecorator("patch");

/**
 * Maps a method to handle HTTP DELETE requests.
 *
 * @param path - The route path
 * @param options - Optional mapping configuration
 */
export const DeleteMapping = createMappingDecorator("delete");
