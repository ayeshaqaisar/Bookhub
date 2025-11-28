// Custom hook for character-related operations with action-based naming

import { useEffect, useState, useCallback } from 'react';
import * as apiClient from '@/services/api-client';
import { handleApiError, getErrorMessage } from '@/services/error-handler';
import { logger } from '@/services/logger';

interface CharacterMessage {
  id: string;
  role: 'user' | 'character';
  sender: string;
  content: string;
  createdAt: Date;
}

interface UseCharacterResult {
  characters: any[];
  loading: boolean;
  error: string | null;
  conversation: CharacterMessage[];
  isMessageSending: boolean;
  actionFetchCharacters: (bookId: string) => Promise<void>;
  actionSendMessage: (bookId: string, characterId: string, message: string) => Promise<void>;
  actionClearConversation: () => void;
  actionClearError: () => void;
}

export function useCharacter(): UseCharacterResult {
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<CharacterMessage[]>([]);
  const [isMessageSending, setIsMessageSending] = useState(false);

  const actionFetchCharacters = useCallback(async (bookId: string) => {
    setLoading(true);
    setError(null);

    try {
      logger.logDebug('Fetching characters', { bookId });
      const data = await apiClient.fetchCharactersByBookId(bookId);
      setCharacters(data);
      logger.logSuccess('Characters fetched', { bookId, count: data.length });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      logger.logError('Failed to fetch characters', err instanceof Error ? err : new Error(String(err)), { bookId });
    } finally {
      setLoading(false);
    }
  }, []);

  const actionSendMessage = useCallback(async (bookId: string, characterId: string, message: string) => {
    if (!message.trim()) return;

    setIsMessageSending(true);
    setError(null);

    try {
      // Add user message to conversation
      const userMessage: CharacterMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        sender: 'You',
        content: message,
        createdAt: new Date(),
      };
      setConversation(prev => [...prev, userMessage]);

      logger.logDebug('Sending message to character', { bookId, characterId, messageLength: message.length });

      // Build conversation history
      const conversationHistory = conversation.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      // Send message
      const response = await apiClient.sendCharacterMessage(
        bookId,
        characterId,
        message,
        conversationHistory
      );

      // Add character response
      const characterMessage: CharacterMessage = {
        id: `char-${Date.now()}`,
        role: 'character',
        sender: 'Character',
        content: response.message,
        createdAt: new Date(),
      };
      setConversation(prev => [...prev, characterMessage]);

      logger.logSuccess('Character response received', { characterId, responseLength: response.message.length });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      logger.logError('Failed to send message', err instanceof Error ? err : new Error(String(err)), { bookId, characterId });
    } finally {
      setIsMessageSending(false);
    }
  }, [conversation]);

  const actionClearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  const actionClearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    characters,
    loading,
    error,
    conversation,
    isMessageSending,
    actionFetchCharacters,
    actionSendMessage,
    actionClearConversation,
    actionClearError,
  };
}
