# Pitalock — Threat Model

> Honest enumeration of what Pitalock protects against, what it does not, and the trust assumptions baked into the design. Written to be useful to security auditors, prospective adopters, and anyone reviewing the codebase for vulnerabilities.

> **Status:** Pre-audit. This document reflects the design intent and current implementation goals. Reality may diverge until the codebase is audited and the audit report is published. See [ROADMAP.md](./ROADMAP.md).

---

## 1. Trust assumptions

These are conditions Pitalock assumes are true. If any is violated, the security guarantees in this document do not apply.

| Assumption | Implication if violated |
|---|---|
| The user's device is uncompromised while in use | An attacker on the device sees plaintext secrets and the master password as the user types |
| The browser is uncompromised | A malicious browser, browser extension, or browser-level attacker can extract in-memory keys |
| The browser's WebCrypto implementation is correct | Cryptographic operations may be unsound; this is the standard assumption every web crypto app makes |
| Audited cryptographic libraries (`@noble/*`, `libsodium-js`) are not malicious or backdoored | A supply-chain compromise of these libraries breaks confidentiality. Mitigated by version pinning, lockfile, dependency scanning |
| The user safely stores their master password and recovery code | If the user writes the master password on a sticky note photographed by an attacker, no design choice can save them |
| The DNS and CA infrastructure are functioning | A successful CA-level MITM defeats TLS. We rely on browser CA stores; certificate pinning is not used because it would break the self-host story |

---

## 2. Cryptographic boundary

What the Pitalock server **sees**:

- User identity records (email, OAuth provider IDs)
- **Encrypted ciphertext blobs** for every secret value (cannot decrypt)
- **Wrapped DEKs** per environment, per member (cannot decrypt)
- Each user's **public key**
- ACL metadata: who has access to which environment
- Audit log entries (event metadata only — never secret values)
- Session tokens
- Login timestamps and IP addresses
- Service-account token hashes (the raw token is shown to the admin once at creation)

What the Pitalock server **never sees**:

- **Master passwords** — never sent over the network in any form
- **Derived encryption keys** — never leave the client
- **Secret values in plaintext**
- **Recovery codes** — never sent to the server; consumed locally during password reset
- **One-time share link payload contents** — server has ciphertext, the URL fragment carrying the key never reaches the server

The ciphertext-only storage is what makes the term "zero-knowledge" defensible. Even with full disk access, root on every Vercel function, and a copy of every environment variable, an attacker with database read cannot recover any secret value.

---

## 3. The service-account exception

Service-account tokens are an explicit, documented expansion of the trust boundary. We name it clearly so users are not surprised.

A service-account token, by physical necessity, must hold key material on the machine that uses it (a CI runner, a production server, a cron worker). Anyone with read access to that machine — root, `cat /proc/<pid>/environ`, a malicious script the CI runs, an attacker who SSHed in — can extract the token and decrypt the secrets the token has access to.

**Pitalock is zero-knowledge with respect to the Pitalock server, not with respect to wherever a service-account token lives.**

This is the same model as Doppler, Infisical, 1Password Connect, AWS Secrets Manager SDK, and every other secret-fetching system that supports non-interactive use. There is no design that avoids this trade-off; non-interactive access *requires* key material at the point of consumption.

Mitigations Pitalock provides:

- Tokens are **scoped**: one project + one environment + read OR read+write. A leaked CI token cannot exfiltrate secrets the CI never needed.
- Tokens are **revocable instantly** from the UI.
- Every token use is **audit-logged** (timestamp, IP, what was fetched).
- Per-token **rate limit** caps blast radius of automated abuse.
- Token format includes a public prefix (`psa_live_…`) that secret scanners (GitGuardian, GitHub Advanced Security) can detect if accidentally committed.

OIDC-bound short-lived tokens (which eliminate the long-lived-secret-on-the-runner problem for CI specifically) are planned for v1.x.

---

## 4. What Pitalock protects against

### Server / hosting compromise

- **Threat:** an attacker gains full read access to the Pitalock server — Vercel function logs, Postgres database, environment variables.
- **Defense:** zero-knowledge encryption. Server stores ciphertext only.
- **Effective:** yes. The attacker recovers encrypted blobs they cannot decrypt. The master password is never sent to the server in any form.

### Passive network adversary

- **Threat:** ISP, network operator, or other party observes traffic between client and server.
- **Defense:** TLS everywhere; HSTS preload; no mixed content.
- **Effective:** yes against passive observation. TLS confidentiality assumed sound.

### Active network adversary (MITM)

- **Threat:** attacker intercepts and modifies traffic.
- **Defense:** TLS with browser CA validation. HSTS prevents downgrade to HTTP.
- **Effective:** yes, conditional on the CA infrastructure being uncompromised. We do not pin certificates (would break the self-host story).

