# ADR-174: Threads refuses what cannot succeed before it queues a job

**Status:** Accepted

**Date:** 2026-10-13

Builds on [ADR-159](adr-159-clawai-threads-two-service-architecture.md), [ADR-167](adr-167-thread-generation-progress-is-an-owner-only-step-log.md) and [ADR-173](adr-173-threads-unknown-model-window-is-assumed-not-fatal.md). Rules: [rule 20](../../rules/20-i18n-and-user-facing-messages.md), [rule 28](../../rules/28-billing-integrity-and-api-contracts.md).

## Context

Production rounds on 2026-10-13 found four faults at the edge of Threads generation:

1. A source chat thread owned by another user came back as `503 Generation request failed (503)`: the snapshot client turned chat-service's 404 into a 503, which looks retryable and says nothing.
2. A Free user got `403 Generation is not permitted` with no reason. The 403 comes from auth-service's budget step (permission and the three plan features) and was flattened twice on the way out.
3. `POST /thread-publications/generations` accepted a made-up model name and a 1 micro-USD cap with 201. The job then failed minutes later, after retries, on its first model call.
4. The Judge and Critic scored down a Spanish or French article because the request topic was in English and the review prompt never mentioned the requested language. Scores of 65 repeated until `REVIEW_NOT_PASSED`.

## Decision

- **Preflight at enqueue.** `PublicationGenerationStartService` runs `GenerationPreflightService` before the job, budget or publication is created. It checks, in order: the spend cap, the `THREAD_GENERATION_USE` permission, that every provider/model (primaries and fallbacks) is in the model catalog, and that every seat's primary model is on the caller's plan. It reads the plan (`EntitlementsAdapter`, `enforceTrial: false`) and the catalog (routing-service `context-window` lookup, field `known`); it never calls a model. If either read fails the enqueue fails closed with 503.
- **Spend cap floor: 10,000 micro-USD (one US cent).** A run does research, three to five drafts and two reviews; a cap below one cent cannot pay for a round. A retry's `spendCapUsd` has the same floor.
- **Plan test is the chat test.** `isModelAllowedForUsage` with PRIMARY for a seat's primary and FALLBACK for each fallback, the same call chat-service's access control makes. Fallbacks are checked too (security review, 2026-10-13): the chat gateway used by Threads only reserves credit and does not re-check the plan, so an unchecked fallback would run for a user whose plan excludes it.
- **Machine codes, shared error body.** `{ message, code, statusCode, ...details }` where details are only the caller's own request fields: `THREAD_SPEND_CAP_TOO_LOW` and `THREAD_MODEL_UNKNOWN` (400), `THREAD_GENERATION_NOT_PERMITTED`, `MODEL_NOT_ALLOWED_FOR_PLAN` and `THREAD_GENERATION_NOT_IN_PLAN` (403). `MODEL_NOT_ALLOWED_FOR_PLAN` is the code chat already uses for the same refusal. The message names the seat, the model and the caller's own plan; the plan that would allow it is not named because auth-service exposes the caller's plan only.
- **Unknown is reported as unknown.** The catalog check runs before the plan check, so a made-up name is not reported as "not on your plan".
- **Missing and foreign source threads are the same 404.** `ChatSnapshotClient` maps 404 and 403 to a 404; Threads answers `Source thread not found` for both.
- **Reviewers judge in the requested language.** The Judge and Critic system prompt states the requested language is correct, forbids lowering the score, adding a blocker or requesting a rewrite or translation because it differs from the topic's language, and asks for findings and `revisionBrief` in that language.

## Consequences

- A bad request now fails in one round trip with a reason the owner can act on, before any budget is reserved or model called.
- One more dependency on the enqueue path: routing-service and auth-service must answer, or the enqueue is a 503. `ROUTING_SERVICE_URL` is the existing shared variable (default `http://routing-service:4004`); no new variable.
- A model the static table knows but the catalog lacks passes the existence check (`known` is true for both), as it does for chat.
- The frontend still renders one generic sentence for any 403 on start. Showing these messages in the 13 locales needs the frontend to map the codes; that is a follow-up and not part of this change.
- In-flight jobs replay their review calls once, because the review prompt (and so its stored hash) changed.

## Addendum 2026-10-14: start and retry are atomic, idempotent and capped

