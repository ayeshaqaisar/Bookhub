// Centralized database operations with action-based naming conventions
// Each function represents a specific database action
// Uses centralized table/RPC names from Supabase constants

import { getSupabaseAdmin } from '../supabase';
import { NotFoundError, InternalServerError } from './error-handler';
import { logger } from './logger';
import { SUPABASE_TABLES, SUPABASE_RPCS } from './supabase-constants';
import {
  Book,
  Character,
  BookChunk,
  User,
  ReadingProgress,
  BookReview,
  UserProfile,
} from '../schemas/types';

// ============ BOOK OPERATIONS ============

/** Fetch all books with optional filtering by status */
export async function fetchAllBooks(status: string = 'completed'): Promise<Book[]> {
  logger.logDebug('Fetching all books', { status });
  
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOKS_DETAILS)
      .select('*')
      .eq('processing_status', status)
      .order('created_at', { ascending: false });

    if (error) {
      logger.logError('Failed to fetch all books', error, {}, { status });
      throw new InternalServerError('Failed to fetch books', { details: error.message });
    }

    return (data || []) as Book[];
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchAllBooks', error as Error);
    throw new InternalServerError('Failed to fetch books');
  }
}

/** Fetch a single book by ID */
export async function fetchBookById(bookId: string): Promise<Book> {
  logger.logDebug('Fetching book by ID', { bookId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOKS_DETAILS)
      .select('*')
      .eq('id', bookId)
      .single();

    if (error || !data) {
      logger.logWarning('Book not found', { bookId });
      throw new NotFoundError('Book', bookId);
    }

    return data as Book;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    logger.logError('Error in fetchBookById', error as Error, { bookId });
    throw new InternalServerError('Failed to fetch book');
  }
}

/** Update an existing book */
export async function updateBook(bookId: string, updates: Partial<Book>): Promise<Book> {
  logger.logDebug('Updating book', { bookId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOKS_DETAILS)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', bookId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundError('Book', bookId);
    }

    logger.logSuccess('Book updated successfully', { bookId });
    return data as Book;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    logger.logError('Error in updateBook', error as Error, { bookId });
    throw new InternalServerError('Failed to update book');
  }
}

// ============ CHARACTER OPERATIONS ============

/** Fetch all characters for a specific book */
export async function fetchCharactersByBookId(bookId: string): Promise<Character[]> {
  logger.logDebug('Fetching characters for book', { bookId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.CHARACTERS)
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.logError('Failed to fetch characters', error, { bookId });
      throw new InternalServerError('Failed to fetch characters', { details: error.message });
    }

    return (data || []) as Character[];
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchCharactersByBookId', error as Error, { bookId });
    throw new InternalServerError('Failed to fetch characters');
  }
}

/** Fetch a single character by ID */
export async function fetchCharacterById(characterId: string, bookId: string): Promise<Character> {
  logger.logDebug('Fetching character', { characterId, bookId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.CHARACTERS)
      .select('*')
      .eq('id', characterId)
      .eq('book_id', bookId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Character', characterId);
    }

    return data as Character;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    logger.logError('Error in fetchCharacterById', error as Error, { characterId, bookId });
    throw new InternalServerError('Failed to fetch character');
  }
}

// ============ BOOK CHUNK OPERATIONS ============

/** Fetch all chunks for a book */
export async function fetchChunksByBookId(bookId: string): Promise<BookChunk[]> {
  logger.logDebug('Fetching chunks for book', { bookId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOK_CHUNKS)
      .select('*')
      .eq('book_id', bookId);

    if (error) {
      logger.logError('Failed to fetch chunks', error, { bookId });
      throw new InternalServerError('Failed to fetch chunks', { details: error.message });
    }

    return (data || []) as BookChunk[];
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchChunksByBookId', error as Error, { bookId });
    throw new InternalServerError('Failed to fetch chunks');
  }
}

// ============ READING PROGRESS OPERATIONS ============

