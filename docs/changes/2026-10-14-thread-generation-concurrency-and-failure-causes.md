# Thread generation: concurrent fair jobs, real failure causes, bounded budget close (2026-10-14)

## Before

One replica ran one job at a time (`prefetchCount: 1` and a handler that awaits the whole job), so the second worker
slot sat empty while 12 to 18 jobs queued and a new job waited 362 s. The recovery sweep re-published the ten oldest
queued jobs, so one user with a backlog hid everyone else. A role whose every candidate failed reported the last
fallback's error as the job's code (Gemini and Ollama "wrong format", then an HTTP 400 became the cause). A cancelled
job's budget close was retried every 15 s for ever. A `RUNNING` row with no lease and a `QUEUED` row nobody would run
were never recovered. An `OUTPUT_INVALID` step showed the first 600 characters of the reply and no reason.

## Change

- Per-replica concurrency 3 (prefetch), 6 worker slots in all (migration adds slots 3 to 6), at most 2 running jobs per
  user (advisory lock per user in `claim`). A refused claim leaves the job queued and costs no attempt. The sweep now
  re-publishes one job per user per round, skipping users at the cap.
- `CandidatesExhaustedError`: the job's terminal code is the most repeated candidate code (the first model's on a tie)
  with a per-candidate summary as the final step excerpt and the operator `failureSummary`.
- Budget close: 8 tries, back-off 15 s doubling to 30 min, one warning with the reason, one error on giving up, then
  `CLOSE_ABANDONED`. `ThreadBudgetClient.close` tells a refusal (null) from an outage.
- `RUNNING` rows with no lease are recovered after lease + 5 min; `QUEUED` rows older than 3 h fail with
  `QUEUE_EXPIRED` and release their budget.
- `OUTPUT_INVALID` steps carry a classified reason (empty, truncated, prose, invalid JSON, wrong shape plus field names).
- A job that could not be stored releases its budget unless a job holds the idempotency key.

## Not changed / needs another service

- `spentMicroCredits` is correct for what it reads (pay-as-you-go costs reported by chat-service). Included-plan jobs stay
  0 while auth's budget row holds the spend; this needs chat-service to report the settled cost of budget-scoped calls or a
  budget spend read endpoint in auth-service.
- Orphans whose publication was never attached need threads-service to cancel the job when its publication step fails.
- The frontend needs `QUEUE_EXPIRED` (and the provider codes that now surface as the main cause) in
  `THREAD_GENERATION_CODE_KEYS`, 13 locales.

See [ADR-176](../13-adr/adr-176-thread-generation-runs-jobs-concurrently-and-fairly.md).

## Model call request id includes the job attempt

The id sent with each model call is now `jobId:roleKey:round-N:attempt-A:cand-I[:try-T]` (A is the job attempt, I the candidate model). With the idempotent budget reserve in auth-service, an id without the attempt would make a retried job reuse the first attempt's reservation and never charge the new one.
