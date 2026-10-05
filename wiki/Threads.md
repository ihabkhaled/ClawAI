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
APIs use `/api/v1/thread-publications`.

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
budget closure are reconciled periodically. The Threads service now owns its
separate `claw_threads` database and has an atomic owner approval transition
for review-ready revisions. Generation-result handoff and public read APIs
remain unfinished, so this does not enable public publication yet.
