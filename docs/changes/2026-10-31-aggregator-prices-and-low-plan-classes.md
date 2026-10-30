# Change - Aggregator models priced; Starter and Plus stop short of the dearest classes

Date: 2026-10-31. Decision: [ADR-199](../13-adr/adr-199-aggregator-models-are-priced-and-low-plans-stop-at-standard.md).
Ledger: [model-price-ledger-2026-10-31](../03-architecture/model-price-ledger-2026-10-31.md).

## Why

On production, Pro users saw "Not on your plan" on 511 models because those models had no price. The owner also
asked that high-priced models stay off Starter and the low plans.

## What changed

- Before: 511 exposed models unpriced and refused. Now: 495 priced by seed v14 (16 left unpriced on purpose).
- Before: every paid plan allowed all five cost classes. Now: Starter FREE..STANDARD, Plus adds PREMIUM.
- A free model is priced 0/0 and classed FREE.

## Files

- `apps/claw-routing-service/src/modules/router-models/` (seed v14: aggregator rows, mapper utility, types, specs)
- `apps/claw-routing-service/CLAUDE.md`
- `apps/claw-auth-service/prisma/seeders/plan-catalog.json`, `prisma/migrations/20261031120000_trim_cost_classes_on_low_plans/`
- `apps/claw-auth-service/src/modules/plans/__tests__/plan-catalog.spec.ts`
- `docs/13-adr/adr-199-*.md`, `docs/13-adr/adr-index.md`, `docs/03-architecture/model-price-ledger-2026-10-31.md`
