import type { PostgrestError } from "@supabase/supabase-js";

export function formatSupabaseError(error: PostgrestError | null): string {
  if (!error) return "Supabase request failed";
  if (error.details) return error.details;
  if (error.message) return error.message;
  return "Supabase request failed";
}

export function isConflictError(error: PostgrestError | null): boolean {
  return Boolean(error && error.code === "23505");
}
