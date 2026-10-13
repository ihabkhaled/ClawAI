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
