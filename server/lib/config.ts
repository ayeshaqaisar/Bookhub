// Centralized environment configuration with validation
// All env vars are validated at module load time to fail fast in production

import { z } from 'zod';

const configSchema = z.object({
  // Server settings
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),

  // Supabase settings
  supabaseUrl: z.string().url('SUPABASE_URL must be a valid URL'),
  supabaseServiceRoleKey: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // OpenAI settings
  openaiApiKey: z.string().min(1, 'OPENAI_API_KEY is required'),
  openaiModel: z.string().default('gpt-4-turbo'),
  openaiEmbeddingModel: z.string().default('text-embedding-3-small'),

  // CORS settings
  corsOrigins: z.string().default('*').transform(origins => {
    if (origins === '*') return ['*'];
    return origins.split(',').map(o => o.trim());
  }),

  // Feature flags
  enableLegacyRoutes: z.boolean().default(true),
});

type Config = z.infer<typeof configSchema>;

/**
 * Validate and parse environment variables
 * Throws detailed error if validation fails
 */
function validateConfig(): Config {
  try {
    const config = configSchema.parse({
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      logLevel: process.env.LOG_LEVEL,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL,
      openaiEmbeddingModel: process.env.OPENAI_EMBED_MODEL,
      corsOrigins: process.env.CORS_ORIGINS,
      enableLegacyRoutes: process.env.ENABLE_LEGACY_ROUTES === 'true',
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n  ');

      throw new Error(
        `Environment validation failed:\n  ${issues}\n\nPlease check your .env file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}

let cachedConfig: Config | null = null;

/**
 * Get validated configuration
 * Configuration is validated once and cached
 */
export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = validateConfig();
  }
  return cachedConfig;
}

/**
 * Force reload configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

// Type export for TypeScript usage
export type AppConfig = Config;
