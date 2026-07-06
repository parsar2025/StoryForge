/**
 * Environment variable validation
 * 
 * Validates that all required environment variables are present.
 * Called during Next.js build/dev to fail fast if configuration is incomplete.
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'DATABASE_URL',
  'OPENAI_API_KEY',
] as const;

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  - ${missing.join('\n  - ')}\n\n` +
      'Please check .env.example for required configuration.'
    );
  }
}

// Validate on module load (during build/dev startup)
validateEnv();