QA on the local stack (`local-threads-negatives-security`, defects D-01 to D-12) found that the checks above covered only the first start. This addendum is the decision record for the fix. ADR number 176 was taken by the generation-service concurrency decision, so the record stays here.

**One preflight for start and retry.** `retry-generation` ran none of the checks: an off-plan or made-up model went straight through `models[]`. It now runs the same `GenerationPreflightService` on the models the new attempt will really use: the stored seats from the generation progress (`selections.roles`, fallbacks included) with the owner's `models` overrides applied exactly as the generation service applies them (a new primary replaces the old one and drops fallbacks on the same provider). Spend cap (a new `spendCapUsd` is converted by string formatting, never float arithmetic, otherwise the stored cap), permission, catalog and plan. An unknown role id is a 400.

**Exact catalog test.** The routing `context-window` lookup answers `known: true` for any name matching a family pattern (`gemini-*`), so `gemini-nope-9` passed. `ModelCatalogClient` now reads connector-service's public catalog (the model picker's own query: connector enabled, model active, exposed, chat) and matches provider (case-insensitive) and model exactly; the Gemini `models/` prefix is decoration. The read is cached for 30 s and shared by concurrent callers; a failed read is never cached and answers 503. Config: `CONNECTOR_SERVICE_URL` (default `http://connector-service:4003`, the shared `.env` value). threads-service no longer reads `ROUTING_SERVICE_URL`.

**Owner-scoped idempotency.** The key sent upstream is `sha256(JSON([ownerId, key]))`. Two owners can use the same client key without meeting: no cross-user 409 and no existence oracle. threads-service also stores that hash and a fingerprint of the request (idempotency key and correlation id excluded) on the publication (`start_key_hash`, `start_request_hash`, unique per owner; the migration is additive and idempotent). A repeated start by the same owner returns the same publication and job without a second preflight, cap check, budget or job. The same key with another body is `409 THREAD_IDEMPOTENCY_KEY_REUSED`. Jobs created before this change keep their raw key upstream, so repeating one of those starts creates a new job once.

**Serialised per owner.** A start or retry runs one at a time per owner inside the process (`GenerationStartGate`, a keyed mutex; at most 8 queued per owner, then 429). Four parallel same-key starts therefore become one job plus three replays instead of 1x201 and 3x503. One threads-service replica is assumed. With more, the unique index and the bounded retry still protect the data, but the cap check and the replay lookup are no longer exact across replicas.

**Atomic enqueue.** The publication write is retried on a write conflict (Prisma P2034, and P2002 from the upsert race) up to 4 times with a short growing wait, then answers a retryable 503, never a 500. If the publication cannot be saved after the job was queued (any error, or a deleted account), threads-service cancels the job through the existing internal client, which releases its budget and feature allowance, unless another publication already points at it. The generation service has no "fail" transition for an unstarted job, so the job ends CANCELLED. A retry whose attach throws does the same.

**Orphan repair (existing orphans).** `POST /api/v1/thread-publications-moderation/orphan-generations/repair` (`THREAD_PUBLICATIONS_MODERATE`, body `{ jobs: [{ jobId, ownerId }] }`, 1 to 50). Per job: `IN_USE` if any publication or edit review here points at it or a start is attaching it (never touched); `NOT_FOUND` if the generation service has no such job for that owner; `ALREADY_FINISHED` if it is not QUEUED or RUNNING; otherwise `CANCELLED`, which makes the generation service release the budget. Idempotent. Chosen over a background sweeper because threads-service cannot list upstream jobs, a sweeper needs a new store and a clock, and this call cannot touch a job it cannot show is unowned.

**Per-owner active cap.** `MAX_ACTIVE_GENERATIONS_PER_OWNER = 3`. Counted from the owner's newest 25 draft publications whose job is QUEUED or RUNNING (only a draft can run). Finished, failed, cancelled and waiting-for-review jobs do not count. At the cap: `429 THREAD_GENERATION_TOO_MANY_ACTIVE` with `limit` and `active`. A generation-service failure other than "job gone" fails closed with its own error. It applies to retry as well. The generation service has its own per-owner running cap (ADR-176); this one stops a user queueing without bound.

**Cancel tells the truth.** Cancel on a job that is not QUEUED or RUNNING (CANCELLED, FAILED, WAITING_FOR_REVIEW, COMPLETED) or on a non-draft publication is `409 THREAD_GENERATION_NOT_CANCELLABLE` with `state` and `publicationStatus`, not `201 CANCEL_REQUESTED`.

