# ADR-141: Feedback has two doors, public and signed-in

- Status: Accepted
- Date: 2026-10-01

## Context

Feedback needed a JWT, so a visitor on a marketing page could not send any. The owner
asked for feedback with no login, without weakening the signed-in path, and for the
admin to tell the two apart.

## Decision

Two separate routes on audit-service, one ticket collection (`feedback_tickets`).

- `POST /api/v1/feedback` (guarded, `FEEDBACK_SUBMIT`): stores `source=AUTHENTICATED`,
  `userId`, `reporterEmail` from the token and `reporterName` = a snapshot of
  firstName + lastName. The token carries only id, email and role, so the name is read
  from auth-service over `GET /internal/users/:id/identity` (service token, never
  another service's database). A failed lookup stores `reporterName: null`; the ticket
  is never lost for want of a name.
- `POST /api/v1/feedback/public` (`@Public`, no guard): body `{type, title?, message,
name, email, pageUrl?, locale?, website}`. Stores `source=PUBLIC`, `userId: null`,
  `reporterName`, `reporterEmail`. Answer is always `201 {id}`.
- Public safety: `website` is a honeypot (filled = same 201, nothing stored); 5/hour
  per address and 3/hour per email in Redis (fixed window, keys hashed, fails open,
  both counters bumped on every call so a 429 never reveals account state, rule 43);
  nginx `limit_req` zone `public_feedback` and a 16k body cap on that location only;
  control characters and NUL stripped before length checks; the client address comes
  from `X-Real-IP` (never `X-Forwarded-For`); unknown body keys such as `userId` or
  `role` are dropped and never read; the email is never echoed.
- No attachments on the public route: an upload needs an authenticated file-service
  owner, and an anonymous upload is the cheapest abuse vector there is.
- Admin list/detail expose `source`, `reporterName`, `reporterEmail`; the list filters
  by `source`. RBAC is unchanged. Feedback publishes no RabbitMQ events.
- Storage: Mongo has no DDL. The "migration" is `FeedbackSourceBackfillMigration`
  (`20261001-feedback-source`): idempotent on boot, sets `source=AUTHENTICATED` and
  `reporterName=null` on old tickets; Mongoose builds the `{source, createdAt}` index.

## Consequences

A public ticket's name and email are claims, not identities; admins must read them so.
The Redis limiter fails open, so nginx is the backstop during a Redis outage.

## What would make this stale

Public submissions gaining attachments; a CAPTCHA or proof-of-work in front of the
route; the limits moving to an admin-editable table; feedback publishing events; a
second ticket collection; or auth-service no longer serving the identity route.
