import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseAdmin } from "../../supabase";

const supabase = getSupabaseAdmin();

const MAX_CHUNK_CHARACTERS = 1200;

const chunkMetadataSchema = z
  .object({
    chapter_number: z.number().nullable().optional(),
    page_number: z.number().nullable().optional(),
    chapter_heading: z.string().nullable().optional(),
  })
  .passthrough();

const chunkMatchSchema = z
  .object({
    id: z.string(),
    content: z.string(),
    chapter_number: z.union([z.number(), z.string()]).nullable().optional(),
    page_number: z.union([z.number(), z.string()]).nullable().optional(),
    chapter_heading: z.string().nullable().optional(),
    metadata: chunkMetadataSchema.nullable().optional(),
    similarity: z.number().optional(),
  })
  .passthrough();

type ChunkMatch = z.infer<typeof chunkMatchSchema>;

const chunkMatchArraySchema = z.array(chunkMatchSchema);

export async function getRelevantChunks(bookId: string, queryEmbedding: number[], topK = 3) {
  const { data, error } = await supabase.rpc("match_book_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter_book_id: bookId,
  });

  if (error) {
    console.error("Error fetching relevant chunks:", error);
    return [];
  }

  if (!data) {
    return [];
  }

  const parsed = chunkMatchArraySchema.safeParse(data);
  if (!parsed.success) {
    console.error("Failed to parse chunk matches:", parsed.error.flatten());
    return [];
  }

  return parsed.data;
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const asNumber = Number.parseFloat(String(value));
  return Number.isFinite(asNumber) ? asNumber : null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
}

function extractMetadata(match: ChunkMatch) {
  const metadata = match.metadata ?? {};
  const chapterNumber = normalizeNumber(match.chapter_number ?? metadata.chapter_number);
  const pageNumber = normalizeNumber(match.page_number ?? metadata.page_number);
  const chapterHeading = normalizeString(match.chapter_heading ?? metadata.chapter_heading);
  return { chapterNumber, pageNumber, chapterHeading };
}

export function toAnswerContext(matches: ChunkMatch[]): string {
  return matches
    .map((match, index) => {
      const truncated =
        match.content.length > MAX_CHUNK_CHARACTERS
          ? `${match.content.slice(0, MAX_CHUNK_CHARACTERS)}...`
          : match.content;

      const { chapterNumber, pageNumber, chapterHeading } = extractMetadata(match);

      const metadata: string[] = [];
      if (chapterNumber !== null) {
        metadata.push(`Chapter ${chapterNumber}`);
      }
      if (pageNumber !== null) {
        metadata.push(`Page ${pageNumber}`);
      }
      if (chapterHeading) {
        metadata.push(chapterHeading);
      }

      const label = metadata.length
        ? metadata.join(" • ")
        : `Excerpt ${index + 1}`;
      return `### ${label}\n${truncated}`;
    })
    .join("\n\n");
}

export function formatSources(matches: ChunkMatch[]) {
  return matches.map((match) => {
    const { chapterNumber, pageNumber, chapterHeading } = extractMetadata(match);
    return {
      chunk_id: match.id,
      chapter_number: chapterNumber,
      page_number: pageNumber,
      chapter_heading: chapterHeading ?? undefined,
      similarity: match.similarity,
    };
  });
}
