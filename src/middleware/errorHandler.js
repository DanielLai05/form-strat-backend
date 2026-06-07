import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

/**
 * Central error handler. Must be registered last (after routes) and must keep
 * all four arguments so Express recognizes it as error-handling middleware.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (typeof err?.code === 'string' && /^\d{5}$/.test(err.code)) {
    // PostgreSQL error codes (SQLSTATE) -> friendlier HTTP responses.
    // https://www.postgresql.org/docs/current/errcodes-appendix.html
    if (err.code === '23505') {
      statusCode = 409;
      message = 'A record with that value already exists';
    } else if (err.code === '23503') {
      statusCode = 409;
      message = 'Operation violates a foreign key constraint';
    } else if (err.code === '22P02') {
      statusCode = 400;
      message = 'Invalid input syntax (e.g. malformed id)';
    } else {
      statusCode = 400;
      message = 'Database request error';
    }
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON payload';
  } else if (err?.message) {
    message = err.message;
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(isProd ? {} : { stack: err?.stack }),
    },
  });
};
