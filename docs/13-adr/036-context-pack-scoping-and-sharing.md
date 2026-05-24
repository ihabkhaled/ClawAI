# ADR-036 — Context Pack Scoping and Sharing

## Status

Accepted (2026-05-24)

## Context

V1 packs lived in a single per-user bucket with a free-text "scope" string and no concept of visibility. A team trying to standardize an "engineering style" pack had to either copy-paste it across users or expose the owner's account.

## Decision

1. **Scope** — `ContextPackScope` enum + nullable `scopeRef`: `USER`, `WORKSPACE`, `PROJECT`, `THREAD`. The legacy free-text column is preserved as `legacy_scope` for read-back compatibility.
2. **Visibility** — `ContextPackVisibility` enum: `PRIVATE` (default), `WORKSPACE` (workspace members can read), `PUBLIC` (future use; gate behind feature flag at the controller layer).
3. **Attachments** — `context_pack_attachments` joins a pack to a scope + scopeRef so a single pack can be active on multiple threads/projects without duplication.
4. **Owner** — `ownerUserId` always defaults to the creator; cross-user transfer requires admin role (out of scope for V2).
5. **Items** — `ContextPackItemType` enum (`TEXT`, `FILE`, `URL`, `MARKDOWN`, `SNIPPET`, `MEMORY_REF`) replaces the v1 free-text `type` column (preserved as `legacy_type`).

## Consequences

- Team adoption story unlocked.
- Free-text → enum migration normalizes known values and falls back to `TEXT` for unknown strings; raw originals retained in `legacy_*` columns for forensic recovery.
- Cross-workspace leakage prevented at the query layer (scope filter in repo).

## Related

- ADR-035 (versioning)
- ADR-037 (retrieval bundle)
