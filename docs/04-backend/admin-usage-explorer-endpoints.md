# Admin usage explorer and Observability endpoints

Backend half of the Observability page rework. No proxy change: `/api/v1/admin`,
`/api/v1/audits` and `/api/v1/usage` are already routed.

## Rules that apply to every route

- **Window.** `hours` (1-2160), `days` (1-90) or `from` / `to` (ISO with offset). Use one of them, never a mix.
  Default 7 days. A window over 90 days is rejected (`USAGE_RANGE_TOO_WIDE`), never clamped. Grain is `HOUR` up to
  7 days, `DAY` beyond.
- **Pagination.** auth-service routes use opaque keyset `cursor` plus `limit` (1-100, default 25) and return
  `nextCursor` (`null` on the last page). audit-service routes use `page` and `limit` and return a total.
- **Cost honesty.** Every cost block carries `costKind`. A missing price is never shown as plain `$0` (see below).
- **No sensitive data.** Only ids, provider, model, workflow, counts, cost and latency. Never a prompt, response, key,
  token or header.
- **Provider names** are normalised in one place per service (`provider-label.utility.ts`): `local-ollama` and
  `LOCAL_OLLAMA` are one group, labelled "Local Ollama"; `CLAW` is "ClawAI (platform)".

## auth-service (Postgres, `weighted_usage_records`)

Base path `/api/v1/admin/usage-explorer`. Permission: role `ADMIN` and `ADMIN_USAGE_VIEW`.
These routes return the **full email**. Opening a user and exporting are audited (below).

Shared filters: `provider` (any spelling, normalised), `model`, `workflow` (`UNKNOWN` = ledger rows with no
workflow), `billing` = `CREDIT | ALLOWANCE | UNMETERED | PLAN`.

| Method | Path                      | Query                                                                                                                                                            | Audited                          |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| GET    | `/users`                  | range, filters, `search` (email, username, exact id), `sort` = `requests\|tokens\|cost\|lastSeen` (default `lastSeen`), `order` = `asc\|desc`, `limit`, `cursor` | no                               |
| GET    | `/users/export`           | range, filters, `search`, `order`                                                                                                                                | yes, `ADMIN_USER_USAGE_EXPORTED` |
| GET    | `/users/:userId`          | range, filters                                                                                                                                                   | yes, `ADMIN_USER_USAGE_VIEWED`   |
| GET    | `/users/:userId/requests` | range, filters, `search` (model, provider, workflow), `sort` = `time\|tokens\|cost`, `order`, `limit`, `cursor`                                                  | first page only                  |
| GET    | `/leaderboard`            | range, filters, `dimension` = `provider\|model\|workflow\|user`, `userId`, `search`, `sort`, `order`, `limit`, `cursor`                                          | no                               |
| GET    | `/timeseries`             | range, filters, `userId`                                                                                                                                         | no                               |

### Response shapes

