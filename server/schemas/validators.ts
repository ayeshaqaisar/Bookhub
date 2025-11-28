// Validation helpers for request/response data without Zod

import { ValidationError } from '../lib/error-handler';
import { CreateCharacterChatRequest, BookQueryRequest, CreateReadingProgressRequest, CreateBookReviewRequest, UpdateBookReviewRequest } from './types';

export function validateCharacterChatRequest(data: unknown): CreateCharacterChatRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const body = data as Record<string, unknown>;

  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    throw new ValidationError('Message is required and must be a non-empty string');
  }

  if (body.conversation_history && !Array.isArray(body.conversation_history)) {
    throw new ValidationError('Conversation history must be an array');
  }

  return {
    message: (body.message as string).trim(),
    conversation_history: (body.conversation_history as Array<{role: string; content: string}>) || [],
  };
}

export function validateBookQueryRequest(data: unknown): BookQueryRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const body = data as Record<string, unknown>;

  if (!body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
    throw new ValidationError('Question is required and must be a non-empty string');
  }

  if (body.conversation_history && !Array.isArray(body.conversation_history)) {
    throw new ValidationError('Conversation history must be an array');
  }

  return {
    question: (body.question as string).trim(),
    conversation_history: (body.conversation_history as Array<{role: string; content: string}>) || [],
    bookTitle: typeof body.bookTitle === 'string' ? body.bookTitle : undefined,
  };
}

export function validateReadingProgressRequest(data: unknown): CreateReadingProgressRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const body = data as Record<string, unknown>;

  if (!body.book_id || typeof body.book_id !== 'string') {
    throw new ValidationError('book_id is required and must be a string');
  }

  if (typeof body.percent_complete !== 'number' || body.percent_complete < 0 || body.percent_complete > 100) {
    throw new ValidationError('percent_complete must be a number between 0 and 100');
  }

  const currentPage = body.current_page ? Number(body.current_page) : undefined;
  if (currentPage !== undefined && (!Number.isInteger(currentPage) || currentPage < 0)) {
    throw new ValidationError('current_page must be a non-negative integer');
  }

  const status = typeof body.status === 'string' ? body.status : 'reading';
  if (!['reading', 'completed', 'paused'].includes(status)) {
    throw new ValidationError('status must be one of: reading, completed, paused');
  }

  return {
    book_id: body.book_id as string,
    percent_complete: body.percent_complete as number,
    current_page: currentPage,
    status,
    last_position: typeof body.last_position === 'object' ? (body.last_position as Record<string, unknown>) : undefined,
    is_favourite: typeof body.is_favourite === 'boolean' ? body.is_favourite : false,
  };
}

export function validateStringParam(param: unknown, name: string): string {
  if (!param || typeof param !== 'string' || param.trim().length === 0) {
    throw new ValidationError(`${name} is required and must be a non-empty string`);
  }
  return param.trim();
}

export function validateObjectId(id: unknown, resourceName = 'ID'): string {
  const stringId = validateStringParam(id, resourceName);
  if (stringId.length < 1) {
    throw new ValidationError(`Invalid ${resourceName} format`);
  }
  return stringId;
}

export function validateCreateBookReviewRequest(data: unknown): CreateBookReviewRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const body = data as Record<string, unknown>;

  if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
    throw new ValidationError('rating is required and must be a number between 1 and 5');
  }

  const comment = typeof body.comment === 'string' ? body.comment.trim() : undefined;
  if (comment !== undefined && comment.length === 0) {
    throw new ValidationError('comment must be a non-empty string or not provided');
  }

  return {
    rating: body.rating as number,
    comment: comment || undefined,
  };
}

export function validateUpdateBookReviewRequest(data: unknown): UpdateBookReviewRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const body = data as Record<string, unknown>;
  const updates: UpdateBookReviewRequest = {};

  if (body.rating !== undefined) {
    if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
      throw new ValidationError('rating must be a number between 1 and 5');
    }
    updates.rating = body.rating as number;
  }

  if (body.comment !== undefined) {
    if (typeof body.comment === 'string') {
      const trimmedComment = body.comment.trim();
      if (trimmedComment.length === 0) {
        throw new ValidationError('comment must be a non-empty string');
      }
      updates.comment = trimmedComment;
    } else {
      throw new ValidationError('comment must be a string');
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('At least one field (rating or comment) must be provided for update');
  }

  return updates;
}
