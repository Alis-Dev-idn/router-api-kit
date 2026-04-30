import type { ZodSchema } from "zod";

// ── Framework Types ───────────────────────────────────────────────

/** Supported framework types */
export type Framework = "express" | "fastify";

/** Authentication type for route protection */
export type AuthType = "auth" | "refresh";

/** HTTP methods supported by the router */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/** Generic middleware function signature */
export type MiddlewareFn = (...args: unknown[]) => unknown;

/** Generic handler function signature */
export type HandlerFn = (req: unknown, res: unknown, next?: unknown) => unknown;

/** Generic class constructor type */
export type Class<T = unknown> = new (...args: unknown[]) => T;

// ── Cookie Types ──────────────────────────────────────────────────

/** Options for setting cookies */
export interface CookieOptions {
  /** Whether the cookie is HTTP-only (default: true) */
  httpOnly?: boolean;
  /** Whether the cookie requires HTTPS (default: true) */
  secure?: boolean;
  /** Cookie max age in days */
  maxAge?: number;
  /** Cookie path (default: "/") */
  path?: string;
  /** SameSite attribute */
  sameSite?: "strict" | "lax" | "none";
}

// ── Configuration Types ───────────────────────────────────────────

/** Swagger configuration options */
export interface SwaggerConfig {
  /** Enable or disable Swagger UI */
  enabled: boolean;
  /** URL path to serve Swagger UI (default: "/api/docs") */
  path?: string;
  /** API documentation title (default: "API Documentation") */
  title?: string;
  /** API version (default: "1.0.0") */
  version?: string;
  /** Sort endpoints by path or method (default: "path") */
  sortBy?: "path" | "method";
  /** Enable search by path (default: true) */
  searchByPath?: boolean;
  /** Enable search by method (default: true) */
  searchByMethod?: boolean;
  /** Enable search by tag (default: true) */
  searchByTag?: boolean;
}

/** Logger configuration */
export interface LoggerConfig {
  /** Enable request logging (default: false) */
  enabled?: boolean;
  /** Custom handler to receive log data (useful for saving to file or external services) */
  handler?: (level: "info" | "error", message: string, meta: { method: string; path: string; status: number; durationMs: number; error?: unknown }) => void;
}

/** Main RouterKit configuration */
export interface RouterKitConfig {
  /** The framework being used */
  framework: Framework;
  /** The framework application instance */
  app: unknown;
  /** Middleware function for "auth" type authentication */
  authMiddleware?: MiddlewareFn;
  /** Middleware function for "refresh" type authentication */
  refreshMiddleware?: MiddlewareFn;
  /** Swagger UI configuration */
  swagger?: SwaggerConfig;
  /** Logger configuration */
  logger?: boolean | LoggerConfig;
}

// ── Decorator Option Types ────────────────────────────────────────

/** Options for @ReqController decorator */
export interface ControllerOptions {
  /** Authentication type applied to all routes in this controller (default: false) */
  authentication?: AuthType | false;
  /** Swagger tag for grouping routes (default: derived from class name) */
  tag?: string;
  /** Whether to include in Swagger docs (default: true) */
  swagger?: boolean;
}

/** Options for mapping decorators (@GetMapping, @PostMapping, etc.) */
export interface MappingOptions {
  /** Override controller-level authentication for this route */
  authentication?: AuthType | false;
  /** Whether to include this route in Swagger docs (default: true) */
  swagger?: boolean;
  /** Override controller tag for this route */
  tag?: string;
  /** Swagger summary for this route */
  summary?: string;
  /** Swagger description for this route */
  description?: string;
  /** Default HTTP response status code */
  status?: number;
}

// ── Metadata Types ────────────────────────────────────────────────

/** Stored metadata for a controller class */
export interface ControllerMetadata {
  basePath: string;
  authentication: AuthType | false;
  tag: string;
  swagger: boolean;
}

/** Stored metadata for a route method */
export interface RouteMetadata {
  method: HttpMethod;
  path: string;
  propertyKey: string;
  options: MappingOptions;
}

/** Parameter injection types */
export type ParamType = "body" | "query" | "param" | "req" | "cookie";

/** Stored metadata for a parameter decorator */
export interface ParamMetadata {
  type: ParamType;
  index: number;
  schema?: ZodSchema;
  key?: string;
}

// ── Metadata Keys ─────────────────────────────────────────────────

/** Reflect metadata keys used internally */
export const METADATA_KEYS = {
  CONTROLLER: "routerkit:controller",
  ROUTES: "routerkit:routes",
  PARAMS: "routerkit:params",
  MIDDLEWARES: "routerkit:middlewares",
  HTTP_STATUS: "routerkit:httpstatus",
} as const;

// ── Swagger Types ─────────────────────────────────────────────────

/** OpenAPI path item */
export interface OpenAPIPathItem {
  [method: string]: OpenAPIOperation;
}

/** OpenAPI operation */
export interface OpenAPIOperation {
  tags: string[];
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
}

/** OpenAPI parameter */
export interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required: boolean;
  schema: OpenAPISchema;
  description?: string;
}

/** OpenAPI request body */
export interface OpenAPIRequestBody {
  required: boolean;
  content: {
    "application/json": {
      schema: OpenAPISchema;
    };
  };
}

/** OpenAPI response */
export interface OpenAPIResponse {
  description: string;
  content?: {
    "application/json": {
      schema: OpenAPISchema;
    };
  };
}

/** OpenAPI schema */
export interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  nullable?: boolean;
  description?: string;
  enum?: unknown[];
  format?: string;
  default?: unknown;
}

/** Full OpenAPI spec */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, OpenAPIPathItem>;
  tags: Array<{ name: string; description?: string }>;
}

/** Resolved route info for internal processing */
export interface ResolvedRoute {
  method: HttpMethod;
  fullPath: string;
  middlewares: MiddlewareFn[];
  params: ParamMetadata[];
  handler: (...args: unknown[]) => unknown;
  statusCode: number;
  controllerTag: string;
  swagger: boolean;
  routeOptions: MappingOptions;
}
