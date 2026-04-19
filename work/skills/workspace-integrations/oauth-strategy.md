---
id: oauth-strategy
title: OAuth strategy
category: workspace-integrations
level: mandatory
applies_to:
  - workspace-adapter
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - integrations-team
  - security-lead
---

# OAuth strategy

## Purpose

OAuth misuse leaks tokens. Use Authorization Code with PKCE, never Implicit, rotate refresh tokens, store tokens encrypted.

## Strict rules

- **MUST** use Authorization Code + PKCE flow. **BLOCKER** on Implicit.
- **MUST** store tokens encrypted at rest (AES-256-GCM).
- **MUST** refresh tokens before expiry, not on failure.
- **MUST** validate `state` parameter to prevent CSRF.
- **MUST** bind OAuth state to the user session (no cross-user state reuse).
- **MUST NOT** return raw tokens to the frontend.
- **MUST NOT** store tokens in logs.

## Anti-patterns

- Implicit flow with `token` in URL fragment.
- No CSRF `state` check.
- Tokens in localStorage.

## Validation checklist

- [ ] PKCE enabled
- [ ] Tokens encrypted at rest
- [ ] `state` validated
- [ ] Refresh before expiry
- [ ] No tokens to frontend
- [ ] No tokens in logs

## Quality gate

| Check                     | Blocker? | Evidence               |
| ------------------------- | -------- | ---------------------- |
| PKCE implemented          | yes      | Code review            |
| Tokens encrypted          | yes      | Code review + DB check |
| QA: CSRF attempt rejected | yes      | QA script              |

## Definition of done

1. Flow uses PKCE.
2. Tokens encrypted.
3. CSRF tested.
