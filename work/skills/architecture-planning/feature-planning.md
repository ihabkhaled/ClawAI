---
id: feature-planning
title: Feature planning (small / medium / large)
category: architecture-planning
level: mandatory
depends_on:
  - foundations/requirement-validation
  - foundations/architecture-awareness
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Feature planning

## Purpose

Scale the plan to the feature size. A small bug fix doesn't need a 20-page plan; a new service needs one.

## When to use

- Every feature.

## Scale classification

| Size       | Signals                                       | Plan depth                                           |
| ---------- | --------------------------------------------- | ---------------------------------------------------- |
| **Small**  | ≤2 files touched, 1 service, no schema change | 1-page plan: problem, acceptance criteria, test plan |
| **Medium** | 3–20 files, 1 service, maybe schema change    | Full Phase 0 (a–g) per CLAUDE.md                     |
| **Large**  | >20 files OR cross-service OR new service     | Full Phase 0 + Phase 10 cross-service verification   |

## Workflow

1. Classify size from the signals above.
2. Write the plan to `.claude/Integrations/<feature>__PLAN.md`.
3. For medium and large, cover:
   - 0a Feature brief
   - 0b Impacted-area map (every service/file/env/doc/compose)
   - 0c Risk assessment
   - 0d Acceptance criteria
   - 0e Failure criteria
   - 0f Test strategy seed
   - 0g Business/product framing
4. For large, add:
   - Cross-service event flow
   - Migration rollout sequence
   - Rollback plan
5. Confirm plan with the user before coding (when ambiguous).

## Strict rules

- **MUST** write a plan file for medium and large features. **BLOCKER** if missing.
- **MUST** include impacted-area map for medium and large.
- **MUST NOT** start coding before the plan exists.

## Anti-patterns

- No plan, "I'll figure it out as I go".
- Plan that's just a restatement of the user's message.
- Plan without risk assessment for a large feature.

## Validation checklist

- [ ] Plan file exists
- [ ] Impacted-area map complete
- [ ] Acceptance criteria numbered
- [ ] Risks listed
- [ ] Business framing present

## Quality gate

| Check                              | Blocker? | Evidence                        |
| ---------------------------------- | -------- | ------------------------------- |
| Plan file exists for medium/large  | yes      | File in `.claude/Integrations/` |
| User confirmation (when ambiguous) | yes      | Chat/ticket record              |

## Definition of done

1. Plan file matches the scale.
2. Phase 0 items complete.
3. User confirmed scope.

## Examples

- `.claude/Integrations/ollama-dynamic-discovery__PLAN.md` — large-scale plan with all Phase 0 items.

## References

- `CLAUDE.md` — Phase 0: Pre-Coding Planning Gate
- `docs/16-quality-engineering/PLANNING_STANDARD.md`
