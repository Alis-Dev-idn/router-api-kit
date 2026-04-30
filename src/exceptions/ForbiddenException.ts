import { BaseException } from "./BaseException.js";

/**
 * Exception for 403 Forbidden responses.
 * Thrown when the user is authenticated but lacks permission.
 */
export class ForbiddenException extends BaseException {
  readonly status = 403;
  readonly code = "FORBIDDEN";
}
