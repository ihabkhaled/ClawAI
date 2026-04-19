---
id: technical-documentation
title: Technical documentation
category: documentation
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - tech-writing
---

# Technical documentation

## Purpose

Narrative docs explain WHY; code explains WHAT. Every non-trivial feature earns a narrative doc.

## Required minimum per new service/feature

1. **Overview** — what the feature does, in one paragraph
2. **Problem** — what pain this solved
3. **Architecture** — diagram + narrative
4. **Data model** — tables + purpose
5. **API surface** — endpoint table (method, path, roles)
6. **Scheduled jobs** — if any
7. **Env vars** — with defaults
8. **Design decisions** — 2–5 callouts explaining non-obvious trade-offs
9. **How to extend** — concrete steps
10. **References** — links to CLAUDE.md, code, PR

## Strict rules

- **MUST** include all 10 sections for a new service/pipeline.
- **MUST** link to concrete file paths in examples.
- **MUST NOT** write "TBD" in shipped docs.

## Validation checklist

- [ ] All 10 sections present
- [ ] Links resolve
- [ ] No TBDs

## Quality gate

| Check               | Blocker? | Evidence              |
| ------------------- | -------- | --------------------- |
| Doc file in `docs/` | yes      | PR diff               |
| Links valid         | yes      | Markdown link checker |

## Definition of done

1. Doc written.
2. Linked from relevant index pages.

## Examples

- `docs/07-integrations/model-discovery-pipeline.md`
- `docs/04-backend/service-guide-agent.md`
