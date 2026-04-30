import { BaseAdapter } from "./BaseAdapter.js";
import type { HttpMethod, MiddlewareFn, CookieOptions } from "../types/index.js";

/** Fastify-like request interface */
interface FastifyRequest {
  body: unknown;
  query: Record<string, unknown>;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies?: Record<string, string>;
}

/** Fastify-like reply interface */
interface FastifyReply {
  status(code: number): FastifyReply;
  code(statusCode: number): FastifyReply;
  send(body: unknown): void;
  setCookie(name: string, value: string, options?: Record<string, unknown>): FastifyReply;
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply;
  header(name: string, value: string): FastifyReply;
}

/** Fastify-like application interface */
interface FastifyApp {
  get(path: string, options: Record<string, unknown>, handler: unknown): void;
  post(path: string, options: Record<string, unknown>, handler: unknown): void;
  put(path: string, options: Record<string, unknown>, handler: unknown): void;
  patch(path: string, options: Record<string, unknown>, handler: unknown): void;
  delete(path: string, options: Record<string, unknown>, handler: unknown): void;
  addHook(name: string, hook: unknown): void;
  setNotFoundHandler(handler: unknown): void;
}

/**
 * Fastify adapter implementation.
 * Handles route registration, request parsing, and response sending for Fastify.
 */
export class FastifyAdapter extends BaseAdapter {
  readonly app: FastifyApp;

  constructor(app: unknown) {
    super();
    this.app = app as FastifyApp;
  }

  registerRoute(
    method: HttpMethod,
    path: string,
    middlewares: MiddlewareFn[],
    handler: (req: unknown, res: unknown) => void
  ): void {
    // Convert Express-style path params (:id) to Fastify-style (:id) — they're the same
    const fastifyPath = path;
    const routeHandler = this.app[method].bind(this.app);

    // Wrap middlewares as Fastify preHandler hooks
    const preHandlers = middlewares.map((mw) => {
      return async (request: unknown, reply: unknown) => {
        return new Promise<void>((resolve, reject) => {
          (mw as Function)(request, reply, (err?: unknown) => {
            if (err) reject(err);
            else resolve();
          });
        });
      };
    });

    routeHandler(fastifyPath, { preHandler: preHandlers }, async (request: unknown, reply: unknown) => {
      handler(request, reply);
    });
  }

  getBody(req: unknown): unknown {
    return (req as FastifyRequest).body;
  }

  getQuery(req: unknown): unknown {
    return (req as FastifyRequest).query;
  }

  getParams(req: unknown): Record<string, string> {
    return (req as FastifyRequest).params;
  }

  getHeaders(req: unknown): Record<string, string> {
    return (req as FastifyRequest).headers;
  }

  getCookies(req: unknown): Record<string, string> {
    return (req as FastifyRequest).cookies ?? {};
  }

  setCookie(res: unknown, key: string, value: string, options: CookieOptions): void {
    const fastifyReply = res as FastifyReply;
    if (typeof fastifyReply.setCookie === "function") {
      fastifyReply.setCookie(key, value, {
        httpOnly: options.httpOnly,
        secure: options.secure,
        maxAge: options.maxAge ? options.maxAge * 24 * 60 * 60 : undefined,
        path: options.path,
        sameSite: options.sameSite,
      });
    } else {
      // Fallback: Set-Cookie header manually
      const parts = [`${key}=${value}`];
      if (options.path) parts.push(`Path=${options.path}`);
      if (options.httpOnly) parts.push("HttpOnly");
      if (options.secure) parts.push("Secure");
      if (options.maxAge) parts.push(`Max-Age=${options.maxAge * 24 * 60 * 60}`);
      if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
      fastifyReply.header("Set-Cookie", parts.join("; "));
    }
  }

  deleteCookie(res: unknown, key: string): void {
    const fastifyReply = res as FastifyReply;
    if (typeof fastifyReply.clearCookie === "function") {
      fastifyReply.clearCookie(key, { path: "/" });
    } else {
      fastifyReply.header("Set-Cookie", `${key}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    }
  }

  sendResponse(res: unknown, status: number, body: unknown): void {
    const fastifyReply = res as FastifyReply;
    fastifyReply.code(status).send(body);
  }

  registerNotFoundHandler(handler: (req: unknown, res: unknown) => void): void {
    if (typeof this.app.setNotFoundHandler === "function") {
      this.app.setNotFoundHandler((request: unknown, reply: unknown) => {
        handler(request, reply);
      });
    } else {
      console.warn("[RouterKit] Fastify instance is missing setNotFoundHandler. Catch-all route not registered.");
    }
  }
}
