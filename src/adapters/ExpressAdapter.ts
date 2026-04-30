import { BaseAdapter } from "./BaseAdapter.js";
import type { HttpMethod, MiddlewareFn, CookieOptions } from "../types/index.js";

/** Express-like request interface */
interface ExpressRequest {
  body: unknown;
  query: Record<string, unknown>;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies?: Record<string, string>;
}

/** Express-like response interface */
interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(body: unknown): void;
  cookie(name: string, value: string, options?: Record<string, unknown>): void;
  clearCookie(name: string, options?: Record<string, unknown>): void;
}

/** Express-like application interface */
interface ExpressApp {
  get(path: string, ...handlers: unknown[]): void;
  post(path: string, ...handlers: unknown[]): void;
  put(path: string, ...handlers: unknown[]): void;
  patch(path: string, ...handlers: unknown[]): void;
  delete(path: string, ...handlers: unknown[]): void;
  use(path: string, ...handlers: unknown[]): void;
}

/**
 * Express.js adapter implementation.
 * Handles route registration, request parsing, and response sending for Express.
 */
export class ExpressAdapter extends BaseAdapter {
  readonly app: ExpressApp;

  constructor(app: unknown) {
    super();
    this.app = app as ExpressApp;
  }

  registerRoute(
    method: HttpMethod,
    path: string,
    middlewares: MiddlewareFn[],
    handler: (req: unknown, res: unknown, next?: unknown) => void
  ): void {
    const routeHandler = this.app[method].bind(this.app);
    routeHandler(path, ...middlewares, handler);
  }

  getBody(req: unknown): unknown {
    return (req as ExpressRequest).body;
  }

  getQuery(req: unknown): unknown {
    return (req as ExpressRequest).query;
  }

  getParams(req: unknown): Record<string, string> {
    return (req as ExpressRequest).params;
  }

  getHeaders(req: unknown): Record<string, string> {
    return (req as ExpressRequest).headers;
  }

  getCookies(req: unknown): Record<string, string> {
    return (req as ExpressRequest).cookies ?? {};
  }

  setCookie(res: unknown, key: string, value: string, options: CookieOptions): void {
    const expressRes = res as ExpressResponse;
    expressRes.cookie(key, value, {
      httpOnly: options.httpOnly,
      secure: options.secure,
      maxAge: options.maxAge ? options.maxAge * 24 * 60 * 60 * 1000 : undefined,
      path: options.path,
      sameSite: options.sameSite,
    });
  }

  deleteCookie(res: unknown, key: string): void {
    const expressRes = res as ExpressResponse;
    expressRes.clearCookie(key, { path: "/" });
  }

  sendResponse(res: unknown, status: number, body: unknown): void {
    const expressRes = res as ExpressResponse;
    expressRes.status(status).json(body);
  }
}
