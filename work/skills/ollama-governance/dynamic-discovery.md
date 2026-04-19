---
id: dynamic-discovery
title: Dynamic discovery
category: ollama-governance
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - ai-platform-team
---

# Dynamic discovery

## Purpose

The catalog is DB-driven, not a static constant. Never hardcode a 30-model list; use the discovery pipeline.

## Strict rules

- **MUST** add new models via the discovery pipeline or admin UI (`/models/discovery` or `/models/catalog/admin`). **BLOCKER** on hardcoded catalog adds.
- **MUST** preserve deprecated-default protection (never re-seed `phi4-mini`, `gemma3:4b`, etc.).
- **MUST** classify every candidate via `classifyModel` before import.
- **MUST** dedupe against catalog and installed models.

## Anti-patterns

- Editing `catalog-entries.constants.ts` to add a model.
- Bypassing the dedup check.
- Importing a cloud-only model as downloadable.

## Validation checklist

- [ ] Model came through discovery or admin UI
- [ ] Classification + confidence set
- [ ] Deduped against catalog + installed

## Quality gate

| Check                                | Blocker? | Evidence   |
| ------------------------------------ | -------- | ---------- |
| No hardcoded catalog constants added | yes      | Diff       |
| Discovery run log shows the addition | yes      | Run record |

## Definition of done

1. Model imported via pipeline.
2. Classification present.

## References

- `docs/07-integrations/model-discovery-pipeline.md`
