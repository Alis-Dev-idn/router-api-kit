import { BaseException } from "./BaseException.js";

/**
 * Exception for 404 Not Found responses.
 * Thrown when a requested resource does not exist.
 */
export class NotFoundException extends BaseException {
  readonly status = 404;
  readonly code = "NOT_FOUND";
}