### Server-side data tampering

- **Threat:** attacker with database write access modifies stored secrets to inject malicious values.
- **Defense:** every ciphertext is AES-256-GCM authenticated. Tampering causes decryption failure (not silent return of malicious plaintext). The audit log is hash-chained.
- **Effective for content integrity:** yes. The audit-log defense is detective only — an attacker with full DB write can rewrite the entire chain forward, but they cannot modify a single past entry without breaking the chain. To detect full-chain forgery we recommend periodically exporting the latest hash to an off-server location (a hardware wallet, a printed page, a separate logging service) — operational guidance, not a code feature.

### Stolen session cookie

- **Threat:** attacker exfiltrates a valid session cookie via XSS, malware, or shoulder-surfing.
- **Defense:** `HttpOnly` (no JS access), `Secure` (HTTPS-only), `SameSite=Strict` (no cross-site sending), server-side session table allowing instant revocation, short rolling expiry.
- **Effective:** yes for cookie theft via cross-site requests. Sessions can be revoked instantly from any of the user's devices.

### Cross-site scripting (XSS)

- **Threat:** attacker injects script that runs in a user's browser context.
- **Defense:** strict CSP, React's auto-escaping (no `dangerouslySetInnerHTML`), Zod validation on all input boundaries, no `eval`, no inline scripts.
- **Effective:** minimizes attack surface to near zero. Honest caveat: a successful XSS still has access to the in-memory decryption key while the user has the vault unlocked. This is the same residual risk every browser-based password manager has.

### Cross-site request forgery (CSRF)

- **Threat:** attacker tricks a logged-in user's browser into making state-changing requests.
- **Defense:** `SameSite=Strict` cookies (no cross-site sending), CSRF tokens on state-changing requests (Auth.js handles this), explicit per-endpoint auth checks (no middleware-only auth — explicitly avoids the 2025 Next.js middleware-bypass class of CVE).
- **Effective:** yes.

### SQL injection

- **Threat:** attacker sends crafted input that becomes SQL.
- **Defense:** Drizzle ORM parameterizes all queries. No raw SQL string concatenation anywhere in the codebase. Custom ESLint rule fails CI on any `db.execute(\`...\${userInput}...\`)` pattern.
- **Effective:** yes.

### Open redirect

- **Threat:** attacker crafts URL with redirect parameter pointing at a phishing site.
- **Defense:** all redirects validated against an allowlist of relative paths. External redirects rejected.
- **Effective:** yes.

### Brute-force on master password

- **Threat:** attacker attempts password guesses against the login endpoint.
- **Defense:** Argon2id KDF (m=64 MiB, t=3, p=4, OWASP 2024 baseline) makes per-guess cost prohibitive. Server-side rate limit per account and per IP via `@upstash/ratelimit`. Account lockout after N failed attempts (alerts surfaced to user).
- **Effective:** a strong master password (≥12 chars, diverse character classes) is computationally infeasible to brute-force in any realistic timeframe. The defense relies on Pitalock enforcing a minimum master-password strength at signup.

### Compromised admin

- **Threat:** an admin account is taken over and used to add the attacker to projects/envs they should not access.
- **Defense:** every admin action recorded in the tamper-evident audit log. Owner can review and revoke.
- **Effective:** detective, not preventive. By definition, an admin is trusted within their scope.

### Owner takeover via race condition on first deploy

- **Threat:** a passerby hits a freshly-deployed Pitalock URL before the legitimate Owner can register.
- **Defense:** setup token required to claim Owner. Token is auto-generated in the build and surfaced only in deploy logs (not in any public surface).
- **Effective:** yes. No registration is possible without the token.

### Phishing of OAuth callback

- **Threat:** attacker spoofs the OAuth provider to capture an OAuth code.
- **Defense:** Auth.js validates `state` parameter, callback URL allowlist, PKCE for OAuth providers that support it.
- **Effective:** yes against standard OAuth phishing patterns.

---

## 5. What Pitalock does NOT protect against

These are documented out-of-scope risks. Adopters must understand them.

### Compromised user device

A keylogger, RAT, or malicious browser extension on the user's computer can capture the master password as it is typed and decrypt every secret the user has access to. **No browser-based password manager can defend against endpoint compromise.** Same threat model as Bitwarden, 1Password, Proton Pass.

**Mitigation outside our control:** users should keep devices patched, avoid unknown extensions, use separate browser profiles for sensitive work.

### Service-account token leak (the documented exception)

See §3. A leaked service-account token compromises every secret it has access to until revoked. Revoke immediately on suspicion. Rotate the underlying secrets in the source systems too — revoking the token does not invalidate cleartext the token already retrieved.

