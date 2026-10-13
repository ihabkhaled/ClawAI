# ADR-167: Thread generation progress is an owner-only step log

**Status:** Accepted

**Date:** 2026-10-13

Extends [ADR-159](adr-159-clawai-threads-two-service-architecture.md).

## Context

A Thread generation that failed showed the owner "Failed to create thread" and nothing else. Production reproduction (2026-10-13, Admin, Free and Pro): authors failed with an upstream `402 PAYG_CREDIT_EXHAUSTED` because the default models were credit models, and the only stored result was `GENERATION_FAILED`. The reason sat in a log line and an operator ticket.

## Decision

- **One append-only step log per job** (`thread_generation_steps`, generation service): stage changes and every research, author, judge, critic, retry, fallback, resume and cancel step, each with a stable machine `code`, the upstream HTTP status, duration, token counts and a 600-character redacted excerpt of what the model said. Recording never throws into the pipeline.
- **Owner only.** Progress, retry and delete answer 404 to anyone but the owner, and a draft with a failed job never appears in discovery, the sitemap or a slug route. Codes are translated in the portal (13 locales); a test fails when the service emits a code the portal cannot translate.
- **Owner actions.** Retry creates a new job from the pinned snapshot, optionally changing topic, cap and models; `retried_from_job_id` is unique, so a job has at most one retry and a lost race releases its budget reservation. Delete removes the publication and the whole retry chain, and refuses while a job runs or its budget is still closing.
- **Defaults avoid the known failure.** Default models prefer ones the plan includes and demote volunteer providers (AI Horde); each role carries up to two fallback models.

## Consequences

- Excerpts hold model output, so they are owner-only and never logged.
- A shared-types change (`ThreadGenerationProgress`) means dev containers need the new dist copied in.
- Not done: an attempt number per step (needs a contract field); a pre-flight check that refuses a model with no known context window before the job starts.
