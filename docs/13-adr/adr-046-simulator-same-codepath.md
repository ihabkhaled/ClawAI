# ADR-046 — Simulator Uses the Same Code Path as Production Evaluate

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 13 (planned)
- **Related:** ADR-042 (RoutingDecisionV2)

## Context

The Phase 13 simulator (planned UI) lets admins preview how the router
would handle a prompt before they activate a policy. The risk of building
the simulator as a separate code path is that it could drift from real
routing — admins would see a preview that doesn't match production behavior.

## Decision

The simulator calls **the same** `RouteEvaluatorManager.evaluate()` function
that production uses, with a `dryRun: true` flag that:

- skips persisting a `RoutingDecision` row
- skips publishing the `routing.decision_made` event
- still validates output against `RoutingDecisionV2` Zod schema
- still respects route-only contract, hard rejections, and policy weights

This means preview === actual route on identical input. The Phase 13
implementation will add `dryRun` to `EvaluateInputV2`, default false.

## Consequences

- No code duplication.
- Phase 14 QA includes a cross-check: 50 random prompts run through both
  `/evaluate-v2` (no persist) and the simulator endpoint; outputs must be
  byte-identical.
- "Save as fixture" promotes a simulator run to a regression fixture
  (Phase 13 also adds `RouterFixture` table). CI runs all fixtures on
  every PR — a regression in `RouteEvaluatorManager` fails the build.

## Alternatives considered

- **Separate `simulator-evaluator.ts`** — rejected: drift risk.
- **Replay against historical decisions** — partially adopted as a separate
  feature (the existing `replay-manager.ts`); not a substitute for forward
  simulation.
