# Billing & Subscription Hardening v2 — Baseline

> Phase 01 output of the `clawai-billing-subscription-hardening-prompt-pack` (v1.0.0,
> generated 2026-08-07). This document records **what exists today**, verified against
> the code — not what the pack assumed. Gaps live in [GAP_MATRIX.md](GAP_MATRIX.md);
> decisions in [DECISION_LOG.md](DECISION_LOG.md); progress in
> [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## 1. Workspace and branch baseline

| Repository | Location | Kind | Branch | Base commit |
| --- | --- | --- | --- | --- |
| ClawAI | `D:/Freelance/Claw/.worktrees/billing-subscription-hardening-v2` | git worktree of `D:/Freelance/Claw` | `feat/billing-subscription-hardening-v2` | `1c352455` off `main` |
| ClawAI-Coding-Agent | `…/apps/claw-coding-agent` | **git submodule** (`https://github.com/ihabkhaled/ClawAI-Coding-Agent.git`) | `feat/billing-subscription-hardening-v2` | `7a571312` off `main` (v0.52.0) |

The pack assumed two independently discovered sibling repositories. **It is one
superproject plus a submodule.** Every coding-agent change therefore needs a commit in
the submodule *and* a pointer commit in the superproject. Both worktrees were clean at
branch creation; no local work was discarded.

Toolchain (from `package.json`, confirmed):

- Payment/auth services: NestJS 11, Prisma 7 + `@prisma/adapter-pg`, Zod 4, Jest 30,
  build via `tsgo` + `tsc-alias` (never `tsc`/`nest build`), lint `eslint --max-warnings 0`.
- Coding agent: esbuild bundle, `tsc --noEmit` typecheck, **Vitest** (not Jest),
  Playwright, `npm run check` as the composite gate.
- Migrations: `prisma migrate dev` (dev) / `prisma migrate deploy` (deploy), one folder
  per timestamped migration.

## 2. The system that already exists

The pack's framing ("upgrade the existing platform") understates it. ClawAI already
runs a mature, largely correct billing core. The following are **implemented and
verified present**, and must be extended rather than rebuilt:

| Primitive | Where | Evidence |
| --- | --- | --- |
| Integer minor-unit money | everywhere in payment-service | `schema.prisma` header convention; `amount_minor` columns; `subtotalMinor`… |
| Immutable price versions | auth `PlanPriceVersion` | `activeKey` emulated partial-unique index; a change mints a new version |
| Transactional outbox / inbox | payment `OutboxEvent`/`InboxEvent`, auth `EntitlementInboxEvent` | enqueued in the same `$transaction` as the state change |
| Webhook dedupe + signature record | payment `WebhookEvent` | `@@unique([gateway, providerEventId])`, `payloadHash`, `signatureValid` |
| Request idempotency | payment `IdempotencyRecord` | `@@unique([userId, operation, key])` + `requestHash` mismatch detection |
| Refund over-refund barrier | payment `Refund` + `refund-balance.utility` | `PENDING` reserves; DB rejects aggregate above capture |
| Optimistic concurrency | payment `Subscription.version` | `updateMany({ where: { version } })` compare-and-swap |
| One active subscription per user | payment `Subscription.uniqueActiveKey` | partial unique index on nullable column |
| Server-owned, expiring, single-use quotes | payment `ProrationQuote` + `ProrationService.consume` | conditional `consumeIfActive` — concurrent confirms race, one wins |
| Reconciliation | payment `ReconciliationRun`/`ReconciliationDivergence` | classified divergences with resolution |
| Gateway secret encryption | payment | AES-256-GCM at app layer, AAD-bound, blind indexes, key versioning |
| No card data by construction | payment `PaymentMethod` | no PAN/CVV columns; `last4` is the maximum fragment |
| FX with frozen inputs | payment `FxQuote` | scaled `BigInt` rates, never floats |
| Atomic multi-window quota | auth `QuotaService.reserveWeighted` | single Lua script over day/week/month/cost/concurrency/chats/messages |
| Reserve/commit/release ledgers | auth `WeightedUsageRecord`, `FeatureUsageRecord` | `RESERVED → FINALIZED/CONSUMED → RELEASED` |
| Plan retirement (no hard delete) | auth `PlanRetirementMigration`, `PlanLifecycleStatus` | durable, idempotent provenance |

Gateways implemented: **PayPal** and **Paymob** (`src/modules/gateways/{paypal,paymob}`),
each with adapter, manager, Zod schemas and utilities.

## 3. Source-of-truth map (corrected)

The pack's `reference/ARCHITECTURE_MAP.md` shipped as an all-`TBD` template. Corrected:

| Concern | Owner service | Authoritative store | Read path | Write path |
| --- | --- | --- | --- | --- |
| Plan catalog | auth | `plans` (**mutable row**) | `plans` module; payment reads via `PlanCatalogClient` | admin `plans` module |
| Plan price | auth | `plan_price_versions` (**immutable**) | `PlanCatalogClient.requirePriceVersion` / `requireActivePrice` | new version row only |
| Plan features | auth | `plan_feature_rules` (**mutable**) + legacy `plans.allow*` booleans | `feature-policy.service` | admin plans module |
| Model access | auth | `plan_model_access` + `plans.model_access_mode` | `entitlements.service` | admin plans module |
| Entitlement | auth | `user_plan_assignments` + `users.active_plan_id` | `me-entitlements.controller`, `entitlements-internal.controller` | `entitlement-applier.service` driven by `EntitlementInboxEvent` |
| Subscription | payment | `subscriptions` | `subscription-query.service` | `subscription-lifecycle`, `plan-change`, `subscription-cancel` |
| Payment | payment | `payment_transactions` | `billing-dashboard`, `refund-query` | `billing-record.service`, webhook services |
| Refund | payment | `refunds` | `refund-query.service` | `refund.manager` → gateway adapter → `refund-completion.service` |
| Change quote | payment | `proration_quotes` | `plan-change.service.quote` | `proration.service.quote/consume` |
| Webhook | payment | `webhook_events` | — | `webhooks` module (row written **before** business state) |
| Idempotency | payment | `idempotency_records` | `idempotency` module | scoped by (user, operation, key) |
| Reconciliation | payment | `reconciliation_runs/_divergences` | `reconciliation` module | scheduled + on-demand |
| Token usage | auth | `token_usage_ledger` (daily rollup), `weighted_usage_records` (per-run) | `usage-view.service` | `quota.service` + Redis Lua |
| Feature usage | auth | `feature_usage_records` | `feature-policy.service` | `feature-usage-consumption.service` |
| Runtime admission | auth | Redis (`RUNTIME_ADMISSION_*_LUA`) | — | `runtime-admission.service` |
| RBAC | auth | `roles`, `role_permissions` | `roles` module, `@RequirePermissions` | admin roles module |
| Admin plan UI | frontend | — | `src/app/(portal)/admin/plans/*`, `admin/billing` | `repositories/admin/{plans,refunds,billing-dashboard}.repository.ts` |
| Customer billing UI | frontend | — | `src/app/(portal)/{billing,plan}`, `src/app/(payment)/billing` | `repositories/billing/billing.repository.ts` |
| Coding Agent | extension | backend is authority | `/auth/me/entitlements`, `/auth/me/usage` | cloud work runs through `/chat-messages*` (chat-service chokepoint) |

## 4. Baseline checks the pack requires to "fail loudly"

Each check from `01_REPOSITORY_DISCOVERY_AND_BASELINE.md`, evaluated against the code:

| Check | Result | Evidence |
| --- | --- | --- |
| Money as float/decimal without controlled conversion | ⚠️ **Partial finding** | Payment-service is fully integer. Auth `Plan.priceMonthly`/`priceYearly` are `Decimal(12,2)` — a **legacy display-only duplicate** of the authoritative `PlanPriceVersion.amountMinor`. Two representations of one price is a drift hazard. |
| Client-trusted amount/currency/user/plan | ⚠️ **Partial finding** | Checkout and plan-change derive price server-side from immutable versions (good). **`POST /admin/billing/refunds` accepts a client-supplied `amountMinor`.** Admin-gated, but still a client-authoritative money value. |
| Active plan price mutated in place | ✅ Pass | `PlanPriceVersion` is append-only with `activeKey` retirement. |
| Webhook without verified raw-body signature | ✅ Pass | `signatureValid` recorded; verification in `webhooks` module. |
| Provider event without durable dedupe | ✅ Pass | `@@unique([gateway, providerEventId])`. |
| Refund callable for another user's payment | ✅ Pass (by absence) | No self-service refund endpoint exists at all — see R1 gap. |
| Quota check/increment split into a race | ⚠️ **Partial finding** | `reserveWeighted` is a single Lua script (good). Legacy `QuotaService.reserve` uses INCRBY→check→DECRBY (bounded, but transiently rejects concurrent callers). `RuntimeAdmissionService` Lua enforces **daily only**. |
| Extension treats cached quota as authority | ✅ Pass | Extension only *displays* `/auth/me/usage`; cloud execution is admitted server-side by chat-service. |
| Duplicated/inconsistent plan feature checks | ⚠️ **Finding** | `Plan.allow*` booleans **and** `PlanFeatureRule` both express feature access. The schema comment says the rules table "replaces" the booleans, but both are still populated and read. |
| Active subscription hard-deleted | ✅ Pass | Status transitions only; `PlanRetirementMigration` for plan removal. |
| Raw secrets or payment payloads logged | ✅ Pass | Schema comments enforce "stable machine code only"; payload retained as SHA-256 hash. |

## 5. State machines as they exist today

**Subscription** — `assertTransition` in `common/utilities/subscription-state-machine.utility.ts`
over `SubscriptionStatus`. Supports scheduled cancel (`cancelAtPeriodEnd`), immediate
termination, grace period (`gracePeriodEndsAt`), past-due, scheduled downgrade.

**Refund** — `RefundStatus { PENDING, SUCCEEDED, FAILED }`. Three states. The pack
requires eight (`requested → eligibility_checked → approved → provider_submitted →
pending → succeeded|failed|reversed|rejected`), separating *request*, *approval*,
*execution* and *provider confirmation*. Today request+approval+execution are one call.

**Proration quote** — `ProrationQuoteStatus` with `ACTIVE → CONSUMED/EXPIRED`.

**Plan version** — prices version (`draft`→ n/a; active/retired). Plans themselves have
`PlanLifecycleStatus { ACTIVE, RETIRED }` — no `draft`/`published`/`deprecated`, and
**feature/quota columns on a live plan are mutable in place**.

## 6. The three headline behavioural gaps (verified by grep + code read)

### A — 48-hour cooling-off refund: **absent entirely**

`grep -rniE "cooling.?off|48.?hour|REFUND_WINDOW"` over `apps/`, `packages/`, `docs/`
returns **zero matches**. There is no capture-time eligibility rule, no eligibility
preview endpoint, and no self-service refund path. `RefundController` is
`@Controller('admin/billing/refunds')` guarded by `ADMIN_PLANS_MANAGE` — refunds are an
operator action only.

`PaymentTransaction.capturedAt` **does exist**, so the provider-confirmed timestamp the
policy needs is already persisted. That is the foundation to build on.

### B — Cancellation settlement: **contradicts the required policy**

`SubscriptionCancelService.endNow()` is documented as "an explicit forfeiture:
entitlement is revoked now" and issues **no refund**. The required policy is: full
eligible refund inside 48 h, unused-prorated refund after. `cancelAtPeriodEnd()` is
correct as-is and needs no change.

### C — Upgrade proration: **wrong mode**

`calculateProration` (`packages/shared-utilities/src/money/proration.utility.ts`)
implements *keep-the-cycle, charge the prorated difference*:

```
unusedCredit  = currentPrice × remainingRatio
targetCharge  = targetPrice  × remainingRatio
amountDue     = max(0, targetCharge − unusedCredit)
```

For the pack's canonical case ($5 → $10, 10 of 30 days) that yields **334¢** and the
period end is unchanged. The required `RESET_CYCLE_WITH_UNUSED_CREDIT` mode yields:

```
unusedCredit = 500 × 20/30 = 333
amountDue    = 1000 − 333  = 667      → and a NEW full period begins
```

**667¢, not 334¢.** Both the calculator and the post-payment period reset are gaps.
`ProrationQuote` already persists `unusedCurrentCreditMinor`, so the credit concept
exists; what is missing is the mode, the full-period target charge, and the cycle reset.

## 7. RBAC baseline

`Permission` (`packages/shared-types/src/enums/permission.enum.ts`) has 24 values across
chat/memory/context/workspace/model/feature-page/admin. **There is not one billing-specific
permission.** Refunds — the highest-risk financial action in the system — are gated by
`ADMIN_PLANS_MANAGE`, the same permission used to edit a plan's display order.

No separation of duties, no dual control, no step-up, no approval records, no
`billing.refund.{request,approve,execute}` split, no finance/support/security roles.

## 8. Test baseline

Payment-service ships ~60 spec files co-located in `__tests__/` (controllers,
repositories, services, managers, utilities), including
`refund-balance.utility.spec.ts`, `proration.service.spec.ts`,
`subscription-cancel.service.spec.ts`, `refund-migration.spec.ts`. Coding agent ships
unit + integration + Playwright + extension-host suites.

Missing, per the pack's acceptance matrix: every REF-*/CAN-*/UPG-* boundary case
(47:59:59.999, exactly 48 h, 48 h + 1 ms), cross-user refund denial, concurrent quote
acceptance, quota-boundary concurrency at the last token, extension account-switch
invalidation, and RBAC negative tests.

## 9. Constraint surface (must hold for every commit)

From root `CLAUDE.md` and `rules/`:

- No `--no-verify`, no `eslint-disable`, no `@ts-ignore`/`@ts-expect-error`, no `any`,
  no `as unknown as`, no `console.log`, no `==`, no non-null `!`.
- No inline `type`/`interface`/`enum`/module-`const` in a logic file — extract per
  `rules/12`.
- Controllers hold no business logic; no Prisma call outside a repository; no
  `process.env` outside `AppConfig`.
- No cross-service database access — HTTP or RabbitMQ only.
- User-facing text needs all 13 locales **as real translations**, plus `i18n.types.ts`.
- Every code change needs a test.
- Gates run **only in touched workspaces**: `npx tsgo --noEmit && npm run lint && npm test && npm run build`.
- One commit, one push; `git log origin/<branch>..HEAD` empty before the next commit.
- `rules/28`: financial history append-only; partial refund preserves access, full
  refund revokes and sets `REFUNDED`; chargeback is distinct and terminal; frontend
  mutation tests assert the **exact serialized body**.

## 10. Delivery-checklist surface

Anything added/renamed must propagate to: `.env.example`, `.env`, `scripts/install.{sh,ps1}`,
all split compose files + GPU overlays, `infra/nginx/nginx.conf`, `packages/shared-constants`,
`packages/shared-types`, `apps/claw-health-service`, `.github/workflows/ci.yml` (build step
**and** per-package matrix in all 4 jobs), `scripts/install-tls.{sh,ps1}` HOSTS, all 13
locales + `i18n.types.ts`, Prisma migration, seeds, tests, frontend types, `docs/`.

## 11. Honest status

This document is **Phase 01 only**. Phases 02–17 (domain model, migrations, refund
policy, cancellation settlement, upgrade proration, security audit, entitlements/quotas,
extension, entitlement catalog, RBAC, admin forms, webhooks, tests, observability,
rollout, final review) are **not started**. Nothing in the product's financial behaviour
has been changed yet.
