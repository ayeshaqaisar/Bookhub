// GET /api/v1/books/:bookId/chunks - Get all chunks for a book

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { fetchBookById, fetchChunksByBookId } from '../lib/db';
import { validateObjectId } from '../schemas/validators';

/** Fetch all chunks for a specific book */
export async function handleGetChunks(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { bookId } = req.params;
  const endpoint = `/api/v1/books/${bookId}/chunks`;

  try {
    logger.logRequest('GET', endpoint);

    // Validate book ID
    const validBookId = validateObjectId(bookId, 'Book ID');

    logger.logDebug('Fetching chunks for book', { bookId: validBookId });

    // Verify book exists
    await fetchBookById(validBookId);

    // Fetch chunks
    const chunks = await fetchChunksByBookId(validBookId);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Chunks fetched', {
      bookId: validBookId,
      chunkCount: chunks.length,
    });

    sendSuccess(res, chunks, 200, `Retrieved ${chunks.length} chunks`);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
