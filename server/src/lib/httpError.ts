/**
 * An error that maps directly to an HTTP response:
 *   { "error": { "code": "...", "message": "...", "details"?: ... } }
 * Throw it from services; the error handler formats it.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, details?: unknown, code = 'BAD_REQUEST') {
    return new HttpError(400, message, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new HttpError(401, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new HttpError(404, message, code);
  }

  static conflict(message: string, details?: unknown, code = 'CONFLICT') {
    return new HttpError(409, message, code, details);
  }

  static tooManyRequests(message: string, retryAfterSeconds: number) {
    return new HttpError(429, message, 'TOO_MANY_REQUESTS', { retryAfterSeconds });
  }
}
