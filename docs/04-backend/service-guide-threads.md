# Service Guide: claw-threads-service

## Overview

| Property     | Value                         |
| ------------ | ----------------------------- |
| Port         | 4019                          |
| Database     | `claw_threads` PostgreSQL     |
| Public route | `/api/v1/thread-publications` |

This service owns publication revisions and community state. Authenticated owners can start a generation with an explicit public-intent version and user-selected cap, poll their own job, cancel it, and persist its finished result as a private revision. A bounded secret/PII scan gates owner review; owners can publish, unpublish, and export JSON or Markdown. Public reads resolve only published, owner-approved, safety-approved, index-eligible revisions. `POST /api/v1/thread-publications/:publicationId/revisions` creates an immutable edit using a fresh cap and idempotency key; `GET /api/v1/thread-publications/:publicationId/revisions/:revisionId/revalidation-state` returns owner-scoped review status. Only a passing review of the exact candidate hash becomes eligible for owner approval; the approved revision remains public until replacement approval.

Prisma migrations run from the container entrypoint. For local schema work,
use `npm run migrate:dev`; for deployment, `npm run migrate` applies committed
migrations.

## Boundaries

- Chat remains the owner of chat threads and messages; `/api/v1/threads` keeps its legacy chat alias.
- Generation jobs and private source snapshots belong to `claw-thread-generation-service`.
- Publication records and revisions belong to this service's isolated PostgreSQL database.
- Research evidence remains owned by `claw-research-service`.
- Cross-service data uses service APIs or RabbitMQ, never another service's database.
- Approval changes publication and revision state atomically and returns only public-safe fields.
- `POST /api/v1/thread-publications/generations` passes the selected cap, explicit public-intent version, and server-derived owner ID to the generation service with a service token. Generation reserves Auth entitlements after snapshot ownership validation.
- `GET /api/v1/thread-publications/:publicationId/generation-state` verifies publication ownership before fetching job state; completed drafts are persisted privately with `PENDING` review status. After a passing edit the answer carries the newest publishable revision's draft and `review.draftHash` (the content hash), not the original generated draft.
- `GET /api/v1/thread-publications/mine` shows the title the public page shows: a newer STALE or PENDING revision does not replace the approved title, and `pendingRevisionStatus` names that newer revision's state (null otherwise).
- Start and retry validation failures always carry a `THREAD_*` code: `THREAD_SPEND_CAP_TOO_LOW` (cap 0), `THREAD_AUTHOR_COUNT_INVALID`, `THREAD_LOCALE_INVALID`, `THREAD_PUBLICATION_TYPE_INVALID`, else `THREAD_REQUEST_INVALID`.
- `POST /api/v1/thread-publications/:publicationId/cancel-generation` checks ownership before forwarding cancellation.
- `GET /api/v1/thread-publications/:publicationId/generation-progress` returns the owner-only step-by-step record (selections, per-role steps with machine codes, durations, tokens, bounded excerpts, failure) from the generation service. Non-owners and unknown ids get `404 Publication not found`.
- `POST /api/v1/thread-publications/:publicationId/retry-generation` (body: `idempotencyKey`, optional `topic`, `spendCapUsd`, `models`) starts a new job from the same snapshot and attaches it to the same DRAFT publication. 409 unless the publication is DRAFT and the job FAILED or CANCELLED.
- `DELETE /api/v1/thread-publications/:publicationId` removes a non-published publication and its job. 409 when published or the job is QUEUED or RUNNING.
- `GET /api/v1/thread-publications/public/:slug` is unauthenticated but resolves only published, owner-approved, safety-approved, index-eligible content; it returns citation URLs, not evidence IDs.
- `POST /api/v1/thread-publications/:publicationId/unpublish` requires owner identity and removes the record from public resolution.
- `GET /api/v1/thread-publications/:publicationId/export?format=json|markdown` requires owner identity and exports article content and citation URLs.
- `GET/POST /api/v1/thread-publications/public/:slug/comments` lists visible comments publicly (paged, threaded, with author names and votes) and accepts authenticated comments and replies; `GET .../comments/:rootId/replies` and `PUT/DELETE .../comments/:commentId/reaction` complete the thread. See the community section below (ADR-180).
- `GET/POST/DELETE /api/v1/thread-publications/public/:slug/reactions` reads counts publicly and lets authenticated readers set or remove their own reaction.
- `POST /api/v1/thread-publications/public/:slug/change-requests` and `/reports` accept authenticated suggestions and reports; owners resolve requests through the publication owner route, with acceptance creating a capped revision for review.
- `/api/v1/thread-publications-moderation/reports` requires `THREAD_PUBLICATIONS_MODERATE`; resolving a report can hide its comment.
- Secret/PII matches store machine-readable reason codes without matched text and keep the revision pending.
- Threads validates `THREAD_GENERATION_SERVICE_URL`, `CONNECTOR_SERVICE_URL` (default `http://connector-service:4003`, already in `.env.example`; the model-existence check reads its public catalog, ADR-174 addendum) and `INTER_SERVICE_AUTH_TOKEN`; generation validates `AUTH_SERVICE_URL` and the same token. These values already exist in `.env.example` and deployment configuration.

