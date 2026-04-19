# ClawAI Skills Framework

## What this is

A portable, markdown-first, governed set of **skills** that every AI coding agent (Claude Code, OpenAI Codex, Cursor, local Ollama models, future agents) must load before touching the ClawAI codebase. Each skill is a focused, versioned, reviewable contract that tells an agent how to work on a specific concern — with strict rules, validation checklists, quality gates, and definition-of-done criteria.

## Why it exists

CLAUDE.md alone isn't enough. Skills make the rules:

- **Portable** — readable by any LLM tool, no vendor lock-in
- **Modular** — one concern per file, no mega-documents
- **Discoverable** — agents know which skills to load for which task
- **Enforceable** — each skill has pass/fail gates
- **Versionable** — Git history is the audit trail
- **Auditable** — we can measure whether skills are followed

## How an agent uses it

```
1. Start of every task → load foundations/ (mandatory)
2. Classify the task → load domain skills matching the task
   - Backend change → backend/ + relevant quality-gates/
   - Frontend change → frontend/ + relevant quality-gates/
   - Security-sensitive → add security/ unconditionally
   - Provider integration → workspace-integrations/<provider>.md
3. Before coding → run the skill's "Workflow" section
4. Before commit → run the skill's "Validation checklist"
5. Before claiming done → pass every relevant "Quality gate"
```

No skill is optional if its category applies. Quality gates are blockers.

## Directory map

```
work/skills/
  README.md                           # this file
  INDEX.md                            # flat catalog of every skill
  SKILL_FILE_SPEC.md                  # file format + sections + metadata
  GOVERNANCE.md                       # versioning, lifecycle, review process
  KPIS.md                             # measurable success criteria

  templates/                          # blueprints when adding skills
    skill.template.md
    checklist.template.md
    workflow.template.md

  foundations/                        # MANDATORY — load before any change
  business-product/                   # pack 20 — BA/PM thinking
  architecture-planning/              # pack 30 — planning discipline
  backend/                            # pack 40 — NestJS service quality
  frontend/                           # pack 41 — Next.js UI quality
  coding-quality/                     # pack 42 — lint, commit, readability
  security/                           # pack 43 — secure coding + OWASP
  testing/                            # pack 50 — TDD + unit + integration
  e2e-manual-testing/                 # pack 51 — E2E + manual API/UI
  bulk-validation/                    # pack 52 — hundreds-of-cases scripts
  devops/                             # pack 60 — CI/CD + release + observability
  documentation/                      # pack 61 — docs as deliverable
  workspace-integrations/             # pack 70 — provider adapters
  search-tool-use/                    # pack 71 — browsing + grounding + final-model preservation
  ollama-governance/                  # pack 72 — model discovery + governance
  quality-gates/                      # pack 80 — hard gates before done
  checklists/                         # quick references for common moments
  examples/                           # worked scenarios end-to-end
```

## Loading order (mandatory)

| Order | Category                                                                   | Purpose                   |
| ----- | -------------------------------------------------------------------------- | ------------------------- |
| 1     | `foundations/`                                                             | Baseline every task needs |
| 2     | `architecture-planning/`                                                   | Plan before coding        |
| 3     | Domain (`backend/` or `frontend/` or `workspace-integrations/`)            | Domain discipline         |
| 4     | `coding-quality/`                                                          | Style, lint, commit       |
| 5     | `security/` (always when touching auth, input, adapters, uploads, secrets) | Safe code                 |
| 6     | `testing/` + `e2e-manual-testing/`                                         | Test discipline           |
| 7     | `quality-gates/`                                                           | Definition of done        |
| 8     | `documentation/`                                                           | Docs as delivery          |

## How a human maintains it

- **Propose**: Fork, copy `templates/skill.template.md`, fill it out, open a PR.
- **Review**: Two engineers + one domain owner sign off.
- **Merge**: CI runs `npm run skills:validate` (lint metadata, check references).
- **Track**: Each skill has a `version` and `last_reviewed` — stale skills get quarterly review.
- **Retire**: Move to `work/skills/.archive/` with a deprecation note pointing to the replacement.

See `GOVERNANCE.md` for the full process.

## Core principles

1. **Strict over vague** — "MUST" and "MUST NOT" beat "should consider"
2. **Checklist over prose** — humans skim, skim wins
3. **Evidence over intent** — "QA script passes 0 failures" beats "tested"
4. **Blocker clearly flagged** — if it's a blocker, say so
5. **One skill per file** — no mega-docs
6. **Cross-reference, don't duplicate** — link to other skills instead of copying
7. **Versioned** — breaking changes bump the major version

## Quick start for an AI agent

1. Read `foundations/README.md` (category index)
2. Read all files under `foundations/` (this is non-negotiable baseline)
3. Read `SKILL_FILE_SPEC.md` so you understand the skill file format
4. Classify the current task into its categories
5. Load those category READMEs and the specific skill files they point to
6. Follow the workflows, respect the quality gates, provide the evidence
7. Never skip a gate. Never fake evidence.

## Quick start for a human engineer

1. Read `INDEX.md` to see the full catalog
2. Read `GOVERNANCE.md` to understand how to change things
3. Skim `KPIS.md` to see how the system proves it's working
4. Use `checklists/*.md` for common moments (pre-commit, pre-PR, pre-release)
