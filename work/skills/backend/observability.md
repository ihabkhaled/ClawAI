---
id: observability
title: Observability
category: backend
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Observability

## Purpose

On-call engineers at 2 AM must be able to trace a request end-to-end. Structured logs, correlation IDs, and meaningful events are the substrate.

## Workflow

1. Use NestJS `Logger` with service class name — never `console.log`.
2. Log at the right level: `log` for happy path info, `warn` for recoverable, `error` for failures.
3. Include correlation IDs (requestId, traceId) — middleware injects them.
4. Publish events for user-visible actions (see `audit-logging.md`).
5. For background jobs, log: start, progress, end, errors with identifiers.
6. Avoid log spam — don't log in tight loops.

## Strict rules

- **MUST** use NestJS Logger, never `console.log`. **BLOCKER**.
- **MUST** include correlation IDs in cross-service calls (HTTP headers).
- **MUST NOT** log secrets (Pino redaction handles known keys — don't add new logged fields with secret material).
- **MUST** log at the right level.

## Anti-patterns

- `console.log(error)` — bypasses Pino redaction.
- Logging every iteration of a 10,000-item loop.
- Logging PII without redaction.

## Validation checklist

- [ ] Only NestJS Logger used
- [ ] Correlation IDs present
- [ ] No secrets or PII in logs
- [ ] Appropriate log levels

## Quality gate

| Check                      | Blocker? | Evidence          |
| -------------------------- | -------- | ----------------- |
| No `console.log` in source | yes      | grep / lint       |
| Docker logs traceable      | yes      | Manual inspection |

## Definition of done

1. Structured logs emitted.
2. Correlation IDs flow through.
3. Docker logs readable.

## References

- `CLAUDE.md` — Observability section
- `devops/observability-planning.md`
