# Service Guide: claw-threads-service

## Overview

| Property     | Value                         |
| ------------ | ----------------------------- |
| Port         | 4019                          |
| Database     | `claw_threads` PostgreSQL     |
| Public route | `/api/v1/thread-publications` |

This service owns publication revisions and community state. Authenticated owners can start a generation with an explicit public-intent version and user-selected cap, poll their own job, cancel it, and persist its finished result as a private revision. A bounded secret/PII scan gates owner review; owners can publish, unpublish, and export JSON or Markdown. Public reads resolve only published, owner-approved, safety-approved, index-eligible revisions. `POST /api/v1/thread-publications/:publicationId/revisions` creates an immutable edit using a fresh cap and idempotency key; `GET /api/v1/thread-publications/:publicationId/revisions/:revisionId/revalidation-state` returns owner-scoped review status. Only a passing review of the exact candidate hash becomes eligible for owner approval; the approved revision remains public until replacement approval.

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
- `GET /api/v1/thread-publications/:publicationId/generation-progress` returns the owner-only step-by-step record (selections, per-role steps with machine codes, durations, tokens, bounded excerpts, failure) from the generation service. Non-owners and unknown ids get `404 Publication not found`.
- `POST /api/v1/thread-publications/:publicationId/retry-generation` (body: `idempotencyKey`, optional `topic`, `spendCapUsd`, `models`) starts a new job from the same snapshot and attaches it to the same DRAFT publication. 409 unless the publication is DRAFT and the job FAILED or CANCELLED.
- `DELETE /api/v1/thread-publications/:publicationId` removes a non-published publication and its job. 409 when published or the job is QUEUED or RUNNING.
- `GET /api/v1/thread-publications/public/:slug` is unauthenticated but resolves only published, owner-approved, safety-approved, index-eligible content; it returns citation URLs, not evidence IDs.
- `POST /api/v1/thread-publications/:publicationId/unpublish` requires owner identity and removes the record from public resolution.
- `GET /api/v1/thread-publications/:publicationId/export?format=json|markdown` requires owner identity and exports article content and citation URLs.
- `GET/POST /api/v1/thread-publications/public/:slug/comments` lists visible comments publicly and accepts authenticated comments.
- `GET/POST/DELETE /api/v1/thread-publications/public/:slug/reactions` reads counts publicly and lets authenticated readers set or remove their own reaction.
- `POST /api/v1/thread-publications/public/:slug/change-requests` and `/reports` accept authenticated suggestions and reports; owners resolve requests through the publication owner route, with acceptance creating a capped revision for review.
- `/api/v1/thread-publications-moderation/reports` requires `THREAD_PUBLICATIONS_MODERATE`; resolving a report can hide its comment.
- Secret/PII matches store machine-readable reason codes without matched text and keep the revision pending.
- Threads validates `THREAD_GENERATION_SERVICE_URL`, `CONNECTOR_SERVICE_URL` (default `http://connector-service:4003`, already in `.env.example`; the model-existence check reads its public catalog, ADR-174 addendum) and `INTER_SERVICE_AUTH_TOKEN`; generation validates `AUTH_SERVICE_URL` and the same token. These values already exist in `.env.example` and deployment configuration.

## Start checks and error codes (ADR-174)

`POST /api/v1/thread-publications/generations` runs `GenerationPreflightService` before any job, budget or publication exists. It reads the plan (auth-service entitlements) and the model catalog (routing-service `context-window` lookup, `known`); it never calls a model. Refusals carry the shared error body `{ message, code, statusCode, ... }`.

| Status | `code`                                        | When                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `THREAD_SPEND_CAP_TOO_LOW`                    | `capMicroUsd` is below 10,000 micro-USD (one US cent, `MIN_THREAD_SPEND_CAP_MICRO_USD`). A retry's `spendCapUsd` has the same floor (zod 400).                                                                                                                                                                                                                                                                 |
| 400    | `THREAD_MODEL_UNKNOWN`                        | A role, or one of its fallbacks, names a provider/model the catalog does not know. Body adds `role`, `roleId`, `provider`, `model`.                                                                                                                                                                                                                                                                            |
| 403    | `THREAD_GENERATION_NOT_PERMITTED`             | The role lacks `THREAD_GENERATION_USE`.                                                                                                                                                                                                                                                                                                                                                                        |
| 403    | `MODEL_NOT_ALLOWED_FOR_PLAN`                  | A model of a seat, primary or fallback, is not on the caller's plan (same test chat uses; fallbacks are checked as FALLBACK because nothing downstream re-checks the plan). Message: `Author 2 uses GROQ/x, which your Free plan does not include. Pick a model your plan includes, or upgrade to a plan that lists it.` Body adds `role`, `roleId`, `provider`, `model`, `plan` (the caller's own plan slug). |
| 403    | `THREAD_GENERATION_NOT_IN_PLAN`               | The budget step in auth-service refused: the plan lacks web research, Judge or Critic review.                                                                                                                                                                                                                                                                                                                  |
| 400    | `THREAD_TOPIC_INVALID`, `THREAD_TEXT_INVALID` | The topic is empty after trimming or under 10 characters, or a text field holds a NUL byte or a lone surrogate.                                                                                                                                                                                                                                                                                                |
| 403    | `THREAD_GENERATION_ALLOWANCE_UNAVAILABLE`     | The plan has the features but the allowance is used up or held by a running generation.                                                                                                                                                                                                                                                                                                                        |
| 409    | `THREAD_IDEMPOTENCY_KEY_REUSED`               | The owner reused a key for a different request.                                                                                                                                                                                                                                                                                                                                                                |
| 429    | `THREAD_GENERATION_TOO_MANY_ACTIVE`           | The owner already has 3 generations queued or running (`limit`, `active` in the body), or too many of their requests are waiting.                                                                                                                                                                                                                                                                              |
| 404    | none                                          | The source chat thread is missing or belongs to another user; the body is `Source thread not found` in both cases.                                                                                                                                                                                                                                                                                             |
| 503    | none                                          | The plan or the catalog could not be read (fail closed).                                                                                                                                                                                                                                                                                                                                                       |

