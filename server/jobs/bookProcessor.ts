// Node module version (no Deno serve)
import { getSupabaseAdmin } from '../supabase';
import PQueue from 'p-queue';
import { createEmbeddings, extractCharacters } from './getCharacterService';
import { getPdfSignedUrl, downloadPdf, extractPagesText, chunkPagesToTokenChunks } from './pdfProcessing';

const supabase = getSupabaseAdmin();

async function updateBookStatus(book_id: string, status: string, progressText?: string, errMsg?: string) {
  const update: any = { processing_status: status };
  if (progressText !== undefined) update.processing_progress = progressText;
  if (errMsg !== undefined) update.error_message = errMsg;
  await supabase.from('booksdetails').update(update).eq('id', book_id);
}

export async function processBook(book_id: string) {
  try {
    await updateBookStatus(book_id, 'extracting', 'Started processing book');

    const { data: bookRow } = await supabase.from('booksdetails').select('*').eq('id', book_id).single();
    if (!bookRow) throw new Error('Book not found');

    const pdfUrl = await getPdfSignedUrl(book_id);
    const pdfBuffer = await downloadPdf(pdfUrl);

    const pages = await extractPagesText(pdfBuffer);
    await updateBookStatus(book_id, 'chunking', 'Extracted pages, chunking now');

    const chunks = chunkPagesToTokenChunks(pages);

    // store chunks
    const { data: inserted, error: chunkErr } = await supabase
      .from('book_chunks')
      .insert(chunks.map((c: any) => ({ book_id, ...c })))
      .select('id, chunk_index');
    if (chunkErr) throw new Error(`Failed to insert chunks: ${chunkErr.message}`);

    await updateBookStatus(book_id, 'embedding', `Stored ${chunks.length} chunks, generating embeddings`);

    const queue = new PQueue({ concurrency: 5 });
    const chunkIdMap = new Map<number, string>();
    (inserted || []).forEach((row: any) => chunkIdMap.set(row.chunk_index, row.id));

    await queue.addAll(
      chunks.map((c: any) => async () => {
        const embedding = await createEmbeddings([c.content]);
        const id = chunkIdMap.get(c.chunk_index);
        if (id) await supabase.from('book_chunks').update({ embedding: embedding[0] }).eq('id', id);
      })
    );

    await updateBookStatus(book_id, 'embeddings_complete', `Embeddings completed for ${chunks.length} chunks`);

    if (['fiction', 'children'].includes(bookRow.category.toLowerCase())) {
      await updateBookStatus(book_id, 'characters_extracting', 'Extracting characters');
      const sampleTexts = chunks.slice(0, 5).map((c) => c.content);
      const characters = await extractCharacters(bookRow.title, bookRow.description, sampleTexts);

      for (const char of characters) {
        await supabase.from('characters').upsert({ book_id, ...char });
      }

      await updateBookStatus(book_id, 'characters_done', `Extracted ${characters.length} characters`);
    }

    await updateBookStatus(book_id, 'completed', 'Book processing completed');
  } catch (e: any) {
    console.error('Book processing error:', e);
    await updateBookStatus(book_id, 'error', undefined, e?.message || 'Unknown error');
  }
}

// Expose a simple starter to run processing manually if needed
export async function startProcessing(book_id: string) {
  return processBook(book_id);
}
