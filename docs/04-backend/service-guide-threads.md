# Service Guide: claw-threads-service

## Overview

| Property     | Value                         |
| ------------ | ----------------------------- |
| Port         | 4019                          |
| Database     | `claw_threads` PostgreSQL     |
| Public route | `/api/v1/thread-publications` |

This service owns publication revisions and community state. It exposes an authenticated owner approval transition for review-ready publications; generation handoff and public read APIs remain unfinished.

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

## References

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)
