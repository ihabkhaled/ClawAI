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

Threads has its own PostgreSQL database (`claw_threads`) and migration history;
generation retains its separate database. The initial publication lifecycle
allows an authenticated owner to approve a `READY_FOR_REVIEW` revision. Owner
approval changes publication and revision state in one transaction, and the
response is an explicit public-field allow-list. Threads passes the
owner-selected cap and idempotency key to generation-service. After validating
the immutable Chat snapshot, generation-service reserves the existing Auth
entitlement budget and persists the job before dispatch. Owners poll their own
publication; Threads copies a completed result into a private `PENDING`
revision. Generation state and draft content never cross to public reads. A
bounded secret/PII scan gates review readiness; only owner-approved, safety-
approved, index-eligible revisions resolve publicly. The response omits owner
IDs, evidence IDs, and internal scores. Owners can unpublish and export JSON or
Markdown. An owner edit creates an immutable private revision and a durable
generation job with a fresh cap and idempotency key. The job reuses the parent's
pinned source snapshot and research evidence, then obtains fresh author
consensus and Judge/Critic review for the exact edit. Only hash-matched passing
review can transition the candidate to owner approval; the current public
revision remains active until approval.

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

Three to five authors draft independently; the first author's draft becomes the
candidate, and every author must return `agrees: true` with that candidate's exact
draft hash (a vote, because independent models never write byte-identical drafts).
A dissent or a different hash restarts the round with the candidate as the brief.
A model whose answer is not the requested JSON shape, or whose citations fall
outside the evidence bundle, gets one more try before its cross-provider fallback. Judge and
Critic produce independent structured results, using thresholds of 80 and 75,
with at most three rounds. Persist evidence, structured role outputs,
checkpoints, and review scores, not hidden chain-of-thought. Owner exports are
Markdown, canonical JSON and TOON (`@toon-format/toon`, wrapped in
`common/utilities/toon.utility.ts`); a TOON export is encoded, decoded and compared to the
canonical JSON before it is returned, so a lossy encode is refused. Model prompts still carry
canonical JSON, so every role receives identical context.

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

Each publication stores the selected shared `Locale` and publication type at
enqueue. Threads-service exposes public detail, locale-filtered discovery, and
bounded sitemap pages; public DTOs omit publication IDs, owner IDs, and evidence
IDs. The frontend renders the approved revision server-side, uses the locale for
its canonical URL, and adds the localized discovery hub to the existing public
content registry. Threads have their own sitemap chunks and RSS entries. The
chat-share lockdown flag continues to gate only chat-share discovery.

## Deployment

Threads and generation services use ports 4019 and 4020. Threads owns the
`claw_threads` PostgreSQL database; generation owns `claw_thread_generation`.
Both dev and production entrypoints run Prisma migrations. Generation enqueue,
cancellation, and owner-state routes require a service token and stay off the
public gateway. Authenticated Threads owner APIs and the public publication read
route use the existing gateway. Public reads remain fail-closed on publication
state, owner approval, safety status, and index eligibility.

Their container health checks use Node's built-in `node:https` client against
loopback `/api/v1/health`. TLS verification is disabled for this loopback-only
probe so both mkcert and self-signed internal certificates work without `wget`.

Auth owns the durable job budget and per-call sub-holds. Its internal
service-token routes reserve the cap and each existing PAYG wallet hold; call
settlement moves measured cost into the cap ledger. The cap adds no provider
prices or wallet balance. Generation closes the budget only after all provider
calls settle or release.

Community comments, reactions, change requests, and reports are stored in the
Threads database. Public comment responses omit author identifiers. Owner
change acceptance creates an immutable revision through generation-service;
moderation routes require `THREAD_PUBLICATIONS_MODERATE`. Account-deletion
propagation is implemented through Auth's durable outbox and idempotent service
consumers; full live cross-service QA remains open.

# Account deletion propagation

Auth writes a `user.deleted` outbox event in the same transaction that deletes
the account. A scheduled publisher retries delivery. Threads and Thread
Generation consume the shared event independently and apply their service-owned
retention policy with idempotent transactions and SHA-256 tombstones. Threads
retains only eligible approved public revisions anonymously; generation rejects
future enqueue for deleted accounts. See [ADR-160](../13-adr/adr-160-threads-account-deletion-propagation.md).
