# ADR-019 — Auto-Suggest Scheduler

**Status:** Accepted (2026-05-01)
**Supersedes:** reservation in `adr-018-027-workspace-automation-reservations.md`
**Stream:** 12

## Context

In addition to event-driven suggestions (Stream 13 — webhook → factory), some valuable automations only emerge from periodic scans:

- "Daily Jira summary" — find tickets created/updated in last 24h
- "GitHub stale-PR nudge" — find PRs older than N days
- "Weekly digest" — aggregate across providers

Running these as long-lived cron jobs inside a horizontally-scaled service requires deduplication (otherwise N replicas all run the same scan).

## Decision

`AutoSuggestSchedulerManager` uses two patterns:

1. **`@Cron(...)` decorators** for declarative job schedules, configured via env vars (`AUTO_SUGGEST_JIRA_CRON`, `AUTO_SUGGEST_GITHUB_STALE_PR_CRON`).
2. **Postgres advisory locks** (`pg_try_advisory_lock`) to ensure a single-replica winner per tick — namespace pattern `auto-suggest:<jobType>`. Other replicas no-op if the lock fails.

Each tick records an `AutoSuggestRun` row (status: RUNNING → COMPLETED|FAILED) with candidate counts for ops visibility.

`SuggestionDeduplication` table caches a hash `(userId, jobType, candidateKey)` with TTL `AUTO_SUGGEST_DEDUP_TTL_DAYS` (default 7) to prevent re-enqueuing the same suggestion across ticks.

Manual entry-point: `POST /workspace/auto-suggest/jobs/:jobType/trigger-now` (admin-only) returns `STARTED` and runs async — useful for ops debugging without waiting for cron.

## Consequences

- Job concurrency = 1 across all replicas (advisory lock), not 1 per replica.
- A crashed replica mid-tick releases its lock at backend disconnect; the next tick is picked up by another replica or the next schedule.
- The `triggerNow` admin escape-hatch is the QA test entry-point.
- Adding a new job type requires the enum value, the cron decorator, the orchestrator handler, and a regression test row.

## Verification

- `qa/test-stream-12-auto-suggest.sh` triggers a job, verifies the run row, rejects bad jobType.
- Live verified: `POST /jobs/JIRA_SUMMARY_DAILY/trigger-now` produced 23 candidates → 23 enqueued in 123 ms.
