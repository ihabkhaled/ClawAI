# ADR-078: PAYG connector credit is the promoted provider-cost ceiling, not a new column

**Status**: Accepted
**Date**: 2026-08-29
**Deciders**: ClawAI core team
**Slice**: Pay-as-you-go connector credit (PAYG flagship)

## Context

The product needs a visible dollar allowance: a user should see what their plan
gives them each month for paid cloud inference, watch it fall, buy more, and be
refused politely at zero while local models keep working.

The obvious implementation is a new `Plan.monthlyPaygCreditMicroUsd` column and a
new wallet enforced beside the existing quota system. **That is wrong, and the
reason is a single line of arithmetic.**

`packages/shared-constants/src/billing.constants.ts:13-14`:

```ts
export const MICRO_USD_PER_USD = 1_000_000;
export const WEIGHTED_TOKENS_PER_USD = 1_000_000;
```

`packages/shared-constants/src/billing.constants.spec.ts:26` guards the identity
deliberately — _"This identity is what lets `weightedTokens = ceil(costMicroUsd)`.
If the two ever diverge, every quota in the system silently rescales."_

So **one weighted token is exactly one micro-USD**, and the platform was already
selling a monthly dollar allowance under two names. Before this change,
`prisma/seeders/plan-catalog.json` for the Starter tier read:

```jsonc
"monthlyTokens": 750000,
"costCeilingMicroUsd": "750000",   // byte-identical
```

`monthlyTokenQuota` and `monthlyProviderCostCeilingMicroUsd` were the same number
in the same unit. `RESERVE_QUOTA_LUA` already enforced both, as windows 3 and 4
of its seven (`modules/quota/constants/quota-redis.constants.ts`).

Adding a third column would have created a **third name for one value, with the
smallest of the three binding first**. A Starter user would have read "$1.50
credit, $1.20 remaining" on their billing page and then been refused at $0.75 by
`PROVIDER_COST_BUDGET_EXCEEDED` — a different error code, from a different
subsystem, quoting a number the UI never showed them. That is the same class of
defect [rule 28](../../rules/28-billing-integrity-and-api-contracts.md) already
records live in production once: the Free plan advertising 300,000 tokens a day
against a 20,000 weekly ceiling.

Two further facts shaped the decision:

- `QuotaService.reserveWeighted` and `WeightedUsageRecord` existed and were
  production-grade, but had **zero call sites** outside their own spec. The
  reserve→finalize→release machinery this feature needs was already written and
  simply never wired.
- `monthlyProviderCostCeilingMicroUsd` was documented as permanently invisible.
  `docs/06-data/plan-and-quota-specification.md:64` says _"The cost ceiling is an
  internal profitability control and is never returned to a normal user."_
  `docs/03-architecture/billing-threat-model.md:108` lists _"Learn margins from an
  error → Cost ceilings are internal; error payloads carry stable codes only."_

## Decision

**`Plan.monthlyProviderCostCeilingMicroUsd` becomes the PAYG credit allowance.**
It is promoted from a hidden margin control to the user-visible number, and
backed by a two-bucket wallet (`UserCreditWallet`) so it can be topped up.

No third column. `monthlyTokenQuota` moves in lockstep with the ceiling — same
unit, same number, one source of truth — and the seeders keep them identical by
construction (`prisma/seeders/plan-payg-allowance.seeder.js` moves three quota
columns and the ceiling together, and refuses to let them drift).

### D1 — which providers are pay-as-you-go

All paid cloud providers: `OPENAI`, `ANTHROPIC`, `GEMINI`, `DEEPSEEK`, `GROK`,
`AWS_BEDROCK`. `OLLAMA` and `LLAMACPP` are free. The list in
`PAYG_DEFAULT_PROVIDERS` is only the **default the migration backfills**;
`Connector.isPayAsYouGo` is the runtime authority and is admin-editable
(see [ADR-082](adr-082-payg-classification-grain.md)).

### D2 — the plan allowance, raised on every tier

| plan      | price | ceiling before | ceiling after | % of revenue | delta  |
| --------- | ----: | -------------: | ------------: | -----------: | ------ |
| free      |    $0 |          $0.30 |     **$0.30** |            — | —      |
| starter   |    $5 |          $0.75 |     **$1.50** |          30% | +$0.75 |
| plus      |   $10 |          $1.75 |     **$3.00** |          30% | +$1.25 |
| pro       |   $20 |          $4.00 |     **$5.00** |          25% | +$1.00 |
| team      |   $50 |         $11.00 |    **$12.50** |          25% | +$1.50 |
| scale     |  $100 |         $24.00 |    **$25.00** |          25% | +$1.00 |
| unlimited |  $200 |         $50.00 |    **$50.00** |          25% | —      |

**No user loses allowance.** Every tier goes up or stays equal, which is what
makes this a safe migration of a live entitlement rather than a repricing.

