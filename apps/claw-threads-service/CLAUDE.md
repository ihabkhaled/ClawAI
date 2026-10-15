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
never public; repository tests prove it. `GET /thread-publications/public/sitemap` takes `locale` (one content
language, unchanged) or `scope=all` (no locale; every content language, same paging and
`publishedAt desc, slug desc` order, same visibility filter); `locale` without `scope=all` is required (400).

## Board search projection (ADR-177)

`thread_publication_search_docs` is the only source for the Board list and suggest endpoints. A row exists only while the publication passes the public discovery predicate; every state change that can remove visibility (unpublish, revoke, safety change) must delete or update the row in the same transaction. Use the one shared visibility predicate, parameterised SQL only, and the one pure search normaliser for both index and query (never strip marks for Devanagari or Thai). Counters are denormalised: bump them in the existing write paths and let the reconcile job heal drift. Revoke is `POST thread-publications-moderation/publications/:id/revoke`. Board items carry `owner { username, displayName } | null` (named by auth-service, never an id or email; ADR-180). See [service guide](../../docs/04-backend/service-guide-threads.md) and ADR-177.

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

Start and retry bodies go through `ZodValidationPipe(schema, ThreadGenerationErrorCode.REQUEST_INVALID)`: a rule-coded failure keeps its own code (cap 0, author count, locale, publication type), anything else gets `THREAD_REQUEST_INVALID`. `GET mine` titles come from `pickOwnerListTitle` (approved revision wins over a STALE/PENDING newer one, `pendingRevisionStatus` reports it); `generation-state` swaps in the newest publishable revision's draft and hash (`withLatestRevision`); `recommended-team` also returns `excluded[]` with `reasonIfExcluded`.

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

## Round-2 owner fixes (ADR-174 addendum 2026-10-14)

- **Same-provider fallback** was refused here (`THREAD_FALLBACK_SAME_PROVIDER`); since ADR-181 it is allowed
  (only a fallback identical to its primary is dropped by the pipeline).
- **Retry cap** below one cent is `400 THREAD_SPEND_CAP_TOO_LOW` (zod only requires a positive number).
- **Publish after progress says WAITING_FOR_REVIEW**: the draft is stored only when the job state is
  read, so `approveAndPublish` reads it once on NOT_READY and publishes; no 25 s 409 window.
- **Unpublish is idempotent**: a second call on an UNPUBLISHED article is 200; a never-published one is
  `409 THREAD_PUBLICATION_NOT_PUBLISHED` with its state; a stranger still gets 404.
- **Owner state** carries `canPublish` (READY_FOR_REVIEW or UNPUBLISHED) and `canRepublish` (UNPUBLISHED).
  The page must use these, not `publicationStatus === 'READY_FOR_REVIEW'`.
- **Edit review is a paid Judge and Critic call** and draws on the Threads allowance like a start, so a
  Free owner whose one lifetime use is spent cannot edit; the refusal is now the plan-aware
  `THREAD_GENERATION_ALLOWANCE_UNAVAILABLE` / `..._NOT_IN_PLAN`, never a blanket "not in plan".
- **An edit never bricks the draft** (round 3, N-1/N-2): creating an edit revision no longer stales the
  approved one. A refused (403) or failed review deletes the unadmitted revision again (coded error to the
  owner, nothing else changed); a Critic failure stales only the new revision; a pass stales the older
  unpublished approvals. `canPublish`/`canRepublish` also need a real approved, index-eligible revision
  (`hasPublishableRevision`). Title = first heading of any level, else first sentence; the first publish
  gives a slug from the title plus 8 id characters (a republish keeps its link). Never a bare route word: `RESERVED_PUBLICATION_SLUGS` (`board`, `discover`, `sitemap`) are the literal segments under `public/`, and a spec derives them from the controllers.
- **Not done**: a start-time refusal for a cap below one call's hold or an unpriced model. No cheap
  price or hold read endpoint exists (the public catalog carries no rate); needs one from connector or chat.

## Board index text format (2026-10-14)

