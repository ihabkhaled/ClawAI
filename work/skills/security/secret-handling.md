---
id: secret-handling
title: Secret handling
category: security
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - security-lead
---

# Secret handling

## Purpose

One leaked API key = credential rotation + customer notification + audit. Treat every secret as radioactive.

## Strict rules

- **MUST** read secrets via `AppConfig`. **BLOCKER** on direct `process.env`.
- **MUST** encrypt at rest with AES-256-GCM (connector configs).
- **MUST** redact in Pino logs — add new secret-bearing field names to the redact list.
- **MUST NOT** return secrets in API responses (always strip before serializing).
- **MUST NOT** log secrets even on error paths.
- **MUST NOT** commit secrets to Git (gitleaks scans CI).
- **MUST** store frontend-accessible secrets only via session-scoped cookies, never localStorage for high-value tokens.

## Anti-patterns

- `console.error({ err, config })` where `config` contains the API key.
- Returning `connector.encryptedConfig` in a list response.
- `const key = process.env.STRIPE_KEY` outside AppConfig.

## Validation checklist

- [ ] Secrets only via AppConfig
- [ ] Pino redact list covers new fields
- [ ] API responses strip secret-bearing fields
- [ ] QA asserts no secret in responses

## Quality gate

| Check                                                            | Blocker? | Evidence  |
| ---------------------------------------------------------------- | -------- | --------- |
| No `process.env.<SECRET>` outside AppConfig                      | yes      | grep      |
| QA asserts no `encryptedTokens` / `sessionKey` in list responses | yes      | QA script |

## Definition of done

1. Secrets loaded safely.
2. Logs redacted.
3. Responses stripped.
4. QA asserts.

## References

- `CLAUDE.md` — Security (Pino log redaction list)
