# Security Testing Standard

How to test the security-relevant behavior of the platform: authentication,
authorization, secret handling, input validation, and file-upload defenses. Security
decisions are pure critical logic — they get exhaustive coverage.

## Authorization & ownership (100% branch)

Ownership and permission checks are the highest-blast-radius pure logic in the system —
one wrong branch leaks or mutates another user's data.

- Test every branch: owner, non-owner, admin override, missing resource, disabled
  resource. Target **100% branch coverage** ([coverage-policy](coverage-policy.md)).
- Assert **both** gates where both apply: RBAC permission (from the `Permission` enum,
  never string literals) AND plan entitlement (`allow*` flags). Passing one proves
  nothing about the other. See [`../memory/authorization-lessons.md`](../memory/authorization-lessons.md).
- Assert dependency refinements (e.g. `criticEnabled ⇒ judgeEnabled`) reject invalid
  combinations at the DTO.

## Authentication

- Unauthenticated request → 401; expired/invalid token → 401; wrong-user → 403/404.
- **Never `EventSource` for authed streams**, never a token in a URL — test that authed
  streams use header auth (see [`../memory/authentication-lessons.md`](../memory/authentication-lessons.md)).
- Refresh-token rotation: a rotated/stale refresh token is rejected; reuse is detected.

## Secret non-leakage

- Assert responses **never** contain `passwordHash`, `encryptedTokens`, `encryptedSecret`,
  or raw API keys — while the encrypted column still exists in the DB
  ([database-testing-standard](database-testing-standard.md)).
- Assert logs never contain secrets: `safeStringify` / Pino redaction covers
  authorization/password/refreshToken/apiKey/token/secret. Test that a payload with a
  secret field is redacted in the emitted log.

## Input validation & injection

- Every Zod `z.string()` has `.max()`, every `z.array()` has `.max()` — test at and past
  the bound. Over-length / oversized inputs → 400/422, not a crash or memory blow-up.
- Prisma ORM only (no raw SQL) — SQL injection surface is structurally closed; still test
  that untrusted strings can't alter query semantics.

## File-upload defenses (file-service)

The 4-stage `FileSecurityManager` pipeline gets negative tests:

- **Antivirus:** infected fixture (EICAR) → 422; ClamAV down → fail-safe reject.
- **Magic bytes:** declared MIME ≠ content → 422.
- **Filename:** path traversal (`../`), null bytes, double extension (`.exe.pdf`),
  dangerous extensions → rejected; names sanitized before storage.
- **ZIP bombs:** nesting depth / entry count / compression ratio / extracted size over
  limits → `files.zip.bombRejected` before extraction; sandbox tmpfs bounds disk use.

## Related

- [`../memory/authorization-lessons.md`](../memory/authorization-lessons.md) ·
  [`../memory/authentication-lessons.md`](../memory/authentication-lessons.md) ·
  [Database testing](database-testing-standard.md) · [Coverage policy](coverage-policy.md)