`normalizeSearchText` segments ja/zh/th runs with `Intl.Segmenter`; changing it means bumping `BOARD_DOC_FORMAT_VERSION` so the reconcile job re-indexes old rows. Citation markers (single, doubled, comma lists `[id1, id2]` and nested `[[id1], [id2]]`; format version 3) are stripped before indexing. A page above 100000 answers a coded 400 `BOARD_PAGE_OUT_OF_RANGE`. A view pushes its count through `BoardCountsPort.viewsChanged`. `highlightRanges` (board-index) computes exact and fuzzy highlight offsets. Thai search is proven by `board-thai-search.spec.ts`: a Thai title/body is segmented into words at index time, the query goes through the same `normalizeSearchText`, and the SQL builders bind it as a parameter (plainto_tsquery plus the trigram arms from 3 characters); the 'simple' text-search config is used for `th`. Real Postgres ranking of Thai is covered only by the live Board lane.

## Board search performance (ADR-177 addendum 2026-10-14)

- Searching reads go through `BoardRepository.searching` (transaction + `set_config` thresholds). Never call `similarity(...) >= x` in a WHERE: it defeats the GIN index. Use `%` and `<%`.
- Under 3 characters: prefix + full-text only (suggest), never a trigram arm. Suggest minimum is 2, enforced in the DTO and the service.
- `plainto_tsquery`, never `websearch_to_tsquery`: user text must not act as operators.
- "Did you mean" reads `thread_board_words`; trending sorts on `trending_score`. Both are rebuilt by `BoardMaintenanceService`, not by requests. If a new way to change a title or counters appears, the 2-minute job heals it.
- Search text errors use `BoardErrorCode`; page beyond 500 is an empty page with meta.

## Security review follow-ups (Board)

- The public view endpoint refreshes the Board row in the background and at most once per publication per 30 s (`BOARD_NOTIFY_MIN_INTERVAL_MS`): a public, unauthenticated request never waits for, or multiplies, a database refresh. The reconcile job heals any miss.
- Removing a Board doc (unpublish, revoke, moderation hide) also removes, in the same transaction, the did-you-mean words only that doc contributed, so a taken-down Thread's words are not echoed back before the next dictionary rebuild.
- Board citation markers are stripped by a linear scanner (`stripCitationMarkers`), not one regex over the whole body: a body of unclosed brackets cost the square of its length with the earlier pattern (ReDoS). A spec feeds 200,000 unclosed brackets and must finish in 1.5 s.

## Recommended team (ADR-174 addendum 2026-10-14)

