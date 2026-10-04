# Thread Generation Service

Owns isolated generation jobs, durable checkpoints, attempts, cancellation,
progress, and the dedicated queue. Chat snapshots and research evidence come
from their owning services; never read another service's database.

The health-only foundation runs on port 4020. Follow the [Threads architecture](../../docs/03-architecture/clawai-threads-architecture.md)
and [product spec](../../docs/02-business-product/clawai-threads-product-spec.md).
