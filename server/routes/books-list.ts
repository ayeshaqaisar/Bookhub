// GET /api/v1/books - List all books
// GET /api/v1/books/:id - Get single book

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { fetchAllBooks, fetchBookById, fetchCharactersByBookId, fetchChunksByBookId } from '../lib/db';
import { validateObjectId } from '../schemas/validators';
import { enrichBookMedia } from '../services/bookMedia';

/** List all books with optional status filtering */
export async function handleListBooks(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/books';

  try {
    logger.logRequest('GET', endpoint);

    const status = req.query.status ? String(req.query.status) : 'completed';
    
    logger.logDebug('Fetching books list', { status });
    const books = await fetchAllBooks(status);

    // Enrich with media URLs
    const enrichedBooks = books.map(enrichBookMedia);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Books fetched successfully', { count: enrichedBooks.length, status });

    sendSuccess(res, enrichedBooks, 200, `Retrieved ${enrichedBooks.length} books`);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(500, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}

/** Get single book with characters and chapters */
export async function handleGetBook(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { id } = req.params;
  const endpoint = `/api/v1/books/${id}`;

  try {
    logger.logRequest('GET', endpoint);

    // Validate book ID
    const validId = validateObjectId(id, 'Book ID');

    logger.logDebug('Fetching book details', { bookId: validId });

    // Fetch book
    const book = await fetchBookById(validId);

    // Enrich with media
    const enrichedBook = enrichBookMedia(book);

    // Fetch related characters if fiction or children's book with characters
    const shouldFetchCharacters = book.category === 'fiction' || (book.category === 'children' && book.has_characters);
    if (shouldFetchCharacters) {
      try {
        const characters = await fetchCharactersByBookId(validId);
        (enrichedBook as any).characters = characters;
      } catch (err) {
        logger.logDebug('Characters not available for book', { bookId: validId });
        (enrichedBook as any).characters = [];
      }
    }

    // Fetch chunks (optional - may not exist for all books)
    let chunks: any[] = [];
    try {
      chunks = await fetchChunksByBookId(validId);
      (enrichedBook as any).chunks = chunks;
    } catch (err) {
      logger.logDebug('Chunks not available for book', { bookId: validId });
      (enrichedBook as any).chunks = [];
    }

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Book details fetched', {
      bookId: validId,
      hasCharacters: !!(enrichedBook as any).characters,
      chunkCount: chunks.length,
    });

    sendSuccess(res, enrichedBook, 200, 'Book retrieved successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
