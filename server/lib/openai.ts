// Centralized OpenAI operations with action-based naming conventions
// Each function represents a specific OpenAI API action
// Uses centralized configuration for API key and model names

import OpenAI from 'openai';
import { logger } from './logger';
import { InternalServerError } from './error-handler';
import { getConfig } from './config';
import { buildCharacterSystemPrompt, buildBookQASystemPrompt, buildQueryOptimizationPrompt } from './system-prompts';

let openaiClient: OpenAI | null = null;

/**
 * Get OpenAI client instance (lazy initialization)
 * Validates configuration on first access
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const config = getConfig();

    try {
      openaiClient = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerError(`Failed to initialize OpenAI client: ${message}`);
    }
  }

  return openaiClient;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Generate a character response based on character persona and conversation history */
export async function generateCharacterResponse(
  characterName: string,
  characterPersona: string,
  characterDescription: string,
  bookTitle: string,
  userMessage: string,
  conversationHistory: ConversationMessage[] = [],
  bookCategory?: string,
  ageGroup?: string
): Promise<string> {
  logger.logDebug('Generating character response', { characterName, bookTitle, bookCategory });

  try {
    const config = getConfig();
    const openai = getOpenAIClient();

    const isChildrenBook = bookCategory === 'children';
    const systemPrompt = buildCharacterSystemPrompt(
      characterName,
      characterPersona,
      characterDescription,
      bookTitle,
      isChildrenBook,
      ageGroup
    );

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    logger.logDebug('Calling OpenAI API for character chat', { characterName, messageCount: messages.length });

    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages,
      temperature: 0.8,
      max_tokens: 300,
    });

    const reply = response.choices[0]?.message?.content || '';

    logger.logSuccess('Character response generated', { characterName, responseLength: reply.length });
    return reply;
  } catch (error) {
    logger.logError('Error generating character response', error as Error, { characterName });
    throw error instanceof InternalServerError ? error : new InternalServerError('Failed to generate character response');
  }
}

/** Generate a character response with book context from semantic search */
export async function generateCharacterResponseWithContext(
  characterName: string,
  characterPersona: string,
  characterDescription: string,
  bookTitle: string,
  userMessage: string,
  relevantContext: string,
  conversationHistory: ConversationMessage[] = [],
  bookCategory?: string,
  ageGroup?: string
): Promise<string> {
  logger.logDebug('Generating character response with context', { characterName, bookTitle, bookCategory });

  try {
    const config = getConfig();
    const openai = getOpenAIClient();

    const isChildrenBook = bookCategory === 'children';
    const systemPrompt = buildCharacterSystemPrompt(
      characterName,
      characterPersona,
      characterDescription,
      bookTitle,
      isChildrenBook,
      ageGroup
    );

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: `Book Context:\n${relevantContext}\n\nUser Message: ${userMessage}` },
    ];

    logger.logDebug('Calling OpenAI API for character chat with context', { characterName, messageCount: messages.length });

    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages,
      temperature: 0.8,
      max_tokens: 300,
    });

    const reply = response.choices[0]?.message?.content || '';

    logger.logSuccess('Character response with context generated', { characterName, responseLength: reply.length });
    return reply;
  } catch (error) {
    logger.logError('Error generating character response with context', error as Error, { characterName });
    throw error instanceof InternalServerError ? error : new InternalServerError('Failed to generate character response');
  }
}

/** Generate an answer to a user question about a book with context from chunks */
export async function generateBookAnswer(
  bookTitle: string,
  userQuestion: string,
  relevantContext: string,
  conversationHistory: ConversationMessage[] = [],
  bookCategory?: string,
  ageGroup?: string
): Promise<string> {
  logger.logDebug('Generating book answer', { bookTitle, questionLength: userQuestion.length, bookCategory });

  try {
    const config = getConfig();
    const openai = getOpenAIClient();

    const isChildrenBook = bookCategory === 'children';
    const systemPrompt = buildBookQASystemPrompt(bookTitle, isChildrenBook, ageGroup);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: `Context from book:\n\n${relevantContext}\n\nQuestion: ${userQuestion}` },
    ];

    logger.logDebug('Calling OpenAI API for book Q&A', { bookTitle, messageCount: messages.length });

    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = response.choices[0]?.message?.content || '';

    logger.logSuccess('Book answer generated', { bookTitle, answerLength: answer.length });
    return answer;
  } catch (error) {
    logger.logError('Error generating book answer', error as Error, { bookTitle });
    throw error instanceof InternalServerError ? error : new InternalServerError('Failed to generate answer');
  }
}

