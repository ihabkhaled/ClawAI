> # ⚠️ SUPERSEDED — do not implement this stream
>
> **Status:** SUPERSEDED on 2026-08-29 by **ADR-081 — Retire the routing cost-budget scaffold**.
> **Replaced by:** the **auth-service PAYG credit wallet**
> (`docs/03-architecture/payg-credit.md`, `docs/02-business-product/payg-credit-spec.md`).
>
> Per-user spend capping is no longer a routing-service concern. It is owned by
> the auth-service wallet, which extends the reservation that already exists
> (`RESERVE_QUOTA_LUA` + `WeightedUsageRecord`) instead of running a second,
> parallel accounting system beside it (ADR-080).
>
> **Why this stream was retired rather than finished.** It never shipped: the
> module was scaffolded but never registered in `app.module.ts`,
> `spend-tracker.manager.ts` threw `SCAFFOLD-R4` instead of tracking anything,
> `UserCostBudget` was never added to the Prisma schema, and the controller
> carried seven handlers with no `@RequirePermissions` — a landmine for whoever
> eventually wired it up. Meanwhile the real design constraint became clear:
> `MICRO_USD_PER_USD == WEIGHTED_TOKENS_PER_USD`, so a per-user dollar cap and
> the existing `monthlyProviderCostCeilingMicroUsd` are the SAME NUMBER. A
> second cap would simply have raced the first, and the smaller of the two would
> have bound with a different error code from a different subsystem.
>
> `apps/claw-routing-service/src/modules/cost-budget/` was deleted in the same
> change that added this banner. What routing-service keeps is **model prices**
> (`ModelCostVersion`) and **metering its own paid calls** through `PaygMeter` —
> not deciding whether a user may spend.
>
> Kept rather than deleted because `budget-gate.manager.ts:15` cited it, and a
> reader arriving from git history needs to land on the reason, not a 404.
> Everything below is **historical context only**.

# Stream 05 — R.4 Cost Budget Intelligence

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/05_R4_cost_budget_intelligence.md`

## Mission

Stop letting users spend unlimited cloud-model dollars. Add per-user (and optionally per-org) monthly caps; pre-routing gate that blocks cloud calls when over budget; user-visible warnings; free-tier-remaining awareness; admin + user dashboards.

## Files to add (scaffold included)

```
apps/claw-routing-service/src/modules/cost-budget/             (NEW MODULE)
├── cost-budget.module.ts
├── controllers/
│   └── cost-budget.controller.ts
├── services/
│   └── cost-budget.service.ts
├── managers/
│   ├── budget-gate.manager.ts                                  (pre-routing check)
│   ├── spend-tracker.manager.ts                                (post-execution increment)
│   ├── budget-warning.manager.ts                               (80% threshold warnings)
│   └── budget-reset.manager.ts                                 (monthly cron)
├── repositories/
│   └── user-cost-budget.repository.ts
├── dto/
│   ├── create-budget.dto.ts
│   ├── update-budget.dto.ts
│   └── check-budget.dto.ts
├── types/
│   └── budget.types.ts
└── constants/
    └── budget.constants.ts
```

## Prisma migration (see PRISMA_FUTURE_MODELS.md)

`UserCostBudget` + `CostBudgetScope` + `CostBudgetStatus` enums. Backfill: empty.

## Pre-routing budget gate

```typescript
// In RoutingManager.handleAuto() — BEFORE picking cloud provider:

const estimatedCost = estimateRequestCost(context, candidatePrimary);
const budgetCheck = await this.budgetGateManager.check({
  userId: context.userId,
  orgId: context.orgId,
  estimatedCostUsd: estimatedCost,
});

if (budgetCheck.status === 'EXCEEDED' && !budgetCheck.overrideAllowed) {
  // Force local route
  return this.handleLocalOnly(context);
}

