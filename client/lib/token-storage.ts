// Local storage helper for managing authentication tokens
// Securely stores and retrieves access/refresh tokens

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'bookhub_access_token',
  REFRESH_TOKEN: 'bookhub_refresh_token',
  TOKEN_EXPIRES_AT: 'bookhub_token_expires_at',
  USER_ID: 'bookhub_user_id',
};

const isBrowser = typeof window !== 'undefined';

export interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId: string;
}

/**
 * Save authentication session to local storage
 */
export function saveSession(session: StoredSession): void {
  if (!isBrowser) return;

  try {
    localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, session.accessToken);
    if (session.refreshToken) {
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, session.refreshToken);
    }
    if (session.expiresAt) {
      localStorage.setItem(TOKEN_KEYS.TOKEN_EXPIRES_AT, String(session.expiresAt));
    }
    localStorage.setItem(TOKEN_KEYS.USER_ID, session.userId);
  } catch (error) {
    console.error('Failed to save session to storage', error);
  }
}

/**
 * Load authentication session from local storage
 */
export function loadSession(): StoredSession | null {
  if (!isBrowser) return null;

  try {
    const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    const userId = localStorage.getItem(TOKEN_KEYS.USER_ID);

    if (!accessToken || !userId) {
      return null;
    }

    return {
      accessToken,
      refreshToken: localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN) || undefined,
      expiresAt: parseInt(localStorage.getItem(TOKEN_KEYS.TOKEN_EXPIRES_AT) || '0'),
      userId,
    };
  } catch (error) {
    console.error('Failed to load session from storage', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt * 1000;
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  if (!isBrowser) return null;

  try {
    return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Failed to get access token', error);
    return null;
  }
}

/**
 * Clear all authentication tokens and user data
 */
export function clearSession(): void {
  if (!isBrowser) return;

  try {
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.TOKEN_EXPIRES_AT);
    localStorage.removeItem(TOKEN_KEYS.USER_ID);
  } catch (error) {
    console.error('Failed to clear session from storage', error);
  }
}

/**
 * Update only the access token (used during refresh)
 */
export function updateAccessToken(accessToken: string, expiresAt?: number): void {
  if (!isBrowser) return;

  try {
    localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    if (expiresAt) {
      localStorage.setItem(TOKEN_KEYS.TOKEN_EXPIRES_AT, String(expiresAt));
    }
  } catch (error) {
    console.error('Failed to update access token', error);
  }
}