**Publish.** An unpublished article whose revision is already owner-approved publishes again without a new review (D7: it used to 404 because only a READY_FOR_REVIEW revision qualified). Publishing something already live answers with the live article and notifies nobody twice. For two simultaneous publishes the revision approval is a guarded update; the loser re-reads and gets the idempotent answer. A duplicate request is the likely cause of D8 (404 to the client while the row ended PUBLISHED), which could not be reproduced. Nothing publishable is a `409` with a reason, a moderation-revoked publication is a `409`, and 404 stays for a publication the caller does not own.

**Input.** The topic is trimmed, then needs 10 characters and no NUL or lone surrogate (`400 THREAD_TOPIC_INVALID`). The same characters are refused in ids, keys, provider and model names (`THREAD_TEXT_INVALID`). A refinement can carry a `code`; `ZodValidationPipe` returns it on the failing field and on the body.

**Allowance versus plan (D-09).** The budget step's 403 is the same for "the plan lacks the feature" and "the allowance is used up or held by a running generation". After the preflight proved permission and models, threads-service reads the plan again. All three features present (web research, Judge review, Critic review) means `403 THREAD_GENERATION_ALLOWANCE_UNAVAILABLE`; a missing feature is `THREAD_GENERATION_NOT_IN_PLAN` naming the features. The "used N of M" figure and the reset date are not available to threads-service, because auth-service's reason is flattened to a bare 403 by the generation service. Showing them needs auth-service to return the reason.

**Consequences.** A budget refusal costs one more plan read. The active-cap check costs up to 25 small calls to the generation service once an owner has 3 or more drafts. The threads database gains two nullable columns and one unique index.

## Addendum 2026-10-14: the wizard starts from a server-owned recommended team

The refusals above were still reachable from the default path: the wizard ranked models in the browser and preselected providers whose last run failed, so a first start could end in a model-reason 403 or a three-minute failure. `GET /api/v1/thread-publications/recommended-team` (owner JWT, the caller's own plan only) now answers with one team and a status for every catalog model.

- **Same tests as the preflight.** The team and every status come from the picker catalog (`ModelCatalogClient.listModels`, the same cached read as `isKnown`) and `isModelAllowedForUsage` on the caller's entitlements (PRIMARY for a seat, FALLBACK for a backup). A model marked available is not refused by the start for plan or catalog reasons.
- **Statuses.** `AVAILABLE`, `NEEDS_PLAN`, `WINDOW_TOO_SMALL` (a published window under 32,768 tokens; a model with no published window uses the documented assumed window of 32,768, ADR-173, so it stays usable) and `UNAVAILABLE` (the deny list).
- **Deny list.** `THREAD_MODEL_DENY_LIST` in `recommended-team.constants.ts` holds OPENAI and ANTHROPIC as whole providers (no credit, hidden 400; backlog P0-3). Credit cannot be detected from threads-service, so a provider is listed by hand until it is healthy. It is a constants list because the service has no settings table; an admin-edited DB row is the follow-up. It only shapes the recommendation and the picker: the start does not reject a denied model.
- **Team choice.** Usable models sorted by provider order (GEMINI, GROK, OLLAMA, then alphabetical), cheapest cost band, larger window, name; spread across providers; three authors, Judge, Critic; the list repeats when there are fewer models than seats. Each seat gets up to two backups on other providers the plan allows as fallbacks. No usable model answers `team: null` and the wizard ranks usable models itself.
- **Cache.** 60 s per owner in memory (one replica's memory; 500 owners at most). A stale answer only changes what is preselected.
- **Failure.** Plan lookup failure is 503 (fail closed), an unreadable catalog is 503.
- **Wizard.** The team is preselected and the five pickers sit under an Advanced fold; a model the account cannot use is listed with its reason ("Not on your {plan} plan", "Context window too small", "Temporarily unavailable") and cannot be chosen; backups per role are on other providers (the same-provider fallback is a 400 on start). `createThreadGenerationRequest` still lets a same-provider backup through for its own pool, so the wizard replaces the backups per seat after building the request (`withSeatFallbacks`).

Not done: the shared chat `ModelPicker` has no disabled option state, so unusable models are labelled and ignored on click rather than greyed out; "last used team remembered" and a measured canary-driven deny list (P0-16) are open.
