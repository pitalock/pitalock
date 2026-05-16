import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';
import { env } from '@/lib/env';

/**
 * Drizzle client backed by porsager/postgres.
 *
 * Vercel serverless functions reuse warm instances, so the connection is
 * cached on globalThis to avoid re-creating per invocation. In production,
 * each function instance keeps a single connection (max=1) and recycles
 * idle connections quickly. prepare=false is required for some serverless
 * Postgres providers (notably Neon's pooler).
 */

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

const pgClient =
  globalForDb.pgClient ??
  postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
  });

if (env.NODE_ENV !== 'production') {
  globalForDb.pgClient = pgClient;
}

export const db = drizzle(pgClient, { schema });
