# Claw Audit Service - Development Rules

## Service Overview

This is the Audit microservice for the Claw platform. It owns audit logs and usage ledger entries. Uses MongoDB via Mongoose (NOT Prisma).

## Ownership

- **Audit Logs**: Record and query audit trail entries
- **Usage Ledger**: Track resource usage across the platform

## Tech Details

- **Port**: 4007
- **Database**: MongoDB (`claw_audit`) via Mongoose
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Collections Owned

- `audit_logs`
- `usage_ledger`

## Baseline rules

Baseline rules for every backend service (commands, absolute rules, declarations, library wrapping, Docker rebuild, workflow phases, checklists, output format): [docs/04-backend/backend-service-baseline.md](../../docs/04-backend/backend-service-baseline.md). This file adds only what is specific to `claw-audit-service`.

## Llamacpp event consumption

`LlamacppAuditConsumer` (`src/modules/audits/consumers/llamacpp.consumer.ts`) subscribes to all 11 `LLAMACPP_*` event patterns published by `claw-llamacpp-service`:

- `binary.installed` (LOW), `binary.updated` (MEDIUM)
- `pull.started` (LOW), `pull.completed` (LOW), `pull.failed` (HIGH)
- `pull.progress` — **intentionally suppressed** (high-frequency event; final outcome is captured by `completed`/`failed`)
- `model.loaded` (LOW), `model.unloaded` (LOW), `model.crashed` (HIGH)
- `weights.deleted` (HIGH)
- `preflight.overridden` (MEDIUM, captures `userId` from payload — never `'system'`)

All rows written under `entityType = LLAMACPP_AUDIT_ENTITY_TYPE = 'llamacpp_model'`. Wired in `audits.module.ts`.

`VideoProcessAuditConsumer` (`src/modules/audits/consumers/video-process.consumer.ts`, 2026-09-29) subscribes to file-service's `file.video_process_requested` / `_completed` / `_failed` and writes `entityType = 'file'` rows (actions `file.video_process_*`, LOW / LOW / ERROR). Details hold structural facts only: never the filename, transcript, or free-text `reason` (it can echo user content) — only `reasonCode`. A failed write is logged and swallowed, like the other file handlers.

## Feedback: two doors (ADR-141, 2026-10-01)

`POST /feedback` is guarded and snapshots the author's full name (via auth-service
`/internal/users/:id/identity`, `UserIdentityClient`, best effort). `POST /feedback/public`
is `@Public`: honeypot, per-IP and per-email Redis limits (`FeedbackRateLimitRepository`,
fails open), no attachments, uniform `201 {id}`, client address from `X-Real-IP` only.
Never echo the email, never read a client-sent user id/role, never reveal account state
(rule 43). Tickets carry `source`, `reporterName`, `reporterEmail`; `userId` is null for
public ones, so any `userId`-scoped code must tolerate that. nginx zone `public_feedback`
lives in `nginx.conf` and `nginx.distributed.conf.template`.
