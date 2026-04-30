/**
 * Base exception class for all HTTP exceptions.
 * All custom exceptions should extend this class.
 */
export abstract class BaseException extends Error {
  /** HTTP status code */
  abstract readonly status: number;
  /** Machine-readable error code */
  abstract readonly code: string;
  /** Optional additional data */
  data?: unknown;

  constructor(message: string, data?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.data = data ?? null;
  }
}
