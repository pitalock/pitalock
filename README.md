# Pitalock

> Zero-knowledge, end-to-end encrypted secret sharing for small teams. Open source. Self-hostable in two minutes.

> ⚠️ **Pre-1.0, pre-audit.** Pitalock has not yet undergone independent security audit. Not yet recommended for high-stakes production secrets. See [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) and [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

Pitalock is an open-source secret manager for the canonical "the team needs to share environment variables securely" use case. The server stores only ciphertext; encryption keys are derived from each user's master password on the client and never leave the client. With full compromise of a Pitalock server, an attacker recovers nothing but encrypted blobs they cannot decrypt.

Built as a free, focused alternative to Bitwarden Enterprise, Doppler, and Infisical for teams that want a simple, honest secret-sharing tool that they fully control.

## What's included

- Zero-knowledge end-to-end encryption (Argon2id KDF, AES-256-GCM, X25519, Ed25519)
- Project / Environment / Secret hierarchy (matches `.env.production`-style mental models)
- Owner / Admin / Member roles with per-environment read or read+write grants
- Master password authentication, optional GitHub + Google OAuth (opt-in via env vars)
- Mandatory recovery code at signup (24-word mnemonic, shown once)
- Admin-assisted recovery flow
- Append-only, hash-chained audit log
- One-time external share links (Bitwarden-Send-style, encrypted client-side, key in URL fragment)
- Multi-format export (`.env`, JSON, docker-compose, Kubernetes Secret)
- Versioned secrets with one-click rollback
- CLI as a static binary
- Service accounts with scoped tokens for non-interactive consumers (CI, production runtime)
- Outbound webhooks for state changes
- Single-tenant per deployment — one Pitalock install IS your team's vault

See [`docs/SPEC.md`](./docs/SPEC.md) for what each item means, and [`docs/ROADMAP.md`](./docs/ROADMAP.md) for what ships when.

## Status

Pre-1.0. Implementation in progress per [`docs/ROADMAP.md`](./docs/ROADMAP.md). v1.0 will not be tagged until an independent security audit (OSTIF-sponsored if possible, paid firm otherwise) is complete and the report is published in this repository.

Not all features listed above are implemented yet. Check the ROADMAP for the current milestone status.

## Documentation

- [`docs/SPEC.md`](./docs/SPEC.md) — canonical design reference
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — versioning and milestones
- [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) — what Pitalock protects against, what it does not
- [`SECURITY.md`](./SECURITY.md) — vulnerability disclosure policy

## Quick start

Coming with v0.1. The recommended deploy path will be one-click via the Vercel "Deploy" button paired with the Neon Postgres free integration. Docker / docker-compose for VPS self-hosters and a Railway template are also planned.

## Contributing

Contributing guide will be published with v0.5. In the pre-0.5 phase, the most valuable contributions are:

- Reading the design docs and pointing out anything underspecified, contradictory, or wrong.
- Reading [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) and surfacing scenarios we haven't accounted for.

For security issues, see [`SECURITY.md`](./SECURITY.md). Please do not file public GitHub issues for vulnerabilities.

## License

MIT. See [`LICENSE`](./LICENSE).

## Built by

[@shwarmadev](https://github.com/shwarmadev) — [pitalock.dev](https://pitalock.dev)
