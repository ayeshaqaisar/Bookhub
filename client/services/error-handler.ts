// Frontend error handling utilities

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }

  isValidationError(): boolean {
    return this.statusCode === 400;
  }

  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }

  isUnauthorizedError(): boolean {
    return this.statusCode === 401;
  }

  isForbiddenError(): boolean {
    return this.statusCode === 403;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  getMessageForUser(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect. Please check your internet connection.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'NOT_FOUND':
        return 'The resource you requested was not found.';
      case 'UNAUTHORIZED':
        return 'You need to be logged in to perform this action.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'INTERNAL_SERVER_ERROR':
      case 'SERVER_ERROR':
        return 'An unexpected error occurred. Please try again later.';
      default:
        return this.message || 'An error occurred. Please try again.';
    }
  }
}

/** Handle API errors and return user-friendly message */
export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(500, error.message, 'UNKNOWN_ERROR', {
      originalError: error.message,
    });
  }

  return new ApiError(500, String(error), 'UNKNOWN_ERROR');
}

/** Format error for display to user */
export function getErrorMessage(error: unknown): string {
  const apiError = handleApiError(error);
  return apiError.getMessageForUser();
}