`GET thread-publications/recommended-team` (`PublicationRecommendedTeamController` -> `RecommendedTeamService`) is the one place that decides a default team. It uses `ModelCatalogClient.listModels` (same 30 s cached catalog read as `isKnown`, now also keeping the published window and cost band) and `isModelAllowedForUsage` (the preflight's plan test), caches per owner for 60 s, and fails closed with 503. `classifyModel` order: deny list, plan, window. A model with no published window counts as the assumed 32,768 (ADR-173). `THREAD_MODEL_DENY_LIST` (OPENAI, ANTHROPIC) is a constants list until a settings table exists; it shapes the recommendation and the picker only, never the start. Do not add a second ranking in the frontend.

## Guest Board (ADR-177 addendum 2026-10-14)

`BoardPublicController` (`thread-publications/public/board`, `.../suggest`, `@Public`) calls the same `BoardService.list(null, query)` / `suggest` as `BoardController`. Never copy the query or shape into a second path; `userId = null` drops the reaction join and `viewerReaction` stays `null`. Limits 60 and 40 per minute per address, `Cache-Control: public, s-maxage=...`, `Vary: Accept-Language` (never `Authorization`). `BoardModule` stays before `PublicationsModule` in `AppModule` or `public/board` is read as a slug.

## Allowance refusal pass-through (2026-10-14)

`ThreadsGenerationClient.request` maps a 403 that carries `THREAD_ALLOWANCE_UNAVAILABLE` (`generationAllowanceRefusalSchema`) to `THREAD_GENERATION_ALLOWANCE_UNAVAILABLE` with the auth message plus `feature`, `used`, `limit`, `window`. Any other 403 is still `THREAD_GENERATION_NOT_IN_PLAN`. The frontend already maps the new code (`allowanceUnavailable`); it may read the numbers from the body.

## Community: threads, votes, mentions, notices (ADR-180, 2026-10-14)

- **Names only from auth-service.** `modules/author-identity` (`AuthorIdentityService.resolveMany/resolveOne/resolveByUsername`) is the one way to turn a user id into `{ username, displayName }`. Best effort, 2 s timeout, 60 s bounded cache; a failure is `null`, never an error. Owners (`PublicationPublicReadService`, `BoardService`) and comment authors use it; `ownerId`/`authorId` never leave the service.
- **Comments live in `PublicationCommentsRepository` / `PublicationCommentsService`**, not in `PublicationsRepository`. Storage is flat: `parentId` = direct target, `rootId` = the top-level comment, both derived by `placeReply` in the creating transaction (never from the client). The target must be VISIBLE and in the same publication; the root row is locked `FOR UPDATE` and replies are capped at `MAX_REPLIES_PER_ROOT` (500). Votes and reply counts are computed, not stored.
- **Mentions**: `parseMentionUsernames` (linear regex, code-aware, max 10) then `resolveByUsername`; unknown names and the author are dropped; stored in `thread_publication_comment_mentions`.
- **Notices never fail a request.** `CommunityNotificationService` -> `ThreadNotificationService.dispatchBestEffort`. Matrix and keys are in `community-notification.utility.ts` (reply > comment > mention, one per person, never the actor; reaction keys carry no time). Params contract: `ThreadCommunityNotificationParams` in `@claw/shared-types`.
- **A removed comment is a placeholder only while it has visible replies** (`removed: true`, `[removed]`, no author); never leak its text or author.
- **Account deletion** must also delete `thread_publication_comment_reactions` and `..._mentions` rows of the user and null `replyToUserId` (`AccountDeletionRepository`; its spec checks each).
- Specs run on the swc-free vitest config when Smart App Control blocks `@swc/core`: all new classes are built by hand with mocks, so no Nest DI metadata is needed.

## Healing pool and same-provider fallbacks (ADR-181, 2026-10-14)

- `HealingPoolService.forOwner` builds `{ pool, safeDefault }` (plan-allowed as FALLBACK, not on the deny list, window at least 32k, cheapest band first, spread over providers, at most 8; safe default = a Gemini "flash" model) and `ThreadsGenerationClient.enqueue`/`retry` hand it to the generation service. A failed read means no pool, never a refused start. `PublicationLifecycleService` and `PublicationGenerationOwnerService` take it as an `@Optional()` last constructor argument.
- `THREAD_FALLBACK_SAME_PROVIDER` is gone: a fallback of another model on the primary's provider is accepted by the start and retry preflight.
- Retry body accepts `articleLength: 'SHORT'`. The progress schema passes `failure.phase|failureClass|remedies|suggestedModel` and `healing` through (all optional, an older generation service sends none). `generation-state` carries `terminal`.

## Production bug batch (ADR-183, 2026-10-14)

- **Safety scan = prose only.** `evaluatePublicationSafety(markdown, urls)` / `describePublicationSafety` (`publication-safety.utility.ts`): secrets and e-mails are matched on the whole text; card, SSN and IBAN shapes only on prose (`stripNonProse`: link targets, bare URLs and evidence markers removed). A card needs word edges and a **Luhn** pass (digits of any script folded first). The report adds `findings[{ reason, kind, excerpt }]` (secrets and cards masked). Never revert to `\d{16}`; never log an excerpt.
- **A blocked DRAFT is recoverable.** `createEditedRevision` also accepts a `DRAFT` that holds a stored revision; `completeRevisionReview` moves it to `READY_FOR_REVIEW`. `generation-state` carries `safetyBlock { reasons, findings }` (re-scan of the newest stored revision, via `findLatestRevisionSafety`) and shows that revision's text, so the owner edits their last version.
- **Topic minimum** (`topic-length.utility.ts`, constants in `topic-length.constants.ts`): grapheme-counted letters and numbers; CJK characters weigh 2.5 (4 pass, 10 for other scripts). The frontend copy must keep the same vectors.
- **Slug** (`derivePublicationSlug`): `\p{L}\p{M}\p{N}`, NFKC then NFC, 60 code points cut per grapheme. Stored slugs never change.
- **Recommended team health.** `ModelHealthService` (60 s cache; failure = no demotion) reads generation-service `model-health` through `ThreadsGenerationClient.getModelHealth`. `DEGRADED` (>= 5 calls in the last hour and under 40% success, own or provider-wide) is selectable, never preselected, ranked after healthy models, and not in `excluded[]`. `ModelCatalogClient` drops non-chat names (`THREAD_NON_CHAT_MODEL_PATTERN`) and rows with `kind != CHAT`, `lifecycle REMOVED`, `exposure UNEXPOSED`.
- **Public markers.** `findPublic` runs `resolveCitationMarkers` (known id -> `[n]`, unresolved 16-hex id -> removed, bracketed address -> number or bare URL; ASCII, full-width and CJK brackets, any digit script) and returns only urls in `citations`. Stored revisions stay untouched. Linear scan, spec feeds 200,000 brackets.
- **Progress** passes `queue { state, ahead, retryAt }` from the generation service through unchanged (`queueSchema`, optional).
- Specs on the swc-free vitest config; `ModelHealthService` is `@Optional()` in `RecommendedTeamService`.

## Reader change requests (ADR-188, 2026-10-15)

- **Where the code is.** `PublicationChangeRequestsRepository` (owner list, "mine", viewer ownership, public credit ids, decision context, `markAcceptedApplied`), `PublicationChangeRequestViewsService` (adds names through `AuthorIdentityService`), writes stay in `PublicationsRepository.createPublicChangeRequest` / `resolveOwnedChangeRequest` and `PublicationCommunityService`. The requester id never leaves the service: the owner view carries `requester: { displayName, username }`.
- **Public never leaks.** The only public read is `GET public/:slug/change-requests/credits`: a `status IN (ACCEPTED, APPLIED)` clause and names only. `GET public/:slug/viewer` answers `{ isOwner: false }` to anyone but the owner without querying the count. Keep both under test (`publication-change-requests.repository.spec.ts`).
- **Limits live under the publication row lock.** `createPublicChangeRequest` takes `SELECT ... FOR UPDATE` on the publication, then refuses the owner (403), a 4th pending from one person (429) or a 51st on the Thread (429). Constants in `publication-change-request.constants.ts`.
- **Decisions.** `ACCEPTED` with `revision` starts the paid review (`editRevision`) and stores `acceptedRevisionId`; without it the owner edits by hand. The decision is one conditional `UPDATE ... WHERE status = 'PENDING'`; the winner sends the notice, a repeat of the same decision answers `{ resolved: true }` and sends nothing, the opposite decision is 409.
- **APPLIED.** `approveAndPublish` calls `markAcceptedApplied` after the board sync (best effort, logged on failure) and tells each requester through `CommunityNotificationService.changesApplied`. `APPLIED` was added by migration `20261015210000_threads_change_request_applied` (`ALTER TYPE ... ADD VALUE` plus an index); never use the new value in the same migration.
- **Notification title.** `targetOf` and the decision context use `readablePublicationTitle`: the stored title, or one derived from the article when it is the "Untitled draft" placeholder, or empty. The owner's request notice links to `/threads/review/<publicationId>#change-request-<id>`.
- Specs: swc-free vitest config, as before.

## Format preview (ADR-189, 2026-10-16)

`modules/publication-format/` owns `POST thread-publications/:id/format-preview` ("Improve formatting with AI"). It previews only; the frontend saves an accepted preview through the ordinary `POST revisions`, so the safety scan and the Judge and Critic review it again before anything is published. Owner scope is the repository query (`publication: { ownerId }`, 404 otherwise); the body is strict and carries no owner id. `thread_format_passes` (migration `20261016090000_threads_format_passes`) is the daily limit (3 counted passes per Thread per rolling day, taken under `pg_advisory_xact_lock`), the idempotency record (a replayed key returns the stored text, no model call) and the stored preview; FAILED and `FORMAT_ALREADY_PRETTY` rows are not counted; rows are deleted with the Thread and with the account (`AccountDeletionRepository`). Codes: `THREAD_FORMAT_DAILY_LIMIT` (429), `THREAD_FORMAT_IN_PROGRESS` (409), `THREAD_FORMAT_NOT_FORMATTABLE` (409). Decision: [ADR-189](../../docs/13-adr/adr-189-thread-articles-are-typeset-by-a-guarded-format-stage-and-rendered-as-rich-safe-html.md).
