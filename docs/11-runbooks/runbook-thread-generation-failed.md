# Runbook: a Thread generation failed

Use this when an owner reports a failed Thread, or a Thread sits in a state that looks wrong. Background: [ADR-181](../13-adr/adr-181-thread-generation-heals-itself-by-failure-class-and-resumes-at-the-failed-phase.md).

## 1. Read the attempt log

The owner's panel and `POST /api/v1/internal/threads/generations/:jobId/progress` (body `{ ownerId }`) return `steps`, `failure` and `healing`.

- `failure.phase` is where it failed, `failure.failureClass` why, `failure.code` the machine code, `failure.roleId` the seat.
- `healing.attempts` lists each automatic fix: `strategy` (what changed), `failureClass` (what it answered), `model`, `result`.
- In `steps`, a healing step is a `RETRY` or `FALLBACK` row whose `code` starts `HEAL_` (or is `FALLBACK_USED`); the row before it is the failure it answered. A `SKIPPED` row with `HEAL_STOPPED_*` says why healing stopped: `SPEND_CAP` (85 percent of the cap reached), `ATTEMPT_BUDGET` (6 per role or 24 per attempt), `OWNER_ACTION` (credit, plan or safety: only the owner can fix it).

## 2. Common reads

| You see                                                     | Meaning                                | Do                                                                                          |
| ----------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `HEAL_BACKOFF_RETRY` then success                           | provider was busy                      | nothing                                                                                     |
| `HEAL_LOWER_OUTPUT_LIMIT`, `HEAL_SHRINK_SOURCE` after a 400 | provider rejected the request          | if every candidate did it, check the provider and the chat gateway logs for that request id |
| `HEAL_JSON_REPAIR` often for one model                      | that model cannot hold the format      | steer owners away or deny-list it                                                           |
| `HEAL_SAFE_DEFAULT` used                                    | every other candidate failed           | check provider credit and the pool (`recommended-team`)                                     |
| failure `PROVIDER_CREDIT`                                   | the operator's provider account is out | top up; the ladder already tried other providers                                            |
| failure `CREDIT_EXHAUSTED`, `CAP_TOO_LOW`                   | owner's wallet or cap                  | the panel offers Add credit or Raise the spend cap                                          |
| failure `REFUSAL`                                           | a safety refusal                       | never retried on another model; the owner changes the topic                                 |
| `healing.attempts` empty, failure `QUEUE_WORKER`            | worker lost or queue expiry            | Try again resumes from saved work; see the concurrency notes in the service guide           |

`generation-state.terminal` is false while the job is queued or running even if `safeErrorCode` shows the last attempt's code; do not treat `safeErrorCode` alone as the end.

## 3. Retrying

Try again (panel or `POST thread-publications/:id/retry-generation`) copies the research and every saved reply, except the roles whose model was changed, so it resumes at the failed phase. A changed topic starts over. A retry of a job that already has a retry returns that retry (409 only for a non-failed job).

## 4. Checking the pool

`healing` is chosen by threads-service when the job starts or is retried. If jobs never heal onto other providers, call `GET thread-publications/recommended-team` as that user: no usable model means no pool.

## A review fails with a good score (ADR-193)

`REVIEW_NOT_PASSED` with a Judge or Critic score at or above the minimum means blockers remained. Read the step log: RETRY steps `JUDGE_BLOCKED` / `CRITIC_BLOCKED` carry the verdict JSON `{score, minScore, blockers}` in their excerpt; `progress.failure.review` has the same. If every blocker asks for sources the failure class is `EVIDENCE_GAP`: the owner's remedies are "Research more" (retry with `refreshResearch: true`, which inherits no research) or "Narrow the claims". Steps `EVIDENCE_GAP_RESEARCH*` show the one targeted research pass (done, empty, failed or skipped at 85 percent of the spend cap). Do not lower the minimum scores to clear one Thread.
