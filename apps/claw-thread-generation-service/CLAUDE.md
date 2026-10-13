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
