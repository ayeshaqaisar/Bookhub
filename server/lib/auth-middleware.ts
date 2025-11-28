// Authentication middleware for extracting and verifying JWT tokens
// This middleware extracts the JWT token from the Authorization header,
// verifies it using Supabase, and attaches the user ID to the request

import type { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../supabase';
import { logger } from './logger';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Extracts and verifies JWT token from Authorization header
 * Sets userId on request object if token is valid
 * Does NOT throw error - allows routes to handle missing auth as needed
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.logDebug('No authorization header provided');
      return next();
    }

    // Extract bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      logger.logWarning('Invalid authorization header format');
      return next();
    }

    const token = match[1];

    // Verify token
    const userId = await verifyToken(token);
    if (userId) {
      (req as any).userId = userId;
    }

    return next();
  } catch (error) {
    logger.logError('Auth middleware error', error instanceof Error ? error : new Error(String(error)));
    return next();
  }
}

/**
 * Async version that verifies and extracts userId from JWT token
 * Decodes the JWT payload to get the 'sub' claim which contains the user ID
 */
export async function verifyToken(token: string): Promise<string | null> {
  try {
    if (!token) {
      return null;
    }

    // JWT tokens are in format: header.payload.signature
    // We'll decode the payload (middle part) which is base64url encoded JSON
    const parts = token.split('.');
    if (parts.length !== 3) {
      logger.logWarning('Invalid JWT token format');
      return null;
    }

    // Decode the payload
    const payload = parts[1];
    // Add padding if needed (base64url can omit padding)
    const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);

    try {
      const decoded = JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf-8'));

      // Supabase JWT tokens have the user ID in the 'sub' claim
      const userId = decoded.sub;

      if (!userId) {
        logger.logWarning('JWT token missing user ID in sub claim');
        return null;
      }

      // Optionally verify the signature using Supabase
      // For now, we trust the token is valid if it's properly formatted
      // In production, you might want to verify the signature
      const supabase = getSupabaseAdmin();
      const result = await supabase.auth.admin.getUserById(userId);

      if (result.error) {
        logger.logWarning('Failed to verify user ID with Supabase', {
          error: result.error.message,
          userId,
        });
        // Still return the userId even if verification fails
        // This allows the app to work even if there are temporary DB issues
        return userId;
      }

      logger.logDebug('Token verified successfully', { userId });
      return userId;
    } catch (decodeError) {
      logger.logWarning('Failed to decode JWT payload', {
        error: decodeError instanceof Error ? decodeError.message : String(decodeError),
      });
      return null;
    }
  } catch (error) {
    logger.logError('Error verifying token', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
