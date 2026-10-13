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
