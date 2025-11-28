// POST /api/v1/books/:bookId/characters/:characterId/chat - Handle character conversation with book context

import type { Request, Response } from 'express';
import { sendErrorResponse, sendSuccess } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { generateCharacterResponse, generateCharacterResponseWithContext, optimizeQueryForSearch } from '../lib/openai';
import { fetchBookById, fetchCharacterById } from '../lib/db';
import { validateCharacterChatRequest, validateObjectId } from '../schemas/validators';
import { CharacterChatResponse } from '../schemas/types';
import { getRelevantChunks, toAnswerContext } from '../utils/qa/chunks';
import { embedQuestion } from '../utils/qa/embeddings';

export async function handleCharacterChat(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { bookId, characterId } = req.params;
  const endpoint = `/api/v1/books/${bookId}/characters/${characterId}/chat`;

  try {
    // Log incoming request
    logger.logRequest('POST', endpoint);

    // Validate parameters
    const validBookId = validateObjectId(bookId, 'Book ID');
    const validCharacterId = validateObjectId(characterId, 'Character ID');

    // Validate request body
    const chatRequest = validateCharacterChatRequest(req.body);

    logger.logDebug('Processing character chat', {
      bookId: validBookId,
      characterId: validCharacterId,
      messageLength: chatRequest.message.length,
    });

    // Fetch book and character
    const book = await fetchBookById(validBookId);
    const character = await fetchCharacterById(validCharacterId, validBookId);

    // Optimize the user message for better semantic search with character context
    const optimizedQuery = await optimizeQueryForSearch(
      chatRequest.message,
      chatRequest.conversation_history,
      {
        type: 'character',
        bookTitle: book.title,
        bookCategory: book.category,
        ageGroup: book.age_group,
        characterName: character.name,
        characterPersona: character.persona,
      }
    );

    logger.logDebug('Optimized character query', { optimizedQuery });

    // Generate embeddings for the optimized query
    const queryEmbedding = await embedQuestion(optimizedQuery);

    // Find relevant chunks from the book for context
    const relevantChunks = await getRelevantChunks(validBookId, queryEmbedding, 4);

    logger.logDebug('Found relevant chunks for character', { chunkCount: relevantChunks.length });

    let characterResponse: string;

    // If relevant chunks found, generate response with context; otherwise use persona-only approach
    if (relevantChunks.length > 0) {
      const context = toAnswerContext(relevantChunks);

      characterResponse = await generateCharacterResponseWithContext(
        character.name,
        character.persona || 'a friendly character',
        character.short_description || 'a character from the story',
        book.title,
        chatRequest.message,
        context,
        chatRequest.conversation_history,
        book.category,
        book.age_group
      );
    } else {
      // Fallback to persona-only response if no chunks found
      logger.logWarning('No relevant chunks found for character chat', { bookId: validBookId });

      characterResponse = await generateCharacterResponse(
        character.name,
        character.persona || 'a friendly character',
        character.short_description || 'a character from the story',
        book.title,
        chatRequest.message,
        chatRequest.conversation_history,
        book.category,
        book.age_group
      );
    }

    // Prepare response
    const response: CharacterChatResponse = {
      character_id: characterId,
      message: characterResponse,
    };

    // Log response
    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Character chat completed successfully', {
      bookId: validBookId,
      characterId: validCharacterId,
      messageLength: characterResponse.length,
      usedContextChunks: relevantChunks.length > 0,
    });

    // Send response
    sendSuccess(res, response, 200, 'Character response generated');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
