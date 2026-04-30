import { BaseException } from "./BaseException.js";

/**
 * Exception for 400 Bad Request responses.
 * Thrown when request validation fails or input is malformed.
 */
export class BadRequestException extends BaseException {
  readonly status = 400;
  readonly code = "BAD_REQUEST";
}
