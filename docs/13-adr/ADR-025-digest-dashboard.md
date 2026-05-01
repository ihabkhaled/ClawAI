# ADR-025 — Daily / Weekly Digest Dashboard

**Status:** Accepted (2026-05-01)
**Stream:** 31

## Context

Users want a "morning brief" — a single screen that summarises the last 24h (or last week) per provider with action items they can one-click into the approval queue. We need:

- Per-user delivery time aware of the user's timezone (8am Pacific != 8am UTC).
- Single-replica orchestration so `gemma3:4b` isn't called twice per user per day.
- Idempotent snapshots — regenerating today's digest replaces the row, doesn't create duplicates.

## Decision

### Schema

Two new tables in `claw_workspace`:

```prisma
enum DigestScope { DAILY, WEEKLY }

model DigestSnapshot {
  id                      String      @id
  userId                  String
  scope                   DigestScope
  snapshotDate            DateTime    @db.Date
  sections                Json        // [{ provider, summary, highlights[], actionItems[] }]
  actionItemSuggestionIds Json
  generatedAt             DateTime
  modelUsed               String
  durationMs              Int
  errorMessage            String?
  @@unique([userId, scope, snapshotDate])
}

model UserDigestPreference {
  id              String   @id
  userId          String   @unique
  dailyEnabled    Boolean  @default(true)
  weeklyEnabled   Boolean  @default(true)
  dailyHourLocal  Int      @default(8)
  weeklyDayOfWeek Int      @default(5)  // Friday
  weeklyHourLocal Int      @default(8)
  timezone        String   @default("UTC")
  providers       Json     @default("[]")
  lastDailyAt     DateTime?
  lastWeeklyAt    DateTime?
}
```

### Orchestrator: hourly cron + advisory lock

`DigestOrchestratorManager.tick()` runs at minute 0 of every hour:

1. Acquire Postgres advisory lock `workspace.digest.tick`. Other replicas no-op.
2. Query `UserDigestPreference WHERE dailyEnabled=true` and filter to users whose `dailyHourLocal` matches the current hour in their stored `timezone` (using `Intl.DateTimeFormat({ timeZone, hourCycle: 'h23' })`).
3. For each match, call `DigestBuilderManager.build({ userId, scope: 'DAILY', snapshotDate: now })`.
4. If today is UTC Friday (day 5), repeat for `weeklyEnabled=true` users.

### Builder: deterministic v1, LLM-rewrite v1.x

`DigestBuilderManager.build()` v1:
- Group `WorkspaceObject` rows by provider over the lookback window (24h for DAILY, 168h for WEEKLY).
- Cap at `DIGEST_MAX_OBJECTS_PER_PROVIDER` (25 daily, 100 weekly).
- Section structure: `{ provider, summary, highlights[3], actionItems[] }`. Summary is `"N items updated in the last Xh."`; highlights are top 3 titles.

The LLM-rewrite step (Gemma3:4b) is plug-in ready — the same JSON shape is produced, the LLM only rewrites prose. Deferred to v1.x to lock down the data path first.

### Endpoints

- `GET /workspace/digests?scope=DAILY&limit=14` — paginated list
- `GET /workspace/digests/today` — convenience for today's daily
- `GET /workspace/digests/preferences` — user view
- `PATCH /workspace/digests/preferences` — Zod-validated; bounds (`0..23` hour, `0..6` weekday)
- `POST /workspace/digests/regenerate` — admin-only, triggers any user's snapshot for any past date (debugging escape hatch)
- `POST /workspace/digests/trigger-mine?scope=DAILY|WEEKLY` — user-driven manual fire (for "show me my brief now")

## Consequences

- **Single-replica orchestration**: advisory lock prevents the duplicate-LLM-call problem when two replicas are ticking simultaneously.
- **Timezone correctness**: storing IANA tz on the preference row + using `Intl.DateTimeFormat` for hour matching is unbreakable across DST transitions.
- **Idempotency**: `(userId, scope, snapshotDate)` unique key means regenerating today's digest replaces the row; no duplicate detection needed.
- **Backward filling**: `regenerate` admin endpoint accepts any past date so ops can reconstruct missing days.
- **Action-item linkage (deferred)**: `actionItemSuggestionIds` exists in schema but the `DigestActionItemExtractorManager` that creates the linked queue entries is v1.x.

## Verification

- `qa/test-stream-31-digest-dashboard.sh` confirms tables, endpoints (today, preferences GET/PATCH, trigger-mine, auth-gating), and Docker log cleanliness.
- All 6 endpoints typecheck; orchestrator + builder + service unit-test ready (test seeded for v1.x).
