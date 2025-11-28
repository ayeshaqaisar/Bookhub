// Custom hook for book Q&A operations with action-based naming

import { useState, useCallback } from 'react';
import * as apiClient from '@/services/api-client';
import { handleApiError, getErrorMessage } from '@/services/error-handler';
import { logger } from '@/services/logger';

interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  sources?: Array<{
    chunk_id: string;
    chapter_number?: number;
    page_number?: number;
    chapter_heading?: string;
  }>;
}

interface UseBookQAResult {
  messages: QAMessage[];
  loading: boolean;
  error: string | null;
  actionAskQuestion: (bookId: string, question: string) => Promise<void>;
  actionClearHistory: () => void;
  actionClearError: () => void;
}

const GREETING_MESSAGE: QAMessage = {
  id: 'greeting',
  role: 'assistant',
  content: 'Hi, how can I help you today?',
  createdAt: new Date(),
};

export function useBookQA(): UseBookQAResult {
  const [messages, setMessages] = useState<QAMessage[]>([GREETING_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionAskQuestion = useCallback(async (bookId: string, question: string) => {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Add user question
      const userMessage: QAMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: question,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      logger.logDebug('Asking book question', { bookId, questionLength: question.length });

      // Build conversation history
      const conversationHistory = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Send question
      const response = await apiClient.askBookQuestion(
        bookId,
        question,
        conversationHistory
      );

      // Add assistant response
      const assistantMessage: QAMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        createdAt: new Date(),
        sources: response.sources,
      };
      setMessages(prev => [...prev, assistantMessage]);

      logger.logSuccess('Answer received', { bookId, answerLength: response.answer.length, sourceCount: response.sources?.length || 0 });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      logger.logError('Failed to get answer', err instanceof Error ? err : new Error(String(err)), { bookId });
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const actionClearHistory = useCallback(() => {
    setMessages([GREETING_MESSAGE]);
    setError(null);
  }, []);

  const actionClearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    actionAskQuestion,
    actionClearHistory,
    actionClearError,
  };
}
