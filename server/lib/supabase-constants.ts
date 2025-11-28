// Centralized Supabase table and RPC names
// Ensures consistency across the entire backend when referencing database resources

// ============ TABLE NAMES ============
export const SUPABASE_TABLES = {
  // Book and content tables
  BOOKS_DETAILS: 'booksdetails',
  BOOK_CHUNKS: 'book_chunks',
  CHARACTERS: 'characters',

  // User data tables
  USER_PROFILES: 'user_profiles',
  READING_PROGRESS: 'reading_progress',

  // User interaction tables
  BOOK_REVIEWS: 'book_reviews',
  USER_FAVORITES: 'user_favorites',

  // Admin/system tables
  ADMIN_BOOKS: 'admin_books',
} as const;

// ============ RPC FUNCTION NAMES ============
export const SUPABASE_RPCS = {
  // Vector search and embeddings
  MATCH_BOOK_CHUNKS: 'match_book_chunks',
  SEARCH_CHUNKS_BY_EMBEDDING: 'search_chunks_by_embedding',

  // User operations
  GET_USER_READING_PROGRESS: 'get_user_reading_progress',
  GET_USER_FAVORITES: 'get_user_favorites',
} as const;

// Type-safe table name helpers
export type TableName = (typeof SUPABASE_TABLES)[keyof typeof SUPABASE_TABLES];
export type RPCName = (typeof SUPABASE_RPCS)[keyof typeof SUPABASE_RPCS];

// Validation helper
export function validateTableName(name: string): name is TableName {
  return Object.values(SUPABASE_TABLES).includes(name as TableName);
}

export function validateRPCName(name: string): name is RPCName {
  return Object.values(SUPABASE_RPCS).includes(name as RPCName);
}

// Default columns for common queries
export const DEFAULT_COLUMNS = {
  BOOK_DETAILS: ['id', 'title', 'author', 'description', 'cover_url', 'file_url', 'genre', 'age_group', 'category', 'processing_status', 'created_at', 'updated_at', 'has_characters'],
  CHARACTER: ['id', 'book_id', 'name', 'short_description', 'persona', 'example_responses', 'created_at'],
  CHUNK: ['id', 'book_id', 'chapter_number', 'chapter_heading', 'content', 'created_at'],
  READING_PROGRESS: ['id', 'user_id', 'book_id', 'percent_complete', 'current_page', 'status', 'is_favourite', 'created_at', 'updated_at'],
  USER_PROFILE: ['id', 'full_name', 'age', 'phone', 'user_role', 'created_at', 'updated_at'],
  BOOK_REVIEW: ['id', 'book_id', 'user_id', 'rating', 'comment', 'created_at', 'updated_at'],
} as const;
