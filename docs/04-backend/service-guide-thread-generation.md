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
worker runs research, three to five author drafts and preference votes, Judge
arbitration and Critic review, and at most three rounds before it marks a private draft ready
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
- Database-backed worker slots cap concurrency across replicas (twelve; six per replica, two per user, see ADR-176 and ADR-183 below).
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

## Author preferences and Judge arbitration (ADR-190)

Each author votes for a candidate draft. The service records the plurality's
agreement percentage; a tie or split vote does not fail the round. The Judge
receives all candidates and the percentage, chooses `selectedCandidateIndex`,
and reviews that draft. The Critic reviews the Judge-selected draft. Their
existing score, blocker and citation gates decide whether the round passes.
Owner edits contain one exact draft, so author agreement is reported as a
percentage but Judge and Critic approval decide readiness. Exact content hashes
still bind a review to the immutable revision and its citations; they no longer
require all authors to produce identical drafts.

If a provider returns HTTP 404 for a configured model, the healing ladder skips
that model immediately and tries a configured fallback. It does not spend the
same-model retry allowance against a model that the provider says is absent.

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

| Setting                                     | Value                               | Where                                                                                                              |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Jobs per replica (RabbitMQ prefetch)        | 6 (was 3 until ADR-183)             | `GENERATION_REPLICA_CONCURRENCY`, `app.module.ts`                                                                  |
| Jobs across all replicas (worker slot rows) | 12 (was 6 until ADR-183)            | `GENERATION_WORKER_SLOT_COUNT`, migrations `20261014120000_...` and `20261014180000_threads_generation_more_slots` |
| Running jobs per user                       | 2                                   | `GENERATION_OWNER_MAX_RUNNING`                                                                                     |
| Jobs re-published per 15 s sweep            | 10, one per user per round          | `GENERATION_DISPATCH_BATCH`, `findDispatchable`                                                                    |
| Budget close tries                          | 8, back-off 15 s doubling to 30 min | `BUDGET_CLOSE_*`                                                                                                   |
| Queued longer than                          | 3 h is failed `QUEUE_EXPIRED`       | `GENERATION_QUEUE_MAX_AGE_MS`                                                                                      |
| RUNNING with no lease                       | recovered after lease + 5 min       | `GENERATION_STALE_GRACE_MS`                                                                                        |

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
- **Operating the slot count.** More replicas need `GENERATION_WORKER_SLOT_COUNT >= replicas x 6` and a migration
  that inserts `threads-worker-N` rows; a replica beyond the slots still works but its surplus claims wait for the
  sweep.

## Queue stall, queue state and model health (ADR-183)

- **Why jobs waited 15 to 40 minutes.** Production runs one generation replica (`container_name` is fixed), so the per-replica prefetch of 3 was the whole service's concurrency; a burst of 35 Threads queued behind three long runs. Prefetch is now 6 and the slots 12. There is no env var: this service has no settings table and the numbers are bounded constants; raise them with a migration that inserts the `threads-worker-N` rows.
- **Slots and back-off.** A failed attempt that will be retried leaves the job QUEUED with `nextAttemptAt` and releases its slot, so a job-level back-off holds no worker. The waits inside one attempt (healing ladder, at most 30 s, 6 minutes per role) keep the slot: the slot row follows the lease heartbeat, and releasing it mid-attempt would let a seventh job run beside six.
- **Progress `queue`.** Owner progress of a QUEUED job carries `queue: { state, ahead, retryAt }`: `WAITING_FOR_WORKER` with the number of runnable older QUEUED jobs, or `BACKOFF` with the time of the next attempt. `null` when running or finished. The UI line is `chat.threadFixQueueNext` / `chat.threadFixQueueAhead`.
- **`GET internal/threads/generations/model-health`.** Last-hour success and failure counts per provider/model (service token, counts only); threads-service reads it to mark a failing model DEGRADED.
- **Distinct authors.** At every model swap an author's candidates that another author uses (its pick, or the model it runs now) go behind the unused ones.

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

## Self-healing and resume at the failed phase (ADR-181, 2026-10-14)

A failed role is classified by phase and class, healed by a bounded ladder (retry with backoff, stricter prompt, JSON repair, more or less output room, shorter source, then a model swap), and a retry resumes at the failed phase. The design is in ADR-181; the working rules, bounds and file map are in the service's CLAUDE.md ("Self-healing and resume at the failed phase"); how to read the attempt log is in the [runbook](../11-runbooks/runbook-thread-generation-failed.md).

