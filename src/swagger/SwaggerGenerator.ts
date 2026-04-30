import type { ZodSchema, ZodObject, ZodTypeAny, ZodOptionalDef, ZodNullableDef, ZodArrayDef, ZodDefault } from "zod";
import type {
  OpenAPISpec,
  OpenAPIPathItem,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPISchema,
  ResolvedRoute,
  SwaggerConfig,
  ParamMetadata,
} from "../types/index.js";

/**
 * Generates an OpenAPI 3.0 specification from resolved route metadata.
 * Converts Zod schemas to OpenAPI schemas and organizes routes by tags.
 */
export class SwaggerGenerator {
  /**
   * Generates a complete OpenAPI 3.0 spec from resolved routes.
   *
   * @param routes - Array of resolved route information
   * @param config - Swagger configuration
   * @returns Complete OpenAPI specification object
   */
  static generate(routes: ResolvedRoute[], config: SwaggerConfig): OpenAPISpec {
    const paths: Record<string, OpenAPIPathItem> = {};
    const tagSet = new Set<string>();

    // Filter out routes where swagger is disabled
    const swaggerRoutes = routes.filter((r) => r.swagger !== false);

    // Sort routes based on config
    const sortedRoutes = [...swaggerRoutes].sort((a, b) => {
      if (config.sortBy === "method") {
        return a.method.localeCompare(b.method) || a.fullPath.localeCompare(b.fullPath);
      }
      return a.fullPath.localeCompare(b.fullPath) || a.method.localeCompare(b.method);
    });

    for (const route of sortedRoutes) {
      const tag = route.routeOptions.tag ?? route.controllerTag;
      tagSet.add(tag);

      // Convert Express-style path (:id) to OpenAPI-style ({id})
      const openApiPath = route.fullPath.replace(/:(\w+)/g, "{$1}");

      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }

      const operation = SwaggerGenerator.buildOperation(route, tag);
      paths[openApiPath][route.method] = operation;
    }

    // Sort tags alphabetically
    const tags = [...tagSet].sort().map((name) => ({ name }));

