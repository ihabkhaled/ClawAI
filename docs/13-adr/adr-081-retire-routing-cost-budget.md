# ADR-081: Retire the routing-service cost-budget scaffold

**Status**: Accepted (supersedes routing flagship stream **R.4**)
**Date**: 2026-08-29
**Deciders**: ClawAI core team
**Slice**: Pay-as-you-go connector credit (PAYG flagship)

## Context

`apps/claw-routing-service/src/modules/cost-budget/` was a 13-file module —
controller, service, four managers, a repository, three DTOs, types and
constants — that appeared to implement per-user spend capping inside
routing-service. It was written as stream **R.4** of the routing flagship
(`docs/15-ai-context/routing-flagship-streams/05-r4-cost-budget-intelligence.md`).

The PAYG audit asked whether it could be reused as the credit enforcer. It could
not, because **it never ran**:

| Evidence            | Finding                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module registration | `CostBudgetModule` was **never listed** in routing-service's `app/app.module.ts`. Nothing in the service could inject it.                                             |
| Persistence         | `UserCostBudget` was **not in `prisma/schema.prisma`**. The repository referenced a model the client never generated.                                                 |
| Core logic          | `spend-tracker.manager.ts:11` **threw**: `throw new Error('SCAFFOLD-R4 — SpendTrackerManager.incrementSpend not implemented')`.                                       |
| Authorization       | The controller declared **7 handlers and 0 `@RequirePermissions`**. Had it ever been registered and routed, it would have been an unauthenticated per-user spend API. |

"Present is not wired." A repository method with no callers is scaffolding, and
this was a whole module of it.

Meanwhile [ADR-078](adr-078-payg-connector-credit.md) puts per-user spend capping
in auth-service, where the wallet, the plan, the quota engine and the atomic
reservation already live. Two spend caps in two services is one too many, and the
one that exists only as an idea is the one to drop.

## Decision

**Delete `apps/claw-routing-service/src/modules/cost-budget/` in full.** Stream
R.4 is superseded; its document is marked `SUPERSEDED` in place with a pointer
here rather than deleted, so the reasoning stays findable.

Per-user spend capping is owned by the **auth-service PAYG credit wallet**.
routing-service keeps the two responsibilities it genuinely owns:

- **model prices** — `ModelCostVersion`, `ModelCostService`, the admin repricing
  surface, and the new `ModelCostSeedService`; and
- **metering its own paid calls** — the cloud router calls real, billed models to
  decide where a message goes, and now reserves against the user's wallet at
  `PaygSurface.ROUTING`.

routing-service does **not** decide whether a user may spend.

## Consequences

**Gained:**

- One answer to "where is spend capped". A future contributor grepping for a
  budget finds the wallet, not a module that throws.
- 13 files, three DTO schemas and seven ungated handlers removed from a service
  that already carries 19 Prisma models.
- The `UserCostBudget` name is free, so nothing suggests a table that was never
  created.

**Accepted — a deletion is not risk-free even when nothing calls the code.**
`npm run knowledge:build` regenerates the manifests, so any generated reference to
the module disappears with it; the R.4 stream document and the routing flagship
`INDEX.md` are updated in the same commit. A stale document describing a deleted
module is worse than none, because it is trusted.

**Accepted — a genuinely operator-scoped budget is now unbuilt.** The wallet caps
_users_. It does not cap _the operator_: admin routing replay and shadow
evaluation reach billed providers against no user wallet, recorded as a known gap
in [ADR-078](adr-078-payg-connector-credit.md#known-gaps) with its call site at
`modules/routing/managers/router-shadow-evaluation.manager.ts:138`. If that gap is
ever closed it will be an operator budget in routing-service — which is what R.4
should have been — and this ADR does not prejudge that design.

## Alternatives considered

**Finish R.4 and use it as the PAYG enforcer.** It sits in the wrong service: the
plan, the quota windows, the atomic reservation script and the user record are all
in auth-service, so a routing-owned budget would need to read all four across a
boundary on the hot path, and would still be a second admission gate with its own
atomicity domain ([ADR-080](adr-080-one-reservation-not-two.md)).

**Leave it in place, unwired.** Cheapest, and rejected: dead code that names a
real concern is read as an implementation. The audit that produced this flagship
lost real time establishing that it did nothing, and the next audit would pay the
same cost again.

**Keep the controller and repoint it at auth.** A thin proxy in routing-service
for a wallet auth owns adds a hop and a second place to guard the same
permission, for no caller that exists.

## Validation

`npx tsgo --noEmit` in routing-service proves nothing referenced the module.
`npm run knowledge:verify` proves no governance document links to a deleted path.
The routing-service test suite is unchanged in count except for the module's own
specs, which are removed with it.

## Rollback

`git revert`. Nothing depended on the module, so restoring it restores exactly the
previous state: an unregistered module that throws. There is no data to migrate —
`UserCostBudget` never existed in any database.

## Related

- [ADR-078](adr-078-payg-connector-credit.md) — where spend capping actually lives
- [ADR-080](adr-080-one-reservation-not-two.md) — why a second gate was rejected
- [`docs/15-ai-context/routing-flagship-streams/05-r4-cost-budget-intelligence.md`](../15-ai-context/routing-flagship-streams/05-r4-cost-budget-intelligence.md) — the superseded stream
- [`docs/04-backend/service-guide-routing.md`](../04-backend/service-guide-routing.md)
