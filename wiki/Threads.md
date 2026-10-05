> **Wiki source:** [`docs/02-business-product/clawai-threads-product-spec.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/clawai-threads-product-spec.md)

# ClawAI Threads

Threads turns private chat into sourced publications through asynchronous
multi-model review. Generation records public intent after a clear disclosure;
the draft remains private until its owner approves publication.

## Product choices

- Article, research article, guide, and technical explanation formats.
- Three to five authors; unanimous agreement on the exact draft hash; Judge at
  least 80; Critic at least 75; up to three rounds.
- A user-selected spend cap is required. Existing plan and credit rules apply;
  there is no new PAYG price.
- Authenticated users can comment, react, and request changes under existing
  moderation controls.
- Approved publications are independently indexable. Chat-share lockdown stays.
- Approved revisions remain public anonymously after account deletion; private
  snapshots and generation artifacts are erased.

## Architecture

`claw-threads-service` owns publications and community state.
`claw-thread-generation-service` owns isolated jobs. Chat provides filtered
immutable snapshots and research-service provides evidence. Read
[the architecture](https://github.com/ihabkhaled/ClawAI/blob/main/docs/03-architecture/clawai-threads-architecture.md)
and [ADR-159](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-159-clawai-threads-two-service-architecture.md).

Generation uses Auth's aggregate cap ledger. Existing research, Judge, and
Critic plan uses are reserved once at enqueue; each provider wallet hold is
sub-held before the call. Settlement counts measured cost, and a job cannot
close with an unresolved sub-hold. The cap introduces no new PAYG price.

The existing `/api/v1/threads` route remains the chat-thread alias. Publication
APIs use `/api/v1/thread-publications`. Public reads require an approved,
safety-cleared, index-eligible revision. Owner APIs can unpublish and export JSON
or Markdown. Secret/PII matches keep drafts private; matched text is not stored
in safety reasons or returned.

Generation requests a versioned snapshot from Chat's internal endpoint.
Ownership is checked in Chat by matching the requested owner and thread in one
serializable read. Snapshots include ordered user/assistant text and a SHA-256
digest, while excluding system/tool rows, failures, placeholders, duplicate
chunks, attachment metadata, and messages matching known secret patterns. An
over-limit transcript (2,000 messages or 2 MiB) is rejected whole. JSON and
Markdown exports are available; TOON stays unavailable until a verified codec
shows semantic round-trip and useful token savings.

The two service containers probe `/api/v1/health` over loopback HTTPS with
Node's built-in HTTPS client; see the [deployment architecture](https://github.com/ihabkhaled/ClawAI/blob/main/docs/03-architecture/clawai-threads-architecture.md#deployment).

The generation service persists queued jobs, attempt records, source and
research checkpoints, structured author/Judge/Critic responses, and the private
final revision in its own PostgreSQL database. Jobs run on the dedicated
`claw.threads.generation` RabbitMQ queue, with a service-token-only enqueue and
cancel API. Two database-backed worker slots cap cross-replica concurrency.
Heartbeats renew leases; bounded retries recover expired jobs with backoff and
reuse only hash-matched checkpoints. FIFO dispatch and persisted idempotent
budget closure are reconciled periodically. Threads-service passes the
owner-selected cap to generation-service, which validates the source snapshot,
then reserves the existing Auth entitlement budget before idempotent job
persistence. Threads links that job to a private publication and exposes
owner-checked status/cancellation. It copies a ready result into a private
revision. Passing Judge/Critic thresholds and the safety scan makes it eligible
for owner approval; this is not automatic publication. Owners can create
immutable text edits with a fresh spend cap and idempotency key. Generation
revalidates the exact content against the parent's pinned source and evidence;
the current public version stays live until the owner approves the passing edit.
Authenticated readers can comment, react, request changes, and report content.
Public comment responses omit author IDs. Owners can accept a change request by
creating a newly capped immutable revision that goes through the usual fresh
review and owner-approval flow. Moderation endpoints require
`THREAD_PUBLICATIONS_MODERATE`. Auth deletion uses a transactional outbox and
`user.deleted` event. Threads keeps eligible approved work public anonymously,
removes private snapshots and account links, and records a hashed tombstone;
Generation removes private jobs and rejects later enqueue. UI and discovery
integration remain unfinished. Live deletion-flow QA remains open.
