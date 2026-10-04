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
