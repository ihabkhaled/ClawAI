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
cancels queued jobs and aborts a running job's in-flight provider call within about two seconds.

## Boundaries

- The publication and community service owns approved public revisions.
- Chat supplies filtered snapshots through an internal API; this service never reads the chat database.
- Research evidence remains owned by `claw-research-service`.
- Model context windows come from, in order: connector-service's public catalog
  (`ConnectorCatalogWindowClient`, the picker's source, fails open, 5 minute index),
  routing-service's registry, then the shared table. `ModelContextClient` returns
  `{ tokens, source }`: `known` (catalog, router row or shared table) or `assumed` (32,768,
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
- **Model output parsing.** Providers wrap JSON (Gemini in a ```json fence or markdown prose,
  Ollama models similarly). `parseModelJson` accepts bare JSON, a single fence, or the first balanced
  object in surrounding prose (braces inside strings are ignored), preferring the object the role's zod
  schema accepts; truncated output and text with no JSON yield nothing and the step fails
  `OUTPUT_INVALID` (one more try per model, then the fallback). No repair re-ask exists in the pipeline and
  none was added.
- **Job spend.** `thread_generation_jobs.spent_micro_credits` is integer micro-USD. Chat-service's
  `/internal/chat/generate` reply may carry `costMicroUsd` (the settled PAYG cost); the pipeline adds it
  per call, unfenced by attempt or status because the provider was paid either way, including for replies
  that fail validation or are cut short by the balance. A call that fails at the provider is released
  by the gateway and costs nothing. Owner progress shows the total. A gateway that omits the field (it
  does for non-PAYG billing) leaves the total at 0.
- Chat-service applies existing provider credit holds and settlement using a
  stable request ID and the Auth-owned aggregate job budget. No PAYG price
  surface is added.
- The queue is dedicated to generation work and has prefetch one. Prisma
  migrations run from development and production container entrypoints.
- Database-backed worker slots cap concurrency across replicas (six; three per replica, two per user, see ADR-176 below).
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

## Review language and source-thread visibility (ADR-174)

- **Judge and Critic review in the requested language.** `buildReviewSystemPrompt(reviewer, contentLocale)` (`utilities/review-prompt.utility.ts`) tells the reviewer the owner requested the article in that language (for example Spanish), so it is correct even when the topic, source conversation or evidence are in another language. A reviewer must not lower the score, add a blocker or ask for a rewrite or translation because the languages differ, may raise a language blocker only if the draft is not in the requested language, judges only factual support, coherence, completeness and safety, and writes findings and `revisionBrief` in that language. JSON keys stay English. Before this, the prompt omitted the locale, so a Spanish or French draft of an English request was scored down and told to switch to English (production rounds R08 and R12). The shared material still has no locale field; the system prompt carries it. Saved review communications are keyed by the prompt hash, so an in-flight job replays its review once.
- **A source thread that is missing or owned by someone else is a 404.** `ChatSnapshotClient` maps chat-service's 404 (and 403) to `NotFoundException('Thread not found')` instead of a 503 that invited retries. Threads relays it as `404 Source thread not found`, the same body for both cases, so a caller cannot tell whether another user's thread id exists.

## Model calls are bounded by silence, not by the clock (ADR-175)

Before this change every role call was one non-streaming request with a fixed `AbortSignal.timeout(180_000)`,
so a model that was still answering or thinking was killed at three minutes and cancelling a job waited for the
call in flight (about 60 s). Now:

- **Contract.** The client posts the same body as before to chat-service's
  `POST /api/v1/internal/chat/generate-stream` and reads `application/x-ndjson`: any number of
  `{"type":"activity"}` lines (sent only when upstream bytes really arrived, never on a timer), then exactly
  one `{"type":"result","data":{...the /generate JSON, plus optional costMicroUsd...}}` or
  `{"type":"error","status":<http>,"code":"<MACHINE_CODE>","message":"..."}`. Partial lines are buffered across
  chunks; unknown frame types are ignored; the message text is never forwarded.
- **Limits per call.** Silence 330 s on this hop (chat-service stops a silent provider at 300 s and answers with a
  coded `MODEL_IDLE_TIMEOUT` frame first), absolute 630 s on this hop (chat-service ends a call at 600 s with
  `MODEL_HARD_CEILING`). Every received chunk restarts the silence timer. Per attempt: 25 minutes
  (`GENERATION_ATTEMPT_MAX_MS`), because the broker redelivers a message held more than 30 minutes.
- **Failure codes in the step log.** `MODEL_IDLE_TIMEOUT` and `MODEL_REASONED_NO_ANSWER` (thinking but no answer)
  fall to the next fallback candidate and are otherwise retried by the normal job retry. `MODEL_HARD_CEILING`
  is not retried on the same model; the job is failed at once only when every candidate hit it.
  `GENERATION_ATTEMPT_TIMEOUT` ends the attempt (no fallback), the retry resumes from checkpoints. A stream cut
  off before its terminal frame is `PROVIDER_UNAVAILABLE`.
- **Cancel.** A running job polls for a cancel request every 2 s and aborts the in-flight call (all parallel
  votes), so the job reaches `CANCELLED` within a couple of seconds instead of waiting out the call; chat-service
  sees the socket close and releases the credit hold. Lease loss aborts the same way. Research is not yet
  covered.
- **Deploy order.** chat-service first, then this service. A new client against a chat-service replica that
  answers 404 on the stream route falls back to the old route for this release only.

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

## Concurrency, fairness and failure causes (ADR-176)

Added 2026-10-14 after local QA found one job per replica, a starving queue, wrong failure causes and a budget
close that retried for ever.

| Setting                                     | Value                               | Where                                                                                     |
| ------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Jobs per replica (RabbitMQ prefetch)        | 3                                   | `GENERATION_REPLICA_CONCURRENCY`, `app.module.ts`                                         |
| Jobs across all replicas (worker slot rows) | 6                                   | `GENERATION_WORKER_SLOT_COUNT`, migration `20261014120000_threads_generation_concurrency` |
| Running jobs per user                       | 2                                   | `GENERATION_OWNER_MAX_RUNNING`                                                            |
| Jobs re-published per 15 s sweep            | 10, one per user per round          | `GENERATION_DISPATCH_BATCH`, `findDispatchable`                                           |
| Budget close tries                          | 8, back-off 15 s doubling to 30 min | `BUDGET_CLOSE_*`                                                                          |
| Queued longer than                          | 3 h is failed `QUEUE_EXPIRED`       | `GENERATION_QUEUE_MAX_AGE_MS`                                                             |
| RUNNING with no lease                       | recovered after lease + 5 min       | `GENERATION_STALE_GRACE_MS`                                                               |

- **Claiming.** A claim locks the owner (`pg_advisory_xact_lock`), refuses when the owner already runs the cap
  or no slot is free, and then leaves the job QUEUED, untouched: the message is acked and the sweep re-publishes
  it after its 30 s dispatch lease. Delivery stays at-least-once: a duplicate finds the job RUNNING or finished
  and does nothing.
- **Fair re-publish.** The sweep takes the oldest job of every user before the second job of any user and skips
  users at the cap, so a long backlog cannot hide another user's job behind ten of its own.
- **Why a failed job names its cause.** When every candidate of a role fails, the job ends with the code that
  repeated most among the candidates (the first model's on a tie), and the final `GENERATION` step shows
  `Every model failed. Main cause: OUTPUT_INVALID (2 of 3). GEMINI/..: OUTPUT_INVALID; ...`. The per-candidate
  steps above it keep their own codes. `failureSummary` (operator ticket) carries the same text.
- **Why an output was refused.** An `OUTPUT_INVALID` step reads `TRUNCATED: The reply was cut off before the JSON
object ended. 8123 characters. Start: "..." End: "..."` (or `EMPTY`, `PROSE`, `INVALID_JSON`, `WRONG_SHAPE` with
  the field names). The recorder redacts and bounds it as before.
- **Budget close.** Auth releases any model call of the job still in flight as part of the close (2026-10-14), so a
  cancelled job closes at once. A close that auth cannot answer (503) is counted on the job and retried with back-off; after 8 tries the job is marked `budget_close_status =
CLOSE_ABANDONED`, closed locally so it can be deleted, and one error line names the job and budget ids. Look
  for `Generation budget close given up` in the log and release that budget in auth.
- **Spend.** `spentMicroCredits` is the persisted spend: the PAYG per-call cost chat-service reports, raised to the
  budget row's settled total (`POST /internal/threads/budgets/summary`, `settledMicroUsd`, plus `freeAllowanceMicroUsd` for Free jobs) by the budget closer just
  before each close, so plan-wallet and PAYG jobs match auth's `thread_job_budgets.spent_micro_usd`. Free jobs
  settle 0 (the free-allowance meter holds the cost), so they show 0. A summary failure never blocks the close.
  A running job is synced the same way after each model call settles (`GenerationSpendSyncService`, at most once
  per 5 s per job, best effort), so the owner sees spend grow before the budget closes.
- **Owner-only refusals fail fast.** `PAYG_CAP_TOO_LOW`, `PAYG_PRICE_UNAVAILABLE`, `PAYG_MODEL_UNPRICED`,
  `PAYG_CREDIT_EXHAUSTED` and `PAYG_FREE_ALLOWANCE_EXHAUSTED` end the job on attempt 1 with the code (no 3 attempts), and progress reports `retryable: false` for them.
- **Operating the slot count.** More replicas need `GENERATION_WORKER_SLOT_COUNT >= replicas x 3` and a migration
  that inserts `threads-worker-N` rows; a replica beyond the slots still works but its surplus claims wait for the
  sweep.

## Author output ceiling (round-3 truncation fix)

The request builder in the frontend (`createThreadGenerationRequest`) sets each role's `maxOutputTokens`. Authors now send 8192 (was 4096, which cut long Arabic and German drafts mid-text); Judge and Critic stay at 4096 because they return verdicts. The schema here accepts 256 to 32768 (`modelRoleSchema`). Cost effect: the spend reserve held for one author call is priced at the ceiling, so it doubles for authors; real spend is only what the model writes, and the job spend cap still refuses a call whose hold does not fit. Constants: `THREAD_AUTHOR_MAX_OUTPUT_TOKENS`, `THREAD_REVIEWER_MAX_OUTPUT_TOKENS` in `apps/claw-frontend/src/constants/thread-publication.constants.ts`.

## Free generation policy (platform failures refund the allowance)

A FAILED job with no draft closes its budget as `PLATFORM_FAILED` when the cause is the platform
(`OUTPUT_INVALID`, `PROVIDER_*`, `CLOUD_PROVIDER_*`, `MODEL_IDLE_TIMEOUT`, `MODEL_HARD_CEILING`,
`MODEL_REASONED_NO_ANSWER`, `MODEL_CATALOG_*`, `GENERATION_FAILED`, `CANDIDATES_EXHAUSTED`, `RESEARCH_*`,
`QUEUE_EXPIRED`, `LEASE_EXPIRED`); auth refunds the Free meter money and the lifetime Thread. `REVIEW_NOT_PASSED`,
owner or billing refusals (`PAYG_*`, plan and allowance codes, validation), owner cancels and unknown codes close
`RELEASED`. The one exception is `PAYG_FREE_ALLOWANCE_EXHAUSTED`: a Thread takes no request slot, so under a Thread it is
the platform's own accounting and closes `PLATFORM_FAILED` (D-P5-01). Progress carries `allowanceRefunded`. Classifier: `utilities/classify-budget-close.utility.ts`.

## Non-English and reasoning-model author output (2026-10-14)

Production showed `ar` guides and `de` articles ending `OUTPUT_INVALID` at `AUTHOR_DRAFTS` with Gemini flash-lite while
`en` passed, and Ollama glm-5.3 failing every author call. The author schema has no language or minimum-length rule;
the failures were tolerance gaps, fixed at the source:

| Cause                                                                                              | Fix                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence ids (hex) rewritten with Arabic-Indic digits, direction marks, full-width or CJK brackets | `canonicalCitationText` / `resolveEvidenceId` fold and match them; body markers are rewritten to ASCII `[id]`; the prompt asks for ASCII ids |
| Thinking text before the JSON (`<think>...</think>`, orphan `</think>`)                            | `stripReasoningBlocks`; unfinished thinking is classified `TRUNCATED`                                                                        |
| Raw line breaks in a long JSON string, trailing comma                                              | `repairJsonText` (only these two repairs)                                                                                                    |
| Reply cut off by `maxOutputTokens` (more tokens per word in ar, hi, ru, de)                        | the next ask raises the ceiling (x1.5, or the language factor, max 32768) and says so                                                        |
| A role stuck on a bad model                                                                        | no new candidate or retry after `ROLE_MAX_MS` (3 min); two bad replies fail over to the next fallback                                        |

A hallucinated evidence id is still refused. A role with no fallback still retries per job attempt; that limit lives
in `GenerationJobsService`. Tests: `non-english-author-output.spec.ts`, `generation-pipeline.output-recovery.spec.ts`.

### Allowance refusal body (2026-10-14)

When auth-service refuses the budget reservation because a plan allowance is used up or held, `ThreadBudgetClient.reserve` forwards its 403 body (`code` `THREAD_ALLOWANCE_UNAVAILABLE`, `feature`, `reason`, `used`, `limit`, `window`, `message`). A feature the plan switches off (`FEATURE_DISABLED`) stays the plain 403. Tests: `thread-budget.client.spec.ts`.
