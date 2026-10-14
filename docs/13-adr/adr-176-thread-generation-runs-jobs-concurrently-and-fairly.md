# ADR-176: Thread generation runs jobs concurrently and fairly, and names the real cause of a failure

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-167](adr-167-thread-generation-progress-is-an-owner-only-step-log.md), [ADR-173](adr-173-threads-unknown-model-window-is-assumed-not-fatal.md) (job spend) and [ADR-175](adr-175-model-calls-are-bounded-by-silence-not-by-the-clock.md) (the 25 minute attempt ceiling). Queue rules: [rule 17](../../rules/17-rabbitmq-events-and-jobs.md). Money rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md).

## Context

Local QA on 2026-10-13 found five faults in how thread-generation-service schedules and ends jobs:

- **One job at a time per replica (D-06).** The broker consumer used `prefetchCount: 1` and the handler awaits the whole job, so a replica ran one job while the second of two worker slots sat empty. A new job waited 362 s in `QUEUED` with 12 to 18 jobs ahead of it, and one user (or one tester) could hold the whole queue. The recovery sweep also took the ten oldest queued jobs, so a user with more than ten queued jobs hid everyone behind them.
- **The failure named the wrong cause (browser D-01).** A role with fallbacks that failed on every candidate threw the last candidate's error. Gemini answered "wrong format" twice, Ollama too, and an HTTP 400 from the last fallback became the job's code.
- **A cancelled job's budget close retried every 15 s forever (D-05).** Auth answers `null` while a model call of the job is still reserved, and the sweep tried again on every pass without bound, logging an error each time.
- **Abandoned jobs had no recovery** beyond an expired lease: a `RUNNING` row with no lease, or a `QUEUED` row nobody would ever run, stayed for ever with its budget held.
- **`OUTPUT_INVALID` hid its reason.** The step excerpt was the first 600 characters of the reply, so a cut-off reply, a prose reply and a wrong-shaped object all looked the same.

## Decision

### Concurrency

- **Per replica: 3 jobs** (`GENERATION_REPLICA_CONCURRENCY`). It is the RabbitMQ prefetch: each running job holds one unacked message, so a replica is never handed more than it will start. The handler already runs each delivery on its own, so no extra in-process semaphore exists.
- **Across replicas: 6 jobs** (`GENERATION_WORKER_SLOT_COUNT`), one `thread_generation_worker_slots` row each (migration `20261014120000_threads_generation_concurrency` inserts slots 3 to 6, `ON CONFLICT DO NOTHING`). It must stay at least replicas times the per-replica number; the surplus claim finds no slot and the job waits for the next sweep. Raising it needs a migration that adds the rows.
- **Per owner: 2 running jobs** (`GENERATION_OWNER_MAX_RUNNING`). `claim` takes `pg_advisory_xact_lock(hashtext(ownerId))` first, counts that owner's `RUNNING` jobs, and refuses at the cap. The lock makes the check race-free across replicas. A refused claim changes nothing: the job stays `QUEUED`, the message is acked, and the sweep re-publishes it when its dispatch lease (30 s) lapses. A deferred job is delayed, never lost and never charged an attempt.
- **Fair dispatch.** `findDispatchable` ranks queued jobs with `ROW_NUMBER() OVER (PARTITION BY owner_id ...)` and takes rank 1 of every owner before rank 2 of any, skipping owners already at the cap. A user with a long backlog gets one slot in the batch per pass, like everyone else.
- **At-least-once stays safe.** Ack still happens after the handler returns. A duplicate or redelivered message finds the job `RUNNING` or finished, `claim` returns null, and nothing runs twice. Lease, heartbeat and attempt fencing are unchanged.

Why these numbers: three keeps a replica busy while one job waits on a slow model without fanning a single process out to dozens of long model streams; two per owner lets one user compare two models at once and still leaves four of six slots to other people.

### The real cause of a failure

