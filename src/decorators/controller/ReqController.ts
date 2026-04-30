import "reflect-metadata";
import type { ControllerOptions, ControllerMetadata } from "../../types/index.js";
import { METADATA_KEYS } from "../../types/index.js";

/**
 * Marks a class as a route controller.
 * Defines the base path and default authentication for all routes in the controller.
 *
 * @param basePath - The base URL path for all routes in this controller
 * @param options - Optional controller configuration
 * @returns ClassDecorator
 *
 * @example
 * ```typescript
 * @ReqController("/users", { authentication: "auth", tag: "User Management" })
 * class UserController {
 *   // all routes inherit authentication: "auth" unless overridden
 * }
 * ```
 */
export function ReqController(basePath: string, options?: ControllerOptions): ClassDecorator {
  return function (target: Function) {
    // Derive tag from class name if not provided (PascalCase split)
    const tag = options?.tag ?? deriveTagFromClassName(target.name);

    const metadata: ControllerMetadata = {
      basePath: normalizePath(basePath),
      authentication: options?.authentication ?? false,
      tag,
      swagger: options?.swagger !== false,
    };

    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, metadata, target);
  };
}

/**
 * Derives a human-readable tag from a PascalCase class name.
 * E.g. "UserController" → "User", "AuthTokenController" → "Auth Token"
 */
function deriveTagFromClassName(name: string): string {
  const withoutSuffix = name.replace(/Controller$/i, "");
  return withoutSuffix.replace(/([a-z])([A-Z])/g, "$1 $2").trim() || name;
}

/**
 * Normalizes a path to ensure it starts with "/" and has no trailing slash.
 */
function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path;
}
