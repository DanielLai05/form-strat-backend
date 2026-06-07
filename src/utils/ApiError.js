/**
 * An error carrying an HTTP status code, thrown from controllers/services and
 * translated into a JSON response by the error-handling middleware.
 *
 *   throw new ApiError(404, 'Form not found');
 */
export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
}
