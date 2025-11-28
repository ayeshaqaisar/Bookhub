// GET /api/v1/admin/books - List all books with processing status

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { fetchAdminBookList } from '../lib/db';

/** Get all books with processing status for admin dashboard */
export async function handleGetAdminBooks(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/admin/books';

  try {
    logger.logRequest('GET', endpoint);
    
    logger.logDebug('Fetching admin book list');
    const books = await fetchAdminBookList();

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Admin books fetched successfully', { count: books.length });

    sendSuccess(res, books, 200, `Retrieved ${books.length} books`);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(500, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
