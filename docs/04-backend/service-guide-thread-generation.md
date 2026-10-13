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
- Routing-service supplies model context windows. `ModelContextClient` returns
  `{ tokens, source }`: `known` (catalog row or shared table) or `assumed` (32,768,
  `THREADS_ASSUMED_WINDOW_TOKENS`, when neither has a window). Results are cached in
  memory per provider/model for 5 minutes (200 entries). An oversized full prompt
  fails closed without truncation, before any model call ([ADR-173](../13-adr/adr-173-threads-unknown-model-window-is-assumed-not-fatal.md)).
- **Retry classification.** `DeterministicGenerationError` marks a failure a retry
  cannot fix: prompt too large for every candidate, invalid role configuration, a
  catalog 4xx. `GenerationJobsService.process` then calls
  `retryOrFail(..., retryable = false)` and the job is FAILED on attempt 1 with the
  reason in `failureSummary`. Catalog unreachable, 5xx/408/425/429 and gateway errors
  stay retryable (3 attempts, 15 s then 30 s). A role is deterministic only when
  every candidate failed deterministically.
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

- Account deletion consumes Auth's `user.deleted` event, removes private jobs,
  and stores a hashed tombstone. Enqueue rejects deleted accounts. See rule 61
  and ADR-160.

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)
- [Generation queue runbook](../../skills/run-threads-generation-queue.md)

## Stage and round progress

The worker writes the job's `stage` and `round` as it moves (`saveProgress`, fenced on the attempt
number): AUTHOR_DRAFTS, CONSENSUS, JUDGE, CRITIC, then READY_FOR_REVIEW. The review page reads them
from `generation-state` and says what is happening. Before 2026-10-07 the stage stayed
AUTHOR_DRAFTS until the end.

## Owner step log, progress, retry and delete

Added 2026-10-13. Contract: `ThreadGenerationProgress` in `@claw/shared-types`
(`thread-generation-progress.type.ts`). This service returns the core without `publicationId`;
the Threads service adds it.

Table `thread_generation_steps` (migration `20261013120000_threads_generation_steps`, additive):
`job_id` FK cascade, `seq` (unique per job), `at`, `stage`, `round`, `outcome`
(STARTED/SUCCEEDED/FAILED/RETRY/FALLBACK/SKIPPED), `role_kind`, `role_id`, `provider`, `model`,
`code`, `http_status`, `duration_ms`, token counts, `excerpt` (VarChar 1200).

- `StepRecorder` (services/) writes steps through `GenerationStepsRepository`. It never throws:
  a storage error or a sequence race that outlasts 5 reads is logged and dropped.
- `GenerationPipelineManager` records research start/finish, each stage change, every author,
  judge and critic call (start, success, failure, wrong-shape retry, fallback), consensus and
  review retries, and invalid citations. `GenerationJobsService.process` records the final
  FAILED / RETRY (stage `GENERATION`), cancel observed (`CANCELLED`) and READY_FOR_REVIEW.
- Codes come from `parseStepError`: `Chat model request failed (402: PAYG_CREDIT_EXHAUSTED)`
  becomes httpStatus 402 + code `PAYG_CREDIT_EXHAUSTED`; a bare status becomes `PROVIDER_ERROR`
  (429 `PROVIDER_RATE_LIMITED`); service-written messages map to `PROVIDER_UNAVAILABLE`,
  `CONTEXT_WINDOW_EXCEEDED`, `CONTEXT_WINDOW_ASSUMED` (prompt too large for an assumed 32k
  window), `MODEL_CATALOG_UNREACHABLE`, `MODEL_CATALOG_REJECTED`, `OUTPUT_INVALID`,
  `CITATION_INVALID`, `RESEARCH_*`,
  `REVIEW_NOT_PASSED`, `CANCELLED`. The cause chain is walked; an upstream status wins.
- Excerpt: first 600 chars of the model output, trimmed, URL query strings and obvious secrets
  removed. Owner-only; never put it in a log line or a public response.

Internal service-token routes (all body-scoped by `ownerId`; a non-owner gets 404, never 403):

| Route                                                                          | Result                                                                                                                                                                                   |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST :jobId/progress` `{ownerId}`                                             | `ThreadGenerationProgressCore` (selections, failure, up to 500 steps)                                                                                                                    |
| `POST :jobId/retry` `{ownerId, idempotencyKey, topic?, spendCapUsd?, models?}` | New job from the failed or cancelled job's pinned snapshot; 409 if the job is not FAILED/CANCELLED or its request is a revision review; 400 for an unknown role id or a cap out of range |
| `POST :jobId/delete` `{ownerId}`                                               | Deletes a finished job (cascade); 409 while QUEUED/RUNNING, and 409 until the budget close has run                                                                                       |

Retry reuses the enqueue path (idempotency, budget reserve). Its correlation id is derived from
the key (`retry:<key>`), so repeating the same call is idempotent and a key reused with changed
input conflicts. Changing a role's provider drops fallbacks on that provider. Delete refuses to
run before `budget_closed_at` is set so the idempotent close path never loses its row.
