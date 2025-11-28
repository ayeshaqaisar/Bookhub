// Central route registration with organized routers by domain
// Each router handles related endpoints and can have its own middleware

import { Router } from 'express';
import { logger } from '../lib/logger';

// Import route handlers
import { handleDemo } from './demo';
import { handleListBooks, handleGetBook } from './books-list';
import { handleGetChunks } from './book-chunks';
import { handleGetCharacters } from './characters';
import { handleCharacterChat } from './character-chat';
import { handleSaveReadingProgress, handleFetchUserReadingProgress } from './reading-progress';
import { handleCreateUser, handleFetchUserProfile, handleFetchBooksWithProgress } from './users';
import { handleUploadBook, handleUpdateBook } from './books';
import { handleBookQA } from './qa';
import { handleGetAdminBooks } from './admin';
import {
  handleGetBookReviews,
  handleGetUserBookReview,
  handleCreateBookReview,
  handleUpdateBookReview,
  handleDeleteBookReview,
} from './reviews';
import { handleToggleFavorite, handleFetchFavorites } from './favorites';
import { handleRegister, handleLogin, handleLogout, handleGetSession, handleRefreshToken } from './auth';

/**
 * Create routers organized by domain
 * This makes it easier to manage related endpoints and apply domain-specific middleware
 */

// ============ BOOKS ROUTER ============
export function createBooksRouter(): Router {
  const router = Router();

  router.get('/', handleListBooks);
  router.get('/:id', handleGetBook);
  router.post('/', handleUploadBook);
  router.put('/:id', handleUpdateBook);

  logger.logSuccess('Books router configured', {
    routes: ['GET /', 'GET /:id', 'POST /', 'PUT /:id'],
  });

  return router;
}

// ============ CHARACTERS ROUTER ============
export function createCharactersRouter(): Router {
  const router = Router({ mergeParams: true });

  router.get('/', handleGetCharacters);
  router.post('/:characterId/chat', handleCharacterChat);

  logger.logSuccess('Characters router configured', {
    routes: ['GET /', 'POST /:characterId/chat'],
  });

  return router;
}

// ============ BOOK CHUNKS ROUTER ============
export function createChunksRouter(): Router {
  const router = Router({ mergeParams: true });

  router.get('/', handleGetChunks);

  logger.logSuccess('Chunks router configured', {
    routes: ['GET /'],
  });

  return router;
}

// ============ BOOK QA ROUTER ============
export function createQARouter(): Router {
  const router = Router({ mergeParams: true });

  router.post('/', handleBookQA);

  logger.logSuccess('Q&A router configured', {
    routes: ['POST /'],
  });

  return router;
}

// ============ READING PROGRESS ROUTER ============
export function createReadingProgressRouter(): Router {
  const router = Router();

  router.get('/', handleFetchUserReadingProgress);
  router.post('/', handleSaveReadingProgress);

  logger.logSuccess('Reading Progress router configured', {
    routes: ['GET /', 'POST /'],
  });

  return router;
}

// ============ FAVORITES ROUTER ============
export function createFavoritesRouter(): Router {
  const router = Router();

  // Note: GET favorites is here, but PUT favorite is registered separately at /api/v1/books/:bookId/favorite
  // to match the original API structure
  router.get('/', handleFetchFavorites);

  logger.logSuccess('Favorites router configured', {
    routes: ['GET /'],
  });

  return router;
}

// ============ REVIEWS ROUTER ============
export function createReviewsRouter(): Router {
  const router = Router({ mergeParams: true });

  router.get('/', handleGetBookReviews);
  router.get('/user', handleGetUserBookReview);
  router.post('/', handleCreateBookReview);
  router.put('/:id', handleUpdateBookReview);
  router.delete('/:id', handleDeleteBookReview);

  logger.logSuccess('Reviews router configured', {
    routes: ['GET /', 'GET /user', 'POST /', 'PUT /:id', 'DELETE /:id'],
  });

  return router;
}

