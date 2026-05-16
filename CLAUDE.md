# CLAUDE.md

> Project orientation for Claude Code sessions in this repository. Read this first; it's small on purpose.

## What this project is

**Pitalock** — open-source, zero-knowledge, end-to-end encrypted secret-sharing tool for small teams. Single-tenant per deployment. One-click self-host on Vercel. MIT licensed.

## Read these in this order

1. [`docs/SPEC.md`](./docs/SPEC.md) — canonical design reference. What Pitalock is, trust model, crypto primitives, data model, sharing mechanics, tech stack, deploy targets, pre-1.0 status, out-of-scope list.
2. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — v0.1 / v0.5 / v1.0 / v1.x+ milestones. Use this to decide whether a feature request belongs in the current milestone or should be deferred.
3. [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) — what Pitalock protects against, what it does not, and the explicit service-account trust expansion.
4. [`SECURITY.md`](./SECURITY.md) — disclosure policy.
5. [`AGENTS.md`](./AGENTS.md) — Next.js 16 framework-specific warning. **Read this before writing any Next.js code** — Next.js 16 has breaking changes from training data; consult `node_modules/next/dist/docs/` for current APIs.

If a question can be answered by reading those documents, read them rather than asking the user.

## Current implementation status

Pre-1.0, pre-audit. v0.1 scaffolding in progress.

**What's in place:**
- Next.js 16 + React 19 + Tailwind v4 + TypeScript scaffold
- Drizzle ORM + porsager/postgres client (`lib/db.ts`)
- Initial schema with `users` + `sessions` tables (`db/schema.ts`) — full schema lands incrementally with feature work
- Env var validation via Zod (`lib/env.ts`)
- Crypto deps pinned exact: `@noble/hashes` and `@noble/curves` (see SPEC §4 for the pinning rule)
- Pitalock-branded landing page with prominent pre-audit warning (`app/page.tsx`)

**What's NOT yet in place** (next sessions, ROADMAP v0.1):
- Auth flow (master password + setup token + recovery code)
- Project / Environment / Secret CRUD + schema for them
- Per-environment ACL with Owner / Admin / Member roles
- Audit log table
- Vercel deployment configuration (`vercel.json`)

**Note on Auth.js:** SPEC §9 lists Auth.js for v1. For v0.1 (master-password-only, no OAuth) we are likely to hand-roll session management — Auth.js's Credentials provider quirks make it easier to integrate when we add OAuth in v0.5. Final call deferred to the auth implementation session.

## Maintainer

Built and maintained by [@shwarmadev](https://github.com/shwarmadev).

## Non-negotiable conventions

These exist for security reasons, not aesthetic ones. Re-read SPEC and THREAT_MODEL if unsure why.

### Cryptography
- Use only the primitives listed in [SPEC §4](./docs/SPEC.md#4-cryptographic-primitives). No others.
- **Never roll custom cryptography.** No "creative" combinations of primitives.
- Pin all crypto-adjacent dependencies to **exact** versions in the lockfile (no `^`, no `~`).

### Authentication
- Every server action and route handler **must** start with `await requireAuth(role)`. A custom ESLint rule fails CI if missing.
- **Never rely on Next.js middleware as the only auth gate** — explicitly avoids the 2025 middleware-bypass class of CVE.
- The master password is **never sent to the server** in any form. Authentication uses a separately-derived hash; encryption uses a separately-derived key.

### Data handling
- Drizzle parameterizes all queries. No raw SQL string concatenation.
- All external input is validated through Zod schemas before reaching business logic.
- React handles HTML escaping. **Never use `dangerouslySetInnerHTML`.**
- All redirects validated against an allowlist of relative paths.

### Pre-1.0 visibility
The "pre-audit" warning must remain visible in **all three** of:
1. README (top of file)
2. App UI footer
3. CLI `--version` output

Until the v1.0 audit is complete and findings are resolved.

### Telemetry
**Zero phone-home from self-hosted instances. Ever.** The opt-in update check (off by default) is the only outbound network call the running app makes that is not initiated by a user action — and it goes to GitHub Releases API only, sends nothing.

## Things explicitly out of scope — do NOT propose these

See [SPEC §16](./docs/SPEC.md#16-out-of-scope-v1) for the full list with reasoning. Highlights:

- **Browser autofill / browser extension** — forever, not just v1. Different threat model, different scope.
- **First-class file storage primitive** — use 64 KiB string values for base64-encoded certs/keys/JSONs instead.
- **Telemetry of any kind** from self-hosted instances. Ever.
- **Multi-org / multi-tenant** on a single deployment. The single-tenant design is intentional and structural.
- **Push integrations** (Vercel/GH Actions sync) — deferred to v1.x. Webhooks cover the v1 gap.
- **Secret references / interpolation** (`${OTHER_SECRET}`) — deferred to v1.x.
- **Custom roles or groups** — Owner/Admin/Member is sufficient at v1.
- **Mandatory email** — adds setup friction, not justified by value at v1.

## Tone

- Documentation is technical and precise, not marketing.
- No emoji in code or documentation unless the user explicitly requests it.
- README and SECURITY.md stay tight; SPEC and THREAT_MODEL can be longer.

## Planned repository layout

Current:
```
pitalock/
  CLAUDE.md           # this file
  README.md
  LICENSE             # MIT
  SECURITY.md
  docs/
    SPEC.md
    ROADMAP.md
    THREAT_MODEL.md
```

Once v0.1 implementation begins:
```
pitalock/
  app/                # Next.js App Router pages + route handlers
  components/         # React components (shadcn/ui-derived)
  lib/                # Shared utilities, crypto helpers, auth, db client
  drizzle/            # Schema definition + migrations
  cli/                # Standalone CLI source (separate build target)
  public/             # Static assets
  package.json
  drizzle.config.ts
  next.config.ts
  tsconfig.json
  vercel.json         # routing + build config
  .github/workflows/  # CI
```

## Working with the user

- The user is `@shwarmadev` on GitHub, also referred to as Anish.
- Default to short, concise responses unless asked otherwise.
- The grilling phase that produced the design documents was structured (one question at a time, with recommendation). For implementation work, lean toward action with brief updates rather than questions, and surface decisions only when they're truly load-bearing.
