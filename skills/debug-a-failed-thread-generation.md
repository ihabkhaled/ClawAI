---
name: debug-a-failed-thread-generation
description: Find why a Thread generation failed or stalled using the owner step log, then retry, cancel or delete it
---

# Debug a failed Thread generation

1. **Read the owner log.** As the owner: `GET /api/v1/thread-publications/:id/generation-progress` (or the review page `/threads/review/:id`). `failure.code`, `failedStage` and `roleId` say what broke; `steps` say how it got there. A 404 means you are not the owner: that is the privacy rule, not a missing job.
2. **Map the code** (`THREAD_GENERATION_CODE_KEYS`, one test pins it to the service): `PAYG_CREDIT_EXHAUSTED` = credit model with an empty wallet, choose an included model; `MODEL_CATALOG_UNREACHABLE` = routing-service could not be reached (retried), `MODEL_CATALOG_REJECTED` = it refused the lookup (check `INTER_SERVICE_AUTH_TOKEN`, not retried), `CONTEXT_WINDOW_EXCEEDED` / `CONTEXT_WINDOW_ASSUMED` = the whole prompt does not fit the model window (assumed = 32k because the catalog has no window; pick a larger model or shorten the topic; not retried, ADR-173); old steps may show `MODEL_CONTEXT_UNAVAILABLE`; `REVIEW_NOT_PASSED` / `*_SCORE_LOW` = the quality gate rejected the drafts (weak model or thin source chat); `PROVIDER_*` = upstream.
3. **Act as the owner.** Retry (`POST retry-generation`, change models first for the first two codes), Cancel (`POST cancel-generation`), Delete (`DELETE /thread-publications/:id`, 409 while running or while the budget closes).
4. **Operator view.** `claw-pg-thread-generation`: `select status, stage, safe_error_code, failure_summary from thread_generation_jobs order by created_at desc`; steps are in `thread_generation_steps`. Never log or paste excerpts.
5. **Local trap.** After a `shared-types` change copy `packages/shared-types/dist` into the dev containers, and clear `.next/dev` in `claw-frontend` when a route that exists answers 404.

See [ADR-167](../docs/13-adr/adr-167-thread-generation-progress-is-an-owner-only-step-log.md) and [service guide](../docs/04-backend/service-guide-thread-generation.md).