## Start checks and error codes (ADR-174)

`POST /api/v1/thread-publications/generations` runs `GenerationPreflightService` before any job, budget or publication exists. It reads the plan (auth-service entitlements) and the model catalog (routing-service `context-window` lookup, `known`); it never calls a model. Refusals carry the shared error body `{ message, code, statusCode, ... }`.

| Status | `code`                                        | When                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `THREAD_SPEND_CAP_TOO_LOW`                    | `capMicroUsd` is below 10,000 micro-USD (one US cent, `MIN_THREAD_SPEND_CAP_MICRO_USD`). A retry's `spendCapUsd` has the same floor (zod 400).                                                                                                                                                                                                                                                                 |
| 400    | `THREAD_MODEL_UNKNOWN`                        | A role, or one of its fallbacks, names a provider/model the catalog does not know. Body adds `role`, `roleId`, `provider`, `model`.                                                                                                                                                                                                                                                                            |
| 403    | `THREAD_GENERATION_NOT_PERMITTED`             | The role lacks `THREAD_GENERATION_USE`.                                                                                                                                                                                                                                                                                                                                                                        |
| 403    | `MODEL_NOT_ALLOWED_FOR_PLAN`                  | A model of a seat, primary or fallback, is not on the caller's plan (same test chat uses; fallbacks are checked as FALLBACK because nothing downstream re-checks the plan). Message: `Author 2 uses GROQ/x, which your Free plan does not include. Pick a model your plan includes, or upgrade to a plan that lists it.` Body adds `role`, `roleId`, `provider`, `model`, `plan` (the caller's own plan slug). |
| 403    | `THREAD_GENERATION_NOT_IN_PLAN`               | The budget step in auth-service refused: the plan lacks web research, Judge or Critic review.                                                                                                                                                                                                                                                                                                                  |
| 400    | `THREAD_TOPIC_INVALID`, `THREAD_TEXT_INVALID` | The topic is empty after trimming or under 10 characters, or a text field holds a NUL byte or a lone surrogate.                                                                                                                                                                                                                                                                                                |
| 403    | `THREAD_GENERATION_ALLOWANCE_UNAVAILABLE`     | The plan has the features but the allowance is used up or held by a running generation.                                                                                                                                                                                                                                                                                                                        |
| 409    | `THREAD_IDEMPOTENCY_KEY_REUSED`               | The owner reused a key for a different request.                                                                                                                                                                                                                                                                                                                                                                |
| 429    | `THREAD_GENERATION_TOO_MANY_ACTIVE`           | The owner already has 3 generations queued or running (`limit`, `active` in the body), or too many of their requests are waiting.                                                                                                                                                                                                                                                                              |
| 404    | none                                          | The source chat thread is missing or belongs to another user; the body is `Source thread not found` in both cases.                                                                                                                                                                                                                                                                                             |
| 503    | none                                          | The plan or the catalog could not be read (fail closed).                                                                                                                                                                                                                                                                                                                                                       |

The plan that would allow a model is not named: auth-service exposes the caller's own plan only, and the plan catalog does not list per-plan model access. The frontend currently shows one generic sentence for any 403 on start (`chat.threadPlanRequired`); mapping these codes to translated sentences is a follow-up.

### Start and retry are atomic, idempotent and capped (ADR-174 addendum, 2026-10-14)

