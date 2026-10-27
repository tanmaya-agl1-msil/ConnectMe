import { ErrorCode } from '@connectme/shared';

export interface ErrorDetail {
  path: string;
  message: string;
}

/** An expected, client-facing error. Its message is safe to return to the caller. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errors = {
  badRequest: (message = 'Bad request', details?: ErrorDetail[]) =>
    new AppError(400, ErrorCode.BAD_REQUEST, message, details),
  unauthorized: (message = 'Authentication required') =>
    new AppError(401, ErrorCode.UNAUTHORIZED, message),
  forbidden: (message = 'Forbidden') => new AppError(403, ErrorCode.FORBIDDEN, message),
  notFound: (message = 'Not found') => new AppError(404, ErrorCode.NOT_FOUND, message),
  conflict: (message = 'Conflict') => new AppError(409, ErrorCode.CONFLICT, message),
  rateLimited: (message = 'Too many requests') =>
    new AppError(429, ErrorCode.RATE_LIMITED, message),
};
