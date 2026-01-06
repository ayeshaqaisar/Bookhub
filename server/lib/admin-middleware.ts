// Admin role verification middleware
// Ensures user is authenticated and has admin role before accessing protected endpoints

import type { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../supabase';
import { ForbiddenError, UnauthorizedError } from './error-handler';
import { logger } from './logger';

/**
 * Verify user has admin role
 * Must be used after authMiddleware
 * Requires userId to be set on request object
 */
export async function adminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // Check if user is authenticated
    if (!userId) {
      logger.logWarning('Admin endpoint accessed without authentication');
      throw new UnauthorizedError('Authentication required to access admin resources');
    }

    // Fetch user profile to check role
    const supabase = getSupabaseAdmin();
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('user_role')
      .eq('id', userId)
      .single();

    if (error) {
      logger.logWarning('Failed to fetch user profile for admin check', {
        userId,
        error: error.message,
      });
      throw new ForbiddenError('Failed to verify admin status');
    }

    if (!userProfile || userProfile.user_role !== 'admin') {
      logger.logWarning('Non-admin user attempted to access admin resource', {
        userId,
        userRole: userProfile?.user_role || 'user',
      });
      throw new ForbiddenError('Admin access required to access this resource');
    }

    logger.logDebug('Admin authorization verified', { userId });
    return next();
  } catch (error) {
    // If it's already an AppError (ForbiddenError or UnauthorizedError), pass it along
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return next(error);
    }

    logger.logError('Admin middleware error', error instanceof Error ? error : new Error(String(error)), {
      userId: (req as any).userId,
    });
    return next(new ForbiddenError('Access denied'));
  }
}
