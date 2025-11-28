// GET /api/v1/books/:bookId/characters - Get all characters for a book

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { fetchBookById, fetchCharactersByBookId } from '../lib/db';
import { validateObjectId } from '../schemas/validators';

/** Fetch all characters for a specific book */
export async function handleGetCharacters(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { bookId } = req.params;
  const endpoint = `/api/v1/books/${bookId}/characters`;

  try {
    logger.logRequest('GET', endpoint);

    // Validate book ID
    const validBookId = validateObjectId(bookId, 'Book ID');

    logger.logDebug('Fetching characters for book', { bookId: validBookId });

    // Verify book exists
    await fetchBookById(validBookId);

    // Fetch characters
    const characters = await fetchCharactersByBookId(validBookId);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Characters fetched', {
      bookId: validBookId,
      characterCount: characters.length,
    });

    sendSuccess(res, characters, 200, `Retrieved ${characters.length} characters`);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
