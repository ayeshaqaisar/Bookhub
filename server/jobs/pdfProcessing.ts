import { getSupabaseAdmin } from '../supabase';
import axios from 'axios';
import pdf from 'pdf-parse';
import { estimateTokens } from './getCharacterService';

const supabase = getSupabaseAdmin();
const BUCKET = 'Books';
export const MAX_TOKENS_PER_CHUNK = 800;
export const CHUNK_TOKEN_OVERLAP = 50;

// Get signed URL for PDF
export async function getPdfSignedUrl(bookId: string) {
  const path = `${bookId}/${bookId}.pdf`;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedURL) throw new Error(error?.message || 'Unknown error');
    return data.signedURL;
  } catch (e: any) {
    throw new Error(`Failed to create signed URL for path "${path}": ${e?.message}`);
  }
}

// Get signed URL for cover
export async function getCoverSignedUrl(bookId: string) {
  const path = `${bookId}/cover.jpg`;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedURL) throw new Error(error?.message || 'Unknown error');
    return data.signedURL;
  } catch (e: any) {
    throw new Error(`Failed to create cover signed URL for path "${path}": ${e?.message}`);
  }
}

// Download PDF as buffer
export async function downloadPdf(url: string) {
  const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
  return Buffer.from(resp.data);
}

// Extract text; pdf-parse returns full text, we wrap as a single-page array
export async function extractPagesText(pdfBuffer: Buffer) {
  const res = await pdf(pdfBuffer);
  const text = (res?.text || '').trim();
  return [{ pageNumber: 1, text }];
}

// Chunk pages by tokens
export function chunkPagesToTokenChunks(
  pages: { pageNumber: number; text: string; chapter?: number }[],
  maxTokens = MAX_TOKENS_PER_CHUNK,
  overlap = CHUNK_TOKEN_OVERLAP
) {
  const chunks: any[] = [];
  let buffer = '';
  let bufferTokens = 0;
  let chunkStartPage = 1;
  let chunkEndPage = 1;
  let chunkIndex = 0;
  let currentChapter = pages[0]?.chapter ?? null;

  const pushChunk = (text: string, startPage: number, endPage: number, chapterNumber: number | null) => {
    const tc = estimateTokens(text);
    chunks.push({ chunk_index: chunkIndex++, content: text, start_page: startPage, end_page: endPage, token_count: tc, chapter_number: chapterNumber });
  };

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const pTokens = estimateTokens(p.text || '');
    if (!buffer) {
      chunkStartPage = p.pageNumber;
      currentChapter = p.chapter ?? currentChapter;
    }
    buffer += (buffer ? '\n' : '') + (p.text || '');
    bufferTokens = estimateTokens(buffer);
    chunkEndPage = p.pageNumber;

    if (bufferTokens >= maxTokens) {
      pushChunk(buffer.trim(), chunkStartPage, chunkEndPage, currentChapter);
      const approxCharsPerToken = 4;
      const tailChars = Math.floor(overlap * approxCharsPerToken);
      buffer = buffer.slice(Math.max(0, buffer.length - tailChars));
      bufferTokens = estimateTokens(buffer);
      chunkStartPage = chunkEndPage;
    }
  }

  if (buffer && buffer.trim().length > 0) {
    pushChunk(buffer.trim(), chunkStartPage, chunkEndPage, currentChapter);
  }

  return chunks;
}
