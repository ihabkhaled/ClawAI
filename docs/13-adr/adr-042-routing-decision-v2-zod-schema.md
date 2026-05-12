# ADR-042 — RoutingDecisionV2: Zod-Validated Output Contract

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 7

## Context

The legacy `RoutingDecision` row (and the `/routing/evaluate` response) grew
organically across the routing-service rebuild. Field shapes drifted between
managers; chat-service had to read several optional fields and fall back to
heuristics when they were missing. The Ollama router also occasionally
returned malformed JSON, which the old code silently coerced.

For the flagship contract, the router output must be:

1. Stable in shape — chat-service must trust every field.
2. Validated at the boundary — bad output is a 500, not a silent fallback.
3. Self-describing for debug — top-5 candidates + breakdown available on `debug:true`.

## Decision

Define `RoutingDecisionV2` as a Zod schema (`routingDecisionV2Schema`) and
validate every output of `RouteEvaluatorManager.evaluate()` against it.
Validation failure throws an error (caught + audited as
`routing.no_execution_model` with code=`NO_HEALTHY_EXECUTION_MODEL`).

Schema shape (high-level):

```ts
RoutingDecisionV2 {
  decisionId: string;
  selectedProfileId: string | null;   // FK to RouterModelRegistry.id
  selectedProvider: string | null;
  selectedModel: string | null;
  runtimeType: 'CLOUD' | 'OLLAMA' | 'LLAMACPP' | 'UNKNOWN';
  routingMode: RoutingMode;
  confidence: number;                  // [0, 1]
  classification: { domain, secondaryDomain, taskFamily, modalityIn[],
                    modalityOut[], riskLevel, privacyClass, confidence };
  reasonTags: string[];
  scoreBreakdown: ScoreBreakdownEntry[] | null;   // top-5 in debug mode
  candidates: { profileId, totalScore }[] | null;
  costClass: CostClass | null;
  latencyClass: LatencyClass | null;
  fallbackChain: { profileId, provider, modelKey, reason }[];
  policyApplied: { policyId, mode };
  noExecutionModelIssue: { code, explanation, suggestedAction } | null;
}
```

`noExecutionModelIssue` is the ONLY way to signal "no executor available" —
the router never silently picks a default.

## Consequences

- chat-service can rely on the shape (no defensive null checks).
- Debug mode (`debug:true`) exposes the 14-dim breakdown so admin tooling
  can show "this answer was chosen because... [3 winning dims], lost on [1 dim]".
- Zod schema lives in `route-evaluator/schemas/routing-decision-v2.schema.ts`
  and is also used by the simulator (Phase 13) for cross-check.

Backwards-compatibility: legacy `/evaluate` still returns the older shape.
chat-service continues to call `/evaluate` until Phase 8 wires the scorer
into `routing.manager.ts.evaluate()`.
