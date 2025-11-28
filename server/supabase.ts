import { createClient } from '@supabase/supabase-js';
import { getConfig } from './lib/config';

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

/**
 * Get Supabase admin client (service role)
 * Uses centralized configuration for URL and API key
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const config = getConfig();

    try {
      supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: { persistSession: false },
      });
      console.log("Supabase admin client initialized");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Supabase client: ${message}`);
    }
  }

  return supabaseAdmin;
}
