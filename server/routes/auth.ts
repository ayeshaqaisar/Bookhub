// Authentication endpoints that handle user login, registration, logout, and session management
// Frontend will call these endpoints instead of directly using Supabase
// Backend communicates with Supabase and returns JWT tokens to the frontend

import type { Request, Response } from 'express';
import { getSupabaseAdmin } from '../supabase';
import { logger } from '../lib/logger';
import { createUserProfile } from '../lib/db';

import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../lib/config'; // Your env vars


interface AuthResponse {
  success: boolean;
  data?: {
    user?: {
      id: string;
      email: string;
      user_metadata?: Record<string, unknown>;
    };
    session?: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      expires_at: number;
      token_type: string;
      user: {
        id: string;
        email: string;
        user_metadata?: Record<string, unknown>;
      };
    };
  };
  error?: {
    message: string;
    code: string;
  };
  message?: string;
}

/**
 * POST /api/v1/auth/register
 * Register a new user with email and password
 * Returns session data with access token
 */
export async function handleRegister(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, phone, avatar } = req.body;

    // Validate required fields
    if (!email || !password) {
      logger.logWarning('Register attempt with missing credentials', { email });
      res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          code: 'INVALID_REQUEST',
        },
      } as AuthResponse);
      return;
    }

    const supabase = getSupabaseAdmin();

    // Create metadata object
    const metadata: Record<string, unknown> = { name: name || email.split('@')[0] };
    if (phone) {
      metadata.contact = phone;
      metadata.phone = phone;
    }
    if (avatar) {
      metadata.avatar = avatar;
      metadata.avatar_url = avatar;
    }

    // Sign up user with Supabase
    // In development, auto-confirm email for testing. In production, set to false.
    const autoConfirmEmail = process.env.NODE_ENV === 'development';
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: metadata,
      email_confirm: autoConfirmEmail, // Auto-confirm in dev for testing
    });

    if (error) {
      logger.logWarning('User registration failed', { email, error: error.message });
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'REGISTRATION_FAILED',
        },
      } as AuthResponse);
      return;
    }

    if (!data.user) {
      logger.logError('User registration succeeded but no user data returned', new Error('No user data'));
      res.status(500).json({
        success: false,
        error: {
          message: 'User created but no session data returned',
          code: 'SESSION_ERROR',
        },
      } as AuthResponse);
      return;
    }

    // Create user profile in public.user_profiles table
    try {
      const userId = data.user.id;
      const fullName = name || email.split('@')[0];
      await createUserProfile(userId, fullName, undefined, phone);
      logger.logSuccess('User profile created after registration', { userId });
    } catch (profileError) {
      // Profile creation failure is not critical - user is still registered
      logger.logWarning('Failed to create user profile after registration', {
        userId: data.user.id,
        error: profileError instanceof Error ? profileError.message : String(profileError),
      });
    }

    logger.logSuccess('User registered successfully', { email, userId: data.user.id });

    const message = autoConfirmEmail
      ? 'Registration successful. You can now log in.'
      : 'Registration successful. Please verify your email to complete sign up.';

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        },
      },
      message,
    } as AuthResponse);
  } catch (error) {
    logger.logError('Register endpoint error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: {
        message: 'An error occurred during registration',
        code: 'INTERNAL_SERVER_ERROR',
      },
    } as AuthResponse);
  }
}

/**
 * POST /api/v1/auth/login
 * Login user with email and password
 * Returns session data with access token
 */
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      logger.logWarning('Login attempt with missing credentials', { email });
      res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          code: 'INVALID_REQUEST',
        },
      } as AuthResponse);
      return;
    }

    const supabase = getSupabaseAdmin();

    // Use the anon key client for user sign-in to get proper session data
    // We need to create a client with anon key for this operation
    const config = getConfig();


    const anonClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

    if (error) {
      logger.logWarning('User login failed', { email, error: error.message });
      res.status(401).json({
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_CREDENTIALS',
        },
      } as AuthResponse);
      return;
    }

    if (!data.session) {
      logger.logWarning('Login succeeded but no session data returned', { email });
      res.status(500).json({
        success: false,
        error: {
          message: 'Login succeeded but no session data returned',
          code: 'SESSION_ERROR',
        },
      } as AuthResponse);
      return;
    }

    logger.logSuccess('User logged in successfully', { email, userId: data.user.id });

    res.status(200).json({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token || '',
          expires_in: data.session.expires_in || 3600,
          expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 3600,
          token_type: 'Bearer',
          user: {
            id: data.user.id,
            email: data.user.email || '',
            user_metadata: data.user.user_metadata,
          },
        },
      },
    } as AuthResponse);
  } catch (error) {
    logger.logError('Login endpoint error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: {
        message: 'An error occurred during login',
        code: 'INTERNAL_SERVER_ERROR',
      },
    } as AuthResponse);
  }
}

