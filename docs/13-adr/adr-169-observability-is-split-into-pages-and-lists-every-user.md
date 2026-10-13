# ADR-169: Observability is split into pages and lists every user

**Status:** Accepted

**Date:** 2026-10-13

Extends [ADR-113](adr-113-prometheus-for-operational-metrics.md) (operational metrics) for the admin portal; the data rules of the usage explorer stay as written in `docs/04-backend/admin-usage-explorer-endpoints.md`.

## Context

`/observability` was one crowded page with six tabs. The overview capped "top users" at a `limit` of 5 to 50, so an operator could not see every user in a period, search them, sort them or export them. There was no page for models, providers, plans or product surfaces, and no comparison with the previous period.

## Decision

- **Separate pages under one layout** (`/observability`, `/users`, `/providers[/:provider]`, `/models[/detail]`, `/plans`, `/surfaces`, `/consumption`, `/tracing`, `/failures`) driven by one URL-based filter bar (period, provider, model, plan, workflow, billing, user).
- **A new endpoint family, `GET /api/v1/admin/observability/*`** in auth-service (`overview`, `filter-options`, `health`, `users`, `users/export`, `providers`, `providers/:provider`, `models`, `models/detail`, `plans`, `workflows`). The old `usage-explorer` keyset routes stay: the per-user dialog and the existing tabs still use them. The new lists use `page` + `limit` (1-100) with a `total`, because a numbered table is what the owner asked for. `page` is capped at 10,000 so OFFSET stays bounded.
- **No top-N.** Every list covers all matching rows. The hub previews take a user-chosen size; "View all N" opens the full list.
- **Data is `weighted_usage_records` only**, aggregated by SQL over existing columns. Nothing new is stored. The audit-service latency and failure data stay on the tracing and failures pages.
- **Emails.** Only the users list and its export return the full address, and both are audited (`admin.usage.listed`, `admin.usage.exported`). Unlike the explorer, EVERY users list request is audited (any page, any search; the payload carries `page`, `limit`, `search` and `rows`), because a numbered table lets an operator read the whole address book page by page and the audit trail must show that. The spec said "masked like the existing mapper"; the code already returns full emails on the audited explorer users list, and a users table with email search is unusable masked, so the audited rule is kept. Every other block (provider and model detail, plans) masks.
- **Honest labels.** `weighted_usage_records` has no latency or HTTP status column. "Settle time" is `finalized_at - created_at` (reserve to settle, including queueing and tool loops), "settle rate / refund rate" is settled vs released holds. Neither is shown as provider latency or an HTTP success rate. Health queries are the only ones that read RELEASED rows. EVERY window read (lists, totals, people, series, signups, counts, activity, billing, health, filter options, detail) runs in its own transaction under `SET LOCAL statement_timeout = 15000`, and a page fans its reads out in batches of at most six (the overview in two batches of six, a detail page in two) so one page cannot hold a dozen pooled connections at once.
- **Settle time skips legacy rows.** Rows written before the reservation flow have `request_id = reservation_id` and a `finalized_at` about equal to `created_at`; they would pull every percentile to zero. The settle-time metrics (avg, p50, p95) only read rows where `request_id <> reservation_id`; the finalized / released counts and the settle / refund rates still read every row.
- **Plans are keyed by the plan the row has, else the user's plan at query time.** `weighted_usage_records.plan_id` is not filled by any writer today (0 of 4765 rows; the credit path hardcodes null), so the plan key, the plan dimension, the plan filter and the plan search all use `COALESCE(w.plan_id, u.active_plan_id)`, and `NONE` means neither exists. For a row with no ledger plan this is the plan the user is on NOW, not the plan at request time; it moves if the user changes plan.
- **Series are zero-filled.** The usage series and the signups series carry a point for every bucket from the first bucket of the window to its end at the range grain (UTC), so a quiet hour or day is an explicit zero, not a gap.
- **Money stays integer micro-USD strings.** Cost per request and per 1k tokens are BigInt divisions rounded half up in the service; shares and changes use basis points. Ratios (cache hit, reasoning share) are plain display numbers.

## Consequences

- Estimate accuracy (`SUM(actual) / SUM(estimated)` over rows with both) is returned null-safe; it is only meaningful while the estimate is kept after settle, which has not been verified against the dev database.
- "New signups" ignores the usage filters (it counts accounts, not usage); the UI says so.
- `population=all` (users with zero usage) is not built; the users list shows users with usage in the period.
- Hour-of-day and day-of-week are UTC.
