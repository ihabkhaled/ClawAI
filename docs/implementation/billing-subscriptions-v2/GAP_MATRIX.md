# Gap matrix — Billing & Subscription Hardening v2

Requirement IDs are from `reference/REQUIREMENTS.md` (R1–R9) and the kickoff prompt
(A–E). Status is measured **against the code**, not against documentation.

Legend: ✅ done · 🟡 partial (primitive exists, behaviour missing) · ❌ missing ·
*present is not wired* — a repository method with no callers counts as missing.

---

## R1 / A — Cooling-off refund (full refund through `capturedAt + 48 h`)

| Dimension | Today | Required change |
| --- | --- | --- |
| Eligibility rule | ❌ none | New `RefundEligibilityService` in payment-service using `PaymentTransaction.capturedAt`; boundary inclusive at exactly 48 h |
| Policy source | ❌ none | `billing.refund.cooling_off_hours` (default 48) + `cooling_off_mode` on the plan policy revision |
| Self-service API | ❌ admin-only (`admin/billing/refunds`, `ADMIN_PLANS_MANAGE`) | `GET /billing/refunds/eligibility` (preview) + `POST /billing/refunds` bound to the authenticated principal |
| Client-supplied amount | ⚠️ `CreateRefundDto.amountMinor` is client-supplied | Self-service path must derive amount server-side; admin path keeps an explicit, audited override |
| Refund state machine | 🟡 3 states (`PENDING/SUCCEEDED/FAILED`) | 8 states; split request / eligibility / approval / provider submission / confirmation |
| Idempotency | ✅ `@@unique([requestedByUserId, idempotencyKey])` | Re-scope to the **subject** user for self-service |
| Over-refund barrier | ✅ reservation + DB constraint | Reuse unchanged |
| Entitlement effect | ✅ `rules/28` policy implemented | Reuse unchanged |
| Migration | — | Refund status enum expansion; `eligibility_*`/`approval_*` columns; policy revision table |
| Errors | ❌ | `REFUND_WINDOW_EXPIRED`, `PAYMENT_NOT_REFUNDABLE`, `REFUND_ALREADY_COMPLETE`, `REFUND_IN_PROGRESS`, `REFUND_PROVIDER_REJECTED`, `REFUND_REQUIRES_REVIEW`, `FORBIDDEN_RESOURCE`, `STALE_SUBSCRIPTION_STATE` |
| UI | ❌ | Customer refund request + status in `(portal)/billing`; 13 locales |
| Extension | n/a | — |
| Tests | ❌ | REF-001…REF-005 + 47:59:59.999 / exactly 48 h / +1 ms boundaries |
| Rollout | ❌ | Flag `billing.refund.coolingOff.enabled` |

## R2 / B — Unsubscribe & remove-plan settlement

| Dimension | Today | Required change |
| --- | --- | --- |
| Cancel at period end | ✅ `cancelAtPeriodEnd()` + `resume()` | No change |
| Immediate cancel | ⚠️ `endNow()` = forfeiture, **no refund** | Settlement workflow: full refund inside window, unused-prorated after |
| Settlement calculator | ❌ | Reuse `calculateRemainingRatioScaled`; cap by remaining refundable balance |
| Typed policy | ❌ | `FULL_WITHIN_COOLING_OFF_THEN_UNUSED_PRORATED` (default), `…_THEN_NO_REFUND`, `FULL_ALWAYS`, `CREDIT_ONLY_AFTER_COOLING_OFF` |
| Preview before confirm | ❌ | Backend-generated cancellation preview (effective time, amount, currency, access end, warnings) |
| Original method | ✅ refunds reference the original capture | No raw credentials — already structurally impossible |
| Concurrency | 🟡 `version` CAS exists | Serialize cancel against upgrade/renewal/refund/dispute |
| Admin plan removal | ✅ `PlanRetirementMigration`, no hard delete | Add impact preview + elevated permission + reason |
| Migration | — | Cancellation policy columns; settlement linkage on `Refund` |
| UI | 🟡 cancel exists | Preview modal + settlement disclosure; 13 locales |
| Tests | ❌ | CAN-001…CAN-003, renewal-races-cancel, cancel-races-upgrade |

## R3 / C — Upgrade by unused credit with a fresh cycle

