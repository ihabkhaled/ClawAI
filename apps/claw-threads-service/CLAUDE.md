# Threads Service

Owns publication identity, immutable revisions, owner approval, comments,
reactions, change requests, moderation state, and public reads. It does not own
chat or generation data; use service APIs and never cross database boundaries.

The health-only foundation runs on port 4019. Follow the [Threads architecture](../../docs/03-architecture/clawai-threads-architecture.md)
and [product spec](../../docs/02-business-product/clawai-threads-product-spec.md).
