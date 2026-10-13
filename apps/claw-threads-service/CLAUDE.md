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

## Board search projection (ADR-177)

`thread_publication_search_docs` is the only source for the Board list and suggest endpoints. A row exists only while the publication passes the public discovery predicate; every state change that can remove visibility (unpublish, revoke, safety change) must delete or update the row in the same transaction. Use the one shared visibility predicate, parameterised SQL only, and the one pure search normaliser for both index and query (never strip marks for Devanagari or Thai). Counters are denormalised: bump them in the existing write paths and let the reconcile job heal drift. Revoke is `POST thread-publications-moderation/publications/:id/revoke`. Board items never include author fields. See [service guide](../../docs/04-backend/service-guide-threads.md) and ADR-177.

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
`CONNECTOR_SERVICE_URL` is the shared `.env` value (default `http://connector-service:4003`); the
catalog check is an exact match against its public picker catalog, never the routing context-window
heuristic. The frontend still shows one generic sentence for any 403 on start; mapping these codes to
the 13 locales is open.

## Atomic, idempotent, capped start and retry (ADR-174 addendum 2026-10-14)

- **Retry runs the same preflight** (`assertCanRetry`: stored seats plus `models[]` overrides,
  fallbacks included, spend cap, permission). Never add a second path that queues a job without it.
- **One owner request at a time** through `GenerationStartGate` (keyed mutex, 8 queued max, then
  429). It assumes one replica. The gate also lists jobs being attached so the orphan repair skips them.
- **Idempotency is per owner.** Upstream key = `scopedIdempotencyKey(ownerId, key)`; the hash and a
  request fingerprint live on the publication (`start_key_hash`, `start_request_hash`). A repeat returns
  the same job before any preflight or cap; another body is `409 THREAD_IDEMPOTENCY_KEY_REUSED`.
- **Enqueue is compensating.** If the publication write fails after the job exists,
  `enqueueGeneration` cancels the job (budget released upstream) unless a publication owns it. The
  write retries P2034/P2002 four times (`withSerializationRetry`), then 503, never 500.
- **Cap:** `MAX_ACTIVE_GENERATIONS_PER_OWNER = 3` queued or running, `429 THREAD_GENERATION_TOO_MANY_ACTIVE`.
- **Orphans:** `POST thread-publications-moderation/orphan-generations/repair` (moderators) cancels
  unowned QUEUED or RUNNING jobs; idempotent; never touches a job a publication or edit review owns.
- **Cancel** is a 409 with `state` unless the job is QUEUED or RUNNING. **Publish** is idempotent and an
  unpublished approved revision publishes again; nothing publishable is a 409 with a reason.
- **Text:** topic is trimmed and refused when empty, short, or holding NUL or a lone surrogate
  (`THREAD_TOPIC_INVALID`, `THREAD_TEXT_INVALID`); `ZodValidationPipe` returns a refinement's `code`.
- **Budget 403** is split after the fact: plan has all three features means
  `THREAD_GENERATION_ALLOWANCE_UNAVAILABLE`, else `THREAD_GENERATION_NOT_IN_PLAN` naming the features.