- `retry-generation` runs the same preflight as a start, on the stored seats (fallbacks included) with the `models[]` overrides applied.
- The model-existence test is an exact match against connector-service's public picker catalog (cached 30 s), not the routing window heuristic.
- A start or retry runs one at a time per owner. The idempotency key is scoped to the owner; the same owner repeating a key gets the same publication and job, another body gets `409 THREAD_IDEMPOTENCY_KEY_REUSED`.
- If the publication cannot be saved after the job was queued, the job is cancelled so its budget is released. The write retries write conflicts four times, then answers a retryable 503.
- At most 3 generations queued or running per owner (`429 THREAD_GENERATION_TOO_MANY_ACTIVE`).
- `POST /api/v1/thread-publications-moderation/orphan-generations/repair` (`THREAD_PUBLICATIONS_MODERATE`, `{ jobs: [{ jobId, ownerId }] }`, up to 50) cancels queued or running jobs that no publication or edit review owns. Outcomes per job: `CANCELLED`, `IN_USE`, `NOT_FOUND`, `ALREADY_FINISHED`. Safe to repeat.
- Cancel of a job that is not queued or running is `409 THREAD_GENERATION_NOT_CANCELLABLE` with `state`. Publish is idempotent, an unpublished approved revision publishes again, and nothing publishable is a 409 with a reason.

## Board endpoints and search projection (ADR-177)

All behind the normal auth guard, prefix `/api/v1`.

