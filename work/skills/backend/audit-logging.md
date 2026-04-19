---
id: audit-logging
title: Audit logging
category: backend
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
  - security-lead
---

# Audit logging

## Purpose

Audit events prove who did what, when. Required for compliance, incident investigation, and user-visible activity history.

## When to use

- Every write action performed by an authenticated user.
- Every privileged operation (admin actions, role changes, connector writes).
- Every event affecting another user's resources.

## Workflow

1. Identify the action type (e.g. `USER_LOGIN`, `CONNECTOR_CREATED`, `DISCOVERY_RUN_TRIGGERED`).
2. Publish via RabbitMQ to `claw.events` with the correct pattern.
3. `audit-service` consumes and persists to MongoDB.
4. Include: actor userId, action, entityType, entityId, severity, details (redacted of secrets).
5. Never log the secret itself — log its fingerprint or identifier.

## Strict rules

- **MUST** publish audit events for privileged actions. **BLOCKER** if missing.
- **MUST NOT** include secrets, tokens, or API keys in the `details` payload.
- **MUST** use enum action names from `shared-types`.

## Anti-patterns

- Writing to audit MongoDB directly from another service.
- Logging `connectorConfig` (contains encrypted tokens).
- Missing audit for admin-only operations.

## Validation checklist

- [ ] Action published for every privileged write
- [ ] Actor, entity, severity captured
- [ ] No secrets in `details`
- [ ] Action name is an enum value from `shared-types`

## Quality gate

| Check                | Blocker? | Evidence          |
| -------------------- | -------- | ----------------- |
| Audit event emitted  | yes      | audit-service log |
| No secret in payload | yes      | Code review       |

## Definition of done

1. Event published.
2. Pattern in `shared-types`.
3. Payload redacted.

## References

- `CLAUDE.md` — Event Bus
- `security/security-logging.md`