```ts
type UsageCostKind = 'PRICED' | 'FALLBACK' | 'UNPRICED' | 'UNMETERED';
type UsageBillingKind = 'CREDIT' | 'ALLOWANCE' | 'UNMETERED' | 'PLAN';

type AdminUsageCostSummary = {
  costMicroUsd: string; // actual + estimated, integer micro-USD as a string
  actualMicroUsd: string; // settled, provider-reported
  estimatedMicroUsd: string; // reservation estimate, only for rows with no settled cost
  costKind: UsageCostKind;
  pricedRequests: number;
  estimatedRequests: number; // FALLBACK rows
  unpricedRequests: number; // model has no price on file
  unmeteredRequests: number; // administrator rows, not charged
  partial: boolean; // some rows have no price, so the figure understates real spend
};

type AdminUsageMetrics = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  weightedTokens: number;
  toolCalls: number;
  cost: AdminUsageCostSummary;
  creditRequests: number; // paid with credit
  allowanceRequests: number; // free allowance
  creditSpendMicroUsd: string;
  lastSeenAt: string | null;
};

type AdminUsageUserRow = AdminUsageMetrics & {
  userId: string;
  email: string | null;
  username: string | null;
  role: string | null;
};
type AdminUsageGroupRow = AdminUsageMetrics & {
  key: string;
  label: string;
  provider: string | null;
  providerLabel: string | null;
  model: string | null;
  userId: string | null;
  email: string | null;
  username: string | null;
};
type AdminUsagePage<T> = {
  from: string;
  to: string;
  generatedAt: string;
  sort: string;
  order: 'asc' | 'desc';
  limit: number;
  items: T[];
  nextCursor: string | null;
};

// GET /users
type AdminUsageUsersPage = AdminUsagePage<AdminUsageUserRow> & { matchedUsers: number };
// GET /users/export
type AdminUsageExport = {
  items: AdminUsageUserRow[];
  truncated: boolean;
  from: string;
  to: string;
}; // max 5000 rows
// GET /leaderboard
type AdminUsageLeaderboardPage = AdminUsagePage<AdminUsageGroupRow> & {
  dimension: 'provider' | 'model' | 'workflow' | 'user';
};

type AdminUsageSeriesPoint = AdminUsageMetrics & { bucketStart: string };
// GET /timeseries
type AdminUsageTimeseries = {
  from: string;
  to: string;
  generatedAt: string;
  grain: 'HOUR' | 'DAY';
  totals: AdminUsageMetrics;
  series: AdminUsageSeriesPoint[];
};

type AdminUsageRequestRow = {
  id: string;
  at: string;
  provider: string;
  providerLabel: string;
  model: string;
  workflow: string;
  status: string; // RESERVED | FINALIZED
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  weightedTokens: number;
  toolCalls: number;
  costMicroUsd: string;
  costKind: UsageCostKind;
  billing: UsageBillingKind;
};
// GET /users/:userId/requests
type AdminUsageRequestsPage = AdminUsagePage<AdminUsageRequestRow>;

// GET /users/:userId
type AdminUserConsumptionDetail = {
  user: { userId: string; email: string; username: string; role: string; status: string };
  from: string;
  to: string;
  generatedAt: string;
  grain: 'HOUR' | 'DAY';
  filters: {
    provider: string | null;
    model: string | null;
    workflow: string | null;
    billing: UsageBillingKind | null;
  };
  totals: AdminUsageMetrics;
  models: AdminUsageGroupRow[]; // max 50, by cost
  providers: AdminUsageGroupRow[];
  workflows: AdminUsageGroupRow[];
  breakdownTruncated: boolean; // a table hit its 50 row cap; use /leaderboard with userId for the rest
  series: AdminUsageSeriesPoint[];
  heaviestRequests: AdminUsageRequestRow[]; // top 10 by tokens
  filterOptions: {
    providers: Array<{ value: string; label: string }>;
    models: string[];
    workflows: string[];
  }; // unfiltered, max 100 each
};
```

### How `costKind` is decided (per ledger row, then per group)

| Row condition                             | Kind                                     |
| ----------------------------------------- | ---------------------------------------- |
| `actual_cost_micro_usd > 0`               | `PRICED`                                 |
| no actual, `estimated_cost_micro_usd > 0` | `FALLBACK` (an estimate, show it as one) |
| neither, user role is `ADMIN`             | `UNMETERED` (show "unmetered (admin)")   |
| neither                                   | `UNPRICED` (show "no price", not `$0`)   |

Group kind: any `FALLBACK` row makes it `FALLBACK`, else any `PRICED` row makes it `PRICED`, else `UNPRICED`, else
`UNMETERED`. `partial` is true when priced or estimated rows sit beside unpriced or unmetered ones. The PAYG hold row
stores `estimated = 0` until it settles, so its cost appears as `actual` once settled.

### Audit events

