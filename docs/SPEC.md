# Pitalock — Specification

> Canonical reference for what Pitalock is and how it works. Implementation reference, not marketing copy.

> **Status:** Pre-1.0, pre-audit. Not yet recommended for high-stakes production secrets. See [ROADMAP.md](./ROADMAP.md) for milestones and [THREAT_MODEL.md](./THREAT_MODEL.md) for the security boundary.

---

## 1. What Pitalock is

A zero-knowledge, end-to-end encrypted secret-sharing tool for small teams. Built for the canonical use case of "the team needs to share environment variables securely without paying for Bitwarden Enterprise or Doppler." Ships as a single open-source codebase that a team owner self-hosts on Vercel (or anywhere that runs Next.js + Postgres) in roughly two minutes.

**Single-tenant per deployment** — one Pitalock install IS one team's vault. There is no concept of multiple organizations sharing an instance.

---

## 2. Trust model

**Zero-knowledge / end-to-end encrypted.** The server stores only ciphertext. The encryption key is derived from a user's master password on the client and never leaves the client. Even with full compromise of the Pitalock server (Postgres database, Vercel function logs, all environment variables), an attacker recovers nothing but encrypted blobs they cannot decrypt.

The hosting provider (Vercel, Neon, Railway, anywhere Pitalock runs) is **outside** the trust boundary.

The user's browser and device are **inside** the trust boundary. A compromised endpoint is a compromised vault — same threat model as every password manager.

Service-account tokens are an explicit, documented exception. See [THREAT_MODEL.md §2](./THREAT_MODEL.md) for the boundary.

---

## 3. Identity & authentication

### Master password (mandatory)

Every user has a master password. The master password is the root from which the encryption key is derived. It is **never sent to the server** in any form. Authentication uses a separately-derived hash; encryption uses a separately-derived key.

### OAuth (optional, opt-in via env vars)

Pitalock supports GitHub and Google as OAuth identity providers. OAuth is **opt-in**: setting the relevant client ID/secret env vars enables the corresponding sign-in button. With no OAuth env vars set, Pitalock works fully with master-password-only auth.

OAuth provides identity. The master password still derives the encryption key — OAuth users still set and remember a master password.

### Sessions

- Server-side session table in Postgres (revocable instantly from any device).
- Cookie attributes: `HttpOnly`, `Secure`, `SameSite=Strict`, signed.
- 7-day rolling expiry, 30-day absolute maximum.
- Re-prompt master password on sensitive operations: bulk export, member removal, role change, recovery code regeneration.

### Recovery

- **Mandatory recovery code at signup.** A 24-word BIP-39-style mnemonic is shown once. The user must type it back to confirm before account creation completes. The recovery code wraps a copy of the user's keypair.
- **Admin-assisted recovery.** When a user with admins forgets their master password and recovery code, an Admin can initiate a re-share flow: the user generates a new keypair, and each Admin's client re-encrypts every secret the user previously had access to using the new public key.
- **No server-side escrow.** The server cannot recover a user's data without an Admin's participation.

---

## 4. Cryptographic primitives

| Purpose | Primitive | Library |
|---|---|---|
| Key derivation (password → key) | Argon2id (m=64 MiB, t=3, p=4) | `@noble/hashes` |
| Symmetric encryption | AES-256-GCM | WebCrypto (browser-native) |
| Key agreement | X25519 | `@noble/curves` |
| Signing | Ed25519 | `@noble/curves` |
| Sealed-box-style envelopes | XChaCha20-Poly1305 | `libsodium-js` |
| Random | `crypto.getRandomValues` | WebCrypto |

**No custom cryptography. No "creative" combinations of primitives.** If a feature needs a primitive these don't provide, the feature is not shipped.

All cryptographic library versions are **pinned exactly** in the lockfile (no `^`, no `~`).

---

## 5. Data model

### Hierarchy

```
Project
  └── Environment
        └── Secret (versioned)
```

- A **Project** represents an application or service (e.g., `marketing-site`).
- An **Environment** represents a deployment target (e.g., `dev`, `staging`, `prod`). Environments are user-defined; the schema does not impose a fixed set.
- A **Secret** has a key (e.g., `DATABASE_URL`) and a value (text up to 64 KiB). The same key in different environments is a different secret with potentially different values.

### Roles

| Role | Quantity | Capabilities |
|---|---|---|
| Owner | Exactly one per deployment | Everything. Includes ownership transfer. Cannot be deleted. |
| Admin | Zero or more | Manage users (invite, remove, role change), manage projects (create, delete), grant per-environment access. Implicit access to projects they create or are added to. |
| Member | Zero or more | Per-environment grants only. Cannot manage users or projects. |