Free keeps $0.30 rather than dropping to $0.00. Its seeded description is _"Try
every frontier model with a small daily allowance"_; $0 makes that copy false and
closes the only funnel the 30-day trial has. Free's previously incoherent
`300,000/day` against a `20,000/week` ceiling (a real enforced allowance of about
$0.02 a week) is replaced by a widening `$0.05 / $0.15 / $0.30`.

### D3 — a two-bucket wallet

`GRANT` is the plan allowance; it resets each period and does **not** roll over.
`PURCHASED` is credit bought with money; it never expires and survives a
downgrade. Debits take GRANT first — spend the perishable half before the money
someone paid for. Refunds return to PURCHASED — returning cash as a bucket that
expires at month end would quietly confiscate it.

### D4 — behaviour at zero

Block PAYG only. Local models keep working, and AUTO routing **degrades to
local** rather than refusing. A user with an empty wallet still has a product.

### D5 — one reservation, not two

PAYG credit extends `RESERVE_QUOTA_LUA` and `WeightedUsageRecord` instead of
adding a parallel system. See [ADR-080](adr-080-one-reservation-not-two.md).

### D6 — the affordability clamp

`maxOutputTokens` is clamped to what the balance can pay for **before** the
provider call, so the hold is ≤ balance by construction:

```
affordableOutput = floor((available − inputCost) / outputRatePerToken)
maxOutputTokens  = min(requestedMax, affordableOutput)
if (maxOutputTokens < PAYG_MIN_VIABLE_OUTPUT_TOKENS) → 402 PAYG_CREDIT_EXHAUSTED
```

This is the change that makes the feature shippable at all. There is no fixed
8,192 default: `computeDefaultMaxTokens` in
`apps/claw-chat-service/src/modules/chat-messages/constants/output-token-bounds.constants.ts:59-68`
returns `ctxSize − promptTokens − OUTPUT_BOUNDS_SAFETY_MARGIN`, and with the
default context of 32,768 and a short prompt that is roughly **32,000 output
tokens** (32,512 at the limit). At $10 per million output tokens, one naive
worst-case hold is around **$0.32** — more than Starter's entire _daily_
allowance. Reserving the un-clamped worst case would have refused almost every
request on almost every plan.

With the clamp, the provider is physically incapable of producing a response that
costs more than the balance. The user gets a **shorter answer instead of a
refusal**, and "a user can never exceed their credit" becomes true by
construction rather than by reconciliation.

### D7 — the routing cost-budget scaffold is deleted

Superseded by this wallet. See [ADR-081](adr-081-retire-routing-cost-budget.md).

## Consequences

**Gained:**

- One number, one meaning. The billing page, the quota engine and the margin
  control are the same figure, so the UI can never advertise more than the
  enforcer allows.
- `reserveWeighted` and `WeightedUsageRecord`, written and never called, are now
  the production path.
- Every plan's allowance went up. The migration is strictly generous.

**Accepted — this ADR reverses a documented decision.**
`plan-and-quota-specification.md:64` and `billing-threat-model.md:108` both state
the cost ceiling is internal and never returned to a user. It now is, on purpose:
the user asked for a visible dollar allowance, and the only alternative was to
publish a duplicate of a number we were already enforcing.

The threat those two documents guarded against was **margin inference** — a user
deriving the platform's per-model markup from an error payload. That guard
survives in a narrowed form and is now a rule rather than a convention: the
_allowance_ is public, while the per-model provider **rate**, the margin and the
internal cost ceiling of any other user remain private. Error payloads carry
`availableMicroUsd` and `requiredMicroUsd` and nothing else — enforced by
[rule 37](../../rules/37-payg-credit-integrity.md).

**Accepted — the ceiling is now a customer-visible commitment.** Lowering it is a
pricing change with notice obligations, not an operational tuning knob it used to
be. `docs/business/plan-allowances.md` is the authority for the number, and
`docs/business/rollout-and-notice.md` for changing it.

**Accepted — an admin override survives, and a fresh install does not.** The
allowance seeder only rewrites rows still holding the old value, so an operator's
tuned figure is preserved and reported as skipped. The consequence is that two
installs of the same version can enforce different allowances, which is correct
but must be read from the table rather than assumed from the release.

### Assumptions recorded rather than left implicit

| #      | Assumption                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** | Top-up SKUs are fixed, server-priced packages: $5 / $10 / $25 / $50 / $100.                                                                                                                                                                                                                                                                                         |
| **A2** | The package price→credit ratio is a column on `CreditPackageVersion`, seeded at **0.60**, not 1:1 — 1:1 books negative gross margin once gateway fees are paid. Operator-tunable without a deploy.                                                                                                                                                                  |
| **A3** | Ollama **Cloud** connectors default to `isPayAsYouGo = false`. The admin toggle is the lever; the residual is recorded with its mechanism in [ADR-082](adr-082-payg-classification-grain.md).                                                                                                                                                                       |
| **A4** | Credit is a **non-withdrawable, non-transferable service allowance**. Refunds are capped at the _unspent_ `PURCHASED` balance. ToS copy is required before the flag goes on.                                                                                                                                                                                        |
| **A5** | The reservation covers the **clamped** worst case (D6) and is reconciled on finalize.                                                                                                                                                                                                                                                                               |
| **A6** | An unpriced model on a PAYG provider is **blocked, never free**. A PAYG connector may never resolve through the local-compute zero-rate fallback.                                                                                                                                                                                                                   |
| **A7** | "One commit, one gate run" cannot be met. `.husky/pre-commit` runs `lint-staged` + `knowledge:*` + `affected typecheck --staged` on every commit and never consults the gate receipt, so N commits mean N pre-commit runs. What is honoured: zero gate runs during implementation, one scoped pass at the end, and `gates:receipt` so pre-push skips the duplicate. |