/**
 * POST /api/v1/auth/logout
 * Logout user by invalidating the session
 * Frontend should also clear local auth state
 */
export async function handleLogout(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.logWarning('Logout attempt without auth header');
      res.status(401).json({
        success: false,
        error: {
          message: 'No authorization header provided',
          code: 'UNAUTHORIZED',
        },
      } as AuthResponse);
      return;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      logger.logWarning('Logout attempt with invalid auth header format');
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authorization header format',
          code: 'UNAUTHORIZED',
        },
      } as AuthResponse);
      return;
    }

    const token = match[1];
    const supabase = getSupabaseAdmin();

    // Revoke the token
    const { error } = await supabase.auth.admin.signOut(
      req.userId || '',
      'all' // Sign out from all devices
    );

    if (error) {
      logger.logWarning('Token revocation failed', { error: error.message });
      // Don't fail the logout - token might already be invalid
    }

    logger.logSuccess('User logged out', { userId: req.userId });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    } as AuthResponse);
  } catch (error) {
    logger.logError('Logout endpoint error', error instanceof Error ? error : new Error(String(error)));
    // Don't fail on logout errors - let frontend clear state anyway
    res.status(200).json({
      success: true,
      message: 'Logout completed',
    } as AuthResponse);
  }
}

/**
 * GET /api/v1/auth/session
 * Get current session information from JWT token
 * Validates token and returns user data
 */
export async function handleGetSession(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.logDebug('Session check without auth header');
      res.status(200).json({
        success: true,
        data: { session: null },
      } as AuthResponse);
      return;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      logger.logWarning('Session check with invalid auth header format');
      res.status(200).json({
        success: true,
        data: { session: null },
      } as AuthResponse);
      return;
    }

    const token = match[1];
    const supabase = getSupabaseAdmin();

    // Verify token and get user
    const { data, error } = await supabase.auth.admin.getUserById(req.userId || '');

    if (error || !data.user) {
      logger.logDebug('Invalid or expired token', { error: error?.message });
      res.status(200).json({
        success: true,
        data: { session: null },
      } as AuthResponse);
      return;
    }

    logger.logSuccess('Session retrieved successfully', { userId: data.user.id });

    res.status(200).json({
      success: true,
      data: {
        session: {
          access_token: token,
          token_type: 'Bearer',
          user: {
            id: data.user.id,
            email: data.user.email || '',
            user_metadata: data.user.user_metadata,
          },
        },
      },
    } as AuthResponse);
  } catch (error) {
    logger.logError('Get session endpoint error', error instanceof Error ? error : new Error(String(error)));
    res.status(200).json({
      success: true,
      data: { session: null },
    } as AuthResponse);
  }
}

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 * Used to extend session without re-login
 */
export async function handleRefreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      logger.logWarning('Refresh token request without refresh token');
      res.status(400).json({
        success: false,
        error: {
          message: 'Refresh token is required',
          code: 'INVALID_REQUEST',
        },
      } as AuthResponse);
      return;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const { getConfig } = await import('../lib/config');
    const config = getConfig();

    const anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await anonClient.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      logger.logWarning('Token refresh failed', { error: error?.message });
      res.status(401).json({
        success: false,
        error: {
          message: 'Failed to refresh token',
          code: 'REFRESH_FAILED',
        },
      } as AuthResponse);
      return;
    }

    logger.logSuccess('Token refreshed successfully', { userId: data.user.id });

    res.status(200).json({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token || '',
          expires_in: data.session.expires_in || 3600,
          expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 3600,
          token_type: 'Bearer',
          user: {
            id: data.user.id,
            email: data.user.email || '',
            user_metadata: data.user.user_metadata,
          },
        },
      },
    } as AuthResponse);
  } catch (error) {
    logger.logError('Refresh token endpoint error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: {
        message: 'An error occurred during token refresh',
        code: 'INTERNAL_SERVER_ERROR',
      },
    } as AuthResponse);
  }
}
