# ADR-041 — Cost Annotation: EXACT / ESTIMATED / UNKNOWN

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 1, 3
- **Related:** ADR-040 (registry), ADR-047 (scoring weights)

## Context

The 14-dimension scorer (Phase 3) reads `inputCostPer1M` / `outputCostPer1M`
from `RouterModelRegistry`. Some providers publish exact price cards
(OpenAI, Anthropic, Gemini). Some local models have a real $0 cost.
Some long-tail or custom models have no known price.

Naively treating unknown cost as $0 would make the scorer always prefer them
in `COST_SAVER` mode — a quiet way to recommend unverified models.

## Decision

Annotate every cost row with a `CostConfidence` enum:

- `EXACT` — documented provider price card or admin-confirmed override
- `ESTIMATED` — inferred from family + size (e.g., Grok via family heuristic)
- `UNKNOWN` — no data; **never auto-treated as 0**

The 14-dim scorer applies an `uncertaintyPenalty` (raw score 0.5) when
`costConfidence=UNKNOWN`, capping the candidate's overall ranking. The
penalty also fires for `latencyClass=null` or `qualityTier=D`.

For `COST_SAVER` mode specifically, the score reduction means `UNKNOWN`-cost
models rarely beat known-cheap models even when their assumed cost would.

## Consequences

- CFO-grade cost reporting becomes meaningful: every cost in the
  observability summary is labeled with its confidence level.
- Local models (Ollama / llama.cpp) get `costConfidence=EXACT, outputCostPer1M=0`.
- Admin override at `RouterAdminOverride.fieldName='inputCostPer1M'` or
  `'outputCostPer1M'` raises confidence to EXACT.

**Negative:** sync workers (Phase 6) must propagate `costConfidence`
from upstream price feeds; they cannot just write the price.
