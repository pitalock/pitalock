# Pitalock — Roadmap

> Versioning timeline. Subject to change as we learn. See [SPEC.md](./SPEC.md) for the meaning of any item below.

> **Versioning policy:** Semver. `0.x` until the v1.0 audit ships. Breaking changes between minor versions are possible during 0.x; migration notes will accompany every minor release.

---

## v0.1 — Private alpha

**Goal:** Two people can use Pitalock as their team vault end-to-end. Internal use only.

### In
- Web UI (functional, not polished)
- Master-password-only authentication (no OAuth)
- Setup-token bootstrap flow
- Mandatory recovery code at signup
- Project / Environment / Secret CRUD
- Per-environment ACL with Owner / Admin / Member roles
- Read and read+write grants
- Vercel + Neon deploy path (`Deploy to Vercel` button, Neon free integration)
- Pre-audit warning in README, app footer, and version output

### Out (deferred to later milestones)
- CLI
- Service accounts
- Sharing (one-time links)
- Audit log
- OAuth (GitHub / Google)
- Optional email
- Admin-assisted recovery
- Versioning / rollback
- Multi-format export
- Docker / docker-compose / Railway templates
- Webhooks

---

## v0.5 — Public beta

**Goal:** Useful for real teams. Pre-audit but feature-complete with respect to v1 scope.

### In (additive to v0.1)
- CLI as static binary, distributed via Homebrew formula + curl install script + npm package fallback
- OS-keychain-backed key cache for the CLI
- Service accounts with scoped tokens (project + env + R/RW)
- Audit log (append-only, hash-chained)
- One-time external share links with optional password protection and expiry
- Multi-format export (`.env`, JSON, docker-compose, Kubernetes Secret)
- Secret versioning + one-click rollback (last 20 versions retained)
- Outbound webhooks for state changes
- OAuth (GitHub + Google), opt-in via env vars
- Optional email integration via env var (Resend / Postmark)
- Admin-assisted recovery flow
- Docker + docker-compose for self-hosters
- Railway template
- Pre-audit warning still visible everywhere

### Out (still deferred)
- Push integrations to Vercel / GH Actions / AWS Secrets Manager
- OIDC-bound short-lived service-account tokens
- File primitive
- Secret references / interpolation
- Rotation reminders
- Groups
- Multi-region database setup

---

## v1.0 — Post-audit

**Goal:** Earn the "production ready" label.

### In (additive to v0.5)
- Independent security audit complete (OSTIF-sponsored if possible, paid firm otherwise)
- Audit report published in the repository
- All audit-blocking findings resolved and verified
- Pre-audit warnings removed from README, app, and CLI
- Bug bounty live (modest amounts: hall of fame + per-severity payouts)
- `SECURITY.md` and `/.well-known/security.txt` finalized with PGP key + response-time commitments

### Process gates for tagging v1.0
- All audit findings of severity ≥ Medium resolved
- Audit report published as `docs/audits/<firm>-<date>.pdf`
- Public changelog entry summarizing the audit and the findings

---

## v1.x+ — Deferred features

The following are explicitly **planned but not in v1**. Order is approximate.

- **Push integrations** — sync from Pitalock to Vercel project env, GitHub Actions secrets, AWS Secrets Manager. Each integration is a separate self-contained module.
- **OIDC-bound service-account tokens** — short-lived tokens issued in exchange for a verified OIDC token from GitHub Actions, Vercel, etc. No long-lived secret on the runner.
- **First-class file primitive** — streaming upload/download for binaries (TLS chains, kubeconfigs, full PEM bundles). Adds chunked encryption, content-type, download flow.
- **Secret references / interpolation** — `DATABASE_URL=postgres://...?password=${DB_PASSWORD}` resolved at fetch time. Includes cycle detection, cross-environment refs, escape syntax.
- **Rotation reminders** — opt-in nudges for secrets that have not been changed in N days.
- **Groups** — users in groups, groups granted environment access.
- **Multi-region database** — read replicas for global teams.
- **Post-quantum primitive migration** — once standardized libraries (ML-KEM, SLH-DSA) are mature.

### Explicitly off the roadmap

- **Multi-org / multi-tenant on a single deployment.** This is a deliberate "no" — the single-tenant design is intentional and structural.
- **Browser autofill / browser extension.** Not a password manager. Different scope.
- **Telemetry of any kind from self-hosted instances.** Not now, not later.
