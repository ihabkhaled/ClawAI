# ADR-047 — 14-Dimension Scoring Weights are Policy-Bound

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 3
- **Related:** ADR-040 (registry), ADR-041 (cost confidence)

## Context

The scoring engine ranks candidate models across 14 dimensions. Different
routing modes care about different dimensions: COST_SAVER cares about cost,
LOW_LATENCY cares about latency, PRIVACY_FIRST cares about privacy.
Without per-mode weights, every mode would produce the same ranking with
only post-hoc filtering.

## Decision

Each `RoutingMode` carries its own `DimensionWeights` vector summing to
1.0 ± 0.001. Weights live in
`src/modules/scoring/constants/scoring.constants.ts` as the
`DEFAULT_POLICY_WEIGHTS` constant. The 14 dimensions:

| #   | Dimension             | Source                                      | Range    |
| --- | --------------------- | ------------------------------------------- | -------- |
| 1   | `capability`          | `QualityTier` mapped                        | 0..1     |
| 2   | `domain`              | match on `domainTags` / `notRecommendedFor` | 0..1     |
| 3   | `role`                | placeholder (Phase 10)                      | 0.5      |
| 4   | `modality`            | `modalitiesIn/Out hasEvery` required        | 0..1     |
| 5   | `cost`                | `CostClass` mapped                          | 0..1     |
| 6   | `latency`             | `LatencyClass` mapped                       | 0..1     |
| 7   | `health`              | CB state + 24h success rate                 | 0..1     |
| 8   | `privacy`             | required vs supported                       | 0..1     |
| 9   | `learnedSuccess`      | LearnedScore (Phase 10)                     | 0..1     |
| 10  | `judgeTrust`          | `judgeSuitability` flag                     | 0..1     |
| 11  | `contextFit`          | `contextWindowTokens` bucket                | 0..1     |
| 12  | `uncertaintyPenalty`  | UNKNOWN cost/latency/quality → 0.5          | 0.5 or 1 |
| 13  | `riskPenalty`         | HIGH risk × quality C/D → 0.4               | 0.4 or 1 |
| 14  | `fallbackReliability` | history of rescuing failed routes           | 0..1     |

`totalScore = Σ (rawScore[d] × weight[d])`, clamped to `[0, 1]`.

Per-mode dominance (must always hold; enforced by unit test):

- `AUTO` — balanced, max weight ≤ 0.25
- `COST_SAVER` — `cost` ≥ every other weight
- `LOW_LATENCY` — `latency` ≥ every other weight
- `HIGH_REASONING` — `capability` ≥ every other weight
- `PRIVACY_FIRST` — `privacy` ≥ every other weight
- `LOCAL_ONLY` — `privacy` weighted; non-local rejected at filter time
- `MANUAL_MODEL` — scoring bypassed; only `capability + health + modality + privacy + contextFit` retain weight for validation

## Consequences

- Adding a new dimension requires editing every per-mode vector + sum-to-1
  test. Acceptable: the scoring formula is intentionally small.
- Admin policies (Phase 4) can override `weightsJson` per policy row,
  overriding the per-mode defaults.
- The score is **deterministic**: same input always produces same output.
  Snapshot unit test enforces this.

## Alternatives considered

- **Single global weight vector + post-hoc mode adjustments** — rejected:
  modes would feel like filters, not preferences.
- **Learned weights per mode** — rejected for v1: bounded updates on
  weight vectors are tricky; better to start with hand-tuned defaults.
