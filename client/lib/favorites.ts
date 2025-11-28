import { getAccessToken } from './token-storage';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export interface FavoriteBook {
  id: string;
  user_id: string;
  book_id: string;
  is_favourite: boolean;
  percent_complete: number;
  status: string;
  created_at: string;
  updated_at: string;
  booksdetails?: {
    id: string;
    title: string;
    author: string;
    cover_url?: string;
    description?: string;
    genre?: string;
  };
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
  method: 'GET' | 'PUT',
  body?: unknown
): Promise<T> {
  const url = `${BACKEND_URL}/api/v1${endpoint}`;
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = (error as any).message || `API request failed with status ${response.status}`;
      console.error(`Failed to fetch favorites from ${endpoint}:`, message);
      throw new Error(message);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`API request failed for ${endpoint}:`, message);
    throw new Error(message);
  }
}

/** Toggle a book as favorite */
export async function toggleFavorite(bookId: string, isFavorite: boolean): Promise<FavoriteBook> {
  return apiRequest(
    `/books/${bookId}/favorite`,
    'PUT',
    { isFavorite }
  );
}

/** Fetch all favorite books for the current user */
export async function fetchFavorites(): Promise<FavoriteBook[]> {
  return apiRequest(
    '/favorites',
    'GET'
  );
}