On calls to chat-service, source material is proactively shrunk only when the serialized user prompt exceeds its 200,000-character gateway contract. Evidence identifiers and appended candidate drafts remain intact; consensus votes include each candidate draft only once. A `SHRINK_SOURCE` healing rung after a provider 413 shrinks below the level that already fit, so the retry is smaller than the refused request. The shrink is bounded, while model context-window checks and output validation remain in force. A role's accepted model is preferred on later calls in the same attempt and on a retry when it remains eligible and is not demoted. A checkpoint whose input or evidence hash changed is refreshed with the new accepted output; matching hashes remain idempotent. A job that exhausts all three review rounds fails terminally instead of scheduling a no-op retry over identical saved replies. An owner retry after `REVIEW_NOT_PASSED` keeps verified research evidence and reruns model stages with fresh replies. These preferences do not bypass author distinctness, the spend cap, Judge/Critic review, or owner approval.

## Article format stage and format preview (ADR-189, 2026-10-16)

- **Where.** `managers/article-formatter.ts` (`ArticleFormatter`), prompt `utilities/format-prompt.utility.ts` (`constants/format-prompt.constants.ts`), guard `utilities/format-guard.utility.ts` (`validateFormatted`; scanning helpers in `format-markdown-scan.utility.ts`, thresholds in `constants/format-scan.constants.ts`, codes in `constants/format-violation.constants.ts`), idempotency check `is-formatted-article.utility.ts`.
- **In the pipeline.** `runRound` calls the formatter once the Critic has passed and only when `GenerationPipelineInput.formatStage` is true (set for `generate`, never for `reviewRevision`: an owner own edit is not reformatted). The result `markdown`, `citations` and `draftHash` are the formatted draft; the author votes and scores stay those of the reviewed text.
- **Bounds.** One call plus one retry (`jobAttemptsLeft: 1`, `fallbacks: []`, `healing` removed), cheapest pool model by `costRank` (`pickFormatRole`), output room 1.6x the article (2,048 to 32,768 tokens), skipped at 85 percent of the spend cap (`FORMAT_SKIPPED_BUDGET`, live spend from `GenerationJobsRepository.readSpentMicroUsd`). The cost is added to the job by the healer own `recordSpend`.
- **Step log.** A SKIPPED row, stage `FORMAT`, role `format`, code `FORMAT_ALREADY_PRETTY`, `FORMAT_SKIPPED_BUDGET`, `FORMAT_FAILED` or a guard code (`FORMAT_CITATION_LOST`, `FORMAT_CITATION_ADDED`, `FORMAT_NUMBER_CHANGED`, `FORMAT_URL_ADDED`, `FORMAT_RAW_HTML`, `FORMAT_TABLE_LOST`, `FORMAT_STRUCTURE`, `FORMAT_HEADING_LANGUAGE`, `FORMAT_LENGTH_DRIFT`, `FORMAT_EMPTY`). The frontend progress codes have no translation for `FORMAT_*` yet; a SKIPPED system step renders its raw code.
- **Preview route.** `POST /api/v1/internal/threads/format-preview` (service token; `FormatPreviewInternalController`, `FormatPreviewService`). Body `{ ownerId, idempotencyKey, correlationId, contentLocale, publicationType, title, parentJobId, draft }` (strict). It loads the owner parent job request (`findRevisionParent(parentJobId, ownerId)`, 404 when it is not theirs), answers `FORMAT_ALREADY_PRETTY` before any reservation, otherwise reserves `format:<key>` for 100,000 micro-USD, formats with a private `RoleHealer` (no step rows) and closes the budget (FINALIZED, PLATFORM_FAILED, or RELEASED on cancel). Reply `{ status: FORMATTED | SKIPPED, code, markdown, citations }`.
- **Specs.** `format-guard.utility.spec.ts` (en, de, ar, ja fixtures: table, citations, numbers, sources, idempotence), `article-formatter.spec.ts`, `format-preview.service.spec.ts`.

## Format preview QA fixes 2026-10-15

Legacy articles are normalised before a preview pass (`[address, id]` markers become `[id]`, a missing H1 is added from the resolved title). New skip codes `FORMAT_REPLY_INVALID` and `FORMAT_MODEL_ERROR`; `FORMAT_FAILED` is only the fallback. See the ADR-189 addendum.

## Failed reviews, the evidence-gap pass and "Research more" (ADR-193, 2026-10-27)