| Method | Path                                                      | Notes                                                                                                                                                           |
| ------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/thread-publications/board`                              | `q`, `sort` (latest, trending, discussed, liked), `lang` (locale or all), `type` (or all), `page`, `limit` (12, 24, 48). Returns `{ items, meta, didYouMean }`. |
| GET    | `/thread-publications/board/suggest`                      | `q`, `lang`. Up to 10 suggestions with highlight offsets, `didYouMean`, `total` capped at 100 (`totalCapped`).                                                  |
| POST   | `/thread-publications-moderation/publications/:id/revoke` | Permission `THREAD_PUBLICATIONS_MODERATE`. Sets REVOKED, deletes the search row, audit-logged.                                                                  |

Throttles: suggest is limited per user well below the global limit (a keystroke endpoint); the list has its own, higher limit. Exact numbers live in the controller decorators. Suggest answers `Cache-Control: private`.

**Public sitemap scope.** `GET /thread-publications/public/sitemap?locale=<l>&page&limit` lists one content language (unchanged). `?scope=all&page&limit` lists every content language with the same ordering, visibility filter and `total`; the frontend uses it for `/sitemaps/<locale>/all-threads-N.xml` ([ADR-182](../13-adr/adr-182-all-threads-sitemaps-list-every-language-under-each-app-locale.md)). A missing locale without `scope=all` is a 400.

**Board freshness (what a guest actually waits).** The API alone is live: a published Thread is in the projection in the same transaction. Three layers sit between publish and the guest HTML: (1) the service header `s-maxage=60, stale-while-revalidate=30`, honoured only by a shared cache in front of the API (nginx has no `proxy_cache_path` for `/api/v1/thread-publications`, so none today; a CDN rule would add up to 90 s); (2) the frontend server fetch `next: { revalidate: 60 }` in `lib/threads/public-board-api.ts`, a Next data-cache entry with stale-while-revalidate semantics: after 60 s the next request still gets the OLD page and only starts the refresh, so on a quiet site the first visitor sees stale data and the one after sees the new Thread (this is the "minutes" seen on 2026-10-14); (3) the sitemap and JSON-LD follow the same fetch. Nothing calls `revalidateTag` on publish. Frontend change needed (not in this service): tag the fetch (`next: { revalidate: 60, tags: ['threads-board'] }`), add a secret-guarded route handler that calls `revalidateTag('threads-board')`, and have threads-service call it after a publish or unpublish commits; or lower the revalidate to 15 s as a cheaper step.

**Did-you-mean.** The dictionary holds title words of visible publications only (`thread_board_words`, rebuilt by the maintenance job). A query word of up to 5 letters also matches when it shares its first letter with the dictionary word and trigram similarity is at least 0.2 (normal floor 0.4), so 'skie' finds 'sky'. Visibility is unchanged because only the dictionary is read.

Projection: table `thread_publication_search_docs` (model `ThreadPublicationSearchDoc`) holds one row per publication that passes the public discovery predicate (PUBLISHED, OWNER_APPROVED, safety APPROVED, index eligible). It is written in the same transaction as publish, unpublish, revoke and approved edits; deleting a publication cascades. Counters are bumped in the comment, reaction and view write paths, and a reconcile job recomputes them to heal drift. One pure normaliser is used for both index and query. The migration is additive (extensions `pg_trgm`, `unaccent`, GIN and btree indexes, backfill). The Board is gated by a database-level setting, default OFF.

Privacy: items carry no author field. Nothing from DRAFT, UNPUBLISHED, REVOKED or unapproved rows reaches list, suggest or "did you mean".

## References

- Account deletion is consumed from Auth's `user.deleted` outbox event. The
  service writes a hashed tombstone, retains only eligible approved public
  revisions anonymously, and removes private snapshots and account-linked
  interactions. See rule 61 and ADR-160.

- [Threads product spec](../02-business-product/clawai-threads-product-spec.md)
- [Threads architecture](../03-architecture/clawai-threads-architecture.md)
- [Backend service index](services-index.md)

## Board index: segmentation, versions and view sync (2026-10-14)

CJK and Thai text is word-segmented in the one shared normaliser; `doc_version` marks the index text format and the reconcile job re-indexes older rows in batches of 50. The stale-counter scan only rebuilds rows whose counters drifted. Format version 4 (2026-10-14) also strips citation markers with spaces or newlines inside the bracket (`[ id]`, `[id ]`, `[
id
]`); bumping the version is what makes reconcile clean old rows. Views refresh the Board row through `BoardCountsPort.viewsChanged`. See the ADR-177 addendum.

## Board search performance (2026-10-14)

Search reads run in a short transaction that sets `pg_trgm.similarity_threshold` and `pg_trgm.word_similarity_threshold` locally, so the `%` and `<%` operators use the GIN trigram index. Suggest under 3 characters uses a prefix index only. `BoardMaintenanceService` (module `board`) rebuilds the `thread_board_words` dictionary behind "did you mean" and the stored `trending_score` every 2 minutes; replicas take turns with `pg_try_advisory_xact_lock`. Sort indexes: `board_docs_published_idx`, `_discussed_idx`, `_liked_idx`, `_trending_idx`. Search text errors carry `BOARD_QUERY_INVALID`, `BOARD_QUERY_TOO_LONG`, `BOARD_QUERY_TOO_SHORT`. A trending order can lag a new reaction by up to 2 minutes (the counters themselves are immediate). See the ADR-177 addendum.

## Recommended team (ADR-174 addendum, 2026-10-14)

`GET /api/v1/thread-publications/recommended-team` returns `{ planName, team, models, excluded }` for the caller only. `excluded` lists every model the caller cannot use as `{ provider, model, reasonIfExcluded }` (`NEEDS_PLAN`, `WINDOW_TOO_SMALL`, `UNAVAILABLE`) so the wizard can explain it; the team and its fallbacks are drawn only from usable models. The Free allowance's per-model price limit lives in auth-service and is not visible here, so a Free user can still be refused at run time by the meter. `team` is three authors, a Judge and a Critic (each `{ provider, model, fallbacks[] }`) or null; `models` has one `{ provider, model, status }` per picker-catalog model with `status` of `AVAILABLE`, `NEEDS_PLAN`, `WINDOW_TOO_SMALL` or `UNAVAILABLE`. Code: `RecommendedTeamService` (60 s per-owner cache), `recommended-team.utility.ts` (pure ranking and classification), `ModelCatalogClient.listModels`. The plan test is the preflight's. The deny list (`THREAD_MODEL_DENY_LIST`, OPENAI and ANTHROPIC) is a constants list; lift a provider by deleting its entry. The Threads wizard preselects the team and keeps the pickers under an Advanced fold. See ADR-174.

## Guest Board endpoints (ADR-177 addendum, 2026-10-14)

| Method | Path                                        | Notes                                                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/thread-publications/public/board`         | `@Public`. Same query and response as the signed-in list; `viewerReaction` is always `null`. 60/min per address. `public, s-maxage=60, stale-while-revalidate=30`. A 429 answers `{ statusCode: 429, code: 'BOARD_RATE_LIMITED', message }` with `Retry-After` (`BoardThrottleExceptionFilter`, bound to this controller only). |
| GET    | `/thread-publications/public/board/suggest` | `@Public`. Same as the signed-in suggest. 40/min per address. `public, s-maxage=30`. `Vary: Accept-Language`.                                                                                                                                                                                                                   |

Both controllers call one `BoardService`, so SQL, visibility (only rows in `thread_publication_search_docs`, so unpublished and revoked Threads are absent) and error codes are shared. `BoardModule` must stay imported before `PublicationsModule` so `public/board` is not read as a `public/:slug`.

### Allowance refusal body (2026-10-14)

A start or retry refused by the budget step for a used-up or held allowance answers 403 `THREAD_GENERATION_ALLOWANCE_UNAVAILABLE` with the real message and `feature`, `used`, `limit`, `window` (forwarded from auth-service through thread-generation-service) instead of the generic plan sentence. Tests: `threads-generation.client.spec.ts`.

