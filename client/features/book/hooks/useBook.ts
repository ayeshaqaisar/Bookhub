// Custom hook for book-related operations with action-based naming

import { useEffect, useState, useCallback } from 'react';
import * as apiClient from '@/services/api-client';
import { handleApiError, getErrorMessage } from '@/services/error-handler';
import { logger } from '@/services/logger';

interface UseBookResult {
  book: any | null;
  loading: boolean;
  error: string | null;
  actionFetchBook: (bookId: string) => Promise<void>;
  actionUpdateBook: (bookId: string, updates: Record<string, unknown>) => Promise<void>;
  actionRefreshBook: () => Promise<void>;
  actionClearError: () => void;
}

export function useBook(bookId?: string): UseBookResult {
  const [book, setBook] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionFetchBook = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      logger.logDebug('Fetching book', { bookId: id });
      const data = await apiClient.fetchBookById(id);
      setBook(data);
      logger.logSuccess('Book fetched successfully', { bookId: id });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      logger.logError('Failed to fetch book', err instanceof Error ? err : new Error(String(err)), { bookId: id });
    } finally {
      setLoading(false);
    }
  }, []);

  const actionUpdateBook = useCallback(async (id: string, updates: Record<string, unknown>) => {
    setLoading(true);
    setError(null);

    try {
      logger.logDebug('Updating book', { bookId: id });
      const updated = await apiClient.updateBook(id, updates);
      setBook(updated);
      logger.logSuccess('Book updated successfully', { bookId: id });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      logger.logError('Failed to update book', err instanceof Error ? err : new Error(String(err)), { bookId: id });
    } finally {
      setLoading(false);
    }
  }, []);

  const actionRefreshBook = useCallback(async () => {
    if (bookId) {
      await actionFetchBook(bookId);
    }
  }, [bookId, actionFetchBook]);

  const actionClearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch book when bookId changes
  useEffect(() => {
    if (bookId) {
      actionFetchBook(bookId);
    }
  }, [bookId, actionFetchBook]);

  return {
    book,
    loading,
    error,
    actionFetchBook,
    actionUpdateBook,
    actionRefreshBook,
    actionClearError,
  };
}
