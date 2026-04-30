import type { OpenAPISpec, SwaggerConfig } from "../types/index.js";

/** Express-like app interface for Swagger UI mounting */
interface SwaggerApp {
  use(path: string, ...handlers: unknown[]): void;
}

/**
 * Serves Swagger UI for the generated OpenAPI specification.
 * Currently supports Express. For Fastify, use @fastify/swagger-ui plugin.
 */
export class SwaggerUI {
  /**
   * Mounts Swagger UI on the given Express app at the configured path.
   *
   * @param app - The Express application instance
   * @param spec - The OpenAPI specification object
   * @param config - Swagger configuration
   */
  static serve(app: unknown, spec: OpenAPISpec, config: SwaggerConfig): void {
    const path = config.path ?? "/api/docs";

    try {
      // Dynamic import to avoid requiring swagger-ui-express when not used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const swaggerUi = require("swagger-ui-express");

      const swaggerApp = app as SwaggerApp;

      const options = {
        explorer: true,
        swaggerOptions: {
          docExpansion: "none", // Collapse all by default
          filter: true,
          showRequestDuration: true,
          tagsSorter: "alpha",
          operationsSorter: config.sortBy === "method" ? "method" : "alpha",
        },
      };

      swaggerApp.use(path, swaggerUi.serve, swaggerUi.setup(spec, options));

      console.log(`📚 Swagger UI available at ${path}`);
    } catch {
      console.warn(
        "⚠️  swagger-ui-express is not installed. Install it to enable Swagger UI:\n" +
          "   npm install swagger-ui-express"
      );
    }
  }
}
