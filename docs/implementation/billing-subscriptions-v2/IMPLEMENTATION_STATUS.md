# Billing and subscription hardening — implementation status

**Program:** `clawai-billing-subscription-hardening-prompt-pack` v1.0.0
**Branch:** `feat/billing-subscription-hardening-v2` (both repositories)
**Last updated:** 2026-08-07 — end of Phase 01

## Requirement status

| Requirement | Status | Backend | Admin/customer UI | Coding Agent | Tests | Evidence/Risk |
|---|---|---|---|---|---|---|
| R1 48-hour refund | **Not started** — gap confirmed | absent (`capturedAt` exists as foundation) | absent | N/A | absent | Zero grep hits for cooling-off/48h anywhere |
| R2 Cancellation settlement | **Not started** — conflict confirmed | `endNow()` forfeits with no refund | cancel exists, no preview | N/A | `subscription-cancel.service.spec.ts` (current behaviour) | Shipped behaviour contradicts required policy |
| R3 Upgrade unused credit | **Not started** — wrong mode confirmed | `calculateProration` = keep-cycle prorated diff | quote shown | N/A | `proration.service.spec.ts` (current behaviour) | Canonical case yields 334¢; pack requires 667¢ |
| R4 Payment security | **Partially pre-existing** | signature+dedupe+idempotency+encryption ✅ | — | — | strong unit coverage | Client-supplied `amountMinor` on admin refund |
| R5 Quota (D/W/M/req/concurrency) | **Partially pre-existing** | `reserveWeighted` Lua multi-window ✅; runtime admission daily-only ⚠️ | usage view exists | display-only | absent for concurrency | Two admission paths must converge |
| R6 Typed entitlements | **Partially pre-existing** | `PlanFeatureRule` + `PlanPriceVersion` ✅; plan versions mutable ❌ | plan forms exist | absent | absent | Dual representation: `Plan.allow*` vs `PlanFeatureRule` |
| R7 RBAC | **Not started** | zero billing permissions | — | N/A | absent | Refunds gated by `ADMIN_PLANS_MANAGE` |
| R8 Admin plan workflow | **Partially pre-existing** | plan CRUD ✅; lifecycle/policy/impact ❌ | `admin/plans/*` | N/A | `plans.repository.test.ts` | No draft/publish, no impact preview |
| R9 Webhook/idempotency/reconciliation | **Largely pre-existing** | outbox/inbox/dedupe/reconciliation ✅ | — | N/A | good coverage | Add tolerance/account assertions + replay tests |
| R9 Observability/rollout | **Not started** | — | — | — | — | No billing metrics/alerts/flags |

## Phase log

### Phase 01 — Repository discovery and baseline ✅ Complete

- **Date:** 2026-08-07
- **Repositories/branches:** ClawAI `feat/billing-subscription-hardening-v2` @ `1c352455`;
  ClawAI-Coding-Agent (submodule) `feat/billing-subscription-hardening-v2` @ `7a571312`.

**Completed requirements:** none (discovery phase — no behavioural change by design).

**Changed files:**

- `docs/implementation/billing-subscriptions-v2/BASELINE.md` (new)
- `docs/implementation/billing-subscriptions-v2/GAP_MATRIX.md` (new)
- `docs/implementation/billing-subscriptions-v2/IMPLEMENTATION_STATUS.md` (new)
- `docs/implementation/billing-subscriptions-v2/DECISION_LOG.md` (new)
- `apps/claw-coding-agent/docs/BILLING_ENTITLEMENT_INTEGRATION_STATUS.md` (new, submodule)
- Pack `reference/ARCHITECTURE_MAP.md` corrected in place (outside both repositories)

**Migrations:** none.

**Tests run:** none — this phase changed no code. Documentation-only commits do not
trigger the per-workspace `tsgo/lint/test/build` lane; that lane starts with Phase 02.

**Security evidence:** the pack's eleven "must fail loudly" baseline checks were each
evaluated against code (BASELINE §4). Eight pass; three are recorded as findings:

1. *Medium* — `Plan.priceMonthly/priceYearly` are `Decimal(12,2)`, duplicating the
   authoritative `PlanPriceVersion.amountMinor`. Drift hazard, not currently a wrong
   charge (payment-service reads only the version rows).
2. *Medium* — `POST /admin/billing/refunds` accepts a client-supplied `amountMinor`.
   Admin-gated and permission-checked, but a money value crossing the trust boundary.
3. *Low* — `Plan.allow*` booleans and `PlanFeatureRule` both express feature access.

None are Critical/High. None block Phase 02.

**Assumptions:**

- A1 — The pack's 667¢ upgrade example is an intended **policy change**, not a bug
  report against the shipped 334¢ calculator. Shipping it behind a flag with shadow
  comparison, keeping the existing mode selectable.
- A2 — "Tenant" maps to ClawAI's user/workspace model; there is no separate tenant
  entity today. Organization/seat requirements are design-only until a product decision.
- A3 — No new commercial prices will be invented (pack rule 8 + `rules/28`).

**Remaining risks:**

- The three headline behaviours (R1–R3) are financial policy changes, not refactors.
  Each needs legal/product sign-off before enabling in production.
- The submodule pointer must be committed in the superproject for every extension
  change, or CI will build a stale extension.

**Next phase:** Phase 02 — domain model, state machines, and invariants
(`02_DOMAIN_MODEL_AND_INVARIANTS.md`).

### Phases 02–17 — Not started

No code, schema, contract, UI, extension, test, or infrastructure change has been made.
