import { getAccessToken } from './token-storage';

export interface BookReview {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

/** Get authorization header with current user's access token */
function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
}

/** Make API request with error handling */
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<T> {
  const url = `/api/v1${endpoint}`;
  const authHeaders = getAuthHeaders();

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = (data as any)?.error?.message || `API request failed with status ${response.status}`;
      console.error(`Failed to fetch reviews from ${endpoint}:`, errorMessage);
      throw new Error(errorMessage);
    }

    return (data as any).data as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`API request failed for ${endpoint}:`, message);
    throw error;
  }
}

/**
 * Fetch all reviews for a book
 */
export async function fetchBookReviews(bookId: string): Promise<BookReview[]> {
  try {
    const reviews = await apiRequest<BookReview[]>(
      `/books/${bookId}/reviews`,
      'GET'
    );
    return reviews || [];
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return [];
  }
}

/**
 * Fetch current user's review for a book (if they have one)
 */
export async function fetchUserBookReview(bookId: string): Promise<BookReview | null> {
  try {
    const review = await apiRequest<BookReview | null>(
      `/books/${bookId}/reviews/user`,
      'GET'
    );
    return review || null;
  } catch (error) {
    console.error('Failed to fetch user review:', error);
    return null;
  }
}

/**
 * Create a new review for a book
 */
export async function createBookReview(
  bookId: string,
  request: CreateReviewRequest
): Promise<BookReview> {
  try {
    const review = await apiRequest<BookReview>(
      `/books/${bookId}/reviews`,
      'POST',
      request
    );
    return review;
  } catch (error) {
    console.error('Failed to create review:', error);
    throw error;
  }
}

/**
 * Update an existing review
 */
export async function updateBookReview(
  bookId: string,
  reviewId: string,
  request: UpdateReviewRequest
): Promise<BookReview> {
  try {
    const review = await apiRequest<BookReview>(
      `/books/${bookId}/reviews/${reviewId}`,
      'PUT',
      request
    );
    return review;
  } catch (error) {
    console.error('Failed to update review:', error);
    throw error;
  }
}

/**
 * Delete a review
 */
export async function deleteBookReview(bookId: string, reviewId: string): Promise<void> {
  try {
    await apiRequest<void>(
      `/books/${bookId}/reviews/${reviewId}`,
      'DELETE'
    );
  } catch (error) {
    console.error('Failed to delete review:', error);
    throw error;
  }
}