/** Save or update reading progress for a user */
export async function saveReadingProgress(
  userId: string,
  bookId: string,
  percentComplete: number,
  currentPage?: number,
  status: string = 'reading',
  lastPosition?: Record<string, unknown>,
  isFavourite: boolean = false
): Promise<ReadingProgress> {
  logger.logDebug('Saving reading progress', { userId, bookId, percentComplete, currentPage });

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Check if progress already exists
    const { data: existing } = await supabase
      .from(SUPABASE_TABLES.READING_PROGRESS)
      .select('id')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .single();

    const updateData = {
      percent_complete: percentComplete,
      current_page: currentPage,
      status,
      last_position: lastPosition,
      is_favourite: isFavourite,
      last_read_at: now,
      updated_at: now,
    };

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.READING_PROGRESS)
        .update(updateData)
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .select()
        .single();

      if (error) throw error;
      logger.logSuccess('Reading progress updated', { userId, bookId, percentComplete });
      return data as ReadingProgress;
    } else {
      // Create new
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.READING_PROGRESS)
        .insert({
          user_id: userId,
          book_id: bookId,
          ...updateData,
          created_at: now,
        })
        .select()
        .single();

      if (error) throw error;
      logger.logSuccess('Reading progress created', { userId, bookId, percentComplete });
      return data as ReadingProgress;
    }
  } catch (error) {
    logger.logError('Error in saveReadingProgress', error as Error, { userId, bookId });
    throw new InternalServerError('Failed to save reading progress');
  }
}

/** Fetch reading progress for a user and book */
export async function fetchReadingProgress(userId: string, bookId: string): Promise<ReadingProgress | null> {
  logger.logDebug('Fetching reading progress', { userId, bookId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.READING_PROGRESS)
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.logError('Failed to fetch reading progress', error, { userId, bookId });
      throw new InternalServerError('Failed to fetch reading progress');
    }

    return (data || null) as ReadingProgress | null;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchReadingProgress', error as Error, { userId, bookId });
    throw new InternalServerError('Failed to fetch reading progress');
  }
}

/** Fetch all reading progress entries for a user with book details */
export async function fetchUserReadingProgress(userId: string): Promise<any[]> {
  logger.logDebug('Fetching all reading progress for user', { userId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.READING_PROGRESS)
      .select(
        `
        id,
        user_id,
        book_id,
        status,
        current_page,
        percent_complete,
        last_position,
        bookmarks,
        last_read_at,
        created_at,
        updated_at,
        is_favourite,
        booksdetails (
          id,
          title,
          author,
          cover_url,
          description,
          genre,
          category,
          age_group
        )
        `
      )
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false });

    if (error) {
      logger.logError('Failed to fetch user reading progress', error, { userId });
      throw new InternalServerError('Failed to fetch reading progress');
    }

    logger.logSuccess('User reading progress fetched', { userId, count: data?.length || 0 });
    return (data || []) as any[];
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchUserReadingProgress', error as Error, { userId });
    throw new InternalServerError('Failed to fetch reading progress');
  }
}

/** Fetch all completed books with user's reading progress and favorite status */
export async function fetchBooksWithUserProgress(userId: string): Promise<any[]> {
  logger.logDebug('Fetching books with user progress', { userId });

  try {
    const supabase = getSupabaseAdmin();

    // Fetch all completed books
    const { data: books, error: booksError } = await supabase
      .from(SUPABASE_TABLES.BOOKS_DETAILS)
      .select('*')
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: false });

    if (booksError) {
      logger.logError('Failed to fetch books', booksError, { userId });
      throw new InternalServerError('Failed to fetch books');
    }

    if (!books || books.length === 0) {
      logger.logWarning('No completed books found', { userId });
      return [];
    }

    // Fetch all reading progress for this user
    const { data: readingProgress, error: progressError } = await supabase
      .from(SUPABASE_TABLES.READING_PROGRESS)
      .select('*')
      .eq('user_id', userId);

    if (progressError) {
      logger.logError('Failed to fetch reading progress', progressError, { userId });
      throw new InternalServerError('Failed to fetch reading progress');
    }

    // Create a map for quick lookup
    const progressMap: Record<string, any> = {};
    if (readingProgress) {
      readingProgress.forEach((progress: any) => {
        progressMap[progress.book_id] = progress;
      });
    }

    // Merge books with reading progress
    const booksWithProgress = books.map((book: any) => {
      const progress = progressMap[book.id];

      return {
        ...book,
        readingProgress: {
          id: progress?.id,
          user_id: progress?.user_id,
          book_id: book.id,
          status: progress?.status || 'reading',
          current_page: progress?.current_page,
          percent_complete: progress?.percent_complete || 0,
          last_position: progress?.last_position,
          bookmarks: progress?.bookmarks,
          last_read_at: progress?.last_read_at,
          created_at: progress?.created_at,
          updated_at: progress?.updated_at,
        },
        is_favourite: progress?.is_favourite || false,
      };
    });

    logger.logSuccess('Books with progress fetched', {
      userId,
      count: booksWithProgress.length,
      booksWithProgress: booksWithProgress.length,
      booksWithoutProgress: booksWithProgress.filter((b: any) => !progressMap[b.id]).length,
    });

    return booksWithProgress;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchBooksWithUserProgress', error as Error, { userId });
    throw new InternalServerError('Failed to fetch books with progress');
  }
}

