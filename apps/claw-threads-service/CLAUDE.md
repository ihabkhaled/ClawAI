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

## Start checks (ADR-174)

`POST /thread-publications/generations` goes controller -> `PublicationGenerationStartService.start`
-> `GenerationPreflightService.assertCanStart` -> `PublicationLifecycleService.enqueueGeneration`.
The preflight runs before any job, budget or publication exists and never calls a model:
spend cap >= `MIN_THREAD_SPEND_CAP_MICRO_USD` (10,000, one cent; a retry's `spendCapUsd` has the
same floor), `THREAD_GENERATION_USE` permission, every provider/model (fallbacks too) known to
`ModelCatalogClient` (routing-service `context-window` lookup, `known`), and every seat's primary on
the caller's plan (`isModelAllowedForUsage(..., PRIMARY)`, the chat test). Plan or catalog
unreadable -> 503 (fail closed). Refusals use `codedErrorBody` = `{ message, code, statusCode, ...own
request fields }`; codes live in `ThreadGenerationErrorCode`. Never put another user's data, a
plan list or a secret in a refusal. A missing or foreign source chat thread is `404 Source thread
not found` (same body); a budget 403 from auth-service maps to `THREAD_GENERATION_NOT_IN_PLAN`.
`ROUTING_SERVICE_URL` is the shared `.env` value (default `http://routing-service:4004`). The frontend
still shows one generic sentence for any 403 on start; mapping these codes to the 13 locales is
open.