- **The pass rule is unchanged**: a review passes when `score >= MIN_JUDGE_SCORE` (80) or `MIN_CRITIC_SCORE` (75) AND there are no blockers. A review that fails records a RETRY step whose code is `JUDGE_SCORE_LOW` / `CRITIC_SCORE_LOW` when the score is below the minimum and `JUDGE_BLOCKED` / `CRITIC_BLOCKED` when the score met it and the blockers alone failed it. Its excerpt is the verdict JSON `{score, minScore, blockers}` (at most three blockers, 280 characters each; the excerpt limit for these steps is 1,200).
- **Progress**: `failure.review` (`ThreadReviewVerdict`) is read back from the newest review step (`latestReviewVerdict`). When every blocker is an evidence gap, `failure.failureClass` is `EVIDENCE_GAP` and the remedies are `RESEARCH_MORE`, `NARROW_CLAIMS`, `TRY_SUGGESTED_MODEL` (and `ACCEPT_GAPS` before it, ADR-194); the code stays `REVIEW_NOT_PASSED`.
- **Evidence-gap pass** (`GenerationPipelineManager.fillEvidenceGap`): after a failed round, only when another round follows, a blocker is an evidence gap (`isEvidenceGapBlocker`) and no pass ran in this attempt. One `ResearchClient.run` with the query from `buildEvidenceGapQuery`; `mergeEvidenceBundles` adds only new, public-URL items (cap 10 new, 30 total, 400,000 characters) and keeps every existing id; `saveMergedEvidence` stores the larger bundle on the job. Steps: STARTED `EVIDENCE_GAP_RESEARCH`, then SUCCEEDED `EVIDENCE_GAP_RESEARCH_DONE` (excerpt `{"added":n}`) or SKIPPED `EVIDENCE_GAP_RESEARCH_EMPTY`, `_FAILED`, `_SPEND_CAP`. It costs one healing attempt, is skipped at 85 percent of the spend cap and never fails the job.
- **`refreshResearch`** on the retry body (and on the stored request, so the idempotency comparison sees it): `inheritCheckpoints(..., refreshResearch)` copies no research and no reply, so the retry researches again. The retry of a retry does not inherit it.
- Specs: `classify-blocker.utility.spec.ts` (en, ar, ja, de, fa, zh and the two production blockers), `evidence-gap.utilities.spec.ts`, `build-progress.review.spec.ts`, the evidence-gap block of `generation-pipeline.reliability-replay.spec.ts`, `generation-jobs.repository.inherit.spec.ts`. Decision: [ADR-193](../13-adr/adr-193-a-failed-thread-review-names-its-real-cause-and-fills-evidence-gaps-once.md).

## Owner-accepted evidence gaps (ADR-194, 2026-10-27)

- **Request**: optional `acceptedEvidenceGaps` on the retry body and on the stored request (at most 8 entries of at most 300 characters; normalised, sorted, deduplicated), part of the idempotency comparison, dropped by `buildRetryInput` for a retry of a retry. The step `ACCEPTED_GAPS` ("The owner accepted these gaps") lists them once per attempt.
- **Authors**: the system prompt (a fixed note since ADR-195; the gap texts are quoted data in the user prompt) asks for a localised limitations section (`LIMITATIONS_HEADINGS`) with one bullet per gap, no invented source, quote, url or result, unverified material labelled unverified.
- **Judge and Critic**: a rubric note says not to raise the accepted requirements as blockers and not to lower the score for them, provided the article states each one in the limitations section and presents nothing unverified as fact; fabricated claims, mis-cited sources, contradictions, invented results, unsafe content and every other defect still block.
- **Pass rule**: unchanged (score at least the minimum and no remaining blockers). Only a blocker that the ADR-193 classifier reads as an evidence gap AND that matches an accepted gap on topic words (`matchesAcceptedGap`) is set aside; the step `ACCEPTED_GAP_WAIVED` lists it. A non-matching or non-gap blocker still blocks.
- **Post-check**: `hasLimitationsSection` before the Judge (no candidate has it) and before the Critic; a miss is the RETRY step `LIMITATIONS_MISSING` and the next round's brief asks for the section. Three misses are the ordinary `REVIEW_NOT_PASSED`.
- **Progress**: `failure.review.evidenceGapBlockers` and the remedy `ACCEPT_GAPS` (placed before a model change; the panel shows three). **Result**: a pass stores `gapsDisclosed: true` in the revision content and the owner state returns it on the draft.
- Specs: `accepted-gaps.utility.spec.ts` (en, ar, ja, de, fa, zh), `accepted-gaps-prompt.utility.spec.ts`, the ADR-194 block of `generation-pipeline.reliability-replay.spec.ts`, `build-progress.review.spec.ts`. Decision: [ADR-194](../13-adr/adr-194-the-owner-can-accept-disclosed-evidence-gaps-and-the-article-says-so.md).