    return {
      openapi: "3.0.0",
      info: {
        title: config.title ?? "API Documentation",
        version: config.version ?? "1.0.0",
      },
      paths,
      tags,
    };
  }

  /**
   * Builds an OpenAPI operation from a resolved route.
   */
  private static buildOperation(route: ResolvedRoute, tag: string): OpenAPIOperation {
    const operation: OpenAPIOperation = {
      tags: [tag],
      summary: route.routeOptions.summary,
      description: route.routeOptions.description,
      responses: {
        [String(route.statusCode)]: {
          description: "Successful response",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  data: { type: "object" },
                },
              },
            },
          },
        },
        "400": { description: "Bad Request" },
        "500": { description: "Internal Server Error" },
      },
    };

    const parameters: OpenAPIParameter[] = [];
    let requestBody: OpenAPIRequestBody | undefined;

    for (const param of route.params) {
      switch (param.type) {
        case "body":
          if (param.schema) {
            requestBody = {
              required: true,
              content: {
                "application/json": {
                  schema: SwaggerGenerator.zodToOpenAPI(param.schema),
                },
              },
            };
          }
          break;

        case "query":
          if (param.schema) {
            const queryParams = SwaggerGenerator.zodToQueryParams(param.schema);
            parameters.push(...queryParams);
          }
          break;

        case "param":
          if (param.key) {
            parameters.push({
              name: param.key,
              in: "path",
              required: true,
              schema: { type: "string" },
            });
          }
          break;
      }
    }

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }
    if (requestBody) {
      operation.requestBody = requestBody;
    }

    return operation;
  }

  /**
   * Converts a Zod schema to OpenAPI query parameters.
   */
  private static zodToQueryParams(schema: ZodSchema): OpenAPIParameter[] {
    const params: OpenAPIParameter[] = [];

    try {
      const shape = SwaggerGenerator.getZodShape(schema);
      if (shape) {
        for (const [key, fieldSchema] of Object.entries(shape)) {
          const zodField = fieldSchema as ZodTypeAny;
          const isOptional = SwaggerGenerator.isOptional(zodField);
          params.push({
            name: key,
            in: "query",
            required: !isOptional,
            schema: SwaggerGenerator.zodFieldToOpenAPI(zodField),
          });
        }
      }
    } catch {
      // If we can't parse the schema, add a generic parameter
    }

    return params;
  }

  /**
   * Converts a Zod schema to an OpenAPI schema object.
   */
  static zodToOpenAPI(schema: ZodSchema): OpenAPISchema {
    try {
      const shape = SwaggerGenerator.getZodShape(schema);
      if (shape) {
        const properties: Record<string, OpenAPISchema> = {};
        const required: string[] = [];

        for (const [key, fieldSchema] of Object.entries(shape)) {
          const zodField = fieldSchema as ZodTypeAny;
          properties[key] = SwaggerGenerator.zodFieldToOpenAPI(zodField);
          if (!SwaggerGenerator.isOptional(zodField)) {
            required.push(key);
          }
        }

        return {
          type: "object",
          properties,
          ...(required.length > 0 ? { required } : {}),
        };
      }
    } catch {
      // Fallback
    }

    return { type: "object" };
  }

  /**
   * Converts an individual Zod field to OpenAPI schema.
   */
  private static zodFieldToOpenAPI(schema: ZodTypeAny): OpenAPISchema {
    const def = schema._def;
    const typeName = def?.typeName as string | undefined;

    // Unwrap optional/nullable/default
    if (typeName === "ZodOptional") {
      const innerDef = def as unknown as ZodOptionalDef;
      return SwaggerGenerator.zodFieldToOpenAPI(innerDef.innerType as ZodTypeAny);
    }
    if (typeName === "ZodNullable") {
      const innerDef = def as unknown as ZodNullableDef;
      const inner = SwaggerGenerator.zodFieldToOpenAPI(innerDef.innerType as ZodTypeAny);
      return { ...inner, nullable: true };
    }
    if (typeName === "ZodDefault") {
      const innerDef = def as unknown as { innerType: ZodTypeAny; defaultValue: () => unknown };
      const inner = SwaggerGenerator.zodFieldToOpenAPI(innerDef.innerType as ZodTypeAny);
      return { ...inner, default: (def as unknown as ZodDefault<ZodTypeAny>)._def.defaultValue() };
    }
    if (typeName === "ZodEffects") {
      // Handle z.coerce etc.
      const innerSchema = (def as unknown as { schema: ZodTypeAny }).schema;
      if (innerSchema) {
        return SwaggerGenerator.zodFieldToOpenAPI(innerSchema);
      }
    }

    switch (typeName) {
      case "ZodString":
        return { type: "string" };
      case "ZodNumber":
        return { type: "number" };
      case "ZodBoolean":
        return { type: "boolean" };
      case "ZodArray": {
        const arrayDef = def as unknown as ZodArrayDef;
        return {
          type: "array",
          items: SwaggerGenerator.zodFieldToOpenAPI(arrayDef.type as ZodTypeAny),
        };
      }
      case "ZodObject": {
        return SwaggerGenerator.zodToOpenAPI(schema as unknown as ZodSchema);
      }
      case "ZodEnum": {
        const enumValues = (def as unknown as { values: unknown[] }).values;
        return { type: "string", enum: enumValues };
      }
      default:
        return { type: "string" };
    }
  }

  /**
   * Attempts to extract the shape from a Zod object schema.
   */
  private static getZodShape(schema: ZodSchema): Record<string, ZodTypeAny> | null {
    const zodObj = schema as unknown as ZodObject<Record<string, ZodTypeAny>>;
    if (zodObj?.shape && typeof zodObj.shape === "object") {
      return zodObj.shape as Record<string, ZodTypeAny>;
    }
    if (zodObj?._def?.shape && typeof zodObj._def.shape === "function") {
      return (zodObj._def.shape as () => Record<string, ZodTypeAny>)();
    }
    return null;
  }

  /**
   * Checks if a Zod field is optional or has a default.
   */
  private static isOptional(schema: ZodTypeAny): boolean {
    const typeName = schema._def?.typeName as string | undefined;
    if (typeName === "ZodOptional" || typeName === "ZodDefault") return true;
    if (typeName === "ZodNullable") {
      const innerDef = schema._def as unknown as ZodNullableDef;
      return SwaggerGenerator.isOptional(innerDef.innerType as ZodTypeAny);
    }
    return false;
  }
}
