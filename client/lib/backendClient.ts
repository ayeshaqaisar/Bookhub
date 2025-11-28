// Backward compatibility wrapper for API client and Supabase client
// This file provides both the new centralized API client and legacy Supabase client access

import { createClient } from '@supabase/supabase-js';
import * as apiClient from '@/services/api-client';

// ============ SUPABASE CLIENT INITIALIZATION ============

const SUPABASE_URL = import.meta.env.VITE_BACKEND_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_BACKEND_ANON_KEY;

let supabaseClientInstance: ReturnType<typeof createClient> | null = null;

/** Check if backend is properly configured with required environment variables */
export function isBackendConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Get or create Supabase client instance (singleton) */
export function getBackendClient() {
  if (!isBackendConfigured()) {
    throw new Error(
      'Backend is not configured. Please set VITE_BACKEND_URL and VITE_BACKEND_ANON_KEY environment variables.'
    );
  }

  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return supabaseClientInstance;
}

// ============ CENTRALIZED API CLIENT (NEW) ============

// Re-export all new API client functions for modern usage
export const backendClient = {
  // Books
  fetchAllBooks: apiClient.fetchAllBooks,
  fetchBookById: apiClient.fetchBookById,
  uploadBook: apiClient.uploadBook,
  updateBook: apiClient.updateBook,

  // Characters
  fetchCharactersByBookId: apiClient.fetchCharactersByBookId,
  sendCharacterMessage: apiClient.sendCharacterMessage,

  // Chunks
  fetchChunksByBookId: apiClient.fetchChunksByBookId,

  // Q&A
  askBookQuestion: apiClient.askBookQuestion,

  // Reading Progress
  saveReadingProgress: apiClient.saveReadingProgress,

  // Users
  createOrUpdateUser: apiClient.createOrUpdateUser,

  // Utilities
  checkApiHealth: apiClient.checkApiHealth,
  getApiUrl: apiClient.getApiUrl,
  getLegacyApiUrl: apiClient.getLegacyApiUrl,
};

// Default export for convenience
export default backendClient;
