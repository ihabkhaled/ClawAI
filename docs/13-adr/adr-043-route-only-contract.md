# ADR-043 — Route-Only Contract Enforced at Filter Time

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 7
- **Related:** ADR-042 (RoutingDecisionV2)

## Context

The router uses small Ollama models (qwen3:1.7b, phi-4-mini, gemma3:4b) to
classify prompts and rank candidates. These models are NOT suitable for
direct user response — they are **router-only**. Without enforcement, a
weak heuristic or LLM output could accidentally select one of them as the
executor, degrading every answer.

## Decision

A profile flagged `isRouterOnly=true` in `RouterModelRegistry` is **filtered
out before scoring even sees it**. The filter is implemented as a pure-function
utility `applyRouteOnlyContract(candidates)` in
`src/modules/route-evaluator/utilities/route-only-guard.utility.ts`:

```ts
candidates.filter(
  (c) => !c.isRouterOnly && c.isExecutionCapable && c.lifecycle === ModelLifecycle.ACTIVE,
);
```

This runs at the start of `RouteEvaluatorManager.evaluate()`, before
`ScoringEngineManager.score()` is called. The scorer's hard-rejection
check (`isRouterOnly` → `rejected=true`) is a defense in depth: if the
filter is ever forgotten, the scorer still rejects.

Additional safeguards:

- `RouterModelRegistry.isExecutionCapable` default is `true`; setting
  `isRouterOnly=true` auto-implies `isExecutionCapable=false` in the seed file.
- Phase 14 fuzz test plan: 1000 prompts × all routing modes should never
  produce a `selectedProvider/Model` that matches a router-only row.

## Consequences

- Router-only models stay invisible to the chat-service execution path
  while remaining visible to the routing logic itself.
- Admin UI (Phase 5) shows `isRouterOnly` as a distinct badge and prevents
  setting it for cloud models.
- The contract is mechanically testable: the unit suite for
  `applyRouteOnlyContract` covers `isRouterOnly`, `isExecutionCapable=false`,
  and all 4 non-ACTIVE lifecycle values.
