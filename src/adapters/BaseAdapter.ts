import type { HttpMethod, MiddlewareFn, CookieOptions } from "../types/index.js";

/**
 * Abstract adapter interface for framework-agnostic route registration.
 * Implement this for each supported framework (Express, Fastify, etc.).
 */
export abstract class BaseAdapter {
  /** The framework application instance */
  abstract readonly app: unknown;

  /**
   * Registers a route on the framework instance.
   *
   * @param method - HTTP method
   * @param path - Route path
   * @param middlewares - Array of middleware functions to execute before the handler
   * @param handler - The route handler function
   */
  abstract registerRoute(
    method: HttpMethod,
    path: string,
    middlewares: MiddlewareFn[],
    handler: (req: unknown, res: unknown, next?: unknown) => void
  ): void;

  /** Extracts the request body */
  abstract getBody(req: unknown): unknown;

  /** Extracts the query parameters */
  abstract getQuery(req: unknown): unknown;

  /** Extracts the route parameters */
  abstract getParams(req: unknown): Record<string, string>;

  /** Extracts the request headers */
  abstract getHeaders(req: unknown): Record<string, string>;

  /** Extracts the cookies from the request */
  abstract getCookies(req: unknown): Record<string, string>;

  /** Sets a cookie on the response */
  abstract setCookie(res: unknown, key: string, value: string, options: CookieOptions): void;

  /** Deletes a cookie from the response */
  abstract deleteCookie(res: unknown, key: string): void;

  /** Extracts the request URL path */
  abstract getUrl(req: unknown): string;

  /** Extracts the request HTTP method */
  abstract getMethod(req: unknown): string;

  /** Sends a JSON response */
  abstract sendResponse(res: unknown, status: number, body: unknown): void;

  /** Registers a catch-all handler for 404 Not Found routes */
  abstract registerNotFoundHandler(handler: (req: unknown, res: unknown) => void): void;
}
