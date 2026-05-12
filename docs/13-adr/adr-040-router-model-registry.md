# ADR-040 — Router Model Registry as Canonical Identity Store

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 1
- **Supersedes:** none
- **Related:** ADR-041 (cost confidence), ADR-043 (route-only contract), ADR-044 (learned scores split)

## Context

The smart router is the flagship product brain of ClawAI. Before this phase,
model identity (provider, modelKey, modalities, cost, latency, lifecycle)
was scattered across three services:

- `claw-connector-service.ConnectorModel` (cloud capability flags, no cost)
- `claw-ollama-service.{LocalModel, ModelCatalogEntry}` (local Ollama models, 173 entries)
- `claw-llamacpp-service.FrontierCatalogEntry` (llama.cpp frontier models, 9 entries)

The router's decision engine had no single place to read full model
intelligence (cost class, latency class, quality tier, modality coverage,
privacy support). It also had no place to store admin overrides
(pinned cost, manual quality tier) that should survive upstream sync.

Additionally, the legacy `RouterModelProfile` table (despite its name) is
actually a per-(provider, model, taskFamily, topicKey) learned-metrics store
— wrong shape for an identity registry.

## Decision

Add a new table **`router_model_registry`** in claw-routing-service as the
canonical model identity store. Add a paired **`router_admin_overrides`**
table for per-(profile, fieldName) admin pins.

Key choices:

1. **Live in claw-routing-service** — the router is the consumer; this is its
   normalized view. Upstream services (connector / ollama / llamacpp) remain
   the sources, but routing-service owns the canonical projection.
2. **Composite unique key `(provider, modelKey)`** — survives renames; allows
   case-insensitive search; matches how chat-service references models.
3. **Soft-delete only** — `lifecycle=REMOVED`, never `DELETE FROM`. Preserves
   foreign-key integrity from `routing_decisions.selectedProfileId` (Phase 8)
   and `router_learned_scores.profileKey` (Phase 10).
4. **Separate override table** — keeps the canonical profile row clean.
   Sync workers (Phase 6) MUST consult `RouterAdminOverride` before writing
   any field that has an active override.
5. **Existing `RouterModelProfile` table renamed in conversation, kept on disk**
   — repurposed as learned-metrics. New registry uses a distinct name.

## Consequences

**Positive:**

- Single SQL query (`SELECT * FROM router_model_registry WHERE lifecycle='ACTIVE' AND is_router_only=false`) returns every eligible execution model.
- Admin overrides survive upstream syncs by design.
- 14-dim scorer (ADR-047) has one source of truth for cost / latency / quality / modality.

**Negative:**

- Sync workers must reconcile three upstream sources into one local representation. Phase 6 owns this.
- Two tables to keep in sync (registry + overrides). Mitigated by manager-level orchestration.

**Migration:** additive only, no data loss.

## Alternatives considered

- **Extend ConnectorModel in connector-service** — rejected: cloud-only, no local models, no override pattern.
- **Single column on RouterModelProfile** — rejected: that table is per-task metrics, not per-model identity.
- **Materialized view across the three upstream sources** — rejected: cross-service joins violate the database boundary rule in CLAUDE.md.
