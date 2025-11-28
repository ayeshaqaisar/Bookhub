import * as apiClient from '@/services/api-client';

export interface ReadingProgressPayload {
  userId: string;
  bookId: string;
  status?: "reading" | "completed" | "paused";
  currentPage?: number;
  percentComplete?: number;
  lastPosition?: Record<string, unknown> | null;
  bookmarks?: unknown[] | null;
  lastReadAt?: string;
  isFavourite?: boolean;
}

export async function fetchUserReadingProgress(): Promise<ReadingProgressPayload[]> {
  return apiClient.fetchUserReadingProgress();
}

export async function upsertReadingProgress(payload: ReadingProgressPayload): Promise<void> {
  await apiClient.saveReadingProgress(
    payload.bookId,
    payload.percentComplete || 0,
    payload.currentPage,
    payload.status || 'reading',
    payload.lastPosition || undefined,
    payload.isFavourite || false
  );
}
