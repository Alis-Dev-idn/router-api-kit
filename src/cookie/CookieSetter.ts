import type { CookieOptions } from "../types/index.js";
import type { BaseAdapter } from "../adapters/BaseAdapter.js";

/**
 * Helper class for reading and setting cookies.
 * Abstracts cookie operations across Express and Fastify via the adapter pattern.
 *
 * Injected into controller methods via the @Cookie() decorator.
 *
 * @example
 * ```typescript
 * @PostMapping("/login")
 * async login(@Body(schema) body: ILogin, @Cookie() cookie: CookieSetter) {
 *   cookie.set("refresh_token", token, { httpOnly: true, secure: true, maxAge: 7 });
 *   const existingToken = cookie.get("refresh_token");
 *   cookie.delete("refresh_token");
 * }
 * ```
 */
export class CookieSetter {
  constructor(
    private readonly adapter: BaseAdapter,
    private readonly req: unknown,
    private readonly res: unknown
  ) {}

  /**
   * Sets a cookie with the given key, value, and options.
   *
   * @param key - Cookie name
   * @param value - Cookie value
   * @param options - Cookie configuration options
   */
  set(key: string, value: string, options?: CookieOptions): void {
    this.adapter.setCookie(this.res, key, value, {
      httpOnly: options?.httpOnly !== false,
      secure: options?.secure !== false,
      maxAge: options?.maxAge,
      path: options?.path ?? "/",
      sameSite: options?.sameSite,
    });
  }

  /**
   * Gets a cookie value by key.
   *
   * @param key - Cookie name
   * @returns The cookie value or undefined if not found
   */
  get(key: string): string | undefined {
    const cookies = this.adapter.getCookies(this.req);
    return cookies[key];
  }

  /**
   * Deletes a cookie by key.
   *
   * @param key - Cookie name to delete
   */
  delete(key: string): void {
    this.adapter.deleteCookie(this.res, key);
  }
}
