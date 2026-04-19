---
id: file-upload-security
title: File upload security
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

# File upload security

## Purpose

File uploads are a top attack vector. ClawAI has a 4-layer guard — all uploads MUST pass through `FileSecurityManager`.

## Strict rules

- **MUST** route every upload through `FileSecurityManager.validate()`. **BLOCKER**.
- **MUST** ClamAV-scan every file.
- **MUST** check magic bytes against declared MIME type.
- **MUST** enforce filename sanitization (no `../`, no null bytes, no double-extensions).
- **MUST** enforce extension allowlist per domain.
- **MUST NOT** serve uploaded files from a world-readable path without auth check.

## Anti-patterns

- Trusting the browser-provided MIME type.
- Saving `req.files[0].originalname` verbatim.
- Executing uploaded scripts (obvious but happens).

## Validation checklist

- [ ] `FileSecurityManager` in the upload path
- [ ] ClamAV reachable
- [ ] Magic bytes match MIME
- [ ] Filename sanitized
- [ ] Extension allowlisted

## Quality gate

| Check                                      | Blocker? | Evidence  |
| ------------------------------------------ | -------- | --------- |
| QA: upload `.exe` rejected with 422        | yes      | QA script |
| QA: upload with `../` in name rejected     | yes      | QA script |
| QA: upload with wrong magic bytes rejected | yes      | QA script |

## Definition of done

1. All checks pass.
2. QA negative assertions pass.

## References

- `apps/claw-file-service/src/common/utilities/file-security.manager.ts`
- `CLAUDE.md` — File Upload Security
