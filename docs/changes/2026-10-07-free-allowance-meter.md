# Free allowance: a meter and a price limit (2026-10-07)

**Why.** Owner: the free requests must be a credit meter as well as a count, and expensive models must not be used on the free plan, including by AUTO routing.

**What.** ADR-162. Plan columns `credit_connector_free_budget_micro_usd` and `credit_connector_free_max_model_output_micro_usd`; counter column `spent_micro_usd`; error code `PAYG_MODEL_NOT_IN_FREE_ALLOWANCE`; entitlement field `freeCreditMaxModelOutputMicroUsd`; `message.created` field `freeModelPriceCap`; routing `ModelOutputPriceService` and the free price guard; admin plan form (two dollar fields) and plan list; a "Free credit this month" meter on the credit card; notice and error text in 13 locales.

**Free defaults.** $0.25 a month and models up to $5.00 per million output tokens. Set in the plan catalog, `seed.cjs` and the migration; edit them per plan in the admin plan form.

**Not changed.** Paid plans, the wallet, the per-request ceiling, the kill switch behaviour, models the user picks (routing never swaps them).

## Code paths traced

apps/claw-auth-service/src/modules/credit/services/credit-free-allowance.service.ts
apps/claw-auth-service/src/modules/credit/repositories/credit-free-allowance.repository.ts
apps/claw-auth-service/src/modules/credit/managers/credit-reservation.manager.ts
apps/claw-auth-service/src/modules/entitlements/services/entitlements.service.ts
apps/claw-chat-service/src/modules/chat-messages/utilities/credit-fallback.utility.ts
apps/claw-routing-service/src/modules/routing/services/model-output-price.service.ts
apps/claw-routing-service/src/modules/routing/utilities/free-model-price-guard.utility.ts
apps/claw-frontend/src/components/billing/free-allowance-meter.tsx
apps/claw-frontend/src/components/admin/plans/plan-form.tsx
