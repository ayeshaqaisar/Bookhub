// Centralized API client service with action-based method naming
// All API calls should go through this service for consistency and error handling

import { logger } from './logger';
import { ApiError } from './error-handler';
import { getBackendClient } from '@/lib/backendClient';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


const API_PREFIX = `${BACKEND_URL}/api/v1`;

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  requiresAuth?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Get authorization header with current user's access token */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    // Try to get token from local storage first (new server-side auth)
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('bookhub_access_token');
      if (token) {
        return {
          Authorization: `Bearer ${token}`,
        };
      }
    }

    // Fallback to Supabase session (for backward compatibility)
    const supabase = getBackendClient();
    const { data } = await supabase.auth.getSession();

    if (data?.session?.access_token) {
      return {
        Authorization: `Bearer ${data.session.access_token}`,
      };
    }
  } catch (error) {
    logger.logDebug('Failed to get auth token', error instanceof Error ? { error: error.message } : {});
  }

  return {};
}

/** Core fetch wrapper with error handling and logging */
async function fetchWithErrorHandling<T>(
  endpoint: string,
  config: RequestConfig
): Promise<T> {
  const url = `${API_PREFIX}${endpoint}`;
  const startTime = Date.now();

  try {
    logger.logRequest(config.method, endpoint);

    // Get auth headers if needed
    const authHeaders = config.requiresAuth !== false ? await getAuthHeaders() : {};

    const response = await fetch(url, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...config.headers,
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    const duration = Date.now() - startTime;
    let responseData: ApiResponse<T>;

    // Try to parse response as JSON
    const contentType = response.headers.get('content-type') || '';
    const isJsonResponse = contentType.includes('application/json');

    try {
      let responseText = '';

      try {
        responseText = await response.text();
      } catch (textError) {
        logger.logWarning(`Failed to read response body from ${endpoint}`, {
          endpoint,
          status: response.status,
          error: textError instanceof Error ? textError.message : String(textError),
        });

        responseText = '';
      }

      if (isJsonResponse && responseText.trim().length > 0) {
        try {
          responseData = JSON.parse(responseText);
        } catch (jsonError) {
          logger.logWarning(`Invalid JSON response from ${endpoint}`, {
            endpoint,
            status: response.status,
            bodyPreview: responseText.substring(0, 100),
          });

          responseData = {
            success: response.ok,
            data: null as any,
            error: {
              code: 'INVALID_RESPONSE',
              message: responseText || response.statusText,
            },
          };
        }
      } else {
        // If not JSON or empty body, create a response object based on status
        if (!isJsonResponse) {
          logger.logWarning(`Non-JSON response from ${endpoint}`, {
            endpoint,
            status: response.status,
            contentType,
          });
        }

        responseData = {
          success: response.ok,
          data: null as any,
          error: {
            code: response.ok ? 'SUCCESS' : 'INVALID_RESPONSE',
            message: responseText || response.statusText,
          },
        };
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      logger.logError(`Failed to parse response from ${endpoint}`, new Error(errorMessage), {
        endpoint,
        status: response.status,
        contentType,
      });

      throw new ApiError(
        response.status,
        `Failed to parse server response: ${errorMessage}`,
        'INVALID_RESPONSE'
      );
    }

    logger.logResponse(response.status, endpoint, duration);

    if (!response.ok) {
      const error = responseData.error || {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      };
      logger.logError(`API error ${response.status}: ${error.code}`, new Error(error.message), {
        endpoint,
        status: response.status,
        code: error.code,
        details: error.details,
      });
      throw new ApiError(response.status, error.message, error.code, error.details);
    }

    logger.logSuccess(`${config.method} ${endpoint} completed`, {
      status: response.status,
    });

    return responseData.data;
  } catch (error) {
    if (error instanceof ApiError) {
      logger.logError(`API error: ${error.message}`, new Error(error.message), {
        endpoint,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      });
      throw error;
    }

    const fetchError = error instanceof Error ? error : new Error(String(error));
    logger.logError(`Request failed: ${endpoint}`, fetchError, {
      endpoint,
      errorType: fetchError.constructor.name,
    });
    throw new ApiError(500, `Network request failed: ${fetchError.message}`, 'NETWORK_ERROR', {
      originalError: fetchError.message,
    });
  }
}

// ============ BOOK OPERATIONS ============

export async function fetchAllBooks(status: string = 'completed'): Promise<any[]> {
  return fetchWithErrorHandling(`/books?status=${status}`, { method: 'GET' });
}

export async function fetchBookById(bookId: string): Promise<any> {
  return fetchWithErrorHandling(`/books/${bookId}`, { method: 'GET' });
}

export async function uploadBook(bookData: FormData): Promise<any> {
  const url = `${API_PREFIX}/books`;

  try {
    logger.logRequest('POST', '/books');

    const response = await fetch(url, {
      method: 'POST',
      body: bookData,
    });

    const duration = Date.now();
    logger.logResponse(response.status, '/books', 0);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || 'Upload failed', 'UPLOAD_ERROR');
    }

    const result = await response.json();
    logger.logSuccess('Book uploaded successfully', { bookId: result.id });
    return result.data || result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const fetchError = error instanceof Error ? error : new Error(String(error));
    logger.logError('Book upload failed', fetchError, { endpoint: '/books' });
    throw new ApiError(500, 'Failed to upload book', 'UPLOAD_ERROR');
  }
}

