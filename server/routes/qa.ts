// POST /api/v1/books/:id/qa - Answer questions about a book

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { optimizeQueryForSearch, generateBookAnswer } from '../lib/openai';
import { validateBookQueryRequest, validateObjectId } from '../schemas/validators';
import { getRelevantChunks, toAnswerContext, formatSources } from '../utils/qa/chunks';
import { embedQuestion } from '../utils/qa/embeddings';
import { fetchBookById } from '../lib/db';

/** Answer a question about a book using semantic search and AI */
export async function handleBookQA(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { bookId } = req.params;
  const endpoint = `/api/v1/books/${bookId}/qa`;

  try {
    logger.logRequest('POST', endpoint);

    // Validate book ID
    const validBookId = validateObjectId(bookId, 'Book ID');

    // Validate request body
    const qaRequest = validateBookQueryRequest(req.body);

    logger.logDebug('Processing book Q&A', {
      bookId: validBookId,
      questionLength: qaRequest.question.length,
    });

    // Fetch book details to get category and age_group
    const book = await fetchBookById(validBookId);

    // Optimize the user query for better semantic search with book context
    const optimizedQuery = await optimizeQueryForSearch(
      qaRequest.question,
      qaRequest.conversation_history,
      {
        type: 'book',
        bookTitle: qaRequest.bookTitle || book.title || 'Unknown',
        bookCategory: book.category,
        ageGroup: book.age_group,
      }
    );

    logger.logDebug('Embedding optimized query', { optimizedQuery });

    // Generate embeddings for the query
    const queryEmbedding = await embedQuestion(optimizedQuery);

    // Find relevant chunks from the book
    const relevantChunks = await getRelevantChunks(validBookId, queryEmbedding, 5);

    // If no relevant chunks found, return helpful message
    if (relevantChunks.length === 0) {
      logger.logWarning('No relevant chunks found', { bookId: validBookId });

      const duration = Date.now() - startTime;
      logger.logResponse(200, endpoint, duration);

      sendSuccess(
        res,
        {
          answer: "I couldn't find relevant excerpts in this book. Try rephrasing your question or ensure the book has been fully processed.",
          sources: [],
        },
        200,
        'No relevant content found'
      );
      return;
    }

    logger.logDebug('Found relevant chunks', { chunkCount: relevantChunks.length });

    // Convert chunks to context for the AI
    const context = toAnswerContext(relevantChunks);

    // Generate answer using AI
    const answer = await generateBookAnswer(
      qaRequest.bookTitle || book.title || 'the book',
      qaRequest.question,
      context,
      qaRequest.conversation_history,
      book.category,
      book.age_group
    );

    // Format sources for response
    const sources = formatSources(relevantChunks);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Q&A completed', {
      bookId: validBookId,
      answerLength: answer.length,
      sourceCount: sources.length,
    });

    sendSuccess(
      res,
      {
        answer,
        sources,
      },
      200,
      'Answer generated successfully'
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
