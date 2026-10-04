# ClawAI Threads architecture

**Status:** Approved for implementation planning, 2026-10-04
**Decision:** [ADR-159](../13-adr/adr-159-clawai-threads-two-service-architecture.md)

## Service ownership

- `claw-threads-service` owns publications, immutable revisions, owner approval,
  comments, reactions, change requests, moderation state, and public reads.
- `claw-thread-generation-service` owns isolated generation jobs, checkpoints,
  attempts, cancellation, progress, and its dedicated queue.
- `claw-chat-service` provides service-authenticated immutable, filtered source
  snapshots. Threads never reads the chat database directly.
- `claw-research-service` owns search and fetch. Generation stores a versioned
  evidence bundle returned through its API.

Publication APIs use `/api/v1/thread-publications`; the existing
`/api/v1/threads` chat alias is preserved. Public pages use opaque IDs under
`/threads/<id>`. Internal worker APIs stay off the public gateway.

## Data and execution

Persist canonical JSON snapshots and structured drafts. Pin snapshots and
evidence by version and hash; every author, Judge, and Critic receives the same
complete bundle. Resolve context capacity before enqueue and never silently
truncate. Store review outcomes and scores, not hidden chain-of-thought. Use
Markdown for user export; add TOON only after semantic round-trip tests and
measured savings.

Use the existing plan entitlement and credit hold/finalize/release flow. A
user-selected job ceiling bounds all provider calls, retries, and concurrent
work. Idempotency prevents duplicate charges. Persisted job state is
authoritative; queue delivery and live progress are transport only.

## Public data and deletion

Public DTOs use an explicit allow-list. Only published, owner-approved,
safety-approved, index-eligible revisions enter public reads, sitemap, search,
and feeds. Unpublish removes them atomically. Account deletion preserves
approved revisions anonymously while deleting private snapshots and generation
artifacts, removing reactions, anonymizing comments, and deleting pending
private requests.

## Deployment

Threads and generation services use ports 4019 and 4020. Both begin as
health-only services; databases and queue contracts arrive with their first
domain batches. Feature routes and indexing remain disabled until the complete
product passes scoped gates and the 15-lane QA workflow.
