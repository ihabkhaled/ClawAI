# ADR Slot Reservations 018–027 — Workspace Automation Initiative

**Date:** 2026-04-26
**Status:** PLACEHOLDER (slots reserved; individual ADRs land with each implementation stream)
**Source:** `plan-prompts/wokrspaces-flagship/` initiative; tracked by stream 60 (`docs-runbooks`)

---

## Why this file exists

The workspace automation initiative produces 10 architectural decisions worth documenting. To prevent slot collisions between concurrent stream branches, ADR numbers 018 through 027 are reserved upfront and listed below. Each individual ADR file lands in the SAME PR as its implementing stream's code.

---

## Reserved slots

| ADR # | Topic | Stream | Status |
|---|---|---|---|
| 018 | AI Action Approval Policy Engine | 10 | Reserved (PLAN at `.claude/Integrations/stream-10-approval-engine__PLAN.md`) |
| 019 | Universal Webhook Ingest | 11 | Reserved |
| 020 | SuggestionFactory Single Entry Point | 13 | Reserved |
| 021 | Email HTML Rendering Pipeline | 22 | Reserved |
| 022 | Calendar + Meeting Notes Detection | 23 | Reserved |
| 023 | Cross-Provider Search via pgvector | 30 | Reserved |
| 024 | Daily/Weekly Digest Generation | 31 | Reserved |
| 025 | Memory Learning Loop | 40 | Reserved |
| 026 | Ticket Planning + Coding Bridge | 41 | Reserved |
| 027 | Per-User Automation Preference Constraints | 32 | Reserved |

---

## ADR template (used for all 10)

When a stream lands its ADR, copy this template:

```markdown
# ADR-NNN: <Title>

**Date:** YYYY-MM-DD
**Status:** Accepted
**Authors:** <names>

## Context
[2-3 paragraphs setting up the decision; what problem prompted it]

## Decision
[1-2 sentences stating what was decided]

## Rationale
- [bullet of justification]
- [bullet]
- [bullet]

## Consequences
- **Positive:** [what becomes easier]
- **Negative:** [what becomes harder]

## Alternatives considered
- [alternative + why rejected]

## References
- Stream PLAN: `.claude/Integrations/stream-NN-*__PLAN.md`
- Implementation: `apps/<service>/src/modules/<module>/`
- Tests: `apps/<service>/src/__tests__/<test>.spec.ts`
- Runbook: `docs/11-runbooks/<runbook>.md`
```

---

## Update protocol

1. Stream branch implementer claims its slot (no others may use same number)
2. ADR file written in same PR as code
3. This reservation file updated: status → "Landed (link to ADR-XXX file)"
4. Index file `docs/13-adr/adr-index.md` appended at the same time

---

## Cross-references

- Vision: `docs/02-business-product/workspace-automation-vision.md`
- Catalog: `docs/02-business-product/workspace-automation-feature-catalog.md`
- UAT: `docs/10-uat-acceptance/workspace-automation-uat.md`
- Master plan: `.claude/Integrations/workspace-automation__MASTER_PLAN.md`
- Per-stream PLANs: `.claude/Integrations/stream-NN-*__PLAN.md`