// ============ USER OPERATIONS ============

/** Create or update user record */
export async function upsertUser(email: string, name?: string): Promise<User> {
  logger.logDebug('Upserting user', { email });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .upsert({ email, name, updated_at: new Date().toISOString() }, { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      logger.logError('Failed to upsert user', error, { email });
      throw new InternalServerError('Failed to save user');
    }

    logger.logSuccess('User upserted successfully', { email });
    return data as User;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in upsertUser', error as Error, { email });
    throw new InternalServerError('Failed to save user');
  }
}

/** Fetch user by email */
export async function fetchUserByEmail(email: string): Promise<User | null> {
  logger.logDebug('Fetching user by email', { email });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.logError('Failed to fetch user', error, { email });
      throw new InternalServerError('Failed to fetch user');
    }

    return (data || null) as User | null;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchUserByEmail', error as Error, { email });
    throw new InternalServerError('Failed to fetch user');
  }
}

/** Create user profile */
export async function createUserProfile(
  userId: string,
  fullName?: string,
  age?: number,
  phone?: string,
): Promise<UserProfile> {
  logger.logDebug('Creating user profile', { userId, fullName });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.USER_PROFILES)
      .insert({
        id: userId,
        full_name: fullName || null,
        age: age || null,
        phone: phone || null,
        user_role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.logError('Failed to create user profile', error, { userId });
      throw new InternalServerError('Failed to create user profile');
    }

    logger.logSuccess('User profile created', { userId });
    return data as UserProfile;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in createUserProfile', error as Error, { userId });
    throw new InternalServerError('Failed to create user profile');
  }
}

/** Fetch user profile by user ID */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  logger.logDebug('Fetching user profile', { userId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.USER_PROFILES)
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.logError('Failed to fetch user profile', error, { userId });
      throw new InternalServerError('Failed to fetch user profile');
    }

    if (!data) {
      logger.logDebug('User profile not found', { userId });
      return null;
    }

    logger.logSuccess('User profile fetched', { userId });
    return data as UserProfile;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchUserProfile', error as Error, { userId });
    throw new InternalServerError('Failed to fetch user profile');
  }
}

/** Update user profile */
export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; age?: number; phone?: string },
): Promise<UserProfile> {
  logger.logDebug('Updating user profile', { userId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.USER_PROFILES)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.logError('Failed to update user profile', error, { userId });
      throw new InternalServerError('Failed to update user profile');
    }

    logger.logSuccess('User profile updated', { userId });
    return data as UserProfile;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in updateUserProfile', error as Error, { userId });
    throw new InternalServerError('Failed to update user profile');
  }
}

// ============ ADMIN OPERATIONS ============

/** Fetch all books with processing status for admin dashboard */
export async function fetchAdminBookList(): Promise<any[]> {
  logger.logDebug('Fetching admin book list');

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOKS_DETAILS)
      .select('id, title, author, category, age_group, processing_status, processing_progress, error_message, created_at, has_characters, cover_url, description')
      .order('created_at', { ascending: false });

    if (error) {
      logger.logError('Failed to fetch admin book list', error, {});
      throw new InternalServerError('Failed to fetch admin book list', { details: error.message });
    }

    logger.logSuccess('Admin book list fetched successfully', { count: (data || []).length });
    return (data || []);
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchAdminBookList', error as Error);
    throw new InternalServerError('Failed to fetch admin book list');
  }
}

// ============ BOOK REVIEW OPERATIONS ============

