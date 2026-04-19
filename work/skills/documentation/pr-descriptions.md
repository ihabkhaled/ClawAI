---
id: pr-descriptions
title: PR descriptions
category: documentation
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# PR descriptions

## Purpose

PRs with useful descriptions merge faster and leave a trail future debuggers can follow.

## Required sections

1. **What** — 1–3 bullets on what changed
2. **Why** — the business/technical driver (link plan doc)
3. **How** — high-level approach (not a commit list)
4. **Test plan** — what was tested; link QA script output
5. **Screenshots / recording** — for UI changes
6. **Checklist** — skills cited, DoD items met
7. **Rollback** — revert commands if needed

## Strict rules

- **MUST** fill every required section.
- **MUST** cite skills applied (at least the category names).
- **MUST NOT** leave description empty.

## Anti-patterns

- "Fixed the bug" with no context.
- Commit-list dump with no narrative.

## Validation checklist

- [ ] What / Why / How / Test plan / Checklist present
- [ ] UI changes have screenshots
- [ ] Skills cited

## Quality gate

| Check               | Blocker? | Evidence |
| ------------------- | -------- | -------- |
| All sections filled | yes      | PR       |

## Definition of done

1. PR meets template.
2. Reviewer confirms clarity.
