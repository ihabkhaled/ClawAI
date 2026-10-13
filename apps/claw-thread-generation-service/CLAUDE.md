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
reservation. Error codes come from `parseStepError`; never log excerpts. See the
[service guide](../../docs/04-backend/service-guide-thread-generation.md#owner-step-log-progress-retry-and-delete).