## Threaded comments, comment votes, mentions and community notifications (ADR-180, 2026-10-14)

Who sees whom. The public Thread page (`GET public/:slug`) and every Board item carry `owner: { username, displayName } | null`; every comment carries `author` and `replyTo` in the same shape. A name is `firstName lastName` when either is set, else the username. Names come only from auth-service (`POST /api/v1/internal/users/public-profiles`, `GET /api/v1/internal/users/by-username/:username`, service token) through `modules/author-identity` (`AuthProfileClient`, `AuthorIdentityService`: 2 s timeout, 60 s in-memory cache bounded to 2,000 entries, batches of 100). Any failure, a deleted or anonymised account and a non-active account give `null` (the UI shows "Member"); no id and no email is ever returned.

Comment routes (all under `thread-publications/public/:slug`):

| Route                                                                    | Auth                                          | Result                                                                                                                                                                                        |
| ------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET comments?page=1&pageSize=20`                                        | public (optional Bearer for `viewerReaction`) | `{ items, page, pageSize, total, totalPages }`; `pageSize` max 50; top-level comments newest first; each item carries its first 3 replies (oldest first), `hasMoreReplies`, `nextReplyCursor` |
| `GET comments/:rootId/replies?cursor=&limit=20`                          | public                                        | `{ items, nextCursor, hasMore }`; replies of one conversation oldest first; `limit` max 50; bad cursor 400; foreign or unknown root 404                                                       |
| `POST comments` body `{ content, parentId? }`                            | signed in                                     | the new comment (same view). `content` 1-5000, storable text. Shares the 5 per minute comment limit                                                                                           |
| `PUT comments/:commentId/reaction` body `{ value: 'LIKE' \| 'DISLIKE' }` | signed in                                     | `{ likes, dislikes, viewerReaction }`                                                                                                                                                         |
| `DELETE comments/:commentId/reaction`                                    | signed in                                     | `{ likes, dislikes, viewerReaction: null }`                                                                                                                                                   |

A comment view is `{ id, parentId, rootId, content, removed, createdAt, author, replyTo, mentions: [{ username }], likes, dislikes, viewerReaction, replyCount, replies, hasMoreReplies, nextReplyCursor }`. `replyCount` counts visible replies of a top-level comment (0 on a reply). Storage is flat: a reply to a reply stores `parentId` = the direct target and `rootId` = the top-level comment; the root is derived by `placeReply` inside the creating transaction and the client's `rootId` is ignored. The target must be a VISIBLE comment of the same publication, otherwise `404 Comment not found` (missing, hidden, deleted and foreign look the same). The conversation root row is locked `FOR UPDATE` before the reply count is read, so concurrent replies hold the cap of 500 per root (`422 THREADS_COMMENT_REPLY_LIMIT`). Likes, dislikes and reply counts are computed from the rows (no stored counters to drift); a vote is one row per user and comment (`thread_publication_comment_reactions`, unique, cascade) written in one transaction with the totals it returns.

Moderation. A hidden or deleted top-level comment is returned only while it still has a visible reply, as `removed: true`, `content: '[removed]'`, `author: null`, no mentions, zero votes. A reply's `replyTo` is `null` when the comment it answered is no longer visible. Hidden comments are excluded from every count; the Board `commentCount` counts replies and is refreshed on every create (`commentsChanged`). `POST reports` works for a reply unchanged.

Mentions. `parseMentionUsernames` finds `@name` (3-32 of letters, digits, `_`, `-`, the register-form rule) with a linear-time regex, never inside backticks or a fenced block, never glued to a letter or `@`, at most 10 distinct. Each is resolved with `GET by-username/:username` (case-insensitive, ACTIVE accounts only); unknown names and the author are dropped. Resolved mentions are stored in `thread_publication_comment_mentions (commentId, userId, username)` and returned as `mentions: [{ username }]`.

Notifications. `CommunityNotificationService` plans payloads with pure functions in `community-notification.utility.ts` and sends them through `ThreadNotificationService.dispatchBestEffort` (RabbitMQ `USER_NOTIFICATION_REQUESTED`). It never throws: a broker or lookup failure is logged without any comment text and the request still succeeds.

| Kind                      | Recipient                        | Fires when                             | `dedupeKey`                                  | Link                           |
| ------------------------- | -------------------------------- | -------------------------------------- | -------------------------------------------- | ------------------------------ |
| `THREAD_COMMENT_REPLIED`  | author of the comment replied to | a reply                                | `comment:<id>:THREAD_COMMENT_REPLIED:<user>` | `/threads/<slug>#comment-<id>` |
| `THREAD_COMMENTED`        | publication owner                | any comment or reply                   | `comment:<id>:THREAD_COMMENTED:<user>`       | same                           |
| `THREAD_MENTIONED`        | each mentioned user              | a comment with mentions                | `comment:<id>:THREAD_MENTIONED:<user>`       | same                           |
| `THREAD_REACTED`          | publication owner                | a LIKE, or the person's first reaction | `thread-reacted:<publicationId>:<actor>`     | `/threads/<slug>`              |
| `THREAD_COMMENT_REACTED`  | comment author                   | a LIKE of a comment                    | `comment-reacted:<commentId>:<actor>`        | `/threads/<slug>#comment-<id>` |
| `THREAD_CHANGE_REQUESTED` | publication owner                | a change request                       | `change-requested:<requestId>`               | `/threads/<slug>`              |

