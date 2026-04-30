import { BaseException } from "./BaseException.js";

/**
 * Exception for 500 Internal Server Error responses.
 * Thrown when an unexpected server error occurs.
 */
export class ServerErrorException extends BaseException {
  readonly status = 500;
  readonly code = "INTERNAL_SERVER_ERROR";
}
