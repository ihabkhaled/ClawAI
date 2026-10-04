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

Generation obtains source through Chat's service-token-protected
`POST /api/v1/internal/thread-snapshots/:threadId` endpoint. Chat checks
`threadId` and `userId` together and reads the thread plus ordered messages in
one serializable transaction. Version-1 snapshots keep only non-empty user and
assistant text; system/tool messages, failed/aborted/placeholder or duplicate
records, attachment metadata, and messages matching known secret patterns are
excluded. Provider, model, file ID, user ID, and raw metadata are not exposed.
More than 2,000 source messages or 2 MiB of canonical snapshot data fails
explicitly; the endpoint never returns a partial transcript. A SHA-256 digest
pins the snapshot body for later job persistence.

## Data and execution

Persist canonical JSON snapshots and structured drafts. Pin snapshots and
evidence by version and hash; every author, Judge, and Critic receives the same
complete bundle. Research runs through research-service. The generation worker
checks each complete role prompt against routing-service's context window plus
the output reserve; unknown or oversized windows fail closed without
truncation.

Three to five authors must agree on one canonical exact draft hash. Judge and
Critic produce independent structured results, using thresholds of 80 and 75,
with at most three rounds. Persist evidence, structured role outputs,
checkpoints, and review scores, not hidden chain-of-thought. Use Markdown for
user export; add TOON only after semantic round-trip tests and measured savings.

Use the existing plan entitlement and credit hold/finalize/release flow. A
user-selected job ceiling bounds all provider calls, retries, and concurrent
work. Provider calls go through chat-service's existing wallet hold/finalize
path and carry a stable per-call idempotency key plus the Auth-owned aggregate
budget ID. Idempotency prevents duplicate enqueue and charges. Persisted job
state is authoritative; queue delivery and live progress are transport only.
The generation consumer uses its own durable RabbitMQ queue with prefetch one.
Database-backed worker slots cap active generation at two across replicas.
Workers renew leases while running; recovery requeues expired work with bounded
attempts and backoff. Persisted research evidence and role outputs are reused
only when their canonical evidence and input hashes still match. Dispatch is
FIFO among jobs whose retry delay has elapsed. Auth budget closure is retried
from persisted pending state, so a temporary close failure does not lose the
settlement operation.

## Public data and deletion

Public DTOs use an explicit allow-list. Only published, owner-approved,
safety-approved, index-eligible revisions enter public reads, sitemap, search,
and feeds. Unpublish removes them atomically. Account deletion preserves
approved revisions anonymously while deleting private snapshots and generation
artifacts, removing reactions, anonymizing comments, and deleting pending
private requests.

## Deployment

Threads and generation services use ports 4019 and 4020. Generation owns the
`claw_thread_generation` PostgreSQL database, and its dev and production
entrypoints run Prisma migrations. Enqueue and cancellation APIs require a
service token and stay off the public gateway. Publication routes and indexing
remain disabled until the complete product passes scoped gates and the 15-lane
QA workflow.

Their container health checks use Node's built-in `node:https` client against
loopback `/api/v1/health`. TLS verification is disabled for this loopback-only
probe so both mkcert and self-signed internal certificates work without `wget`.

Auth owns the durable job budget and per-call sub-holds. Its internal
service-token routes reserve the cap and each existing PAYG wallet hold; call
settlement moves measured cost into the cap ledger. The cap adds no provider
prices or wallet balance. Generation closes the budget only after all provider
calls settle or release.
