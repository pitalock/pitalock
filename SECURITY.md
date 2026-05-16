# Security Policy

Pitalock is a security tool. We take vulnerability reports seriously and respond quickly.

## Status

**Pre-1.0, pre-audit.** Pitalock has not yet undergone independent security audit. We are pursuing a sponsored audit through OSTIF as the first option, with a paid audit (Cure53, Trail of Bits, NCC Group, Doyensec, X41) as fallback. v1.0 will not be tagged until the audit report is published in this repository and audit-blocking findings are resolved.

See [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) for the full enumeration of what Pitalock protects against, what it does not, and the explicit service-account trust expansion.

## Reporting a vulnerability

**Preferred:** [GitHub Private Vulnerability Reporting](https://github.com/pitalock/pitalock/security/advisories/new) — fastest triage path, encrypted in transit, integrated with the issue tracker.

**Alternate:** email `security@pitalock.dev`. A PGP key will be published with v0.5; until then, email is acceptable for low-severity reports. For high-severity reports prior to v0.5, please use GitHub Private Vulnerability Reporting.

**Please do not file public GitHub issues for security vulnerabilities.**

## What to include in a report

- Affected version (commit SHA preferred, version tag acceptable)
- A description of the vulnerability and its potential impact
- Step-by-step reproduction instructions
- Proof-of-concept code or commands, if applicable
- Suggested mitigation, if you have one

The more specific the report, the faster we can triage and patch.

## Our commitments

| | |
|---|---|
| **Triage** | Within **48 hours** of receipt — we acknowledge, assess severity, and classify. |
| **High-severity patch** | Within **7 days** of triage. Medium and lower severities on a best-effort basis. |
| **Disclosure** | Coordinated disclosure preferred but not required. We will not retaliate against good-faith researchers who publish without coordination, though coordination produces better outcomes for users. |
| **Credit** | Reporters are named in the changelog and the hall of fame in this file by default, unless they request otherwise. |

## Severity classification

We use a CVSS-influenced internal scale. Indicative examples:

| Severity | Examples |
|---|---|
| **Critical** | Auth bypass, decryption of arbitrary user secrets without auth, remote code execution on the server |
| **High** | Privilege escalation across roles or environments, predictable token generation, broken access control on a sensitive endpoint |
| **Medium** | Authenticated XSS limited to one's own data, CSRF on a non-sensitive endpoint, audit log tamper-evidence weakness |
| **Low** | Open redirect, missing security header, rate-limit bypass on a non-auth endpoint |

## Bug bounty

A modest bug bounty (per-severity payouts for high-severity findings) will go live at v1.0.

In the pre-1.0 phase, reporters receive credit and our gratitude only. We're a free, single-maintainer open-source project at this stage; we appreciate the patience.

## Hall of fame

To be populated as reports come in.

## Out of scope

The following are not eligible as security vulnerabilities under this policy:

- Findings against dependencies (please report to the dependency maintainer; we'll happily coordinate disclosure if it affects Pitalock users).
- Issues already documented in [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) §5 ("What we DO NOT protect against") — these are intentional design boundaries, not bugs.
- Social engineering of maintainers or users.
- Physical attacks on user devices.
- Issues that require a compromised user device or browser to exploit (out of scope per threat model).
- Service-account token leakage on the runner that holds the token (documented trust expansion per [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) §3).

## Other security topics

- **Dependency vulnerabilities** discovered by Dependabot, Socket.dev, or Snyk are tracked publicly via the GitHub Security tab and patched on a normal release cadence (or expedited for critical CVSS).
- **Cryptographic library updates** are reviewed manually before merge, regardless of the source of the update PR.
- **Release artifacts** are signed (commits GPG-signed, tags GPG-signed, release artifacts cosign-signed) starting from v0.5.
