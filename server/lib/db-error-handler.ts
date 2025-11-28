// Database error handling utilities
// Provides standardized error handling for Supabase operations

import { PostgrestError } from '@supabase/supabase-js';
import { NotFoundError, InternalServerError } from './error-handler';
import { logger } from './logger';

/**
 * Supabase error codes
 * Reference: https://postgrest.org/en/v11/references/errors/
 */
export enum PostgrestErrorCode {
  // No rows found
  NO_ROWS = 'PGRST116',
  // Constraint violation
  CONSTRAINT_VIOLATION = '23505',
  // Foreign key violation
  FOREIGN_KEY_VIOLATION = '23503',
  // Unique violation
  UNIQUE_VIOLATION = '23505',
}

/**
 * Check if error is a "no rows found" error
 */
export function isNoRowsError(error: PostgrestError | null): boolean {
  return error?.code === PostgrestErrorCode.NO_ROWS;
}

/**
 * Check if error is a constraint violation
 */
export function isConstraintError(error: PostgrestError | null): boolean {
  if (!error?.code) return false;
  return [
    PostgrestErrorCode.CONSTRAINT_VIOLATION,
    PostgrestErrorCode.FOREIGN_KEY_VIOLATION,
    PostgrestErrorCode.UNIQUE_VIOLATION,
  ].includes(error.code as any);
}

/**
 * Handle Supabase error and throw appropriate AppError
 * For "no rows" errors, returns false instead of throwing
 *
 * @param error - The Supabase error
 * @param context - Additional context for logging
 * @param returnNullOnNoRows - If true, returns false for "no rows" errors (allows caller to return null)
 */
export function handleSupabaseError(
  error: PostgrestError | null,
  context: Record<string, unknown> = {},
  returnNullOnNoRows = true
): boolean {
  if (!error) {
    return true;
  }

  // "No rows found" is not an error, it's just an empty result
  if (returnNullOnNoRows && isNoRowsError(error)) {
    return false;
  }

  // Log the error
  logger.logError('Supabase error', new Error(error.message), context, {
    code: error.code,
    hint: error.hint,
    details: error.details,
  });

  // Throw appropriate error
  if (isConstraintError(error)) {
    throw new InternalServerError('Data conflict or constraint violation', {
      code: error.code,
      message: error.message,
    });
  }

  throw new InternalServerError('Database operation failed', {
    code: error.code,
    message: error.message,
  });
}

/**
 * Wrap a Supabase query to standardize error handling
 *
 * Usage:
 * ```
 * const result = await runSupabaseQuery(async () => {
 *   return supabase.from('table').select('*');
 * });
 * ```
 */
export async function runSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  context: Record<string, unknown> = {}
): Promise<T> {
  try {
    const { data, error } = await queryFn();

    if (!handleSupabaseError(error, context)) {
      throw new NotFoundError('Resource', 'unknown');
    }

    if (!data) {
      throw new NotFoundError('Resource', 'unknown');
    }

    return data;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InternalServerError) {
      throw err;
    }

    logger.logError('Unexpected error in Supabase query', err as Error, context);
    throw new InternalServerError('Database operation failed');
  }
}

/**
 * Wrap a Supabase query that may return empty results (no rows)
 * Returns null if no rows found, otherwise returns data
 *
 * Usage:
 * ```
 * const result = await runSupabaseQueryOptional(async () => {
 *   return supabase.from('table').select('*').single();
 * });
 * ```
 */
export async function runSupabaseQueryOptional<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  context: Record<string, unknown> = {}
): Promise<T | null> {
  try {
    const { data, error } = await queryFn();

    // No rows is OK for optional queries
    if (isNoRowsError(error)) {
      return null;
    }

    // Any other error is a problem
    if (error) {
      handleSupabaseError(error, context, false);
    }

    return data || null;
  } catch (err) {
    if (err instanceof InternalServerError) {
      throw err;
    }

    logger.logError('Unexpected error in optional Supabase query', err as Error, context);
    throw new InternalServerError('Database operation failed');
  }
}

/**
 * Wrap a Supabase query that returns an array
 * Returns empty array if no rows found
 *
 * Usage:
 * ```
 * const results = await runSupabaseQueryArray(async () => {
 *   return supabase.from('table').select('*');
 * });
 * ```
 */
export async function runSupabaseQueryArray<T>(
  queryFn: () => Promise<{ data: T[] | null; error: PostgrestError | null }>,
  context: Record<string, unknown> = {}
): Promise<T[]> {
  try {
    const { data, error } = await queryFn();

    if (error && !isNoRowsError(error)) {
      handleSupabaseError(error, context, false);
    }

    return data || [];
  } catch (err) {
    if (err instanceof InternalServerError) {
      throw err;
    }

    logger.logError('Unexpected error in array Supabase query', err as Error, context);
    throw new InternalServerError('Database operation failed');
  }
}
