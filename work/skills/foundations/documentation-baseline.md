---
id: documentation-baseline
title: Documentation baseline
category: foundations
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - tech-writing
  - platform-team
---

# Documentation baseline

## Purpose

Every feature produces documentation as part of delivery. No exception. Undocumented features rot — users can't adopt them, engineers can't maintain them, and the next agent starts from zero.

## When to use

- Every feature, bug fix, or enhancement.
- Every new service, env var, pattern, or rule.

## Inputs required

- `docs/` directory structure
- `CLAUDE.md` — Documentation sections

## Workflow

1. Identify the doc deltas triggered by your change:
   - New service → `docs/04-backend/service-guide-<name>.md` + `docs/04-backend/services-index.md` update
   - New pipeline/flow → `docs/07-integrations/<pipeline>.md` or `docs/03-architecture/<topic>.md`
   - New env var → `docs/06-data/environment-variables.md`
   - New endpoint → `docs/12-reference/api-reference.md`
   - New event pattern → `docs/03-architecture/event-bus.md`
   - New frontend page or user-facing feature → `docs/05-frontend/` relevant file
2. Update `CLAUDE.md` root if any new service, env var, pattern, or mindset rule is introduced.
3. Update the service-specific `CLAUDE.md` (if applicable).
4. Update `codex.md` and `cursor.md` only when mindset rules change (rare).
5. Write the doc narratively — explain what, why, how to use, what to watch out for.

## Strict rules

- **MUST** update docs as part of the same PR that ships the feature. **BLOCKER** if missing.
- **MUST** describe the feature in narrative form, not a bullet dump.
- **MUST NOT** claim "done" without doc delta in the PR.
- **MUST NOT** write "TBD" or "coming soon" in user-facing docs.

## Anti-patterns

- Opening a PR that adds a new endpoint with zero edit to `api-reference.md`.
- "Self-documenting code" — code has no narrative.
- Copying CLAUDE.md content into another doc. Link instead.

## Validation checklist

- [ ] Every new service has `service-guide-<name>.md`
- [ ] Every new env var is in `environment-variables.md`
- [ ] Every new endpoint is in `api-reference.md`
- [ ] `CLAUDE.md` root updated if architecture changed
- [ ] `services-index.md` updated if services changed
- [ ] Service-specific `CLAUDE.md` updated

## Quality gate

| Check                  | Blocker? | Evidence              |
| ---------------------- | -------- | --------------------- |
| Doc delta in PR        | yes      | PR diff               |
| Cross-references valid | yes      | markdown link checker |

## Test requirements

None direct. Docs are reviewed by humans.

## Definition of done

1. All applicable docs updated.
2. Cross-references checked (no dead links).
3. Reviewer confirms docs match code.

## Examples

- `docs/07-integrations/model-discovery-pipeline.md` — narrative architecture doc for the discovery feature.
- `docs/04-backend/services-index.md` — updated with new discovery controller and managers.

## References

- `CLAUDE.md` — Phase 11: Documentation (MANDATORY — Cannot Be Skipped)
- `docs/00-start-here/` — overall doc index
- `documentation/` — full documentation skill pack
