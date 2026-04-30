import "reflect-metadata";
import type { RouterKitConfig, Class } from "../types/index.js";
import { ExpressAdapter } from "../adapters/ExpressAdapter.js";
import { FastifyAdapter } from "../adapters/FastifyAdapter.js";
import type { BaseAdapter } from "../adapters/BaseAdapter.js";
import { RouteResolver } from "./RouteResolver.js";
import { SwaggerGenerator } from "../swagger/SwaggerGenerator.js";
import { SwaggerUI } from "../swagger/SwaggerUI.js";

/**
 * Main setup and registry class for router-api-kit.
 * Configured once at application entry point.
 *
 * @example
 * ```typescript
 * import express from "express";
 * import { RouterKit } from "@alisdev/router-api-kit";
 *
 * const app = express();
 * app.use(express.json());
 *
 * RouterKit.setup({
 *   framework: "express",
 *   app,
 *   authMiddleware: verifyAccessToken,
 *   refreshMiddleware: verifyRefreshToken,
 *   swagger: {
 *     enabled: true,
 *     path: "/api/docs",
 *     title: "My API",
 *     version: "1.0.0",
 *   },
 * });
 *
 * RouterKit.register(AuthController, UserController);
 *
 * app.listen(3000);
 * ```
 */
export class RouterKit {
  private static adapter: BaseAdapter | null = null;
  private static resolver: RouteResolver | null = null;
  private static config: RouterKitConfig | null = null;
  private static isSetup = false;

  /**
   * Configures RouterKit with the framework adapter, authentication, and swagger settings.
   * Must be called before `register()`.
   *
   * @param config - The RouterKit configuration
   */
  static setup(config: RouterKitConfig): void {
    // Create the appropriate adapter
    switch (config.framework) {
      case "express":
        RouterKit.adapter = new ExpressAdapter(config.app);
        break;
      case "fastify":
        RouterKit.adapter = new FastifyAdapter(config.app);
        break;
      default:
        throw new Error(
          `[RouterKit] Unsupported framework: "${config.framework}". ` +
            `Supported frameworks are "express" and "fastify".`
        );
    }

    RouterKit.config = config;
    RouterKit.resolver = new RouteResolver(RouterKit.adapter, config.authMiddleware, config.refreshMiddleware);
    RouterKit.isSetup = true;

    console.log(`🚀 RouterKit initialized with ${config.framework} adapter`);
  }

  /**
   * Registers one or more controller classes.
   * Each controller must be decorated with @ReqController.
   * Supports registering multiple controllers in a single call.
   *
   * @param controllers - One or more controller classes to register
   * @throws Error if setup() has not been called
   * @throws Error if a controller is not decorated with @ReqController
   * @throws Error if duplicate routes are detected
   *
   * @example
   * ```typescript
   * // Register a single controller
   * RouterKit.register(UserController);
   *
   * // Register multiple controllers at once
   * RouterKit.register(AuthController, UserController, ProductController);
   * ```
   */
  static register(...controllers: Class[]): void {
    if (!RouterKit.isSetup || !RouterKit.resolver || !RouterKit.config) {
      throw new Error(
        `[RouterKit] RouterKit.setup() must be called before RouterKit.register(). ` +
          `Configure the framework and adapter first.`
      );
    }

    // Resolve all controllers
    for (const Controller of controllers) {
      RouterKit.resolver.resolve(Controller);
      console.log(`✅ Registered controller: ${Controller.name}`);
    }

    // Generate and serve Swagger UI if enabled
    if (RouterKit.config.swagger?.enabled && RouterKit.resolver.resolvedRoutes.length > 0) {
      const spec = SwaggerGenerator.generate(RouterKit.resolver.resolvedRoutes, RouterKit.config.swagger);
      SwaggerUI.serve(RouterKit.config.app, spec, RouterKit.config.swagger);
    }
  }

  /**
   * Resets the RouterKit state. Useful for testing.
   * @internal
   */
  static reset(): void {
    RouterKit.adapter = null;
    RouterKit.resolver = null;
    RouterKit.config = null;
    RouterKit.isSetup = false;
  }
}
