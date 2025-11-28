// Type definitions for API requests, responses, and database entities

// Database Models
export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  cover_url?: string;
  file_url?: string;
  genre?: string;
  age_group?: string;
  category: 'fiction' | 'nonfiction' | 'children';
  processing_status: string;
  created_at: string;
  updated_at?: string;
  has_characters?: boolean;
}

export interface Character {
  id: string;
  book_id: string;
  name: string;
  short_description?: string;
  persona?: string;
  example_responses?: string[];
  created_at: string;
}

export interface BookChunk {
  id: string;
  book_id: string;
  chapter_number?: number;
  chapter_heading?: string;
  content: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  progress: number;
  current_chapter: number;
  created_at: string;
  updated_at: string;
}

export interface UserReadingProgress {
  id?: string;
  user_id?: string;
  book_id: string;
  status: string;
  current_page?: number;
  percent_complete: number;
  last_position?: Record<string, unknown>;
  bookmarks?: unknown[];
  last_read_at?: string;
  created_at?: string;
  updated_at?: string;
  is_favourite: boolean;
}

export interface BookerWithProgress extends Book {
  readingProgress: UserReadingProgress;
}

export interface BookReview {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  age?: number;
  phone?: string;
  user_role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

// Request/Response Types
export interface CreateCharacterChatRequest {
  message: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface CharacterChatResponse {
  character_id: string;
  message: string;
}

export interface BookQueryRequest {
  question: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  bookTitle?: string;
}

export interface BookQueryResponse {
  answer: string;
  sources?: Array<{
    chunk_id: string;
    chapter_number?: number;
    chapter_heading?: string;
    page_number?: number;
  }>;
}

export interface CreateReadingProgressRequest {
  book_id: string;
  percent_complete: number;
  current_page?: number;
  status?: string;
  last_position?: Record<string, unknown>;
  is_favourite?: boolean;
}

export interface UploadBookRequest {
  title: string;
  author: string;
  description?: string;
  file: File;
  cover?: File;
  genre?: string;
  age_group?: string;
  category: 'fiction' | 'nonfiction' | 'children';
}

export interface CreateUserRequest {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
}

export interface CreateUserProfileRequest {
  full_name?: string;
  age?: number;
  phone?: string;
}

export interface UpdateUserProfileRequest {
  full_name?: string;
  age?: number;
  phone?: string;
}

export interface CreateBookReviewRequest {
  rating: number;
  comment?: string;
}

export interface UpdateBookReviewRequest {
  rating?: number;
  comment?: string;
}

export interface BookDetailResponse extends Book {
  characters?: Character[];
  chunks?: BookChunk[];
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// API Response Envelope
export interface SuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
