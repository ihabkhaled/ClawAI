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
- Owners select the content language; articles, canonical URLs, discovery, and
  feeds use that locale.
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
owner-checked status/cancellation. The portal surfaces cancellation request
progress and acceptance, disables duplicate requests after acceptance, and
keeps retry available if the request fails. Terminal cancellation comes from
worker status. It copies a ready result into a private
revision. Passing Judge/Critic thresholds and the safety scan makes it eligible
for owner approval; this is not automatic publication. Owners can create
immutable text edits with a fresh spend cap and idempotency key. Generation
revalidates the exact content against the parent's pinned source and evidence;
the current public version stays live until the owner approves the passing edit.
The owner portal has an authenticated list endpoint at
`GET /api/v1/thread-publications/mine`; it returns at most 50 newest owned
publication summaries without generation IDs or source snapshots. The
frontend portal now supports generation from an owner-selected chat, a required
user-selected spend cap, public/indexing intent disclosure, status polling,
draft and citation preview, and a separate owner approval action before
publication. The workflow uses the existing model catalog and stays separate
from the legacy chat-thread API. Owners can submit capped private revisions for
fresh review, export Markdown or JSON, and unpublish a live publication.
The owner portal now lists reader change requests. Owners can reject with an
optional response or submit an edited, user-capped revision for fresh review.
The public reader server-renders approved articles, filters citation links to
absolute HTTP(S), and supports authenticated comments, reactions, change
requests, and reports. Comments remain identity-free. The localized discovery
hub, canonical metadata, sitemap chunks, RSS/Atom, and `llms.txt` use the existing
public-content registry. Chat-share lockdown remains separate.
Authenticated readers can comment, react, request changes, and report content.
Public comment responses omit author IDs. Owners can accept a change request by
creating a newly capped immutable revision that goes through the usual fresh
review and owner-approval flow. Moderation endpoints require
`THREAD_PUBLICATIONS_MODERATE`. Auth deletion uses a transactional outbox and
`user.deleted` event. Threads keeps eligible approved work public anonymously,
removes private snapshots and account links, and records a hashed tombstone;
Generation removes private jobs and rejects later enqueue. Live deletion,
browser, access-control, device, and production QA remain open.

## Launch status (2026-10-06)

Live QA of the reader and owner portal fixed raw translation keys and added Article
JSON-LD. Launch readiness, blockers and out-of-plan pack items:
[docs/features/clawai-threads](https://github.com/ihabkhaled/ClawAI/blob/main/docs/features/clawai-threads/README.md).
