// Book Reviews API Endpoints
// GET    /api/v1/books/:bookId/reviews        - Get all reviews for a book
// GET    /api/v1/books/:bookId/reviews/user   - Get current user's review for a book
// POST   /api/v1/books/:bookId/reviews        - Create a review
// PUT    /api/v1/books/:bookId/reviews/:id    - Update a review
// DELETE /api/v1/books/:bookId/reviews/:id    - Delete a review

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess, NotFoundError, ValidationError } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { extractUserId, validateObjectId } from '../lib/request-helpers';
import {
  fetchBookReviews,
  fetchUserBookReview,
  createBookReview,
  updateBookReview,
  deleteBookReview,
  fetchBookById,
} from '../lib/db';
import { validateCreateBookReviewRequest, validateUpdateBookReviewRequest } from '../schemas/validators';
import type { BookReview } from '../schemas/types';

/** Get all reviews for a book */
export async function handleGetBookReviews(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = `/api/v1/books/${req.params.bookId}/reviews`;

  try {
    logger.logRequest('GET', endpoint);

    const bookId = validateObjectId(req.params.bookId, 'Book ID');

    // Verify book exists
    await fetchBookById(bookId);

    logger.logDebug('Fetching reviews for book', { bookId });
    const reviews = await fetchBookReviews(bookId);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    sendSuccess(res, reviews, 200, 'Reviews fetched successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(500, endpoint, duration);
    sendErrorResponse(res, error);
  }
}

/** Get current user's review for a book */
export async function handleGetUserBookReview(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = `/api/v1/books/${req.params.bookId}/reviews/user`;

  try {
    logger.logRequest('GET', endpoint);

    const userId = extractUserId(req);

    const bookId = validateObjectId(req.params.bookId, 'Book ID');

    // Verify book exists
    await fetchBookById(bookId);

    logger.logDebug('Fetching user review for book', { userId, bookId });
    const review = await fetchUserBookReview(userId, bookId);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    sendSuccess(res, review, 200, review ? 'Review found' : 'No review found');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(500, endpoint, duration);
    sendErrorResponse(res, error);
  }
}

/** Create a new review for a book */
export async function handleCreateBookReview(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = `/api/v1/books/${req.params.bookId}/reviews`;

  try {
    logger.logRequest('POST', endpoint);

    const userId = extractUserId(req);

    const bookId = validateObjectId(req.params.bookId, 'Book ID');

    // Verify book exists
    await fetchBookById(bookId);

    // Validate request body
    const reviewRequest = validateCreateBookReviewRequest(req.body);

    logger.logDebug('Creating review for book', {
      userId,
      bookId,
      rating: reviewRequest.rating,
    });

    const review = await createBookReview(userId, bookId, reviewRequest.rating, reviewRequest.comment);

    const duration = Date.now() - startTime;
    logger.logResponse(201, endpoint, duration);
    logger.logSuccess('Review created', { reviewId: review.id, userId, bookId });
    sendSuccess(res, review, 201, 'Review created successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(500, endpoint, duration);
    
    if (error instanceof Error && error.message === 'User already has a review for this book') {
      return sendErrorResponse(res, new ValidationError(error.message));
    }
    
    sendErrorResponse(res, error);
  }
}

/** Update an existing review */
export async function handleUpdateBookReview(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = `/api/v1/books/${req.params.bookId}/reviews/${req.params.id}`;

  try {
    logger.logRequest('PUT', endpoint);

    const userId = extractUserId(req);

    const bookId = validateObjectId(req.params.bookId, 'Book ID');
    const reviewId = validateObjectId(req.params.id, 'Review ID');

    // Verify book exists
    await fetchBookById(bookId);

    // Validate request body
    const updateRequest = validateUpdateBookReviewRequest(req.body);

    logger.logDebug('Updating review', {
      userId,
      bookId,
      reviewId,
      updates: updateRequest,
    });

    const review = await updateBookReview(reviewId, userId, updateRequest);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Review updated', { reviewId, userId });
    sendSuccess(res, review, 200, 'Review updated successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(500, endpoint, duration);
    sendErrorResponse(res, error);
  }
}

/** Delete a review */
export async function handleDeleteBookReview(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = `/api/v1/books/${req.params.bookId}/reviews/${req.params.id}`;

  try {
    logger.logRequest('DELETE', endpoint);

    const userId = extractUserId(req);

    const bookId = validateObjectId(req.params.bookId, 'Book ID');
    const reviewId = validateObjectId(req.params.id, 'Review ID');

    // Verify book exists
    await fetchBookById(bookId);

    logger.logDebug('Deleting review', { userId, bookId, reviewId });

    await deleteBookReview(reviewId, userId);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Review deleted', { reviewId, userId });
    sendSuccess(res, null, 200, 'Review deleted successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(500, endpoint, duration);
    sendErrorResponse(res, error);
  }
}
