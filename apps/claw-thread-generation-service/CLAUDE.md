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
  refunds the Free meter money and the lifetime Thread hold. `REVIEW_NOT_PASSED`, every `NON_RETRYABLE_STEP_CODES`
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
same-provider fallback is dropped at call time with a SKIPPED step `FALLBACK_SKIPPED_SAME_PROVIDER`.
