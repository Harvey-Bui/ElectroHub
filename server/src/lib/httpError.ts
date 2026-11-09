/** An error that maps directly to an HTTP response. Throw it from services/routes. */
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

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, 'BAD_REQUEST', details);
  }

  static notFound(message = 'Resource not found') {
    return new HttpError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string, details?: unknown) {
    return new HttpError(409, message, 'CONFLICT', details);
  }
}
