# ADR-044 — Learned Scores in a Separate Table

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 10
- **Related:** ADR-040 (registry)

## Context

Phase 10 introduces per-model learned metrics — `successRate`, feedback
counts, judge outcomes, fallback triggers, total routes — partitioned by
`(profileKey, domain, taskFamily)`. Two storage options:

1. Add the columns to `RouterModelRegistry` directly.
2. Store them in a separate `router_learned_scores` table.

## Decision

Use a separate table `router_learned_scores` with composite unique key
`(profileKey, domain, taskFamily)`. The registry row stores identity + admin
overrides; the learned table is the rolling metrics store.

Rationale:

1. **Override hygiene** — `RouterAdminOverride` rows shouldn't compete with
   automatically-updated learned data. A field name like `successRate` could
   accidentally be "overridden" by an admin in the registry table; with
   a separate table the meaning is unambiguous.
2. **Bounded update domain** — the learning manager only touches one table,
   one row. The registry remains a stable identity store that downstream
   services can cache aggressively.
3. **Rollback** — snapshotting the learned table (for Phase 10 rollback
   feature) doesn't require touching the registry.
4. **Per-task partitioning** — successRate varies by (domain, taskFamily):
   a model can be excellent at coding but mediocre at marketing copy.
   The registry can't carry that 3-D matrix in flat columns.

The scoring engine (Phase 3, dim `learnedSuccess`) reads from
`router_learned_scores` lazily and falls back to `DEFAULT_SUCCESS_RATE=0.6`
when no row exists.

## Consequences

- Two queries needed on the hot path (`registry.find` + `learned.find`),
  mitigated by Redis cache (5-min TTL, keyed on `(profileKey, domain, task)`).
- Learning loop manager is self-contained; doesn't need access to the
  registry repository.
- Snapshots / rollbacks are simpler (one table to copy).

## Bounded updates

`successRate` is clamped to `[0.3, 0.95]` per write. 20 consecutive
NEGATIVE signals from a 0.4 baseline cannot drop the score below 0.3.
This prevents one bad day from killing a previously-trusted model.
