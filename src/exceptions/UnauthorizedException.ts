import { BaseException } from "./BaseException.js";

/**
 * Exception for 401 Unauthorized responses.
 * Thrown when authentication is required but not provided or invalid.
 */
export class UnauthorizedException extends BaseException {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";
}