auth-service publishes `admin.usage.viewed` and `admin.usage.exported` (RabbitMQ). audit-service writes
`ADMIN_USER_USAGE_VIEWED` and `ADMIN_USER_USAGE_EXPORTED` audit rows: `userId` = acting admin, `entityType` = `user`,
`entityId` = target user id, severity `MEDIUM`, `details` = `{ filters, at }`. Filters hold the window, provider, model,
workflow, billing and (export) search text and row count. The payload never contains an email. Publishing is best
effort: a broker failure is logged and does not block the read.
The users list and leaderboard (`dimension=user`) also return full emails but write no event, to avoid one row per
keystroke; the per-user open is the audited boundary.

## audit-service (Mongo)

Permissions: `ADMIN_SYSTEM_VIEW` for failures, `ADMIN_USAGE_VIEW` for tracing.

### `GET /api/v1/audits/failures`

Query: `hours` (1-720, default 24), `includeSync` (`true|false`, default `false`), `search` (action or source),
`sort` = `count|lastSeen`, `order`, `page`, `limit`.

Failures are audit rows with severity `HIGH` or `CRITICAL` inside the window. `SYNC_*` workspace-sync actions are
counted separately as `syncNoise` and left out of the groups unless `includeSync=true`.

```ts
type FailuresResponse = {
  from: string;
  to: string;
  hours: number;
  includeSync: boolean;
  totals: { failures: number; syncNoise: number };
  groups: {
    items: Array<{
      action: string;
      source: string;
      severity: string;
      isSyncNoise: boolean;
      count: number;
      lastSeenAt: string;
    }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  bySource: Array<{ key: string; label: string; count: number }>;
  topProviders: Array<{ key: string; label: string; count: number }>;
  topModels: Array<{ key: string; label: string; count: number }>;
};
```

Indexes added on `audit_logs` (Mongoose creates them at startup): `{ createdAt: -1 }`,
`{ severity: 1, createdAt: -1 }`, `{ action: 1, createdAt: -1 }`; on `usage_ledger`: `{ action: 1, createdAt: -1 }`.
Every pipeline starts with a `$match` on the window and has a 20 s `maxTimeMS`.

### `GET /api/v1/usage/tracing`

Query: `hours` (1-720, default 24), `dimension` = `provider|model|context`, `search`, `sort` = `requests|p95|tokens`,
`order`, `page`, `limit`. Reads `usage_ledger` rows with action `message.completed` (metadata only).

```ts
type TracingResponse = {
  from: string;
  to: string;
  hours: number;
  dimension: 'provider' | 'model' | 'context';
  overall: {
    requests: number;
    measuredRequests: number;
    p50LatencyMs: number | null;
    p95LatencyMs: number | null;
  };
  rows: {
    items: Array<{
      key: string;
      label: string;
      provider: string | null;
      model: string | null;
      requests: number;
      measuredRequests: number;
      avgLatencyMs: number | null;
      p50LatencyMs: number | null;
      p95LatencyMs: number | null; // approximate percentiles
      totalTokens: number;
      providerReportedRequests: number;
      estimatedRequests: number; // token counts reported by the provider vs estimated
      failureEvents: number | null;
      errorRate: number | null; // null for dimension=context
    }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  signals: Array<{ action: string; count: number }>; // retry / fallback / circuit-breaker / rate-limit audit events
};
```

`errorRate = failureEvents / (requests + failureEvents)`. It is an approximation: failures come from HIGH/CRITICAL
audit events that carry `details.provider` or `details.model`, requests from the usage ledger, and the two stores are
not joined per request. Failed requests that never reach the ledger are counted only as failure events. Retry and
fallback counts are the audit events whose action contains `FALLBACK`, `RETRY`, `CIRCUIT_BREAKER` or `RATE_LIMITED`; a
per-request retry count is not stored.

## Known limits

- The legacy page widgets (`/usage/summary`, `/usage/cost`, `/usage/latency`) are unchanged and still all-time with a
  flat cost rate. The frontend should stop using them in favour of the routes above.
- `weighted_usage_records` has no latency column, so latency comes from the audit store only.
- `/admin/usage-analytics` (the older overview) still masks emails in `topUsers`; use `/admin/usage-explorer/leaderboard?dimension=user`.
- Unmetered detection is by account role (`ADMIN`); the ledger has no explicit flag.