/** Fetch all reviews for a specific book */
export async function fetchBookReviews(bookId: string): Promise<BookReview[]> {
  logger.logDebug('Fetching book reviews', { bookId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOK_REVIEWS)
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.logError('Failed to fetch book reviews', error, { bookId });
      throw new InternalServerError('Failed to fetch reviews', { details: error.message });
    }

    return (data || []) as BookReview[];
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchBookReviews', error as Error, { bookId });
    throw new InternalServerError('Failed to fetch reviews');
  }
}

/** Fetch user's review for a specific book (one review per user per book) */
export async function fetchUserBookReview(userId: string, bookId: string): Promise<BookReview | null> {
  logger.logDebug('Fetching user book review', { userId, bookId });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOK_REVIEWS)
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.logError('Failed to fetch user book review', error, { userId, bookId });
      throw new InternalServerError('Failed to fetch review', { details: error.message });
    }

    return (data || null) as BookReview | null;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in fetchUserBookReview', error as Error, { userId, bookId });
    throw new InternalServerError('Failed to fetch review');
  }
}

/** Create a new book review (one per user per book) */
export async function createBookReview(
  userId: string,
  bookId: string,
  rating: number,
  comment?: string
): Promise<BookReview> {
  logger.logDebug('Creating book review', { userId, bookId, rating });

  try {
    const supabase = getSupabaseAdmin();

    // Check if user already has a review for this book
    const existingReview = await fetchUserBookReview(userId, bookId);
    if (existingReview) {
      throw new Error('User already has a review for this book');
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOK_REVIEWS)
      .insert([
        {
          user_id: userId,
          book_id: bookId,
          rating,
          comment: comment || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error || !data) {
      logger.logError('Failed to create book review', error || new Error('No data returned'), { userId, bookId });
      throw new InternalServerError('Failed to create review', { details: error?.message });
    }

    logger.logSuccess('Book review created', { userId, bookId, rating });
    return data as BookReview;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    if (error instanceof Error && error.message === 'User already has a review for this book') {
      throw new Error(error.message);
    }
    logger.logError('Error in createBookReview', error as Error, { userId, bookId });
    throw new InternalServerError('Failed to create review');
  }
}

/** Update a book review */
export async function updateBookReview(
  reviewId: string,
  userId: string,
  updates: { rating?: number; comment?: string }
): Promise<BookReview> {
  logger.logDebug('Updating book review', { reviewId, userId });

  try {
    const supabase = getSupabaseAdmin();

    // Verify the review belongs to the user
    const { data: review, error: fetchError } = await supabase
      .from(SUPABASE_TABLES.BOOK_REVIEWS)
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review || (review as any).user_id !== userId) {
      logger.logWarning('Review not found or unauthorized', { reviewId, userId });
      throw new NotFoundError('Review', reviewId);
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BOOK_REVIEWS)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error || !data) {
      logger.logError('Failed to update book review', error || new Error('No data returned'), { reviewId });
      throw new InternalServerError('Failed to update review', { details: error?.message });
    }

    logger.logSuccess('Book review updated', { reviewId });
    return data as BookReview;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in updateBookReview', error as Error, { reviewId, userId });
    throw new InternalServerError('Failed to update review');
  }
}

/** Delete a book review */
export async function deleteBookReview(reviewId: string, userId: string): Promise<void> {
  logger.logDebug('Deleting book review', { reviewId, userId });

  try {
    const supabase = getSupabaseAdmin();

    // Verify the review belongs to the user
    const { data: review, error: fetchError } = await supabase
      .from(SUPABASE_TABLES.BOOK_REVIEWS)
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review || (review as any).user_id !== userId) {
      logger.logWarning('Review not found or unauthorized', { reviewId, userId });
      throw new NotFoundError('Review', reviewId);
    }

    const { error } = await supabase
      .from(SUPABASE_TABLES.BOOK_REVIEWS)
      .delete()
      .eq('id', reviewId);

    if (error) {
      logger.logError('Failed to delete book review', error, { reviewId });
      throw new InternalServerError('Failed to delete review', { details: error.message });
    }

    logger.logSuccess('Book review deleted', { reviewId });
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error instanceof InternalServerError) throw error;
    logger.logError('Error in deleteBookReview', error as Error, { reviewId, userId });
    throw new InternalServerError('Failed to delete review');
  }
}
