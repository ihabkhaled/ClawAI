# Threads Service

Owns publication identity, immutable revisions, owner approval, comments,
reactions, change requests, moderation state, and public reads. It does not own
chat or generation data; use service APIs and never cross database boundaries.

The health-only foundation runs on port 4019. Follow the [Threads architecture](../../docs/03-architecture/clawai-threads-architecture.md)
and [product spec](../../docs/02-business-product/clawai-threads-product-spec.md).

## Owner generation progress, retry and delete

`PublicationGenerationOwnerService` (owner JWT routes on `PublicationOwnerController`):
`GET generation-progress`, `POST retry-generation`, `DELETE /thread-publications/:id`.
Every route resolves the publication with `findOwnedGeneration(id, ownerId)`; a non-owner,
an unknown id or an upstream 404 all answer `404 Publication not found`. Progress is
fetched live from the generation service (`ThreadsGenerationClient.getProgress`) and is
never stored here. Retry needs a DRAFT publication and a FAILED or CANCELLED job, then
re-points the same publication at the new job (`attachRetryJob`). Delete refuses with 409
when the publication is PUBLISHED or the job is QUEUED or RUNNING (cancel first); it
removes the job upstream and the publication row (revisions cascade). Public discovery,
sitemap and slug reads filter on `status = PUBLISHED`, so a failed or running draft is
never public; repository tests prove it.