| Dimension | Today | Required change |
| --- | --- | --- |
| Calculator | ⚠️ **wrong mode** — charges `target×ratio − current×ratio` (334¢ for the canonical case) | Add `RESET_CYCLE_WITH_UNUSED_CREDIT`: `target_full − unusedCredit` = **667¢** |
| Cycle reset | ❌ period end preserved | New full period starts after successful payment |
| Mode selection | ❌ no mode concept | Typed `ProrationMode` on the plan policy revision; keep the existing mode available |
| Credit surplus | ❌ | Carry as non-withdrawable billing credit (new ledger), never cash |
| Quote contract | 🟡 server-owned, expiring, single-use, CAS-consumed | Add `calculatorVersion`, `policyRevision`, explicit line items, `newPeriodStart/End` |
| Line items | ❌ quote stores scalars | Persisted line items summing exactly to `amountDueMinor` |
| Cross-currency | ✅ rejected (`CURRENCY_UNSUPPORTED`) | No change |
| Migration | — | `proration_quotes` mode/calculator/policy columns + line-item table; billing credit ledger |
| UI | 🟡 quote shown | Show old price, used, unused credit, new full price, due now, new renewal date, quote expiry |
| Tests | 🟡 `proration.service.spec.ts` exists | Table-driven 28/29/30/31-day months, leap years, second boundaries, rounding edges, concurrent acceptance; **lock the 667¢ case** |

## R4 — Payment security

| Dimension | Today | Required change |
| --- | --- | --- |
| Tenant/subject binding | ✅ derived from verified auth | Re-verify on new endpoints |
| Server-resolved price | ✅ immutable version rows | Extend to refund/settlement amounts |
| Webhook signature + dedupe | ✅ | Add timestamp tolerance + provider-account/environment assertions if absent |
| Idempotency | ✅ | Extend to new operations |
| Secret handling | ✅ AES-256-GCM, AAD-bound, key-versioned | No change |
| Log redaction | ✅ machine codes only | Add automated sensitive-log test (SEC-001) |
| Rate limiting / abuse | 🟡 `@nestjs/throttler` present | Per-subject refund/checkout abuse limits, repeat subscribe-use-refund detection |
| IDOR tests | ❌ | Automated cross-user/cross-tenant suite |

## R5 / D — Backend-authoritative quotas

| Dimension | Today | Required change |
| --- | --- | --- |
| Multi-window atomic reserve | ✅ `reserveWeighted` Lua (day/week/month/cost/concurrency/chats/messages) | Reuse as the one admission path |
| Runtime admission | ⚠️ `RuntimeAdmissionService` Lua enforces **daily only** | Route through the weighted engine so all windows apply |
| Legacy `reserve()` | ⚠️ INCRBY→check→DECRBY | Retire in favour of the Lua path |
| Per-request bounds | ❌ | `ai.request.max_{input,output,total}_tokens`; pass bounded `maxOutputTokens` to the provider |
| Spend limits | 🟡 `monthlyProviderCostCeilingMicroUsd` exists | Expose as a typed entitlement with reset semantics |
| `entitlementRevision` | ❌ | Monotonic revision that changes whenever effective access changes |
| `resetAt` | 🟡 TTL-based daily reset | Return exact server-owned `resetAt` per window |
| Stable error codes | ❌ | `DAILY_LIMIT_EXCEEDED`, `WEEKLY_…`, `MONTHLY_…`, `REQUEST_TOKEN_LIMIT_EXCEEDED`, `CONCURRENCY_LIMIT_EXCEEDED`, `MODEL_NOT_ALLOWED`, `PROVIDER_NOT_ALLOWED`, `SPEND_LIMIT_EXCEEDED`, `ENTITLEMENT_REVISION_STALE`, `FEATURE_NOT_ENTITLED`, `PLAN_INACTIVE` |
| Ledger | ✅ `WeightedUsageRecord`, `FeatureUsageRecord`, `TokenUsageLedger` | Reuse |
| Tests | ❌ | QTA-001…QTA-003 concurrency at the last token |

## R6 / E — Plan entitlements catalog

| Dimension | Today | Required change |
| --- | --- | --- |
| Price immutability | ✅ `PlanPriceVersion` | No change |
| Plan version immutability | ❌ plan feature/quota columns mutable in place | `draft → published → deprecated → archived`; published versions immutable |
| Typed catalog | 🟡 `PlanFeatureKey` (10 keys) + `PlanFeatureRule` | Registry with key, type, unit, range, default, dependencies, conflicts, sensitivity, deprecation |
| Duplicate representations | ⚠️ `Plan.allow*` booleans **and** `PlanFeatureRule` both live | Adapter from legacy → typed keys; shadow-compare, then cut over |
| Coding-agent entitlements | ❌ | `coding_agent.*` keys (shell/git/browser/container/mcp/subagents/…) |
| Migration | — | Plan version table + resolved entitlement snapshot; backfill each plan to behaviour-equivalent `v1` |
| Tests | ❌ | Catalog schema, dependency graph, unknown-key fail-safe, MIG-001 rerun idempotency |

