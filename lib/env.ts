import { z } from 'zod';

/**
 * Environment variable schema. Validated at module load — startup fails
 * loudly if a required variable is missing or malformed.
 *
 * Optional variables: when unset, the related feature is disabled.
 *   - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET → Sign in with GitHub (SPEC §3)
 *   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET → Sign in with Google
 *   - RESEND_API_KEY → Out-of-band security alert emails (SPEC §13)
 *
 * NOT loaded server-side at module top in code paths that run at build time
 * without a DATABASE_URL — only at request time. Next.js may statically
 * analyze imports, so be careful where this is imported.
 */

const schema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // First-run bootstrap (SPEC §12). Required to claim the Owner role.
  // Auto-generated in production builds; for local dev, set in .env.
  OWNER_SETUP_TOKEN: z.string().min(32).optional(),

  // Optional: OAuth providers (opt-in per SPEC §3).
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Optional: Email (SPEC §13). Without it, alerts are in-app only.
  RESEND_API_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
