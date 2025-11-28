// POST /api/v1/users - Create user with profile
// GET /api/v1/users/:userId/books-with-progress - Fetch books with user reading progress and favorite status

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess, ValidationError, UnauthorizedError } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { createUserProfile, fetchUserProfile, fetchBooksWithUserProgress } from '../lib/db';
import { validateStringParam } from '../schemas/validators';
import { extractUserId } from '../lib/request-helpers';
import type { UserProfile } from '../schemas/types';
import { getSupabaseAdmin } from '../supabase.js'; // your admin client


interface CreateUserPayload {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
}

/** Create user profile for newly registered users */
export async function handleCreateUser(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/users';

  try {
    logger.logRequest('POST', endpoint);

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      throw new ValidationError('Request body must be an object');
    }

    const { id, displayName, email, phone } = req.body as CreateUserPayload;

    // Validate required fields
    const validId = validateStringParam(id, 'User ID');
    const validName = validateStringParam(displayName, 'Display Name');
    const validEmail = validateStringParam(email, 'Email');

    if (!validEmail.includes('@')) {
      throw new ValidationError('Invalid email format');
    }

    logger.logDebug('Creating user profile', { userId: validId, email: validEmail });

    // Check if profile already exists
    const existingProfile = await fetchUserProfile(validId);
    if (existingProfile) {
      const duration = Date.now() - startTime;
      logger.logResponse(200, endpoint, duration);
      logger.logDebug('User profile already exists', { userId: validId });
      sendSuccess(res, existingProfile, 200, 'User profile already exists');
      return;
    }

    // Create user profile
    const userProfile: UserProfile = await createUserProfile(validId, validName, undefined, phone);

    const duration = Date.now() - startTime;
    logger.logResponse(201, endpoint, duration);
    logger.logSuccess('User profile created', { userId: validId });

    sendSuccess(res, userProfile, 201, 'User profile created successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}

/** Fetch user profile by ID (used after login) */
export async function handleFetchUserProfile(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/users/profile';

  try {
    logger.logRequest('GET', endpoint);

    const { id } = req.params;
    const userId = validateStringParam(id, 'User ID');

    logger.logDebug('Fetching user profile', { userId });

    const userProfile = await fetchUserProfile(userId);

    if (!userProfile) {
      const duration = Date.now() - startTime;
      logger.logResponse(404, endpoint, duration);
      logger.logWarning('User profile not found', { userId });
      sendErrorResponse(res, new Error('User profile not found'), { endpoint });
      return;
    }

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('User profile fetched', { userId });

    sendSuccess(res, userProfile, 200, 'User profile fetched successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}

/** Fetch all completed books with user's reading progress and favorite status */
export async function handleFetchBooksWithProgress(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/users/:userId/books-with-progress';

  try {
    logger.logRequest('GET', endpoint);

    // Get authenticated user ID
    const authenticatedUserId = extractUserId(req);

    // Get the requested user ID from params
    const { userId } = req.params;
    const requestedUserId = validateStringParam(userId, 'User ID');

    // Only allow users to fetch their own books (unless admin)
    if (authenticatedUserId !== requestedUserId) {
      const duration = Date.now() - startTime;
      logger.logResponse(403, endpoint, duration);
      logger.logWarning('Unauthorized access attempt to user books', {
        authenticatedUserId,
        requestedUserId,
      });
      throw new UnauthorizedError('You can only access your own books');
    }

    logger.logDebug('Fetching books with reading progress', { userId: requestedUserId });

    // Fetch books with user progress
    const booksWithProgress = await fetchBooksWithUserProgress(requestedUserId);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Books with progress fetched', {
      userId: requestedUserId,
      count: booksWithProgress.length,
    });

    sendSuccess(
      res,
      booksWithProgress,
      200,
      `Retrieved ${booksWithProgress.length} books with reading progress`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error as any).statusCode || 500;
    logger.logResponse(statusCode, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}


export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Use Supabase Admin client to generate a login token
    const supabase = getSupabaseAdmin();

    // Supabase Admin cannot directly do "signInWithPassword" but you can use REST
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY as string, // service role
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error || 'Login failed' });
    }

    // Return session info to frontend
    return res.status(200).json({ session: data });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
