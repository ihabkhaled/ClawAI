# Thread Generation Service

Owns isolated generation jobs, durable checkpoints, attempts, cancellation,
progress, and the dedicated queue. Chat snapshots and research evidence come
from their owning services; never read another service's database.

The service runs on port 4020. It persists generation jobs and checkpoints in
its owned PostgreSQL database and consumes `claw.threads.generation`. Internal
enqueue and cancellation routes require a service token. Research and model
calls go through their owning services. The publication read/approval handoff
is pending; generated drafts remain private. Follow the [service guide](../../docs/04-backend/service-guide-thread-generation.md),
[Threads architecture](../../docs/03-architecture/clawai-threads-architecture.md),
and [product spec](../../docs/02-business-product/clawai-threads-product-spec.md).

## Owner step log, progress, retry, delete

Table `thread_generation_steps` records every step of a job (owner-only, bounded excerpt).
`StepRecorder` must never throw into the pipeline. Internal routes `:jobId/progress`,
`:jobId/retry`, `:jobId/delete` are owner-scoped by body `ownerId`; non-owners get 404. Retry
builds a new job from the pinned snapshot (no fresh snapshot, new idempotency key); delete waits
for the budget close and removes the whole retry chain. `retriedFromJobId` is unique, so a job has at
most one retry: a second retry returns the existing retry child before any budget is reserved, and a lost race releases its
reservation. Error codes come from `parseStepError`; never log excerpts.

## Model window and retries (ADR-173)

