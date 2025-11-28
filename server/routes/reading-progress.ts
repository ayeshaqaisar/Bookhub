// POST /api/v1/reading-progress - Save user reading progress
// GET /api/v1/reading-progress - Fetch user reading progress

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { extractUserId } from '../lib/request-helpers';
import { saveReadingProgress, fetchUserReadingProgress } from '../lib/db';
import { validateReadingProgressRequest } from '../schemas/validators';

/** Save or update user's reading progress for a book */
export async function handleSaveReadingProgress(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/reading-progress';

  try {
    logger.logRequest('POST', endpoint);

    // Get user ID - throws UnauthorizedError if not authenticated
    const userId = extractUserId(req);

    // Validate request body
    const progressRequest = validateReadingProgressRequest(req.body);

    logger.logDebug('Saving reading progress', {
      userId,
      bookId: progressRequest.book_id,
      percentComplete: progressRequest.percent_complete,
    });

    // Save reading progress
    const savedProgress = await saveReadingProgress(
      userId,
      progressRequest.book_id,
      progressRequest.percent_complete,
      progressRequest.current_page,
      progressRequest.status,
      progressRequest.last_position,
      progressRequest.is_favourite
    );

    const duration = Date.now() - startTime;
    logger.logResponse(201, endpoint, duration);
    logger.logSuccess('Reading progress saved', {
      userId,
      bookId: progressRequest.book_id,
      percentComplete: progressRequest.percent_complete,
    });

    sendSuccess(res, savedProgress, 201, 'Reading progress saved successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error as any).statusCode || 500;
    logger.logResponse(statusCode, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}

/** Fetch all reading progress for the authenticated user */
export async function handleFetchUserReadingProgress(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/reading-progress';

  try {
    logger.logRequest('GET', endpoint);

    // Get user ID - throws UnauthorizedError if not authenticated
    const userId = extractUserId(req);

    logger.logDebug('Fetching reading progress for user', { userId });

    // Fetch all reading progress for user
    const readingProgress = await fetchUserReadingProgress(userId);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Reading progress fetched', {
      userId,
      count: readingProgress.length,
    });

    sendSuccess(
      res,
      readingProgress,
      200,
      `Retrieved ${readingProgress.length} reading progress entries`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error as any).statusCode || 500;
    logger.logResponse(statusCode, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