## R7 — RBAC

| Dimension | Today | Required change |
| --- | --- | --- |
| Billing permissions | ❌ **zero** (refunds gated by `ADMIN_PLANS_MANAGE`) | ~30 `billing.*` / `plans.*` / `usage.*` / `roles.*` / `audit.*` permissions |
| Role catalog | 🟡 generic `Role`/`RolePermission` | `refund_reviewer`, `billing_operator`, `finance_auditor`, `security_auditor`, `plan_catalog_manager`, org billing roles |
| Separation of duties | ❌ | Requester ≠ approver; dual control above threshold; persisted approval evidence |
| Step-up auth | ❌ | For payment-method change, large refunds, manual credits |
| Tests | ❌ | RBAC-001, RBAC-002 + per-endpoint negative matrix |

## R8 — Admin plan forms

| Dimension | Today | Required change |
| --- | --- | --- |
| Plan CRUD | ✅ `admin/plans/*` (new, edit, prices, model-access) | Extend |
| Lifecycle workflow | 🟡 active/retired | draft → clone → validate → preview → publish → deprecate → archive → migrate |
| Policy section | ❌ | Cooling-off hours/mode, cancellation mode, proration mode, credit carry-forward, review threshold |
| Impact preview | ❌ | Subscribers affected, expected credits/refunds, feature-loss warnings, migration batches |
| Optimistic concurrency | ❌ on plan edit | Version field + stale-edit rejection |
| Tests | ❌ | ADM-001, ADM-002 + component/contract/E2E/a11y/i18n/RTL |

## R9 — Quality, observability, rollout

| Dimension | Today | Required change |
| --- | --- | --- |
| Test layers | 🟡 strong unit/repo coverage | Migration, contract, concurrency, abuse, failure-injection |
| Metrics/alerts | ❌ billing-specific | Per `15_OBSERVABILITY…` |
| Runbooks | 🟡 `docs/11-runbooks/` | Add duplicate payment, stuck refund, reconciliation mismatch, quota leak |
| Feature flags | ❌ | Server-controlled flags per `16_ROLLOUT…` |
| Shadow mode | ❌ | Old vs new refund/upgrade side-by-side before cutover |

---

## Extension (ClawAI-Coding-Agent) — R5/09

| Dimension | Today | Required change |
| --- | --- | --- |
| Entitlement snapshot | 🟡 `/auth/me/entitlements` + `/auth/me/usage` | Add revision, expiry/ETag, limits, allowed models/providers/tools, per-request bounds, `resetAt` |
| Admission | ⚠️ `RequestAdmissionService` is **local only** (account epoch + workspace scope) — no backend reservation | Preflight backend admission; apply server-returned bounds |
| Authority | ✅ cloud work runs through `/chat-messages*` → chat-service chokepoint | Keep; never let cached data raise an allowance |
| Cache binding | 🟡 `AccountEpoch` invalidates on account change | Bind to subject, tenant, epoch, backend origin, entitlement revision |
| Offline policy | ❌ explicit policy | Local-only offline permitted; paid cloud fails closed after bounded grace |
| UX | ❌ | Plan name, per-window remaining, exact reset time, warnings, upgrade action, restriction reasons |
| Tests | 🟡 suites exist | EXT-001…EXT-003 + stale snapshot, wrong tenant, boundary, concurrent runs, downgrade mid-session |

---

## Corrections to the pack's own assumptions

1. The two repositories are **superproject + submodule**, not siblings.
2. `reference/ARCHITECTURE_MAP.md` shipped as an all-`TBD` template; corrected in
   [BASELINE.md §3](BASELINE.md).
3. The pack's canonical upgrade example (667¢) **disagrees with shipped behaviour**
   (334¢). This is a deliberate policy change, not a bug fix — it must ship behind a
   flag with shadow comparison.
4. Most `02`, `03`, `07`, `13` primitives already exist and must be **extended**, not
   created. Building parallel subsystems is explicitly prohibited by the pack and by
   `rules/09`.
5. The coding agent uses **Vitest**, not Jest — pack test commands need adapting.
