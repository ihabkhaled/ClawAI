# ADR-135: Term discounts are per-plan settings that derive the price versions

- **Status:** Accepted
- **Date:** 2026-09-30
- **Deciders:** Product owner (request), engineering
- **Related:** [ADR-064](adr-064-refund-ledger-and-entitlement-policy.md), rule
  [28](../../rules/28-billing-integrity-and-api-contracts.md), [plan allowances](../business/plan-allowances.md)

## Context

Checkout sells four terms (1, 3, 6 and 12 months). Each is its own immutable
`PlanPriceVersion` row, and until now each amount was typed or seeded on its own:
quarterly and semiannual were a flat 10% off, yearly was a hand-set figure
(`yearlyMinor`, ten months of the monthly rate ≈ 16.7% off). Nothing tied the
four together, so an admin who changed the monthly price left the others stale,
and a yearly figure could exceed twelve monthly payments. The product owner set
the policy: **quarterly 10%, semiannual 15%, yearly 20% off**, editable by an
admin, and applied everywhere a price is shown or charged.

## Decision

1. **A discount is a per-plan number, in basis points**, on the `plans` table:
   `quarterly_discount_bps` (default 1000), `semiannual_discount_bps` (1500),
   `yearly_discount_bps` (2000). CHECK 0–9000. It is DB-level config an admin
   edits (new config goes to the database, not `.env`).
2. **Longer-term prices are derived, not typed.**
   `amount = round(monthly × months × (10000 − bps) / 10000)`, integer
   arithmetic, one rounding. Yearly at 20% is exactly `monthly × 12 × 80 / 100`.
3. **The charged amount is still an immutable `PlanPriceVersion`.** Checkout and
   invoices never compute it (there is still no "apply discount at payment"
   path). What changed is who writes those rows:
   `PlanIntervalPricingService` mints the derived versions in **one transaction**
   (`PlanBillingRepository.publishPriceSet`) whenever the monthly price or a
   discount changes. An interval already at the right amount and currency is left
   alone, so re-syncing never floods history.
4. **A hand-typed QUARTERLY/SEMIANNUAL/YEARLY publish is refused**
   (`PLAN_INTERVAL_PRICE_DERIVED`, 400). Publishing MONTHLY re-derives the rest;
   `PUT /admin/plans/:id/interval-discounts` changes the discounts. A plan with no
   monthly price cannot have discounts set (`PLAN_HAS_NO_MONTHLY_PRICE`, 409), and
   a Free (0) monthly price never creates paid terms.
5. **Existing plans are re-priced once** by the `plan-interval-discounts` seeder
   (v1): it retires the old version and mints a new one per interval, keyed on each
   plan's live MONTHLY price. Subscriptions keep pointing at the version they
   bought; only new checkouts see the new price.
6. **The badge is read off the stored prices**, never hard-coded:
   `computeIntervalDiscountPercent` in the frontend derives "Save N%" from the
   monthly and term price, so a changed discount changes the badge with no copy
   edit. Copy that hard-coded plan prices or "two months free" was rewritten
   price-free in all 13 locales.

## Alternatives rejected

- **Compute the discount at read/checkout time.** Two figures (shown vs charged)
  can disagree by rounding or race; rule 28 forbids it.
- **A global discount table.** Simpler, but a plan may reasonably differ; per-plan
  columns cost nothing extra and the defaults are identical.
- **Edit the old seeders' figures.** They are checksum-pinned history; a new
  versioned seeder is the sanctioned path.

## Consequences

- **Revenue:** a yearly subscriber now pays 9.6 months' worth instead of 10, a
  semiannual subscriber 5.1 instead of 5.4; quarterly is unchanged (2.7). PAYG credit is still `monthly price × bps` per month, so the
  credit per euro paid rises for longer terms (a yearly subscriber's credit is
  37.5% of what they pay at a 30% plan rate, up from 36%). The per-term margin table is in
  [margin-model.md](../business/margin-model.md); the margin floor that should cap
  the admin discount is still unassigned there.
- Existing invoices and subscriptions are untouched (append-only).
- `plan-catalog.json` `yearlyMinor` now holds the 20% figures (owner asked, 2026-09-30),
  so a fresh install seeds them directly. On an install that already ran plan-catalog,
  its payload checksum changes, which logs one "already applied with a DIFFERENT
  checksum" warning per boot (harmless: the seeder is not re-run).
- The seeder replaces ANY differing longer-term price, including one an operator
  set by hand. That is the intended policy (the owner wants the discount formula
  everywhere); the billing-operations runbook has a pre-deploy query to preview
  which plans change.
- The admin cap is 90%. On a 30% PAYG plan a yearly discount of 70% or more makes
  the worst case loss-making; no margin floor is recorded, so the cap is a sanity
  bound, not a business rule.

## What would make this stale

A code path that writes a QUARTERLY/SEMIANNUAL/YEARLY `PlanPriceVersion` without
going through `publishPriceSet`, a checkout that recomputes a price, or copy that
names a plan price or a fixed discount again.