export async function updateBook(bookId: string, updates: Record<string, unknown>): Promise<any> {
  return fetchWithErrorHandling(`/books/${bookId}`, { method: 'PUT', body: updates });
}

// ============ CHARACTER OPERATIONS ============

export async function fetchCharactersByBookId(bookId: string): Promise<any[]> {
  return fetchWithErrorHandling(`/books/${bookId}/characters`, { method: 'GET' });
}

export async function sendCharacterMessage(
  bookId: string,
  characterId: string,
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ character_id: string; message: string }> {
  return fetchWithErrorHandling(`/books/${bookId}/characters/${characterId}/chat`, {
    method: 'POST',
    body: {
      message,
      conversation_history: conversationHistory || [],
    },
  });
}

// ============ BOOK CHUNK OPERATIONS ============

export async function fetchChunksByBookId(bookId: string): Promise<any[]> {
  return fetchWithErrorHandling(`/books/${bookId}/chunks`, { method: 'GET' });
}

// ============ BOOK Q&A OPERATIONS ============

export async function askBookQuestion(
  bookId: string,
  question: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  bookTitle?: string
): Promise<{ answer: string; sources: any[] }> {
  return fetchWithErrorHandling(`/books/${bookId}/qa`, {
    method: 'POST',
    body: {
      question,
      conversation_history: conversationHistory || [],
      bookTitle,
    },
  });
}

// ============ READING PROGRESS OPERATIONS ============

export async function fetchUserReadingProgress(): Promise<any[]> {
  return fetchWithErrorHandling('/reading-progress', {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function saveReadingProgress(
  bookId: string,
  percentComplete: number,
  currentPage?: number,
  status?: string,
  lastPosition?: Record<string, unknown>,
  isFavourite?: boolean
): Promise<any> {
  return fetchWithErrorHandling('/reading-progress', {
    method: 'POST',
    requiresAuth: true,
    body: {
      book_id: bookId,
      percent_complete: percentComplete,
      current_page: currentPage,
      status,
      last_position: lastPosition,
      is_favourite: isFavourite,
    },
  });
}

// ============ USER OPERATIONS ============

export async function createOrUpdateUser(email: string, name?: string): Promise<any> {
  return fetchWithErrorHandling('/users', {
    method: 'POST',
    body: { email, name },
  });
}

export async function fetchBooksWithProgress(userId: string): Promise<any[]> {
  return fetchWithErrorHandling(`/users/${userId}/books-with-progress`, { method: 'GET' });
}

// ============ AUTHENTICATION OPERATIONS ============

export interface AuthSessionData {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
}

export interface AuthSession {
  session: AuthSessionData;
}

export async function registerUser(
  email: string,
  password: string,
  name?: string,
  phone?: string,
  avatar?: string
): Promise<any> {
  return fetchWithErrorHandling('/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
      name,
      phone,
      avatar,
    },
  });
}

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  return fetchWithErrorHandling('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function logoutUser(): Promise<any> {
  return fetchWithErrorHandling('/auth/logout', {
    method: 'POST',
    requiresAuth: true,
  });
}

export async function getSession(): Promise<{ session: AuthSessionData | null }> {
  return fetchWithErrorHandling('/auth/session', {
    method: 'GET',
  });
}

export async function refreshToken(refresh_token: string): Promise<AuthSession> {
  return fetchWithErrorHandling('/auth/refresh', {
    method: 'POST',
    body: { refresh_token },
  });
}

// ============ UTILITY FUNCTIONS ============

/** Check if API is reachable */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`/api/demo`);
    return response.ok;
  } catch {
    return false;
  }
}

/** Get full API URL */
export function getApiUrl(endpoint: string): string {
  return `${API_PREFIX}${endpoint}`;
}

/** Get full legacy API URL for backward compatibility */
export function getLegacyApiUrl(endpoint: string): string {
  return `/api${endpoint}`;
}

