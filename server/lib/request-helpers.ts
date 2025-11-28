// Centralized request utility functions
// Reduces code duplication across route handlers

import { Request } from 'express';
import { UnauthorizedError, ValidationError } from './error-handler';
import { logger } from './logger';

/**
 * Extract and validate user ID from authenticated request
 * Throws UnauthorizedError if user not authenticated
 *
 * The user ID is set by the auth middleware if a valid JWT is provided
 */
export function extractUserId(req: Request): string {
  const userId = (req as any).userId || (req as any).user?.id || null;

  if (!userId) {
    logger.logWarning('Request missing user authentication', {
      method: req.method,
      path: req.path,
      headers: { authorization: req.headers.authorization ? 'present' : 'missing' },
    });
    throw new UnauthorizedError('User authentication required. Please log in to access this resource.');
  }

  return userId as string;
}

/**
 * Validate that a parameter is a non-empty string
 * Throws ValidationError if validation fails
 */
export function validateStringParam(value: unknown, paramName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${paramName} must be a non-empty string`);
  }
  return value.trim();
}

/**
 * Validate that a parameter is a valid object ID (UUID format)
 * Throws ValidationError if validation fails
 */
export function validateObjectId(value: unknown, paramName: string = 'ID'): string {
  const str = validateStringParam(value, paramName);

  // Basic UUID validation (v4 format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(str)) {
    throw new ValidationError(`${paramName} must be a valid UUID`);
  }

  return str;
}

/**
 * Validate that a value is a boolean
 * Throws ValidationError if validation fails
 */
export function validateBooleanParam(value: unknown, paramName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${paramName} must be a boolean`);
  }
  return value;
}

/**
 * Validate that a value is a number within a range
 * Throws ValidationError if validation fails
 */
export function validateNumberParam(
  value: unknown,
  paramName: string,
  min?: number,
  max?: number
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${paramName} must be a number`);
  }

  if (min !== undefined && value < min) {
    throw new ValidationError(`${paramName} must be at least ${min}`);
  }

  if (max !== undefined && value > max) {
    throw new ValidationError(`${paramName} must be at most ${max}`);
  }

  return value;
}

/**
 * Validate that a value is one of the allowed options
 * Throws ValidationError if validation fails
 */
export function validateEnumParam<T extends string>(
  value: unknown,
  paramName: string,
  allowedValues: readonly T[]
): T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${paramName} must be one of: ${allowedValues.join(', ')}`
    );
  }
  return value as T;
}

/**
 * Validate query parameters - extracts single values from request.query
 * Handles Express query parsing that can return string[] for duplicated params
 */
export function getQueryParam(query: Record<string, any>, key: string): string | undefined {
  const value = query[key];

  if (Array.isArray(value)) {
    // If multiple values provided, take the first
    return value[0];
  }

  return value as string | undefined;
}

/**
 * Safe integer parsing with validation
 * Returns null if parsing fails
 */
export function safeParseInt(value: string | undefined, min?: number, max?: number): number | null {
  if (!value) return null;

  const num = parseInt(value, 10);
  if (isNaN(num)) return null;

  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;

  return num;
}

/**
 * Request validation helper for common patterns
 * Returns early validation errors if request is malformed
 */
export function validateRequestBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  return body as Record<string, unknown>;
}

/**
 * Log request details for debugging
 */
export function logRequestDetails(req: Request, endpoint: string): void {
  logger.logDebug('Request details', {
    method: req.method,
    endpoint,
    params: req.params,
    query: req.query,
    userId: (req as any).userId || 'anonymous',
  });
}
