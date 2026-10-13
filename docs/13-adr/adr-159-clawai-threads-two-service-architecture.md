# ADR-159: ClawAI Threads uses publication and generation services

- **Status:** Accepted
- **Date:** 2026-10-04
- **Deciders:** Product owner
- **Related:** [Threads product spec](../02-business-product/clawai-threads-product-spec.md) · [architecture](../03-architecture/clawai-threads-architecture.md)

## Context

Threads creates sourced publications from private chat and adds public
community actions. Generation is long-running, metered, and retryable. Chat and
research already own their data and APIs; publication and job state have
different security and lifecycle needs.

## Decision

Use `claw-threads-service` for publication and community state and
`claw-thread-generation-service` for isolated jobs and workers. Chat returns
immutable filtered snapshots; research remains in research-service. Reuse
existing auth, entitlement, credit, moderation, and discovery systems. Keep
`/api/v1/threads` for chat and expose publication APIs under
`/api/v1/thread-publications`.

Generation requires a user-selected spend cap and visible publication/indexing
disclosure. Starting generation records intent; a draft stays private until
owner approval. Approved work remains public after account deletion with
anonymous attribution; private generation data is erased.

## Consequences

The feature needs two service workspaces, separate data ownership, an internal
queue, and explicit lifecycle integration. Public indexing must remain
independent of chat-share eligibility. Every pushed batch must be deploy-safe
because pushes to main trigger release and deployment.

## Addendum (2026-10-14): the job budget under parallel load, retries and cancellation

Local QA found six defects in auth-service's job budget (`thread_job_budgets`, `thread_job_budget_calls`). The decisions, all inside auth-service and the shared PAYG meter:

1. **Serializable conflicts are retried.** Parallel authors of one job reserve against the same budget row at SERIALIZABLE isolation, so conflicts are normal. Every budget transaction retries `P2034` up to 8 times with full-jitter backoff; only a transaction still conflicting answers `503 THREAD_BUDGET_BUSY`, which the meter reports as the temporary `PAYG_PRICING_UNAVAILABLE`, never as a spent cap.
2. **A request id is idempotent.** `calls/reserve` returns an outcome (`RESERVED`, `ALREADY_RESERVED`, `ALREADY_FINALIZED`, `ALREADY_RELEASED`, `CAP_EXCEEDED`, `BUDGET_CLOSED`, `BUDGET_NOT_FOUND`). A finished row asked for with a new credit hold is a retry and is reopened (what it spent stays counted). A genuine cap refusal is `PAYG_CREDIT_EXHAUSTED` carrying what is left of the cap. The generation service should still include the job attempt in the request id (`generation-pipeline.manager.ts`); with idempotency a retry works either way, but unique ids keep the per-call history readable.
3. **The cap counts the charge.** The credit finalize settles the budget call at what was charged (0 on the free allowance); the meter's finalize is a fallback at the hold.
4. **The hold fits the cap.** `credit/reserve` takes `threadJobBudgetId` and clamps the hold to the cap left. The punitive hold of an unpriced model is routing-service's fallback price and is not changed here.
5. **Closing releases in-flight calls** and their credit holds in one transaction; a cancelled job no longer stays ACTIVE.
6. **Nothing leaks.** `reserve` releases its plan holds in `finally`; a sweeper closes budgets ACTIVE for 12 h and releases allowance holds stranded on closed budgets.