// ============ USERS ROUTER ============
export function createUsersRouter(): Router {
  const router = Router();

  router.post('/', handleCreateUser);
  router.get('/:id/profile', handleFetchUserProfile);
  router.get('/:userId/books-with-progress', handleFetchBooksWithProgress);

  logger.logSuccess('Users router configured', {
    routes: ['POST /', 'GET /:id/profile', 'GET /:userId/books-with-progress'],
  });

  return router;
}

// ============ ADMIN ROUTER ============
export function createAdminRouter(): Router {
  const router = Router();

  router.get('/books', handleGetAdminBooks);

  logger.logSuccess('Admin router configured', {
    routes: ['GET /books'],
  });

  return router;
}

// ============ DEMO ROUTER ============
export function createDemoRouter(): Router {
  const router = Router();

  router.get('/demo', handleDemo);

  logger.logSuccess('Demo router configured', {
    routes: ['GET /demo'],
  });

  return router;
}

// ============ AUTH ROUTER ============
export function createAuthRouter(): Router {
  const router = Router();

  router.post('/register', handleRegister);
  router.post('/login', handleLogin);
  router.post('/logout', handleLogout);
  router.get('/session', handleGetSession);
  router.post('/refresh', handleRefreshToken);

  logger.logSuccess('Auth router configured', {
    routes: [
      'POST /register',
      'POST /login',
      'POST /logout',
      'GET /session',
      'POST /refresh',
    ],
  });

  return router;
}


/**
 * Register all routers with the Express app
 * Called from server/index.ts during server initialization
 */
export function registerAllRoutes(app: any, enableLegacyRoutes: boolean): void {
  // V1 API routes
  app.use('/api/v1/books', createBooksRouter());
  app.use('/api/v1/books/:bookId/characters', createCharactersRouter());
  app.use('/api/v1/books/:bookId/chunks', createChunksRouter());
  app.use('/api/v1/books/:bookId/qa', createQARouter());
  app.use('/api/v1/books/:bookId/reviews', createReviewsRouter());
  app.use('/api/v1/reading-progress', createReadingProgressRouter());
  app.use('/api/v1/favorites', createFavoritesRouter());
  app.use('/api/v1/users', createUsersRouter());
  app.use('/api/v1/admin', createAdminRouter());
  app.use('/api', createDemoRouter());
  app.use('/api/v1/auth', createAuthRouter());


  // Favorite toggle endpoint (must be registered after books router but at specific path)
  app.put('/api/v1/books/:bookId/favorite', handleToggleFavorite);

  logger.logSuccess('V1 API routes registered', {
    baseUrl: '/api/v1',
    demoUrl: '/api/demo',
  });

  // Legacy routes (for backward compatibility)
  if (enableLegacyRoutes) {
    // Create simplified legacy routers that map to v1 handlers
    const booksLegacy = Router();
    booksLegacy.get('/', handleListBooks);
    booksLegacy.get('/:id', handleGetBook);
    booksLegacy.post('/upload', handleUploadBook);
    booksLegacy.put('/:id', handleUpdateBook);
    booksLegacy.get('/:id/characters', handleGetCharacters);
    booksLegacy.get('/:id/chunks', handleGetChunks);
    booksLegacy.post('/:id/qa', handleBookQA);
    booksLegacy.post('/:bookId/characters/:characterId/chat', handleCharacterChat);

    const progressLegacy = Router();
    progressLegacy.post('/', handleSaveReadingProgress);

    const usersLegacy = Router();
    usersLegacy.post('/', handleCreateUser);

    app.use('/api/books', booksLegacy);
    app.use('/api/reading-progress', progressLegacy);
    app.use('/api/users', usersLegacy);

    logger.logSuccess('Legacy API routes registered (v0)', {
      deprecation: 'Legacy routes will be removed in future versions. Use /api/v1 instead.',
    });
  }
}