Never the actor. One notice per person per comment: reply wins over comment, comment wins over mention. Reaction keys have no timestamp, so toggling like/dislike cannot repeat a notice. `params` are `{ actorName, actorUsername, title, excerpt }` (`ThreadCommunityNotificationParams` in `@claw/shared-types`): `actorName` max 100, `title` max 120 (via `notificationTitle`), `excerpt` the first 120 characters on one line, empty for reactions. `actorName` is `''` when auth-service could not be reached. Email text uses only `title`; all 13 locales exist in auth-service.

Account deletion removes the person's comment votes and mentions, nulls `replyToUserId` of replies that answered them, and anonymises their comments (`authorId` null) as before.

## Healing pool and same-provider fallbacks (ADR-181, 2026-10-14)

- `HealingPoolService.forOwner` builds `{ pool, safeDefault }` (plan-allowed as FALLBACK, not on the deny list, window at least 32k, cheapest band first, spread over providers, at most 8; safe default = a Gemini "flash" model) and `ThreadsGenerationClient.enqueue`/`retry` hand it to the generation service. A failed read means no pool, never a refused start. `PublicationLifecycleService` and `PublicationGenerationOwnerService` take it as an `@Optional()` last constructor argument.
- `THREAD_FALLBACK_SAME_PROVIDER` is gone: a fallback of another model on the primary's provider is accepted by the start and retry preflight.
- Retry body accepts `articleLength: 'SHORT'`. The progress schema passes `failure.phase|failureClass|remedies|suggestedModel` and `healing` through (all optional, an older generation service sends none). `generation-state` carries `terminal`.

## Production bug batch (ADR-183, 2026-10-14)

- **Safety scan.** Secrets and e-mails: whole text. Card, SSN, IBAN: prose only (link targets, bare URLs and evidence markers are removed first); a card needs word edges and a Luhn pass, digits of any script are folded. A blocked `DRAFT` stays editable: `POST thread-publications/:id/revisions` accepts a `DRAFT` that holds a stored revision, answers `REVIEW_REQUIRED` with `findings[{ reason, kind: SECRET|EMAIL|CARD|SSN|IBAN, excerpt }]` when the new text still trips the scan (secrets and cards masked), and `GET generation-state` returns `safetyBlock` with the newest stored text. A passing review moves the publication to `READY_FOR_REVIEW`.
- **Topic.** `THREAD_TOPIC_INVALID` now means fewer than 10 letters or numbers (4 for Chinese, Japanese or Korean), counted per user-perceived character, or an unsavable character.
- **Slug.** Combining marks stay (Devanagari, Thai, Tamil, Bengali, Arabic harakat, Hebrew niqqud); 60 code points of title, cut per grapheme, plus `-` and 8 id characters.
- **Recommended team.** `models[].status` may be `DEGRADED` (with `recentHealth { successRate, samples }`): usable, never preselected, ranked after healthy models. Non-chat names and `REMOVED`/`UNEXPOSED`/non-`CHAT` catalog rows never reach the picker data.
- **Public reads.** `GET public/:slug` returns the markdown with evidence markers numbered or removed; `citations` carries urls only.
- **Owner progress** may carry `queue` (see the generation service guide).
- **Board first page.** The unfiltered Board is newest first with no age window and 12 per page; older Threads are on later pages. Members start with their own language filter, guests with every language. Checked, not a defect.
