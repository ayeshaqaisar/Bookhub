import { getBackendClient, isBackendConfigured } from '@/lib/backendClient';

export const BOOKS_TABLE = 'books';
export const BOOK_FILES_BUCKET = 'book-files';

export type UploadBookArgs = {
  title: string;
  author: string;
  category: string;
  description?: string;
  file: File;
};

export type UploadedBookRecord = {
  id: string | number;
  title: string;
  author: string;
  category: string;
  description?: string | null;
  file_url: string;
  file_name: string;
  status: string;
  upload_date: string;
  chapters?: number | null;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadBook({ title, author, category, description, file }: UploadBookArgs) {
  if (!isBackendConfigured()) {
    throw new Error('Backend credentials are not configured. Set constants in client/lib/backendClient.ts or env variables.');
  }

  const backend = getBackendClient();

  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.name || `${title}.bin`);
  const objectPath = `public/${timestamp}-${safeName}`;

  const { error: uploadError } = await backend.storage
    .from(BOOK_FILES_BUCKET)
    .upload(objectPath, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = backend.storage.from(BOOK_FILES_BUCKET).getPublicUrl(objectPath);
  const fileUrl = publicUrlData.publicUrl;

  const record = {
    title,
    author,
    category,
    description: description ?? null,
    file_url: fileUrl,
    file_name: safeName,
    status: 'processing',
    upload_date: new Date().toISOString(),
    chapters: null,
  } satisfies Omit<UploadedBookRecord, 'id'>;

  const { data: insertData, error: insertError } = await backend
    .from(BOOKS_TABLE)
    .insert([record])
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertData as UploadedBookRecord;
}
