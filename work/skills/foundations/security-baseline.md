---
id: security-baseline
title: Security baseline
category: foundations
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - security-lead
  - platform-team
---

# Security baseline

## Purpose

OWASP Top 10 is a floor, not a ceiling. Every agent must know the baseline defenses before any change — even a "small" change can introduce SSRF, IDOR, or secret leakage.

## When to use

- Every code change. Yes, every one.
- Especially for: auth, input validation, file uploads, secrets, external calls, SQL/NoSQL queries, user-facing output.

## Inputs required

- `CLAUDE.md` — Security section

## Workflow

1. Identify the trust boundary your change crosses (external → service, service → external, user → service).
2. For every input: validate with Zod, enforce `.max()` on strings, `.max()` on arrays.
3. For every secret: read from `AppConfig` — never from `process.env` directly. Never log. Redact in Pino config.
4. For every outbound HTTP call: use `createHttpClient` wrapper, respect rate limits, validate URLs (no internal IPs if user-controlled).
5. For every query: use Prisma ORM — no raw SQL. Use parameterized queries if raw is unavoidable.
6. For every user-provided path: normalize, reject `..`, reject null bytes.
7. For every file upload: ClamAV scan, magic byte check, extension allowlist, filename sanitization.

## Strict rules

- **MUST** validate every DTO with Zod — strings have `.max()`, arrays have `.max()`.
- **MUST NOT** read `process.env` directly; use `AppConfig`. **BLOCKER** if violated.
- **MUST NOT** log secrets, tokens, passwords, API keys. Use redaction paths in Pino.
- **MUST NOT** expose secrets in frontend responses.
- **MUST** use `argon2` for password hashing (auth service).
- **MUST** use AES-256-GCM for connector config at rest.
- **MUST** enforce role checks on admin endpoints via `@Roles(UserRole.ADMIN)` + `RolesGuard`.
- **MUST NOT** return 500 for auth failures — use 401/403 with `BusinessException`.
- **MUST NOT** trust user input for file paths, URLs, or SQL fragments.

## Anti-patterns

- Storing a plaintext API key in a connector `config` column.
- Returning `encryptedTokens` in a list response.
- Using `String.raw` for a SQL query.
- Fetching a user-provided URL without checking for `127.0.0.1`, `169.254.*`, `10.*`.
- `catch(e) { console.log(e); }` — logs secrets that appeared in the error.

## Validation checklist

- [ ] Every Zod string has `.max()`
- [ ] Every Zod array has `.max()`
- [ ] No `process.env` outside AppConfig
- [ ] No `console.log` of anything that could contain secrets
- [ ] Every outbound HTTP uses `createHttpClient`
- [ ] Every file upload goes through `FileSecurityManager`
- [ ] Every admin endpoint has `@Roles` decorator

## Quality gate

| Check                                       | Blocker? | Evidence              |
| ------------------------------------------- | -------- | --------------------- |
| No hardcoded secrets                        | yes      | grep + CI secret scan |
| No leaked sessionKey / API key in responses | yes      | QA script assertions  |
| Role-guarded admin endpoints                | yes      | QA 401/403 assertions |
| Zod validation on every DTO                 | yes      | Code review           |

## Test requirements

| Type | Scope                 | Bar                                                   |
| ---- | --------------------- | ----------------------------------------------------- |
| Unit | every validator/guard | positive + negative                                   |
| QA   | every endpoint        | 401 unauthenticated; 403 wrong role; 400 invalid body |

## Definition of done

1. Every strict rule above satisfied.
2. QA script asserts auth enforcement and secret absence.
3. Security review noted in PR description.

## Examples

- `apps/claw-agent-service/src/modules/agent/repositories/agent-session.repository.ts` — strips `sessionKey` from every response shape.
- `apps/claw-file-service/src/common/utilities/file-security.manager.ts` — 4-layer upload validation.

## References

- `CLAUDE.md` — Security section
- `security/` — full security skill pack
