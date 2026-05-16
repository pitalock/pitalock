import { defineConfig } from 'drizzle-kit';

// drizzle-kit (>= 0.31) automatically loads .env / .env.local from cwd.
// For Vercel builds, env vars are provided by the platform.

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