### Permission grants

Members are granted access to specific environments. Two grant levels per environment:

- **Read** — can decrypt and view secrets
- **Write** — read + edit values + add/remove keys

There are no groups in v1. Per-user grants only.

### Secret versioning

- Append-only `secret_versions` table.
- Latest-version-wins on read.
- Last 20 versions per secret retained, older pruned.
- Versions are encrypted with the same DEK as the latest value.

### Revocation honesty

Removing a member from an environment removes their *future* server-side access. It does **not** invalidate secret material they already saw. The UI explicitly surfaces a "rotate these secrets in source systems" prompt with per-secret tracking. Optional environment DEK rotation is available as a button (does not change values, but invalidates any cached ciphertext on the removed user's device).

---

## 6. Sharing & encryption mechanics

### Per-environment DEK

Each environment has a symmetric data encryption key (DEK). All secrets in that environment are encrypted with that DEK. The DEK is itself wrapped (encrypted) using each member's public key.

- Adding a member: an existing member's client unwraps the DEK and re-wraps it using the new member's public key. Server cannot perform this — it has no plaintext DEK.
- Removing a member: server-side ACL removed. Optional DEK rotation: a current member's client generates a new DEK, re-encrypts all secrets, re-wraps the new DEK to all remaining members.

### One-time external share links

For sharing a single secret with someone outside the team (vendor, contractor, customer):

- Client generates an ephemeral symmetric key (`crypto.getRandomValues`).
- Client encrypts the payload with that key (XChaCha20-Poly1305).
- Server stores ciphertext + metadata (expiry, max views, optional password-derived auth).
- The share URL contains the ephemeral key in the URL fragment (`#k=...`) — fragments are never sent to the server.
- Expiry: configurable, default 7 days or 1 view.
- Optional password protection: PBKDF2 over a user-chosen password, used as additional input to AES-GCM.
- Server never has the key. Server cannot decrypt the payload.

This feature also serves as the project's public-facing "free Privnote-style sharing" entry point.

---

## 7. CLI & service accounts

### CLI

Distributed as a single static binary (Homebrew + curl install + npm fallback for Node-only environments).

```
pitalock login
pitalock pull <project>/<env> > .env
pitalock push <project>/<env> .env
pitalock run -e <project>/<env> -- <command>
pitalock export <project>/<env> --format=docker-compose
```

The CLI:
- Authenticates interactively against the same OAuth+master-password flow as the web UI.
- Caches the unwrapped encryption key in the OS-native credential store (macOS Keychain, Windows Credential Manager, Linux Secret Service).
- Re-derives the key from master password on first use after cache expiry.

### Service accounts

For non-interactive consumers (CI, production runtime):

- Created from the web UI by Admins.
- Token format: `psa_live_<32-bytes-base64url>`.
- **Scoped:** one project + one environment + read OR read+write. Tokens are not multi-environment.
- Per-token rate limit.
- Revocable from UI; revocation is immediate (server-side check).
- Audit log entry on every token use.

**Trust expansion:** the token, by physical necessity, holds key material on the machine that uses it. Anyone with read access to that machine can decrypt the secrets the token has access to. Pitalock is zero-knowledge with respect to the **Pitalock server**, not with respect to wherever a service-account token lives. This is the same model as Doppler, Infisical, and 1Password Connect. See [THREAT_MODEL.md §3](./THREAT_MODEL.md).

OIDC-bound short-lived tokens (GitHub Actions / Vercel OIDC) are deferred to v1.x — see [ROADMAP.md](./ROADMAP.md).

---

## 8. Audit log

- Append-only Postgres table (`audit_log`).
- No `UPDATE` or `DELETE` permissions on it from the application role.
- Each entry includes the SHA-256 hash of the previous entry (hash-chained). Tampering with any past entry is detectable.
- Visible to Owner and Admins only.
- Logged events (non-exhaustive): login success/failure, secret read/write/create/delete, member added/removed, role changed, project created/deleted, service-account token created/used/revoked, environment DEK rotated, recovery code regenerated, OAuth provider linked/unlinked.
- Event metadata is plaintext (the value of a secret is not logged — only that it was accessed). The metadata itself is not sensitive.

---

## 9. Tech stack

| Layer | Choice |
|---|---|
| Frontend framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| UI primitives | Tailwind v4 + shadcn/ui |
| Data fetching | TanStack Query |
| Validation | Zod (everywhere — backend and frontend share schemas) |
| Auth | Auth.js (formerly NextAuth) with custom credentials provider for master-password flow |
| ORM | Drizzle |
| Database | Postgres (any provider via `DATABASE_URL`) |
| Rate limiting | `@upstash/ratelimit` |
| Testing | Vitest (unit) + Playwright (E2E with real browser crypto) |
| CI | GitHub Actions + CodeQL + Socket.dev (or Snyk) + Dependabot |
| Package manager | pnpm with strict frozen lockfile in CI |

### Per-endpoint authorization pattern

**Every server action and route handler** begins with `await requireAuth(role)` (or equivalent). Middleware is defense-in-depth only. A custom ESLint rule fails CI if a server entry point omits the auth check.

This explicitly avoids the class of vulnerabilities exemplified by the 2025 Next.js middleware-bypass CVE.

---

## 10. HTTP hardening

- **CSP:** `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none';`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: same-origin`
- `Permissions-Policy` denies all features Pitalock does not use
- `Cache-Control: no-store` on every authenticated response

---

## 11. Deploy targets

| Target | Status | Notes |
|---|---|---|
| Vercel + Neon | Primary, recommended | "Deploy to Vercel" button, Neon integration auto-provisions Postgres, free tier viable |
| Railway template | Supported | Single platform for app + DB, ~$5/mo hobby |
| Docker / docker-compose | Supported | Covers Fly, Render, Coolify, raw VPS, k8s |

Migrations run automatically on deploy via `drizzle-kit migrate` in the build step. Idempotent.

Updates: Git fork + auto-redeploy on Vercel/Railway, or pinned Docker image tags. Releases are semver-tagged, signed (GPG-signed tags + cosign-signed release artifacts), and published to GitHub Releases with SHA-256 sums.

---

## 12. First-run bootstrap

1. Deploy completes. Pitalock auto-generates an `OWNER_SETUP_TOKEN` (32 random bytes, hex-encoded) during the build. The token is surfaced in the deploy logs.
2. The Owner visits the deployed URL. The first-run wizard requires the setup token before any account can be created.
3. The Owner enters the token, sets email + master password, sees their recovery code (typed back to confirm), and lands as Owner.
4. The setup token is invalidated. Subsequent users join via Admin-issued invite link only.

This eliminates the "race condition where a passerby claims Owner of someone else's deployment" failure mode.

---

## 13. Telemetry & external network calls

- **Zero telemetry from self-hosted instances. Ever.** Pitalock never phones home about usage, features, errors, or anything else.
- **Update notifications are opt-in, off by default.** When enabled by the Owner in admin settings, the instance performs one daily HTTPS GET to `https://api.github.com/repos/<org>/pitalock/releases/latest` to check the version tag. No data is sent. A banner appears in the Owner's dashboard if a newer version exists.
- **Email is optional**, configured via env var (`RESEND_API_KEY` or equivalent). When unset, security alerts surface in-app on next login with a "⚠️ N security events since your last login" banner.

A Pitalock instance with `OWNER_SETUP_TOKEN`, `DATABASE_URL`, no OAuth env vars, no `RESEND_API_KEY`, and update-check disabled has **zero outbound network calls** apart from those initiated by the Owner's browser via the Pitalock UI.

---

## 14. License & contributions

- **License:** MIT.
- **No CLA.** Inbound contributions are MIT by GitHub Terms of Service §D.6.
- **Commit signing required.** All maintainer commits are GPG-signed. Contributors are encouraged but not required to sign.

---

## 15. Pre-1.0 status

Until v1.0, Pitalock has not undergone independent security audit. The codebase will display a clear pre-audit warning in:

- The README (top of file)
- The deployed app's footer
- The CLI version output (`pitalock --version` includes the warning)

We are pursuing a sponsored audit through OSTIF as the first option, with paid audit (Cure53, Trail of Bits, NCC Group, Doyensec, X41) as fallback. v1.0 will not be tagged until the audit report is published in the repository and audit-blocking findings are resolved.

---

## 16. Out-of-scope (v1)

| Item | Reason |
|---|---|
| First-class file primitive | 64 KiB string values cover base64-encoded certs/keys/JSONs |
| Secret references / interpolation (`${OTHER}`) | Complexity, deferred to v1.x |
| Rotation reminders | Cute, low real value at v1 |
| Browser autofill / extension | Not a password manager. Out of scope **forever**. |
| Push integrations (Vercel, GH Actions sync) | Each platform's API is a rabbit hole. Webhooks cover the gap in v1. |
| Multi-org / multi-tenant on one deployment | Single-tenant per deployment is the design intent |
| Mandatory email | Adds setup friction, not justified by value at v1 |
| Telemetry of any kind | Trust posture |
| Custom roles / custom permission models | Owner/Admin/Member is sufficient |
| Groups | Direct ACL grants are sufficient at <30 users |
