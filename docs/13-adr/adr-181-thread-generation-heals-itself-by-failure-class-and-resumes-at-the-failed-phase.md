# ADR-181: Thread generation heals itself by failure class and a retry resumes at the failed phase

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-173](adr-173-threads-unknown-model-window-is-assumed-not-fatal.md) (output parsing, fallbacks), [ADR-174](adr-174-threads-refuses-what-cannot-succeed-before-it-queues.md) (start preflight), [ADR-175](adr-175-model-calls-are-bounded-by-silence-not-by-the-clock.md) (time bounds), [ADR-176](adr-176-thread-generation-runs-jobs-concurrently-and-fairly.md) (concurrency, real cause of a failure). Money rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md). Runbook: [a Thread generation failed](../11-runbooks/runbook-thread-generation-failed.md).

## Context

Production runs on 2026-10-14 (six providers) failed in ways the pipeline treated alike: an author call answered `CLOUD_PROVIDER_REQUEST_FAILED` 400 with an empty excerpt; `PAYG_PRICING_UNAVAILABLE` 402 and `PROVIDER_CREDIT_EXHAUSTED` 503 failed the job though another model would have worked; almost every OpenRouter model failed its first reply with `OUTPUT_INVALID` (WRONG_SHAPE on the citation rules, or TRUNCATED); a team on one provider could not have a fallback (`THREAD_FALLBACK_SAME_PROVIDER`); Groq answered 413 (request larger than its tier); and a retry started from nothing, paying for research and drafts again.

Before this ADR a failed call was retried at most once, only for a wrong-shaped reply, and then the role moved to its next fallback. Everything else (a 429, a 503, a 400, a window overflow, a missing price) went straight to the next candidate or failed the attempt, and the owner saw one code.

## Decision

### 1. A classifier gives every failure a phase, a class, and a remedy

`classifyFailure({ code, httpStatus, outputKind, stage, citationRule })` (`utilities/classify-failure.utility.ts`) returns `{ phase, failureClass, healable, ownerOnly, retryable, remedies }`. The vocabulary is shared enums in `@claw/shared-types`: `ThreadFailurePhase` (QUEUE, SNAPSHOT, RESEARCH, AUTHOR, CITATIONS, CONSENSUS, JUDGE, CRITIC, FINALIZE), `ThreadFailureClass` (22 classes), `ThreadHealingStrategy`, `ThreadFailureRemedy`. Code to class is one table (`failure-class.constants.ts`); an unknown code falls to HTTP-status rules, then to `UNKNOWN`. There is no separate "plan" phase: research fixes what the authors may cite, so it is the plan.

`ownerOnly` classes stop the ladder at once and are never retried as a whole attempt: spent credit (`PAYG_CREDIT_EXHAUSTED`), entitlement, and a safety refusal (any code matching SAFETY, CONTENT_FILTER, REFUSED...). Trying another model after a safety refusal would be evading it, so the only remedy is "change the topic".

### 2. A ladder per class changes the request, then the model

`nextOnModelStep` (`healing-ladder.utility.ts`) picks, per class, the next not-yet-used rung for the same model:

| Class                                         | Rungs on the same model, in order                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 429, 5xx, network                             | wait with exponential backoff and +-25% jitter; a provider's Retry-After is honoured up to 30 s, a longer one means swap       |
| timeout (idle, ceiling)                       | none: the same model would stall the same way                                                                                  |
| provider rejected (400, 404, 422)             | lower the output limit (half, floor 2,048), then shrink the source                                                             |
| cap too low                                   | lower the output limit                                                                                                         |
| empty reply                                   | stricter prompt with the reason                                                                                                |
| cut off                                       | give more output room (x1.5 or the language factor), then ask for a shorter article                                            |
| not JSON / wrong shape / citation rule        | stricter prompt with the reason, then a repair pass: the bad reply is sent back with the required shape and "do not add facts" |
| window overflow (own check or 413)            | shrink the source (keep the opening message and the newest, clip each)                                                         |
| pricing unavailable, provider credit, refusal | none                                                                                                                           |

A rung that would send the identical request is skipped. When the rungs are spent the role swaps model: the owner's backups, then a ranked pool, then a safe default. After a provider-wide failure (429, outage, timeout, no credit) candidates on the same provider move behind the others. Every healing step is written to the owner's step log (code = the strategy, excerpt = the class it answered), so there is no new table: `buildHealingSummary` reads the attempts back out of the log.

Not done on purpose: lowering temperature or sending `response_format`. The chat gateway's internal route accepts neither (its schema is strict), so they cannot be varied from here. The 400 rung therefore lowers the output limit and shrinks the prompt, the only request settings that exist.

### 3. Candidates: own backups, a plan-allowed pool, a safe default

