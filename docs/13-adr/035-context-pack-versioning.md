# ADR-035 — Context Pack Versioning

## Status

Accepted (2026-05-24)

## Context

V1 context packs were mutable in place. A user editing a pack overwrote the previous content with no diff, no revert, no audit. Power users who built sophisticated packs feared editing them — and many didn't.

## Decision

Introduce `context_pack_versions` (id, contextPackId, version, payloadJson, summary, changedBy, createdAt). Every meaningful mutation writes a new version row **before** the live row is updated. The pack's `version` column is monotonically incremented. Revert creates a new forward version with the chosen payload (never rewrites history). A retention manager prunes versions beyond `CONTEXT_VERSION_RETENTION_COUNT` (default 20).

## Consequences

- Edit-without-fear UX unlocked.
- Storage cost scales with edit frequency; bounded by the retention cap.
- The version table is immutable; tampering is auditable.

## Related

- ADR-036 (scoping + sharing)
- Planning pack `.claude/Integrations/memory-context-v2/`