### Coercion / rubber-hose attacks

Pitalock does not defend against a user being physically or legally compelled to enter their master password. There is no plausible-deniability mode.

### Forgotten master password AND lost recovery code

For a solo Owner with no other admins, losing both the master password and the recovery code is **unrecoverable by design**. Secrets are lost. There is no escape hatch — providing one would require server-side escrow, which would defeat zero-knowledge.

**Mitigation:** mandatory recovery code at signup with explicit storage advice. Strongly recommend at least one additional Admin in any team, even if just for recovery purposes.

### Recovery code leak

The recovery code is functionally a second master password. If a user stores it in plaintext on their desktop, an attacker with that file owns the account.

**Mitigation:** UI explicitly suggests storage in a hardware wallet, paper safe, or another password manager. Recovery code is shown once at signup and the user must type it back to confirm before account creation completes.

### Supply-chain attack on a dependency

A malicious update to a transitive dependency (postinstall script in a sub-dependency, compromised maintainer account) could compromise a build.

**Mitigations:**
- All cryptographic libraries pinned to exact versions in the lockfile.
- pnpm with strict frozen-lockfile install in CI.
- Socket.dev (or Snyk) scanning every PR.
- CodeQL scanning enabled.
- Dependabot alerts on.
- We commit to never accepting a dependency update without reviewing the changelog, especially for crypto-adjacent libraries.

These reduce risk significantly but do not eliminate it. The user's only further mitigation is to pin Pitalock to specific commits and review the dependency tree before updating.

### Compromise of the Pitalock release pipeline

A malicious commit pushed to `github.com/<org>/pitalock` could end up in users' deployments via auto-pull.

**Mitigations:**
- All maintainer commits GPG-signed.
- All release tags GPG-signed.
- All release artifacts cosign-signed.
- SHA-256 sums published with every release.
- Reproducible builds via frozen lockfile.
- Self-hosters who pin to specific commits or audited release tags are insulated from upstream compromise between updates.

### Side-channel attacks on shared cloud infrastructure

Hyperthreading-based timing attacks, Rowhammer, etc. on Vercel's or Neon's shared compute.

**Mitigation:** out of scope. Self-hosting on dedicated hardware mitigates. Pitalock's threat model assumes the underlying compute platform is sound.

### Quantum adversary

X25519 and Ed25519 are not post-quantum-secure. A future cryptographically-relevant quantum computer could decrypt today's recorded ciphertexts ("harvest now, decrypt later").

**Mitigation:** planned migration to post-quantum primitives (ML-KEM for key agreement, SLH-DSA for signing) in v1.x once standardized libraries mature. Current adopters with multi-decade secret confidentiality requirements should be aware.

### Long-running compromise of an authenticated session

If an attacker has both the user's session cookie and access to the user's browser memory while the vault is unlocked, they have what the user has. Mitigations (short rolling sessions, re-prompt on sensitive operations) reduce window but do not eliminate.

---

## 6. Disclosure policy

Reported via:
- `security@<domain>` (PGP key published in `SECURITY.md`)
- GitHub Private Vulnerability Reporting (preferred for triage)

Commitments:
- **Triage within 48 hours** of receipt (acknowledge, assess, classify).
- **High-severity patch within 7 days** of triage. Lower severities on best-effort basis.
- **Coordinated disclosure preferred** but not required. We will not retaliate against good-faith researchers who publish without coordination — though coordination produces better outcomes for users.
- **Credit by default.** Reporters are named in the changelog and `SECURITY.md` hall of fame unless they request otherwise.

A bug bounty (modest payouts for high-severity findings) will be enabled at v1.0. In the pre-1.0 phase, reporters receive credit and our gratitude only.

---

## 7. Acknowledgement of residual risk

No security software is bug-free. Pitalock minimizes risk through:

- A small, focused codebase
- Audited cryptographic primitives only
- Defensive defaults (CSP, SameSite, HSTS, rate limiting, per-endpoint auth)
- Pinned dependencies, scanned every PR
- Pre-1.0 transparency about the lack of audit
- A planned independent audit before v1.0

It does not eliminate risk. Adopters handling secrets where compromise would be catastrophic (financial systems, medical records, classified data) should evaluate Pitalock against their specific threat model, consider commercial alternatives with formal certifications (SOC 2, ISO 27001, FedRAMP) until Pitalock has equivalent third-party validation, and apply additional controls outside the scope of any single tool (network segmentation, hardware security modules for the most sensitive credentials).

For the canonical use case — small to mid-sized teams sharing API keys, database URLs, and similar secrets that today live in shared Notion docs, Slack DMs, or `.env` files passed around on the team chat — Pitalock is a meaningful security improvement, even pre-audit.
