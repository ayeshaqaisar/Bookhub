// Custom hook for books list operations with action-based naming

import { useEffect, useState, useCallback } from 'react';
import * as apiClient from '@/services/api-client';
import { handleApiError, getErrorMessage } from '@/services/error-handler';
import { logger } from '@/services/logger';
import { useAuth } from '@/contexts/AuthContext';

interface UseBookListResult {
  books: any[];
  loading: boolean;
  error: string | null;
  actionFetchBooks: (status?: string) => Promise<void>;
  actionFetchBooksWithProgress: (userId?: string) => Promise<void>;
  actionRefreshBooks: () => Promise<void>;
  actionClearError: () => void;
}

export function useBooksList(): UseBookListResult {
  const { user } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState('completed');
  const [useMergedApi, setUseMergedApi] = useState(false);

  const actionFetchBooks = useCallback(async (status: string = 'completed') => {
    setLoading(true);
    setError(null);
    setCurrentStatus(status);
    setUseMergedApi(false);

    try {
      logger.logDebug('Fetching books list', { status });
      const data = await apiClient.fetchAllBooks(status);
      setBooks(data);
      logger.logSuccess('Books list fetched', { count: data.length, status });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      logger.logError('Failed to fetch books', err instanceof Error ? err : new Error(String(err)), { status });
    } finally {
      setLoading(false);
    }
  }, []);

  const actionFetchBooksWithProgress = useCallback(async (userId?: string) => {
    setLoading(true);
    setError(null);
    setUseMergedApi(true);

    const requestUserId = userId || user?.id;
    if (!requestUserId) {
      setError('User ID not available');
      setLoading(false);
      return;
    }

    try {
      logger.logDebug('Fetching books with progress', { userId: requestUserId });
      const data = await apiClient.fetchBooksWithProgress(requestUserId);
      setBooks(data);
      logger.logSuccess('Books with progress fetched', { count: data.length, userId: requestUserId });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      logger.logError('Failed to fetch books with progress', err instanceof Error ? err : new Error(String(err)), { userId: requestUserId });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const actionRefreshBooks = useCallback(async () => {
    if (useMergedApi) {
      await actionFetchBooksWithProgress();
    } else {
      await actionFetchBooks(currentStatus);
    }
  }, [currentStatus, actionFetchBooks, useMergedApi, actionFetchBooksWithProgress]);

  const actionClearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch books on mount - use merged API if user is authenticated
  useEffect(() => {
    if (user?.id) {
      actionFetchBooksWithProgress(user.id);
    } else {
      actionFetchBooks();
    }
  }, [user?.id, actionFetchBooksWithProgress, actionFetchBooks]);

  return {
    books,
    loading,
    error,
    actionFetchBooks,
    actionFetchBooksWithProgress,
    actionRefreshBooks,
    actionClearError,
  };
}