threads-service builds `healing: { pool, safeDefault }` at start and at retry (`HealingPoolService`, `buildHealingPool`): catalog models the plan allows as a fallback, minus the deny list and windows under 32k, cheapest band first, spread over providers, at most 8, with window and cost hints; the safe default is a Gemini "flash" model when the plan has one. Any failure to read the plan or catalog means no pool, never a refused start. The generation service ranks the pool by the last hour's success rate from its own step log (models with at least 3 samples and no success are dropped), skips pool models whose published window cannot hold the prompt, and tries at most 4 per role. A model that failed a role for its own reasons in an earlier attempt of the same job moves behind that role's backups. `healing` is excluded from the idempotency comparison (`isSameRequest`), because the pool is chosen at call time and a repeated start must stay the same generation.

### 4. Bounds: attempts, time and money

- per role call: 6 healing attempts (`MAX_HEAL_ATTEMPTS_PER_ROLE`); per job attempt: 24 (`MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT`); per role, 6 minutes (`ROLE_MAX_MS`, was 3); the job still has `MAX_GENERATION_ATTEMPTS` (3) and the 25 minute attempt ceiling (ADR-175). The total is therefore bounded; there is no unbounded loop.
- a healing attempt never starts once the job's spend reaches 85 percent of its cap (`HEAL_SPEND_CEILING_PERCENT`); every attempt's cost is counted. The gateway still enforces the cap itself.
- backoff waits are abortable by cancel and lease loss (`waitBeforeRetry`) and at most 30 s, so a worker slot is not held through long gaps. A failure that cannot change between attempts (`NON_RETRYABLE_STEP_CODES` plus every `ownerOnly` class, now also `PAYG_PRICING_UNAVAILABLE` and `PROVIDER_REQUEST_TOO_LARGE`) fails the job on attempt 1.
- budget close, refund policy and the Free allowance rules are unchanged.

### 5. Same-provider fallbacks are allowed

`THREAD_FALLBACK_SAME_PROVIDER` is removed. Its intent was to refuse what the pipeline would only reject after budget was held; but a team on one provider (which the picker allows) then had no fallback at all, and most failures are the model's, not the provider's. A fallback that is the primary itself is still dropped, with a visible SKIPPED step. The ladder keeps the safety intent differently: after a provider-wide failure it prefers other providers, so a same-provider fallback is tried last in exactly the case where it would not help. Rejected alternative: keep refusing and rely on the pool; it leaves single-provider teams exposed whenever the pool is empty (no plan access to others).

### 6. A retry resumes at the failed phase

`GenerationJobsService.retry` copies the failed job's research evidence and every saved model reply into the new job (`inheritCheckpoints`), except the roles whose model the owner changed (a reply is also kept only if its prompt hash matches, so a changed article length or topic regenerates). A changed topic inherits nothing. The copy is best effort, idempotent (skip duplicates, only an unstarted child with no evidence) and inside a transaction; when it fails the retry runs from scratch. Automatic job-level attempts already resume from checkpoints of the same job. Result: "Try again" restarts at the failed phase and "Try again with <model>" changes only the failed role.

### 7. The owner sees phase, reason, what was tried and one-click remedies

Progress carries `failure.phase`, `failure.failureClass`, `failure.remedies` (at most three shown), `failure.suggestedModel` and `healing.attempts`. The panel shows the phase, a one-sentence reason, what was tried, and buttons: Try again, Try again with <model>, Choose another model for this step, Use the recommended team, Try a shorter article, Raise the spend cap, Add credit, Change the topic. While healing runs the progress says "Retrying with a different model" or "Trying again a smarter way". `retryable` now means "a plain Try again helps": only spent credit is false. `getOwnerState` adds `terminal`, because `safeErrorCode` can hold the last attempt's code while the job is still queued or running.

### 8. Output tolerance: citations

The WRONG_SHAPE on `citations.N.url` came from the normaliser giving an unknown id the id as its url (not a url). It now matches the same page written with a trailing slash, tracking parameters, another scheme or `www`; accepts a number only when the entry also gives that item's url; drops a listed entry that names nothing when another citation is real; and the prompt carries an id/url table. A draft whose citations all name nothing in the bundle is still refused, so an invented source never passes. Reviewers' `revisionBrief` defaults to empty.

## Consequences

- Most first-attempt failures heal inside the same attempt, at the cost of up to 6 extra calls per role (bounded, cap-guarded). Repair passes cost only the bad reply as input.
- The step log grows by one row per healing step; the 500-row list keeps the oldest and newest.
- Not done here: accepting the best-scored draft after repeated no-consensus or a tie-break judge (REVIEW_NOT_PASSED still fails after 3 rounds), splitting an article into sections, dropping an author, breaker state across jobs for a provider whose credit is out (only the hourly success ranking), and filtering unexposed or non-chat models out of the picker (the catalog read carries no such flag).
- Rollout: shared-types first, then thread-generation-service and threads-service (an older generation service sends no `phase`; the panel hides itself), then the frontend.