/** Generate embeddings for semantic search (for future use with vector DB) */
export async function generateEmbeddings(text: string): Promise<number[]> {
  logger.logDebug('Generating embeddings', { textLength: text.length });

  try {
    const config = getConfig();
    const openai = getOpenAIClient();

    const response = await openai.embeddings.create({
      model: config.openaiEmbeddingModel,
      input: text,
    });

    const embeddings = response.data[0]?.embedding || [];

    logger.logSuccess('Embeddings generated', { embeddingLength: embeddings.length });
    return embeddings;
  } catch (error) {
    logger.logError('Error generating embeddings', error as Error);
    throw error instanceof InternalServerError ? error : new InternalServerError('Failed to generate embeddings');
  }
}

/** Check if OpenAI API is properly configured */
export function isOpenAIConfigured(): boolean {
  try {
    const config = getConfig();
    return !!config.openaiApiKey;
  } catch {
    return false;
  }
}

interface QueryOptimizationContext {
  type: 'book' | 'character';
  bookTitle: string;
  bookCategory?: string;
  ageGroup?: string;
  characterName?: string;
  characterPersona?: string;
}

/** Optimize user query for semantic search using OpenAI */
export async function optimizeQueryForSearch(
  question: string,
  conversationHistory: ConversationMessage[] = [],
  context?: QueryOptimizationContext
): Promise<string> {
  logger.logDebug('Optimizing query for search', {
    questionLength: question.length,
    contextType: context?.type,
    bookTitle: context?.bookTitle,
    bookCategory: context?.bookCategory,
  });

  try {
    const config = getConfig();
    const openai = getOpenAIClient();

    const isChildrenBook = context?.bookCategory === 'children';
    const systemPrompt = buildQueryOptimizationPrompt(context?.type || 'book', isChildrenBook);

    const sanitizedHistory = conversationHistory
      .map(entry => ({
        role: entry.role as 'user' | 'assistant',
        content: entry.content.trim(),
      }))
      .filter(entry => entry.content.length > 0)
      .slice(-4);

    // Build user content based on context type
    let userContent: string;

    if (context?.type === 'character') {
      userContent = `Book Title: ${context.bookTitle || 'Unknown'}
Character: ${context.characterName || 'Unknown'}
Character Traits: ${context.characterPersona || 'A character from the story'}
Conversation: ${sanitizedHistory.length > 0 ? sanitizedHistory.map(m => `${m.role}: ${m.content}`).join('\n') : '[empty]'}
User Message: ${question}`;
    } else {
      userContent = `Book Title: ${context?.bookTitle || 'Unknown'}
Conversation: ${sanitizedHistory.length > 0 ? sanitizedHistory.map(m => `${m.role}: ${m.content}`).join('\n') : '[empty]'}
User Question: ${question}`;
    }

    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    let optimizedQuery = response.choices[0]?.message?.content || question;

    // Clean up the query
    optimizedQuery = optimizedQuery
      .trim()
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`+/g, '')
      .replace(/^.*?:\s*/i, '')
      .replace(/^"(.*)"$/, '$1')
      .replace(/^'(.*)'$/, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    logger.logSuccess('Query optimized', {
      originalLength: question.length,
      optimizedLength: optimizedQuery.length,
      contextType: context?.type,
    });
    return optimizedQuery;
  } catch (error) {
    logger.logError('Error optimizing query', error as Error, { question });
    throw error instanceof InternalServerError ? error : new InternalServerError('Failed to optimize query');
  }
}

/**
 * Export the client getter for advanced usage
 * Note: Use specific functions above when possible
 */
export { getOpenAIClient };
