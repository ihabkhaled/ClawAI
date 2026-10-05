# Service Guide: claw-threads-service

## Overview

| Property     | Value                         |
| ------------ | ----------------------------- |
| Port         | 4019                          |
| Database     | `claw_threads` PostgreSQL     |
| Public route | `/api/v1/thread-publications` |

This service owns publication revisions and community state. Authenticated owners can start a generation with an explicit public-intent version and user-selected cap, poll their own job, cancel it, and persist its finished result as a private revision. A bounded secret/PII scan gates owner review; owners can publish, unpublish, and export JSON or Markdown. Public reads resolve only published, owner-approved, safety-approved, index-eligible revisions. Owner text edits and paid revalidation remain unfinished.

Prisma migrations run from the container entrypoint. For local schema work,
use `npm run migrate:dev`; for deployment, `npm run migrate` applies committed
migrations.

## Boundaries

- Chat remains the owner of chat threads and messages; `/api/v1/threads` keeps its legacy chat alias.
- Generation jobs and private source snapshots belong to `claw-thread-generation-service`.
- Publication records and revisions belong to this service's isolated PostgreSQL database.
- Research evidence remains owned by `claw-research-service`.
- Cross-service data uses service APIs or RabbitMQ, never another service's database.
- Approval changes publication and revision state atomically and returns only public-safe fields.
- `POST /api/v1/thread-publications/generations` passes the selected cap, explicit public-intent version, and server-derived owner ID to the generation service with a service token. Generation reserves Auth entitlements after snapshot ownership validation.
- `GET /api/v1/thread-publications/:publicationId/generation-state` verifies publication ownership before fetching job state; completed drafts are persisted privately with `PENDING` review status.
- `POST /api/v1/thread-publications/:publicationId/cancel-generation` checks ownership before forwarding cancellation.
- `GET /api/v1/thread-publications/public/:slug` is unauthenticated but resolves only published, owner-approved, safety-approved, index-eligible content; it returns citation URLs, not evidence IDs.
- `POST /api/v1/thread-publications/:publicationId/unpublish` requires owner identity and removes the record from public resolution.
- `GET /api/v1/thread-publications/:publicationId/export?format=json|markdown` requires owner identity and exports article content and citation URLs.
- Secret/PII matches store machine-readable reason codes without matched text and keep the revision pending.
- Threads validates `THREAD_GENERATION_SERVICE_URL` and `INTER_SERVICE_AUTH_TOKEN`; generation validates `AUTH_SERVICE_URL` and the same token. These values already exist in `.env.example` and deployment configuration.

## References

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)