if (budgetCheck.status === 'WARN') {
  reasonTags.push('cost_budget_warn');
}
```

## Acceptance criteria

| #   | Test                                               | Expected                                                                 |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | User under budget + cloud request                  | Routes to cloud as normal; spend incremented post-execution              |
| 2   | User at 85% of budget                              | Routes to cloud + `messageKey: 'BUDGET_NEAR_LIMIT'` in response metadata |
| 3   | User over budget without override permission       | Routes to local; `messageKey: 'BUDGET_EXCEEDED_FORCED_LOCAL'`            |
| 4   | User over budget WITH `overrideAllowed=true`       | Routes to cloud + audit log + `messageKey: 'BUDGET_EXCEEDED_OVERRIDDEN'` |
| 5   | Unknown cost (model not in cost table)             | Treat cautiously: assume STANDARD class; if user near budget → block     |
| 6   | Privacy keyword present                            | Privacy beats budget — always local regardless                           |
| 7   | Free tier remaining (when connector exposes it)    | Prefer free-tier-remaining provider for cost wins                        |
| 8   | Budget reset on `resetAt` date                     | Cron at midnight: `currentSpendUsd=0`, `status=OK`, `resetAt += 1 month` |
| 9   | Org budget exceeded but user has personal headroom | Org budget wins (most restrictive)                                       |
| 10  | Cost dashboard at `/settings/budget`               | Shows: monthly cap, spent, trend, projected hit date                     |
| 11  | Admin dashboard at `/admin/cost-budgets`           | List all users + spend + status; filter by org                           |
| 12  | Cost/quality slider (`0=cheapest, 100=best`)       | Affects scoring engine weight                                            |

## Endpoint contract

```http
GET    /api/v1/routing/cost-budget/me            (current user's budget)
GET    /api/v1/routing/cost-budget/me/forecast   (projected hit date + trend)
PATCH  /api/v1/routing/cost-budget/me            (user updates personal cap if allowed)
POST   /api/v1/routing/cost-budget                (admin: create budget for any user/org)
PATCH  /api/v1/routing/cost-budget/:id            (admin: update)
GET    /api/v1/routing/cost-budget                (admin: list all with filters)
POST   /api/v1/routing/cost-budget/check          (internal: pre-routing gate)
```

## Free-tier awareness (blocked on connector-service work)

Stream blocker B2 in master plan. When connector-service exposes `freeTierRemaining`:

```typescript
// Score boost for providers with free tier
if (candidate.freeTierRemaining > 0 && candidate.costClass !== 'FREE') {
  candidate.score += 0.1; // small boost when free tier still available
}
```

## RabbitMQ events

```
cost_budget.created                 { budgetId, scope, ownerId, monthlyCapUsd }
cost_budget.spend_incremented       { budgetId, deltaUsd, totalUsd, percentOfCap }
cost_budget.warning_threshold_crossed { budgetId, percentOfCap }
cost_budget.exceeded                { budgetId, forcedLocal: boolean, overrideUsed: boolean }
cost_budget.reset                   { budgetId, previousSpend, newResetAt }
```

## Frontend

- `/settings/budget` — user page (own budget)
- `/admin/cost-budgets` — admin page (all budgets)
- Warning banner in chat composer when budget at 80%+
- Locked-state in model selector when over budget without override
- "Budget exceeded" empty state with "Switch to local model" CTA

## Rollback

`ROUTING_R4_COST_BUDGET_ENABLED=false` → budget gate skipped; all routes proceed as before. DB rows remain (no destructive change).

## Risks

| #   | Risk                                                         | Mitigation                                                                    |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1   | Cost estimate wrong (token count off)                        | Use generous upper bound; log actual vs estimated for calibration             |
| 2   | Race condition: 2 concurrent requests both pass budget check | Increment is post-execution; minor over-cap acceptable; weekly cleanup script |
| 3   | User can't access their work near reset                      | "Override" toggle for "this 24h period"                                       |
| 4   | Privacy keyword + over-budget conflict                       | Privacy always wins — never expose data to cloud even if user opts in         |
