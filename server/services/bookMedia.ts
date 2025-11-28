import { getSupabaseAdmin } from "../supabase";

const BUCKET = "Books";

export function getCoverPublicUrl(bookId: string): string {
  const supabase = getSupabaseAdmin();
  return supabase.storage.from(BUCKET).getPublicUrl(`${bookId}/cover.jpg`).data.publicUrl;
}

export function getPdfPublicUrl(bookId: string): string {
  const supabase = getSupabaseAdmin();
  return supabase.storage.from(BUCKET).getPublicUrl(`${bookId}/${bookId}.pdf`).data.publicUrl;
}

export function enrichBookMedia<T extends { id: string; cover_url?: string | null; file_url?: string | null }>(book: T): T {
  const cover = book.cover_url && book.cover_url.length > 0 ? book.cover_url : getCoverPublicUrl(book.id);
  const file = book.file_url && book.file_url.length > 0 ? book.file_url : getPdfPublicUrl(book.id);
  return { ...book, cover_url: cover, file_url: file } as T;
}