## Alternatives considered

**A new `Plan.monthlyPaygCreditMicroUsd` column.** The original proposal, and the
one this ADR exists to reject. It introduces a third name for one number with the
smallest binding first, so the UI advertises $1.50 and the enforcer refuses at
$0.75 with an error code the UI never mentions. Every plan edit would then have to
keep three columns coherent by hand.

**Token-only quotas with better cost weights.** Keep the existing token windows
and improve the per-model weighting so expensive models consume more tokens.
Rejected because the user-visible unit stays a token, which is exactly the unit
customers cannot reason about — "how many tokens is a long code review?" has no
answer, while "how many dollars" has one. It also leaves the platform's real
exposure (dollars) inferred from a proxy.

**Hard model gating per plan.** Restrict expensive models to expensive plans and
drop spend accounting entirely. Rejected because it caps the product rather than
the cost: a Pro user running one frontier model all day still costs an unbounded
amount, and a Free user who wants to try one frontier answer cannot. `ModelAccess`
rules remain, but as a product decision, not a cost control.

**Enforce the ceiling but keep it hidden.** Ship the wallet and the clamp and show
the user only a token figure. Rejected because it produces the worst outcome of
all: real dollar enforcement, no dollar visibility, and refusals the user cannot
predict or act on.

## Known gaps

- **`U7` — admin routing replay and shadow evaluation are unmetered.** The path
  is real, reaches billed providers, and is deliberately left uncharged:
  `apps/claw-routing-service/src/modules/routing/managers/router-shadow-evaluation.manager.ts:138`
  records it in a comment at the call site. The context is rebuilt from a stored
  `RoutingDecision`, and that table has **no `userId` column**, so there is
  genuinely no user to charge; inventing one would bill a customer for an
  operator's replay. Closing it needs `RoutingDecision.userId` (a migration, plus
  a decision about back-filling historical rows that have no recoverable owner)
  and an operator-scoped budget rather than a user wallet.
- **Ollama Cloud is unmetered by default.** `OLLAMA_CLOUD` is a routing-only
  provider name connector-service does not carry, so it resolves unclassified and
  therefore free. That is what A3 chose; flipping it is an admin toggle, not a
  code change.

## Validation

Unit tests assert the clamp is inescapable (a request whose clamped
`maxOutputTokens` × output rate exceeds the balance cannot be constructed), that
ten parallel requests against a balance funding exactly one produce exactly one
`CONSUMPTION` row and nine 402s, and that `wallet.grant + wallet.purchased` equals
the sum of ledger deltas for every fixture user. Seeder tests assert
`monthlyTokenQuota == monthlyProviderCostCeilingMicroUsd` for every plan.

## Rollback

Flip `SystemSetting` `payg.credit.enabled` to `false`. Nothing is metered; the
schema stays forward, because every migration in this flagship is additive.

**After the first `CreditLedgerEntry` with `kind = 'TOPUP'` exists, a user has
paid real money and rollback is no longer symmetric.** Corrections become
compensating ledger rows, and the credit tables must never be dropped —
payment-service still holds `CheckoutSession` rows with `purpose = 'CREDIT_TOPUP'`
referencing `creditPackageId` with no foreign key to stop you. Full procedure:
[`docs/11-runbooks/runbook-payg-credit.md`](../11-runbooks/runbook-payg-credit.md).

## Related

- [ADR-079](adr-079-auth-model-price-cache.md) — where auth learns prices
- [ADR-080](adr-080-one-reservation-not-two.md) — one reservation
- [ADR-081](adr-081-retire-routing-cost-budget.md) — the retired scaffold
- [ADR-082](adr-082-payg-classification-grain.md) — where PAYG is decided
- [ADR-083](adr-083-credit-topup-checkout-purpose.md) — the top-up purpose
- [`docs/03-architecture/payg-credit.md`](../03-architecture/payg-credit.md) — the mechanism
- [`docs/02-business-product/payg-credit-spec.md`](../02-business-product/payg-credit-spec.md) — intent and acceptance criteria
- [`docs/business/plan-allowances.md`](../business/plan-allowances.md) — the authoritative dollar figures
- [`rules/37-payg-credit-integrity.md`](../../rules/37-payg-credit-integrity.md)
