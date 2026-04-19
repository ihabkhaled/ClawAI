---
id: ssrf-prevention
title: SSRF prevention
category: security
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - security-lead
---

# SSRF prevention

## Purpose

When the service fetches a URL partly controlled by user input, attackers redirect it to internal endpoints (`127.0.0.1`, `169.254.*` metadata, `10.*`). Prevent by explicit allowlist + validation.

## Strict rules

- **MUST** use `createHttpClient` wrapper (enforces timeout, correct agent).
- **MUST** validate the host against a domain allowlist when URLs come from user input.
- **MUST** reject private/loopback IPs for user-controlled URLs.
- **MUST NOT** follow redirects to different hosts silently — validate each hop.
- **MUST** set a max response size.

## Validation checklist

- [ ] Host allowlist in place (where applicable)
- [ ] Private IPs rejected
- [ ] Redirects validated
- [ ] Max response size set
- [ ] Timeout set (<30s)

## Quality gate

| Check                             | Blocker? | Evidence  |
| --------------------------------- | -------- | --------- |
| QA: `http://127.0.0.1:…` rejected | yes      | QA script |
| QA: timeout enforced              | yes      | QA script |

## Definition of done

1. Allowlist + private-IP rejection.
2. QA assertions.

## References

- `CLAUDE.md` — Security section
