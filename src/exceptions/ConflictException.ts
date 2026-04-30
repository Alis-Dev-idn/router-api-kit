import { BaseException } from "./BaseException.js";

/**
 * Exception for 409 Conflict responses.
 * Thrown when a request conflicts with the current state of the resource.
 */
export class ConflictException extends BaseException {
  readonly status = 409;
  readonly code = "CONFLICT";
}
