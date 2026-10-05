# Service Guide: claw-threads-service

## Overview

| Property     | Value                         |
| ------------ | ----------------------------- |
| Port         | 4019                          |
| Database     | `claw_threads` PostgreSQL     |
| Public route | `/api/v1/thread-publications` |

This service owns publication revisions and community state. Authenticated owners can start a generation with an explicit public-intent version and user-selected cap, poll their own job, cancel it, and persist its finished result as a private pending revision. Publication safety scanning, owner edit/approval controls, public reads, unpublish, and exports are still gated.

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
- Threads validates `THREAD_GENERATION_SERVICE_URL` and `INTER_SERVICE_AUTH_TOKEN`; generation validates `AUTH_SERVICE_URL` and the same token. These values already exist in `.env.example` and deployment configuration.

## References

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)