The plan that would allow a model is not named: auth-service exposes the caller's own plan only, and the plan catalog does not list per-plan model access. The frontend currently shows one generic sentence for any 403 on start (`chat.threadPlanRequired`); mapping these codes to translated sentences is a follow-up.

### Start and retry are atomic, idempotent and capped (ADR-174 addendum, 2026-10-14)

- `retry-generation` runs the same preflight as a start, on the stored seats (fallbacks included) with the `models[]` overrides applied.
- The model-existence test is an exact match against connector-service's public picker catalog (cached 30 s), not the routing window heuristic.
- A start or retry runs one at a time per owner. The idempotency key is scoped to the owner; the same owner repeating a key gets the same publication and job, another body gets `409 THREAD_IDEMPOTENCY_KEY_REUSED`.
- If the publication cannot be saved after the job was queued, the job is cancelled so its budget is released. The write retries write conflicts four times, then answers a retryable 503.
- At most 3 generations queued or running per owner (`429 THREAD_GENERATION_TOO_MANY_ACTIVE`).
- `POST /api/v1/thread-publications-moderation/orphan-generations/repair` (`THREAD_PUBLICATIONS_MODERATE`, `{ jobs: [{ jobId, ownerId }] }`, up to 50) cancels queued or running jobs that no publication or edit review owns. Outcomes per job: `CANCELLED`, `IN_USE`, `NOT_FOUND`, `ALREADY_FINISHED`. Safe to repeat.
- Cancel of a job that is not queued or running is `409 THREAD_GENERATION_NOT_CANCELLABLE` with `state`. Publish is idempotent, an unpublished approved revision publishes again, and nothing publishable is a 409 with a reason.

## Board endpoints and search projection (ADR-177)

All behind the normal auth guard, prefix `/api/v1`.

| Method | Path                                                      | Notes                                                                                                                                                           |
| ------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/thread-publications/board`                              | `q`, `sort` (latest, trending, discussed, liked), `lang` (locale or all), `type` (or all), `page`, `limit` (12, 24, 48). Returns `{ items, meta, didYouMean }`. |
| GET    | `/thread-publications/board/suggest`                      | `q`, `lang`. Up to 10 suggestions with highlight offsets, `didYouMean`, `total` capped at 100 (`totalCapped`).                                                  |
| POST   | `/thread-publications-moderation/publications/:id/revoke` | Permission `THREAD_PUBLICATIONS_MODERATE`. Sets REVOKED, deletes the search row, audit-logged.                                                                  |

Throttles: suggest is limited per user well below the global limit (a keystroke endpoint); the list has its own, higher limit. Exact numbers live in the controller decorators. Suggest answers `Cache-Control: private`.

Projection: table `thread_publication_search_docs` (model `ThreadPublicationSearchDoc`) holds one row per publication that passes the public discovery predicate (PUBLISHED, OWNER_APPROVED, safety APPROVED, index eligible). It is written in the same transaction as publish, unpublish, revoke and approved edits; deleting a publication cascades. Counters are bumped in the comment, reaction and view write paths, and a reconcile job recomputes them to heal drift. One pure normaliser is used for both index and query. The migration is additive (extensions `pg_trgm`, `unaccent`, GIN and btree indexes, backfill). The Board is gated by a database-level setting, default OFF.

Privacy: items carry no author field. Nothing from DRAFT, UNPUBLISHED, REVOKED or unapproved rows reaches list, suggest or "did you mean".

## References

- Account deletion is consumed from Auth's `user.deleted` outbox event. The
  service writes a hashed tombstone, retains only eligible approved public
  revisions anonymously, and removes private snapshots and account-linked
  interactions. See rule 61 and ADR-160.

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)