When every candidate of a role fails, `callRole` throws `CandidatesExhaustedError` with one outcome per candidate (provider, model, machine code, HTTP status; never provider text). The primary cause is the code that repeated most, the earliest on a tie, so with all codes different it is the first model the owner chose. `parseStepError` returns the primary cause (and stops there, ignoring the last fallback's status deeper in the chain). The final `GENERATION` step carries that code and an excerpt such as `Every model failed. Main cause: OUTPUT_INVALID (2 of 3). GEMINI/..: OUTPUT_INVALID; OPENROUTER/..: PROVIDER_ERROR (HTTP 400).`, and the same text (400 characters) is the job's `failureSummary` for the operator report. The error keeps the deterministic marker of its cause, so a job that fails only for reasons a retry cannot fix still ends on attempt 1.

### Bounded budget close

A failed close is counted on the job (`budget_close_attempts`) and retried by the sweep with exponential back-off: 15 s doubling to a 30 minute cap, at most 8 tries (about 32 minutes in all). The first failure logs one warning with the reason ("the budget service refused to close it" when auth answers null or false, "could not be reached" otherwise); the tries between are silent; giving up logs one error and marks the job `budget_close_status = CLOSE_ABANDONED` with `budget_closed_at` set, so the sweep stops and the owner can delete the job. The abandoned budget is left to the budget service; the log line carries the job id and budget id.

### Abandoned jobs

- A `RUNNING` job with no lease for longer than a lease plus 5 minutes is recovered exactly like an expired lease (retried, or failed with `LEASE_EXPIRED`).
- A job `QUEUED` for longer than 3 hours since it last became runnable is failed with code `QUEUE_EXPIRED` and its budget released. Each pass handles at most 20 and each row is guarded by status and age, so a repeat pass changes nothing and a job claimed meanwhile is left alone.
- This service cannot see publications, so an orphan whose publication was never attached is only caught by the queue age bound. See Consequences.

### Output reasons

A refused reply is recorded as a classified reason first (`EMPTY`, `TRUNCATED`, `PROSE`, `INVALID_JSON`, `WRONG_SHAPE` with the names of the missing or invalid fields), then its length and a short start and end, so a cut-off reply shows where it stopped. The machine code stays `OUTPUT_INVALID`. The recorder still redacts and bounds the text.

## Consequences

- Throughput rises from one job per replica to three, six in all, with no user above two. QA's 362 s wait becomes the wait for a free slot only.
- `spentMicroCredits` (D-10) is unchanged and correct for what it reads: the sum of the cost chat-service reports per call, and chat-service reports it only for pay-as-you-go calls. An included-plan call reports none, so the job total stays 0 while auth's budget row holds the settled spend. Reconciling needs either chat-service to report `costMicroUsd` for budget-scoped calls, or a read endpoint for a budget's spend in auth-service; neither exists, and this service does not guess.
- Orphans whose publication was never attached still run (they are real jobs). Closing that gap needs threads-service to cancel the job when its publication step fails, or an internal lookup this service can ask.
- New failure codes reach the frontend: `QUEUE_EXPIRED`, and any provider code that now surfaces as the primary cause. Each needs a `THREAD_GENERATION_CODE_KEYS` entry in the 13 locales.
- When a storage failure leaves a reserved budget with no job, it is released unless some job holds the idempotency key, because reserving is idempotent per owner and key and a concurrent request shares the budget.

## Addendum 2026-10-14: round-2 owner fixes

The preflight also refuses a fallback on its primary's provider (`THREAD_FALLBACK_SAME_PROVIDER`).
A retry cap below one cent now reaches the preflight and gets `THREAD_SPEND_CAP_TOO_LOW`. Decision:
an owner edit review is a paid Judge and Critic call and uses the allowance, so a Free owner cannot edit
after the one lifetime use; the refusal explains the allowance. Still open: refusing a cap below the
cheapest hold or an unpriced model at start needs a price or hold read endpoint that does not exist.
