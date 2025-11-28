// PUT /api/v1/books/:bookId/favorite - Toggle book favorite status
// GET /api/v1/favorites - Fetch user's favorite books

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess, ValidationError } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { extractUserId, validateStringParam } from '../lib/request-helpers';
import { saveReadingProgress, fetchUserReadingProgress } from '../lib/db';

/** Toggle a book as favorite for the user */
export async function handleToggleFavorite(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/books/:bookId/favorite';

  try {
    logger.logRequest('PUT', endpoint);

    const userId = extractUserId(req);
    const { bookId } = req.params;
    const { isFavorite } = req.body as { isFavorite?: boolean };

    // Validate parameters
    const validBookId = validateStringParam(bookId, 'Book ID');
    if (typeof isFavorite !== 'boolean') {
      throw new ValidationError('isFavorite must be a boolean');
    }

    logger.logDebug('Toggling book favorite status', {
      userId,
      bookId: validBookId,
      isFavorite,
    });

    // Fetch existing reading progress to preserve data
    const existingProgress = await fetchUserReadingProgress(userId);
    const bookProgress = existingProgress.find((p: any) => p.book_id === validBookId);

    // Use existing values or defaults
    const percentComplete = bookProgress?.percent_complete || 0;
    const currentPage = bookProgress?.current_page;
    const status = bookProgress?.status || 'reading';
    const lastPosition = bookProgress?.last_position;

    // Update or create reading progress with favorite status
    const updatedProgress = await saveReadingProgress(
      userId,
      validBookId,
      percentComplete,
      currentPage,
      status,
      lastPosition,
      isFavorite
    );

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Book favorite status updated', {
      userId,
      bookId: validBookId,
      isFavorite,
    });

    sendSuccess(res, updatedProgress, 200, 'Favorite status updated successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error as any).statusCode || 500;
    logger.logResponse(statusCode, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}

/** Fetch all favorite books for the user */
export async function handleFetchFavorites(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/favorites';

  try {
    logger.logRequest('GET', endpoint);

    const userId = extractUserId(req);

    logger.logDebug('Fetching favorite books for user', { userId });

    // Fetch all reading progress and filter favorites
    const allProgress = await fetchUserReadingProgress(userId);
    const favorites = allProgress.filter((progress: any) => progress.is_favourite === true);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Favorite books fetched', {
      userId,
      count: favorites.length,
    });

    sendSuccess(
      res,
      favorites,
      200,
      `Retrieved ${favorites.length} favorite books`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error as any).statusCode || 500;
    logger.logResponse(statusCode, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
