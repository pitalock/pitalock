import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * v0.1 scaffolding schema.
 *
 * Includes only the tables needed for the auth foundation (users + sessions).
 * Project / Environment / Secret / Audit_log / Setup_token tables are added
 * with their corresponding feature implementations per ROADMAP v0.1.
 *
 * SPEC §3 (Identity & authentication) and §4 (Cryptographic primitives)
 * govern the field shapes here.
 */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }).notNull().unique(),

  // Argon2id-derived auth hash (separate from the encryption-key derivation).
  // The master password is NEVER sent to the server in any form; the auth hash
  // is computed client-side from a separate KDF output and sent in place of
  // the password. See SPEC §3.
  authHash: text('auth_hash').notNull(),

  // Per-user salt for the client-side KDF (Argon2id).
  // SPEC §4: m=64 MiB, t=3, p=4.
  kdfSalt: text('kdf_salt').notNull(),

  // X25519 keypair. Public key is in clear (used by other members to wrap
  // DEKs to this user). Private key is encrypted with a KEK derived from the
  // master password — server cannot decrypt.
  publicKey: text('public_key').notNull(),
  privateKeyEncrypted: text('private_key_encrypted').notNull(),

  // Recovery escape hatch: same private key wrapped with a KEK derived from
  // the recovery code shown to the user once at signup. SPEC §3 + THREAT_MODEL §5.
  recoveryWrappedPrivateKey: text('recovery_wrapped_private_key').notNull(),

  // SPEC §5: Owner / Admin / Member.
  role: varchar('role', { length: 20 }).notNull().default('member'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // SPEC §3: 7-day rolling, 30-day absolute max. Absolute max enforced at
  // creation time; rolling renewal updates expiresAt on each request.
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  // For unfamiliar-device security alerts (SPEC §13 — surfaced in-app or
  // emailed if RESEND_API_KEY is configured).
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
