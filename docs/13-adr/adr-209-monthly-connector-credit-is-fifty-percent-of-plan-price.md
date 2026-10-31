# ADR-209: The monthly connector credit is 50% of the plan price

**Status:** Accepted

**Date:** 2026-10-31

Amends [ADR-078](adr-078-payg-connector-credit.md). Rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 37](../../rules/37-payg-credit-integrity.md), [rule 52](../../rules/52-every-schema-ships-a-migration.md).

## Context

The credit a plan grants each month is `monthly price x Plan.paygCreditPercentBps / 10000`. It shipped at 30% (Starter, Plus) and 25% (Pro, Team, Scale, Unlimited). The owner ordered 50% for every plan.

## Decision

- `paygCreditPercentBps` is 5000 on Starter, Plus, Pro, Team, Scale and Unlimited. Free keeps 3000 and still grants $0, because a $0 price converts to nothing.
- Fresh installs: `plan-catalog.json` and the `plan-payg-percent` seeder carry 5000.
- Existing databases: migration `20261031150000_connector_credit_fifty_percent`. It updates only rows still at the shipped value (3000 for Starter and Plus, 2500 for the rest), so an administrator-edited rate is never overwritten. A second run matches nothing.
- No code changes: the amount and the "N% of your plan price" label are both derived from the column (`creditFromPayment`, `formatCreditRatePercent`).
- No retroactive top-up. A wallet takes the new grant when it rolls into the next UTC month. Plan cards show 50% at once; balances change at each wallet's first roll on or after the next 1st at 00:00 UTC.

## Consequences

- Credit per month: Starter $2.50, Plus $5, Pro $10, Team $25, Scale $50, Unlimited $100.
- The credit is no longer equal to `monthlyProviderCostCeilingMicroUsd` (still 25-30% of price). PAYG requests do not check the ceiling, so nothing blocks the larger credit.
- Worst case, credit plus ceiling: 80% (Starter, Plus) and 75% (Pro and up) of the monthly price. On a yearly term (20% discount, credit granted from the monthly price) Starter and Plus reach 100% of revenue and the rest 93.75%: zero or negative margin after gateway fees. A term-discount floor needs an owner decision. See [margin-model](../business/margin-model.md).
- Rollback: set the column back; the migration is not reversible by itself and a re-run does not undo an edit.