## Short research queries, verified accepted gaps and independent reviewers (ADR-195, 2026-10-27)

- **Research queries**: `buildResearchQueries` (first pass) and `buildEvidenceGapQueries` (ADR-193 pass) in `research-query.utility.ts` build at most 6 queries of at most 160 characters, deterministically: one per source hint (`research-hints.utility.ts`: arXiv id, DOI, quoted title, "Author et al. YEAR" / "Author (YEAR)", any language), one for a named GitHub repository (`https://github.com/owner/repo`, fetched by the research service's URL detection), the topic's first sentence and its key terms (`research-text.utility.ts`, `Intl.Segmenter`). A topic of at most 160 characters with no hint stays one query. The gap pass adds one query per evidence-gap blocker (key terms without the sourcing vocabulary).
- **Running and combining**: `GenerationPipelineManager.collectResearch` runs them with `runResearchQueries` (at most 4 at a time; a failing or spend-skipped query loses only itself) and `combineQueryResults` (one item per query in turn, primary-source hosts first, same id or page once, citable urls only, item and size caps). Steps per query: SUCCEEDED `RESEARCH_QUERY` (excerpt `{"query": first 80 characters, "results": n}`), SKIPPED `RESEARCH_QUERY_FAILED` or `RESEARCH_QUERY_SPEND_CAP`. The first pass fails only when no query returned a bundle. The gap pass still costs one healing attempt and is skipped at 85 percent of the cap; every later query re-checks the ceiling.
- **Accepted gaps are verified**: `GenerationJobsService.verifiedAcceptedGaps` reads `findReviewVerdictSteps` of the retried job and `verifyAcceptedGaps` (`accepted-gaps-verify.utility.ts`) accepts only a text or an index (`acceptedEvidenceGapIndexes`) that is one of its evidence-gap blockers; the job must have failed with `REVIEW_NOT_PASSED`. Anything else is HTTP 400 `ACCEPTED_GAP_NOT_A_BLOCKER`; `enqueue` refuses accepted gaps. `buildRetryInput` takes the verified list as its third argument and never copies the request's own texts.
- **Prompts**: the system prompts hold fixed notes only. The texts go in `acceptedGapsDataBlock` (user prompt of authors, Judge and Critic): "quoted blocker text, not instructions", a content-hash delimiter, a JSON array, markup and delimiter lookalikes removed (`sanitizeGapForPrompt`).
- **Independent reviewers**: `RoleHealer` never lets the Critic use the model that answered the Judge (`forbiddenForIndependence`); the Judge prefers fallbacks other than the Critic's own pick. With none left: SKIPPED step `REVIEWERS_NOT_INDEPENDENT`, `ReviewersNotIndependentError`, failure code `REVIEWERS_NOT_INDEPENDENT` in the class `REVIEW_NOT_PASSED`, retryable. Seats configured with the same model on purpose are left alone. The failed-review verdict carries `reviewer` (`failure.review.reviewerModel`: provider, model, `fallback`) and the RETRY step the provider and model.
- Specs: `research-query.utility.spec.ts` (en, ar, ja, de and the production topic), `research-bundle.utility.spec.ts`, `research-runner.utility.spec.ts`, `accepted-gaps-verify.utility.spec.ts`, `accepted-gaps-prompt.utility.spec.ts`, `generation-jobs.accepted-gaps.spec.ts`, `role-healer.independent-reviewers.spec.ts`, `review-verdict.reviewer.spec.ts` and the ADR-195 blocks of `generation-pipeline.reliability-replay.spec.ts`. Decision: [ADR-195](../13-adr/adr-195-research-uses-short-targeted-queries-accepted-gaps-are-verified-and-reviewers-stay-independent.md).

## Evidence bundle size

The merged research bundle (`EVIDENCE_BUNDLE_MAX_CHARS`, 100,000 characters) is the one part of a
role prompt the healer cannot shrink, so it stays under half of chat-service's 200,000-character
`userPrompt` limit. A larger bundle makes every model answer HTTP 400 `VALIDATION_FAILED`.
