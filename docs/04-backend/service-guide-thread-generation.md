# Service Guide: claw-thread-generation-service

## Overview

| Property   | Value                                 |
| ---------- | ------------------------------------- |
| Port       | 4020                                  |
| Database   | PostgreSQL (`claw_thread_generation`) |
| Public API | None; internal service-token routes   |

This isolated service owns durable generation jobs, attempts, checkpoints,
evidence bundles, structured role outputs, and private revision drafts. Its
service-token-only enqueue route obtains a filtered owner snapshot from
chat-service, persists the job, then publishes a confirmed dispatch event. The
worker runs research, three to five authors, exact-hash consensus, Judge and
Critic reviews, and at most three rounds before it marks a private draft ready
for owner review. After verifying the source snapshot, it reserves the selected
Auth entitlement cap with the same idempotency key before storing and dispatching
the job. A repeated matching key returns the pinned job before taking another
snapshot or budget; a reused key with changed input conflicts. Its cancel route
cancels queued jobs or requests cancellation between provider calls.

## Boundaries

- The publication and community service owns approved public revisions.
- Chat supplies filtered snapshots through an internal API; this service never reads the chat database.
- Research evidence remains owned by `claw-research-service`.
- Routing-service supplies model context windows; an unknown or oversized full
  prompt fails closed without truncation.
- Chat-service applies existing provider credit holds and settlement using a
  stable request ID and the Auth-owned aggregate job budget. No PAYG price
  surface is added.
- The queue is dedicated to generation work and has prefetch one. Prisma
  migrations run from development and production container entrypoints.
- A database-backed pair of worker slots caps concurrency across replicas.
  Heartbeats extend leases; periodic recovery retries expired jobs up to the
  bounded attempt limit with backoff. Resume reuses persisted research and role
  outputs only when input and evidence hashes match.
- Queue reconciliation dispatches ready jobs FIFO and retries pending Auth
  budget closure from persisted status. Do not manually replay a provider call
  or close a budget outside the idempotent service path.
- The service has no public owner or reader API. Its internal service-token
  `POST /api/v1/internal/threads/generations/:jobId/owner-state` returns only
  safe status and the completed draft when the supplied owner matches. The
  Threads service verifies publication ownership before using this handoff and
  stores the result as a private pending revision.
- The service-token-only `POST /api/v1/internal/threads/generations/revision-reviews`
  creates durable paid reviews for owner edits. It pins the parent's source
  snapshot, evidence bundle, and reviewer configuration, but evaluates the exact
  submitted markdown and citations with fresh author/Judge/Critic calls. The
  private owner-state response includes the candidate hash and review outcome;
  Threads verifies that hash before making a revision eligible for owner
  approval.

## References

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)
- [Generation queue runbook](../../skills/run-threads-generation-queue.md)
