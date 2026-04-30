import "reflect-metadata";
import type { ZodSchema } from "zod";
import type { ParamMetadata } from "../../types/index.js";
import { METADATA_KEYS } from "../../types/index.js";

/**
 * Helper to register parameter metadata on a method.
 * @internal
 */
function addParamMetadata(
  target: Object,
  propertyKey: string | symbol,
  parameterIndex: number,
  metadata: Omit<ParamMetadata, "index">
): void {
  const existingParams: ParamMetadata[] =
    Reflect.getOwnMetadata(METADATA_KEYS.PARAMS, target.constructor, String(propertyKey)) ?? [];

  existingParams.push({ ...metadata, index: parameterIndex });
  Reflect.defineMetadata(METADATA_KEYS.PARAMS, existingParams, target.constructor, String(propertyKey));
}

/**
 * Injects and optionally validates `req.body` using a Zod schema.
 *
 * @param schema - Optional Zod schema for validation
 *
 * @example
 * ```typescript
 * @PostMapping("/")
 * async create(@Body(CreateUserSchema) body: ICreateUser) { ... }
 * ```
 */
export function Body(schema?: ZodSchema): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (propertyKey === undefined) return;
    addParamMetadata(target, propertyKey, parameterIndex, { type: "body", schema });
  };
}

/**
 * Injects and optionally validates `req.query` using a Zod schema.
 *
 * @param schema - Optional Zod schema for validation (use z.coerce for type conversion)
 *
 * @example
 * ```typescript
 * @GetMapping("/")
 * async getAll(@Query(PaginationSchema) query: IPagination) { ... }
 * ```
 */
export function Query(schema?: ZodSchema): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (propertyKey === undefined) return;
    addParamMetadata(target, propertyKey, parameterIndex, { type: "query", schema });
  };
}

/**
 * Injects a single route parameter by key.
 *
 * @param key - The route parameter name (e.g. "id" for /:id)
 *
 * @example
 * ```typescript
 * @GetMapping("/:id")
 * async getById(@Param("id") id: string) { ... }
 * ```
 */
export function Param(key: string): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (propertyKey === undefined) return;
    addParamMetadata(target, propertyKey, parameterIndex, { type: "param", key });
  };
}

/**
 * Injects the raw framework request object.
 *
 * @example
 * ```typescript
 * @GetMapping("/me")
 * async getProfile(@Req() req: express.Request) { ... }
 * ```
 */
export function Req(): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (propertyKey === undefined) return;
    addParamMetadata(target, propertyKey, parameterIndex, { type: "req" });
  };
}

/**
 * Injects a CookieSetter instance for reading and setting cookies.
 *
 * @example
 * ```typescript
 * @PostMapping("/login")
 * async login(@Body(schema) body: ILogin, @Cookie() cookie: CookieSetter) {
 *   cookie.set("token", value, { httpOnly: true });
 * }
 * ```
 */
export function Cookie(): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (propertyKey === undefined) return;
    addParamMetadata(target, propertyKey, parameterIndex, { type: "cookie" });
  };
}