`ModelContextClient.getWindow` returns `{ tokens, source: 'known' | 'assumed' }`. An unknown
window is assumed to be `THREADS_ASSUMED_WINDOW_TOKENS` (32,768), never an error, and the prompt is
still checked against it and never truncated. Lookups are cached (5 min TTL, 200 entries). Source order: connector catalog
(`ConnectorCatalogWindowClient`, the picker's `public-catalog` route, fails open) -> router
registry -> shared table -> assumed. Failure
codes are separate: `MODEL_CATALOG_UNREACHABLE` (retryable), `MODEL_CATALOG_REJECTED`,
`CONTEXT_WINDOW_EXCEEDED`, `CONTEXT_WINDOW_ASSUMED`. Throw `DeterministicGenerationError` for
anything a retry cannot fix; the job then fails on attempt 1 (`retryOrFail(..., false)`). A new
code needs the frontend `THREAD_GENERATION_CODE_KEYS` entry and all 13 locales. See the
[service guide](../../docs/04-backend/service-guide-thread-generation.md#owner-step-log-progress-retry-and-delete).

## Model output parsing and job spend (ADR-173 addendum)

Every role reply is read with `parseModelJson(content, schema)` (`utilities/parse-model-json.utility.ts`), never
`JSON.parse`: bare JSON, one code fence, or the first balanced object inside prose, string-aware, the
first object the role's schema accepts. A reply whose object never closes (cut off) yields nothing and
fails `OUTPUT_INVALID`. Spend: `ChatModelResponse.costMicroUsd` is the chat gateway's settled integer
micro-USD for the call; the pipeline adds it with `GenerationJobsRepository.addSpend` right after the call,
before the cancel check and before parsing, so cancelled, superseded and unparseable calls still count.
`ChatModelIncompleteError` carries the cost of a reply that was charged but unusable. Never compute a
price here; the cost is only what the gateway reports. `spentMicroCredits` holds micro-USD.

## Review language and foreign source threads (ADR-174)

The Judge and Critic system prompt comes from `buildReviewSystemPrompt(reviewer, contentLocale)`
(`utilities/review-prompt.utility.ts`, text in `constants/review-prompt.constants.ts`), never an
inline string: the requested article language is correct even when the topic or evidence is in
another language; reviewers do not penalise, block or ask for a rewrite or translation over it, and
write findings and `revisionBrief` in that language. Keep the rest of the contract (JSON keys in
English, no chain-of-thought). Changing the prompt changes the stored prompt hash, so in-flight jobs
replay their review once. `ChatSnapshotClient` answers 404 (never 503) when chat reports the source
thread missing or owned by someone else.

## Model calls time out on silence, not on the clock (ADR-175)

`ChatModelClient.generate` calls chat-service's `POST /internal/chat/generate-stream` and reads
`application/x-ndjson` frames incrementally (`utilities/ndjson-lines.utility.ts`; a line may be split
across chunks). Frames (mirrored zod schema in `schemas/chat-generate-stream.schema.ts`, no shared
package): `{"type":"activity"}` only when upstream bytes really arrived, then exactly one terminal
`{"type":"result","data":<the /generate JSON>}` or `{"type":"error","status","code","message"}`. An unknown
frame type is ignored; the `message` text is never read or forwarded, only the machine `code`.

- **One guard per call** (`utilities/model-call-guard.utility.ts`): silence limit `MODEL_CALL_IDLE_TIMEOUT_MS`
  330 s, restarted on every chunk of bytes; absolute `MODEL_CALL_MAX_TOTAL_MS` 630 s that nothing restarts; and
  the job's `AbortSignal`. The limits sit 30 s above chat-service's own (300 s idle, 600 s ceiling) so its coded
  error frame arrives first and this hop's limits are only a backstop. Constants live in
  `models/constants/model-call.constants.ts`; there are no env vars.
- **Codes.** `MODEL_IDLE_TIMEOUT` (retryable, falls to the next fallback candidate), `MODEL_REASONED_NO_ANSWER`
  (same), `MODEL_HARD_CEILING` -> `ModelCallCeilingError`, a `DeterministicGenerationError`: the same model is
  not retried, the next candidate is tried, and the job fails on attempt 1 only if every candidate ended that
  way. An error frame becomes `Chat model request failed (<status>: <CODE>)`, so `parseStepError` keeps status
  and code; a stream that ends with no terminal frame is `PROVIDER_UNAVAILABLE` (transient).
- **Cancel stops the call in flight.** `GenerationJobsService.startLeaseMonitor` owns an `AbortController` per
  job and polls `isCancellationRequested` every `CANCEL_POLL_INTERVAL_MS` (2 s); cancel or lease loss aborts it.
  The signal rides `GenerationPipelineInput.signal` -> `callRole` -> `ChatModelRequest.signal`, so parallel
  author votes stop together and the socket closes (chat-service then releases the hold). Never poll cancel only
  between steps again.
- **Attempt ceiling.** `GenerationPipelineManager.withAttemptCeiling` gives one attempt
  `GENERATION_ATTEMPT_MAX_MS` (25 min, under the broker's 30 min consumer timeout) and joins that to the job
  signal. Expiry fails the attempt with `GENERATION_ATTEMPT_TIMEOUT` (`GenerationAttemptTimeoutError`), no
  fallback is tried, and the retry resumes from saved checkpoints.
- **One release of fallback.** A 404 from the stream route (a chat-service replica not yet upgraded) calls the old
  `/internal/chat/generate` instead, with only the ceiling (no activity exists to watch). Delete
  `callBuffered` and `CHAT_GENERATE_PATH` once every chat-service replica serves the stream route.
- A new code needs the frontend `THREAD_GENERATION_CODE_KEYS` entry and all 13 locales (done for the four codes
  above in `docs/05-frontend/threads-progress-codes.md`). Research calls are not yet cancellable in flight.

## Concurrency, fairness and failure causes (ADR-176)

- **Jobs run in parallel.** `app.module.ts` sets the RabbitMQ `prefetchCount` to `GENERATION_REPLICA_CONCURRENCY`
  (3); each delivery is handled on its own and holds its message until the job ends, so a replica runs at most
  three jobs. `GENERATION_WORKER_SLOT_COUNT` (6, one `thread_generation_worker_slots` row each, seeded by
  migrations) caps all replicas together; raise it only with a migration that inserts the rows, and keep it at
  least replicas x 3. `GENERATION_OWNER_MAX_RUNNING` (2) caps one user.
- **`claim` may answer null and that is not an error.** It takes `pg_advisory_xact_lock(hashtext(ownerId))`,
  counts that owner's RUNNING jobs, and refuses at the cap; a refused or slotless claim leaves the job QUEUED with
  no attempt used, the message is acked, and the sweep re-publishes it after the 30 s dispatch lease. Never throw
  or nack for it.
- **`findDispatchable` is fair by SQL**, not by ordering in code: `ROW_NUMBER() OVER (PARTITION BY owner_id)`,
  one job per owner per round, owners at the cap skipped. Do not go back to `findMany` oldest-first.
- **A failed role ends in `CandidatesExhaustedError`** (`utilities/candidates-exhausted.error.ts`): per-candidate
  `CandidateOutcome`s (machine codes only), a primary cause (most repeated code, earliest on a tie), and a summary
  line. `parseStepError` returns the primary cause and stops there; `handleFailedAttempt` records it as the final
  step's code with the summary as the owner-visible excerpt, and `describeFailure` uses the same summary for
  `failureSummary`. Never report the last fallback's error as the job's cause. Constructing it with a
  deterministic cause keeps the job's fail-on-attempt-1 behaviour.
- **`OUTPUT_INVALID` steps carry a classified reason** from `describeOutputFailure` (`EMPTY`, `TRUNCATED`,
  `PROSE`, `INVALID_JSON`, `WRONG_SHAPE` plus the invalid field names, length, start and end), not a blind cut
  of the reply. The code stays `OUTPUT_INVALID`.
- **Budget close is bounded.** All closes go through `GenerationBudgetCloser`; a failure is counted on the job
  (`budget_close_attempts`, `budget_close_next_at`), the sweep honours the back-off (15 s doubling to 30 min),
  and after 8 tries the job is marked `CLOSE_ABANDONED` and closed locally. One warning with the reason on the
  first failure, one error when it gives up, nothing between. `ThreadBudgetClient.close` throws
  `ThreadBudgetCloseRefusedError` when auth answers null/false (a call is still reserved) and a plain
  `ServiceUnavailableException` for an outage. Do not add a log or a retry outside the closer.
- **Abandoned jobs.** `recoverExpiredLeases` also takes RUNNING rows with no lease untouched for lease + grace;
  `expireStaleQueuedJobs` fails QUEUED rows older than `GENERATION_QUEUE_MAX_AGE_MS` (3 h) with
  `QUEUE_EXPIRED`. Both are bounded, guarded by status and age, and idempotent; the budget is released through
  the closer. This service cannot see publications, so a job whose publication was never attached is not
  detected earlier than the age bound.
- **A job that could not be stored releases its reservation** only when no job holds the idempotency key
  (reserve is idempotent per owner and key, so a concurrent request shares the budget).
- A new code (`QUEUE_EXPIRED`) needs the frontend `THREAD_GENERATION_CODE_KEYS` entry and all 13 locales.
- `spentMicroCredits` is the sum of the `costMicroUsd` chat-service reports (PAYG only), raised monotonically to the
  budget row's `settledMicroUsd` (auth `POST /internal/threads/budgets/summary`, `ThreadBudgetClient.spentMicroUsd`, the larger of `settledMicroUsd` and `freeAllowanceMicroUsd`; an absent field means 0)
  by `GenerationBudgetCloser` right before every close, and also while the job runs: `GenerationSpendSyncService`
  (called from the pipeline's `recordSpend` after each model call settles) syncs it at most once per 5 s per job,
  best effort. Progress reads the persisted value, never auth per poll.
  A Free job settles 0 by design (its cost sits in the free-allowance meter), so its spend is read from the summary's
  `freeAllowanceMicroUsd` and shows the real money.
- **Free generation policy.** A job that ends FAILED (or lease/queue-expired) with no draft closes its budget as
  `PLATFORM_FAILED` when the code is platform-caused (`PLATFORM_FAILURE_STEP_CODES` plus the `CLOUD_PROVIDER_*` and
  `MODEL_CATALOG_*` prefixes in `step-recorder.constants.ts`, classified by `budgetCloseStatusForFailure`); auth then
  refunds the Free meter money and the lifetime Thread hold. `PAYG_FREE_ALLOWANCE_EXHAUSTED` is the one owner-looking code
  that ALSO closes `PLATFORM_FAILED` (`PLATFORM_ACCOUNTING_STEP_CODES`): a Thread takes no request slot, so that code is the
  platform's own accounting (D-P5-01, ADR-162 addendum). `REVIEW_NOT_PASSED`, every other `NON_RETRYABLE_STEP_CODES`
  code, an owner cancel and any unknown code close `RELEASED` (allowance stays spent). A retried close (sweep) reads
  the job's last failed step code (`findLastFailureCode`) so it keeps the verdict. Progress exposes
  `allowanceRefunded` (`budget_close_status = PLATFORM_FAILED`). A new platform code goes in the set AND the
  classification spec table. "Retry on us" needs no code here: the refund frees the allowance the retry reserves.
- `NON_RETRYABLE_STEP_CODES` (PAYG cap too low, price unavailable, unpriced model, credit and allowance exhausted)
  fail the job on the first attempt; a retry would be refused the same way (ADR-173 addendum). The progress
  `failure.retryable` is false for them too (`isRetryable` in `build-progress.utility.ts`), so the UI offers no Retry.
  When parallel authors fail with mixed codes, `requireFulfilled` lets such an owner/billing code win over a
  transient one (a sibling `PROVIDER_ERROR`), so the attempt fails as final instead of retrying and re-spending.

## Round-2 output hardening (2026-10-14, ADR-173 addendum)

The model is never asked to echo the draft hash: the vote schema is `{ agrees }`, the hash comes from the
request, and a stray echo is ignored. Reviewer `blockers`/`findings`/`revisionBrief` are shortened after
parsing (280 characters, five findings), never rejected; the prompt states the limit. Author markdown goes
through `sanitizeDraftMarkup` (strips `<sup>`/`<sub>`, flattens `[[id1], [id2]]`). A provider outage the chat
service sends as a 400 with `CLOUD_PROVIDER_UNAVAILABLE` is stored as `PROVIDER_UNAVAILABLE` with HTTP 503.
`PAYG_CAP_TOO_LOW`, `PAYG_CREDIT_EXHAUSTED`, `PAYG_PRICE_UNAVAILABLE` pass through as their own codes. A
fallback identical to its primary is dropped at call time with a SKIPPED step `FALLBACK_SKIPPED_SAME_PROVIDER` (ADR-181: a different model of the same provider is kept).

## Non-English and reasoning-model author output (2026-10-14)

Production: `ar` and `de` drafts ended `OUTPUT_INVALID` where `en` passed, and Ollama glm-5.3 failed every author call.
There is no language or length check in the author schema; the causes were three tolerance gaps.

- **Citation ids mangled by the language.** Evidence ids are hex (`922197023defa567`). An Arabic or Persian answer
  renders the digits Arabic-Indic and wraps the id in direction marks or full-width brackets, so the evidence rule
  refused a fine draft. `normalizeAuthorOutput` now resolves ids through `resolveEvidenceId`
  (`utilities/citation-id.utility.ts`: invisible marks removed, NFKC, local digits folded, CJK brackets and quotes
  trimmed, case-insensitive, or the evidence url given instead of the id) and rewrites resolvable body markers to ASCII
  `[id]`. A real unknown id is still refused. The author prompt (`buildAuthorSystemPrompt`) tells the model to keep
  keys, ids, urls and markers ASCII; changing it replays in-flight jobs' author calls once.
- **Reasoning models.** `stripReasoningBlocks` drops `<think>`, `<thinking>`, `<thought>`, `<reasoning>`,
  `<reflection>` blocks (also an orphan closing tag) before JSON is looked for; an opening tag that never closes is
  classified `TRUNCATED` (the model ran out of output while thinking). `repairJsonText` fixes raw line breaks/tabs in
  strings and trailing commas only.
- **Truncation.** A `TRUNCATED` reply is asked again with `escalatedOutputTokens`: x1.5, or the language factor
  (`LOCALE_TOKEN_FACTOR`, ar 2, hi 2.2, ...) if larger, capped at 32768, plus `TRUNCATION_NOTE`.
- **Bounded roles.** `ROLE_MAX_MS` (3 min): no new candidate or format retry starts after it. Two bad replies from one
  model already fail over to the next fallback (`FORMAT_ATTEMPTS_PER_MODEL`). A role with no fallback still retries per
  job attempt (`MAX_GENERATION_ATTEMPTS`, owned by `GenerationJobsService`).

## Allowance refusal pass-through (2026-10-14)

`ThreadBudgetClient.reserve` keeps the body of auth-service's 403 `THREAD_ALLOWANCE_UNAVAILABLE` (`feature`, `reason`, `used`, `limit`, `window`, parsed by `threadAllowanceRefusalSchema`) so threads-service can tell the owner how much is used and when it frees up. A `FEATURE_DISABLED` refusal and any other 403 stay the plain "not permitted" 403. Do not drop the body again.

## Self-healing and resume at the failed phase (ADR-181, 2026-10-14)

- **Classifier.** `classifyFailure` (`utilities/classify-failure.utility.ts`, table in `constants/failure-class.constants.ts`) maps every step failure to `{ phase, failureClass, healable, ownerOnly, retryable, remedies }`. The enums (`ThreadFailurePhase`, `ThreadFailureClass`, `ThreadHealingStrategy`, `ThreadFailureRemedy`, `ThreadArticleLength`) live in `@claw/shared-types`. A new code goes in `FAILURE_CLASS_BY_CODE`, the frontend `THREAD_GENERATION_CODE_KEYS` and all 13 locales. `ownerOnly` classes (spent credit, entitlement, safety refusal) stop the ladder and are never retried as a whole attempt.
- **Ladder.** `managers/role-healer.ts` (`RoleHealer`, plain class, fakes in specs) replaces the old `callRole`/`tryCandidate`. Per class, `nextOnModelStep` picks the next unused rung for the same model (backoff + jitter + Retry-After, stricter prompt, JSON repair pass, more or less output room, shorter source); when the rungs are spent the role swaps model: owner backups, then the pool (`input.healing`, ranked by the last hour's success rate in the step log), then the safe default. After a provider-wide failure other providers go first. Same-provider fallbacks are allowed; only a fallback identical to the primary is dropped with a SKIPPED step. The gateway has no temperature or response_format parameter, so none is varied.
- **Bounds.** 6 healing attempts per role (`MAX_HEAL_ATTEMPTS_PER_ROLE`), 24 per job attempt, 6 minutes per role, and no healing attempt once spend reaches 85 percent of the cap (`HealingBudget`, built per attempt by `createHealingBudget`). Backoff waits (at most 30 s) stop on cancel (`waitBeforeRetry`).
- **Step log.** A healing step is a `RETRY`/`FALLBACK` row whose code is the strategy (`HEAL_*`, or `FALLBACK_USED`) and whose excerpt is the failure class it answered; `HEAL_STOPPED_*` SKIPPED rows say why healing stopped. `buildHealingSummary` derives `progress.healing` from the log; there is no extra table. `progress.failure` also carries `phase`, `failureClass`, `remedies` and `suggestedModel`.
- **Resume.** `retry` calls `GenerationJobsRepository.inheritCheckpoints`: research evidence and every saved reply except the roles whose model changed are copied into the unstarted child (skip duplicates, best effort). A changed topic inherits nothing. `articleLength: SHORT` (the Shorter article remedy) changes the author prompt, so authors regenerate. When all three review rounds are rejected, the exhausted job is terminal because replaying its unchanged checkpoints cannot improve it; an owner retry retains research but invalidates all cached model replies so the new draft is fresh.
- **Successful model preference.** Within an attempt, a role's accepted model is tried first on later calls. On a new attempt, `findLastSuccessfulModel` looks up the latest saved success for that role (including inherited author draft/vote checkpoints); it only moves the model earlier when it is already allowed by the current candidate queue and is not demoted. Author distinctness, plan eligibility, spend and review gates still apply.
- **Oversized gateway requests.** Before calling chat-service, `RoleHealer` shrinks only the shared source material when the user prompt exceeds its 200,000-character gateway limit. It preserves the prompt's evidence table and appended candidate drafts. Consensus prompts include candidate drafts once, not in both shared and per-vote material. The bounded source shrink is not permission to drop evidence or bypass model-window checks. A `SHRINK_SOURCE` rung after a 413 goes below the level that already fit (fit level plus the rung's level), so it never re-sends the same prompt. The 50-scenario local replay is `generation-pipeline.reliability-replay.spec.ts`.
- **Checkpoint refresh.** A checkpoint with changed input/evidence hashes is replaced by the new accepted output. Matching hashes remain idempotent, and stale attempts are rejected by the job lease guard before writes.
- **Request.** `enqueueGenerationSchema` accepts optional `healing` (pool of at most 12, safe default) and `articleLength`. `healing` is ignored when two requests are compared for idempotency (`isSameRequest`).
- **Citations.** `normalizeAuthorOutput` also resolves a url written with a trailing slash, tracking parameters, another scheme or `www`, and a number only when the entry gives that item's url; unresolved listed entries are dropped when another citation is real. The author user prompt ends with an id/url table. A `revisionBrief` left out by a reviewer is empty.
- **Gateway detail.** An error frame's redacted `message` and `retryAfterSeconds` are kept on `ChatUpstreamError`; the message becomes the failed step's excerpt.
- **Owner state.** `getOwnerState` adds `terminal`; `safeErrorCode` can hold the last attempt's code while the job is queued or running.
- Not done: best-draft acceptance or a tie-break judge after repeated no-consensus, sectioned authoring, dropping a failed author, a cross-job provider breaker, the slot count was raised to 12 and the prefetch to 6 in ADR-183. See the [runbook](../../docs/11-runbooks/runbook-thread-generation-failed.md).

## Production bug batch (ADR-183, 2026-10-14)

- **Concurrency.** Production has one replica, so `GENERATION_REPLICA_CONCURRENCY` (prefetch) is the whole service: now 6, with 12 worker slots (migration `20261014180000_threads_generation_more_slots`). No new env var (this service has no settings table). A job-level retry already frees its slot (QUEUED + `nextAttemptAt`); in-attempt healing waits (<= 30 s) keep it because the slot row is anchored to the lease heartbeat.
- **Queue state.** `GenerationProgressService` adds `queue { state: WAITING_FOR_WORKER | BACKOFF, ahead, retryAt }` for a QUEUED job (`countQueuedAhead`: runnable QUEUED jobs created before it; approximate, the claim is fair per owner). `null` once it runs.
- **Model health.** `GET internal/threads/generations/model-health` (service token) returns `{ windowMs, models[{ provider, model, ok, failed }] }` from `StepRecorder.recentModelHealth` (the healing ranking's own last-hour counts). Counts only.
- **Distinct authors.** `RoleHealer` tracks the model each author runs per job attempt (a `WeakMap` on the input) and `preferDistinctModels` moves a fallback another author uses behind the unused ones at every swap. A role's own pick keeps its place; taken models stay as a last resort.

## Article format stage (ADR-189, 2026-10-16)

- After the Critic passes, `ArticleFormatter` retypesets the reviewed article with ONE cheap model call (cheapest `costRank` in the healing pool, else the safe default, else the Judge's model) and `validateFormatted` proves only layout changed: every `[id]` marker kept and no new id, every number and date (digits of every script folded), no new url, no new raw HTML, tables kept, exactly one H1, no English heading word in a non-English article, word count within 15 percent. Any refusal keeps the reviewed text and writes a SKIPPED step `stage FORMAT` with a `FORMAT_*` code. Never throw for it; only cancel, lease loss and the attempt ceiling propagate.
- Bounds are ADR-181's: one call plus one retry (`jobAttemptsLeft: 1`, no fallbacks, no pool), cost counted by the healer, skipped at 85 percent of the spend cap and for an article `isFormattedArticle` already accepts (that is what makes it idempotent). It runs only when `GenerationPipelineInput.formatStage` is true (`generate`, not `reviewRevision`). The result `draftHash` is the formatted text's hash.
- `AUTHOR_STRUCTURE_NOTE` (author prompt) asks the authors for the same structure; changing it replays in-flight author calls once. There is no merge stage: the first author's draft is the candidate and the others vote on it.
- Owner preview: `POST internal/threads/format-preview` (`FormatPreviewService`): owner-scoped parent job lookup (404), a $0.10 budget under `format:<key>`, closed at once. A new `FORMAT_*` code needs the guard spec and the service guide row; the frontend has no translation for it yet.
- Never add a number-, id- or url-tolerant shortcut to the guard: its strictness is the whole point (the Critic reviewed the facts). Specs: `format-guard.utility.spec.ts` (en, de, ar, ja fixtures), `article-formatter.spec.ts`, `format-preview.service.spec.ts`. Decision: [ADR-189](../../docs/13-adr/adr-189-thread-articles-are-typeset-by-a-guarded-format-stage-and-rendered-as-rich-safe-html.md).

## Format preview QA fixes 2026-10-15

- `prepareLegacyDraft` normalises `[address, id]` markers and a missing H1 before a preview pass; the normalised text is the guard's baseline. Skip codes `FORMAT_REPLY_INVALID` (bad JSON reply) and `FORMAT_MODEL_ERROR` (every call failed) replace most `FORMAT_FAILED`, which stays as the generic fallback.

## Failed reviews, the evidence-gap pass and "Research more" (ADR-193, 2026-10-27)

- Never weaken the pass rule (score at least the minimum AND no blockers). A review that fails writes a verdict into its RETRY step (`serializeVerdict`): code `*_BLOCKED` when the score met the minimum, `*_SCORE_LOW` otherwise, excerpt `{score, minScore, blockers}`. Do not put the revision brief back into that excerpt: the frontend parses it.
- `classify-blocker.utility.ts` is a keyword list (`EVIDENCE_GAP_TERMS` in `constants/evidence-gap.constants.ts`). A new language or phrasing is a new term plus a case in `classify-blocker.utility.spec.ts`; Latin terms match at a word start only ("resources" is not "source").
- `fillEvidenceGap` runs at most once per job attempt, only when another round follows, never fails the job (cancel still propagates), costs one healing attempt and is skipped at 85 percent of the cap. `mergeEvidenceBundles` must keep existing ids and order: the citation rule compares `evidenceId` to `url` against the bundle, and a saved draft cites those ids.
- `refreshResearch` is part of the stored request (`enqueueGenerationSchema`), so `isSameRequest` sees it; `buildRetryInput` drops an inherited value. `inheritCheckpoints(from, to, changed, refreshResearch)` copies nothing when it is true.
- The step codes of the pass and of a blocked review are listed in `evidence-gap.constants.ts`; the frontend maps them in `constants/thread-evidence.constants.ts` (not scanned by the code-key contract test, so keep both in step by hand).
- Decision: [ADR-193](../../docs/13-adr/adr-193-a-failed-thread-review-names-its-real-cause-and-fills-evidence-gaps-once.md).

## Owner-accepted evidence gaps (ADR-194, 2026-10-27)

- `acceptedEvidenceGaps` (at most 8 strings of at most 300 characters) is on the retry body and on the stored request (`enqueueGenerationSchema`), so `isSameRequest` sees it. `buildRetryInput` normalises it (`normalizeAcceptedGaps`: trimmed, sorted, deduplicated) and drops an inherited value: never inherited by a retry of a retry.
- Prompts: `buildAuthorSystemPrompt` and `buildReviewSystemPrompt` take the gaps as a last argument; the notes live in `accepted-gaps-prompt.utility.ts` (texts in `accepted-gaps.constants.ts`). The gaps are quoted with `JSON.stringify`. Keep the Judge/Critic proviso ("PROVIDED the article states each one clearly in the limitations section") and the list of what still blocks.
- `withoutAcceptedBlockers` (in the pipeline manager) removes a blocker only if `isEvidenceGapBlocker` AND `matchesAcceptedGap` agree; the score is never changed. `hasLimitationsSection` is the deterministic post-check (heading keyword per locale in `LIMITATIONS_HEADING_KEYWORDS`, one item per gap); a miss is the RETRY step `LIMITATIONS_MISSING` and a repair brief, checked before the Judge (no candidate has it) and before the Critic.
- A new language needs a `LIMITATIONS_HEADINGS` entry, keywords and cases in `accepted-gaps.utility.spec.ts`. The matcher is lexical (topic words after removing the sourcing vocabulary): a new filler word goes in `GAP_FILLER_WORDS`.
- A pass writes `gapsDisclosed: true` into the revision content (`saveResult`) and `getOwnerState` returns it on the draft. Progress: `failure.review.evidenceGapBlockers` and the remedy `ACCEPT_GAPS` (`withAcceptGaps`). Steps `ACCEPTED_GAPS`, `ACCEPTED_GAP_WAIVED`, `LIMITATIONS_MISSING` are mapped by the frontend in `constants/thread-evidence.constants.ts`.
- Never relax with it: safety refusals, billing codes, the citation rule, the spend cap, the healing bounds. Decision: [ADR-194](../../docs/13-adr/adr-194-the-owner-can-accept-disclosed-evidence-gaps-and-the-article-says-so.md).
