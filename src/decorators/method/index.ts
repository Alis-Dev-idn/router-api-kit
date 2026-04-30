import "reflect-metadata";
import type { MiddlewareFn } from "../../types/index.js";
import { METADATA_KEYS } from "../../types/index.js";

/**
 * Applies one or more middleware functions to a specific route method.
 * Middlewares are executed in the order they are provided, before the route handler.
 *
 * @param middlewares - Middleware functions to apply
 *
 * @example
 * ```typescript
 * @PostMapping("/upload")
 * @UseMiddleware(uploadMiddleware, validateFileSize)
 * async upload(@Req() req: express.Request) { ... }
 * ```
 */
export function UseMiddleware(...middlewares: MiddlewareFn[]): MethodDecorator {
  return function (_target: Object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
    const existingMiddlewares: MiddlewareFn[] =
      Reflect.getOwnMetadata(METADATA_KEYS.MIDDLEWARES, _target.constructor, String(propertyKey)) ?? [];

    existingMiddlewares.push(...middlewares);
    Reflect.defineMetadata(METADATA_KEYS.MIDDLEWARES, existingMiddlewares, _target.constructor, String(propertyKey));
  };
}

/**
 * Sets the default HTTP response status code for a route.
 * Overrides the default 200 OK status.
 *
 * @param code - HTTP status code
 *
 * @example
 * ```typescript
 * @PostMapping("/")
 * @HttpStatus(201)
 * async create(@Body(schema) body: ICreate) { ... }
 * ```
 */
export function HttpStatus(code: number): MethodDecorator {
  return function (_target: Object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.HTTP_STATUS, code, _target.constructor, String(propertyKey));
  };
}
