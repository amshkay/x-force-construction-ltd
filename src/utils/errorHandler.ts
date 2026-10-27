/**
 * Standardized Error Handling Architecture
 *
 * Never exposes raw database queries, SQL errors, or internal stack traces
 * to normal users, while retaining technical information for logging.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly userMessage: string;

  constructor(
    userMessage: string,
    code = 'INTERNAL_ERROR',
    statusCode = 500,
    isOperational = true,
    technicalMessage?: string
  ) {
    super(technicalMessage || userMessage);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.userMessage = userMessage;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Handle Supabase / PostgreSQL specific errors
    const postgrestCode = typeof err.code === 'string' ? err.code : '';
    const msg = typeof err.message === 'string' ? err.message.toLowerCase() : '';

    if (postgrestCode === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
      return new AppError('A record with this identifier already exists.', 'DUPLICATE_RESOURCE', 409, true, String(err.message || ''));
    }

    if (postgrestCode === '23503' || msg.includes('foreign key constraint')) {
      return new AppError('This action references a non-existent or restricted related record.', 'FOREIGN_KEY_VIOLATION', 400, true, String(err.message || ''));
    }

    if (postgrestCode === '23514' || msg.includes('check constraint')) {
      return new AppError('The submitted data failed business validation rules.', 'VALIDATION_FAILED', 422, true, String(err.message || ''));
    }

    if (postgrestCode === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
      return new AppError('You do not have permission to access or modify this record.', 'ACCESS_DENIED', 403, true, String(err.message || ''));
    }

    if (postgrestCode === 'PGRST116' || msg.includes('results contain 0 rows')) {
      return new AppError('The requested record was not found.', 'RECORD_NOT_FOUND', 404, true, String(err.message || ''));
    }

    if (postgrestCode === '22P02' || msg.includes('invalid input syntax for type uuid')) {
      return new AppError('Invalid identifier format provided.', 'INVALID_IDENTIFIER', 400, true, String(err.message || ''));
    }

    if (typeof err.message === 'string') {
      if (msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized')) {
        return new AppError('Your session has expired. Please sign in again.', 'AUTH_EXPIRED', 401, true, err.message);
      }

      if (msg.includes('network') || msg.includes('failed to fetch')) {
        return new AppError('Unable to connect to the network. Please check your internet connection.', 'NETWORK_ERROR', 0, true, err.message);
      }
    }
  }

  if (error instanceof Error) {
    return new AppError('An unexpected error occurred. Please try again.', 'UNEXPECTED_ERROR', 500, false, error.message);
  }

  return new AppError('Something went wrong. Please try again.', 'UNKNOWN_ERROR', 500, false, String(error));
}
