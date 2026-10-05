# Skill — add a dimension to admin usage analytics

Runbook for showing one more thing (a new tool, a new cost split, a new filter) in the admin
"Usage and consumption" modal or the Observability "Platform usage" section.

## Where the numbers come from (audit, 2026-10-05)

| Dimension                                                                       | Source (auth-service DB)                                                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| model, provider/connector, workflow, input/output tokens, tool call COUNT, cost | `weighted_usage_records`                                                                      |
| paid with credit / free allowance / wallet micro-USD                            | `is_payg`, `is_free_allowance`, `credit_*_micro_usd` on the same row                          |
| named gated tools (web search, fetch, file generation...)                       | `feature_usage_records` (`state = CONSUMED`)                                                  |
| free allowance used vs limit                                                    | `credit_free_allowance_usage` (`provider = '*'`) + plan `creditConnectorFreeRequestsPerMonth` |

Per-tool NAMES for in-answer tool calls and image generation are NOT stored: only a count.
Adding them needs a new column written by the chat/image path, not a read-side change.

## Steps

1. Aggregate an EXISTING column first. Add a method to
   `apps/claw-auth-service/src/modules/admin-statistics/repositories/admin-usage-analytics.repository.ts`
   with a `LIMIT`, parameterised SQL, `state <> 'RELEASED'`, and the half-open `created_at` window.
2. Never read another service's database. If the dimension lives elsewhere, call it over HTTP or consume an event.
3. Add the wire type to `packages/shared-types/src/types/admin-usage-analytics.type.ts`, then rebuild shared-types.
4. Keep the range rules in `utilities/usage-range.utility.ts` (90-day cap rejected, hourly up to 7 days).
5. Money is a micro-USD decimal STRING; render with `formatMicroUsd`. `null` = unlimited, `0` = disabled.
6. Frontend: component (TSX only) under `components/admin/usage-analytics` or
   `components/observability/usage-analytics`; period logic in `utilities/usage-analytics.utility.ts`.
7. i18n: one key group, `usageAnalytics`, in `lib/i18n/locales/usage-analytics-translations.ts`
   (13 locales) plus `UsageAnalyticsLocaleTranslation` in `i18n.types.ts`. The translation test
   fails on a missing key or a lost `{placeholder}`.
8. Tests at every layer, `npm run knowledge:build`, `npm run audit`, a `docs/qa-evidence` record.

Related: `apps/claw-auth-service/CLAUDE.md` (Admin per-user statistics),
`docs/04-backend/service-guide-auth.md`, `context/permission-map.md`.
