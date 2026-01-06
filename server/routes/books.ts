// POST /api/v1/books - Upload new book
// PUT /api/v1/books/:id - Update book details

import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { sendErrorResponse, sendSuccess, ValidationError } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { updateBook as dbUpdateBook } from '../lib/db';
import { getSupabaseAdmin } from '../supabase';
import { validateStringParam, validateObjectId } from '../schemas/validators';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB limit


/** Upload a new book with PDF and cover image - Admin only */
export async function handleUploadBook(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const endpoint = '/api/v1/books';

  try {
    logger.logRequest('POST', endpoint);

    // Admin middleware ensures user is admin, extract user ID for logging
    const userId = (req as any).userId;
    if (!userId) {
      throw new ValidationError('User authentication required for book upload');
    }

    // Validate multipart form data
    if (!req.body) {
      throw new ValidationError('Request body is required');
    }

    const { title, author, category, age_group, description, genre } = req.body;
    const files = req.files as Record<string, any[]> | undefined;

    // Validate required text fields
    validateStringParam(title, 'Title');
    validateStringParam(author, 'Author');
    validateStringParam(category, 'Category');
    validateStringParam(age_group, 'Age group');
    validateStringParam(description, 'Description');
    validateStringParam(genre, 'Genre');

    // Validate category enum
    if (!['fiction', 'nonfiction', 'children'].includes(category)) {
      throw new ValidationError('Category must be fiction, nonfiction, or children');
    }

    // Validate files are present
    if (!files || !files.pdf || !files.cover) {
      throw new ValidationError('Both PDF file and cover image are required');
    }

    if (files.pdf.length === 0 || files.cover.length === 0) {
      throw new ValidationError('Both PDF file and cover image are required');
    }

    const pdfFile = files.pdf[0];
    const coverFile = files.cover[0];

    logger.logDebug('Validating files', {
      title,
      pdfSize: `${(pdfFile.size / 1024).toFixed(2)} KB`,
      coverSize: `${(coverFile.size / 1024).toFixed(2)} KB`,
    });

    // Validate file sizes
    if (pdfFile.size > MAX_FILE_SIZE) {
      throw new ValidationError('PDF too large', {
        size: `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`,
        maxSize: '50 MB',
      });
    }

    if (coverFile.size > MAX_FILE_SIZE) {
      throw new ValidationError('Cover image too large', {
        size: `${(coverFile.size / 1024 / 1024).toFixed(2)} MB`,
        maxSize: '50 MB',
      });
    }

    logger.logDebug('Uploading files to Supabase storage', { title });

    const supabase = getSupabaseAdmin();
    const bookId = randomUUID();
    const bucket = 'Books';
    const pdfObjectPath = `${bookId}/${bookId}.pdf`;
    const coverObjectPath = `${bookId}/cover.jpg`;

    // Upload PDF
    const { error: pdfErr } = await supabase.storage
    .from(bucket)
    .upload(pdfObjectPath, pdfFile.buffer, {
      contentType: pdfFile.mimetype || 'application/pdf',
      upsert: true,
    });

    if (pdfErr) {
      logger.logError('PDF upload failed', pdfErr as Error, { title, bookId });
      throw new ValidationError('Failed to upload PDF', { details: pdfErr.message });
    }

    // Upload Cover
    const { error: coverErr } = await supabase.storage
    .from(bucket)
    .upload(coverObjectPath, coverFile.buffer, {
      contentType: coverFile.mimetype || 'image/jpeg',
      upsert: true,
    });

    if (coverErr) {
      logger.logError('Cover upload failed', coverErr as Error, { title, bookId });
      throw new ValidationError('Failed to upload cover image', { details: coverErr.message });
    }

    logger.logDebug('Files uploaded to storage, saving book to database', { bookId, title });

    // Get public URLs
    const filePublic = supabase.storage.from(bucket).getPublicUrl(pdfObjectPath).data.publicUrl;
    const coverPublic = supabase.storage.from(bucket).getPublicUrl(coverObjectPath).data.publicUrl;

    // Insert into database
    const { error: dbErr } = await supabase.from('booksdetails').insert({
      id: bookId,
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      age_group: age_group.trim(),
      description: description.trim(),
      genre: genre.trim(),
      file_url: filePublic,
      cover_url: coverPublic,
      processing_status: 'started',
      created_at: new Date().toISOString(),
    });

    if (dbErr) {
      logger.logError('Database insert failed', dbErr as Error, { bookId, title });
      throw new ValidationError('Failed to save book details', { details: dbErr.message });
    }

    const duration = Date.now() - startTime;
    logger.logResponse(201, endpoint, duration);
    logger.logSuccess('Book uploaded successfully', {
      bookId,
      title,
      pdfSize: `${(pdfFile.size / 1024).toFixed(2)} KB`,
    });

    sendSuccess(
      res,
      {
        id: bookId,
        title,
        author,
        category,
        age_group,
        description,
        genre,
        file_url: filePublic,
        cover_url: coverPublic,
        created_at: new Date().toISOString(),
      },
      201,
      'Book uploaded successfully'
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}

/** Update an existing book's metadata */
/** Update an existing book's metadata - Admin only */
export async function handleUpdateBook(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { id } = req.params;
  const endpoint = `/api/v1/books/${id}`;

  try {
    logger.logRequest('PUT', endpoint);

    // Admin middleware ensures user is admin, extract user ID for logging
    const userId = (req as any).userId;
    if (!userId) {
      throw new ValidationError('User authentication required for book update');
    }

    // Validate book ID
    const validId = validateObjectId(id, 'Book ID');

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      throw new ValidationError('Request body must be an object');
    }

    logger.logDebug('Updating book', { bookId: validId, userId });

    // Update book using centralized function
    const updatedBook = await dbUpdateBook(validId, req.body);

    const duration = Date.now() - startTime;
    logger.logResponse(200, endpoint, duration);
    logger.logSuccess('Book updated successfully', { bookId: validId });

    sendSuccess(res, updatedBook, 200, 'Book updated successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse(error instanceof Error ? 500 : 400, endpoint, duration);
    sendErrorResponse(res, error, { endpoint });
  }
}
