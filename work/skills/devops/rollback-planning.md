---
id: rollback-planning
title: Rollback planning
category: devops
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Rollback planning

## Purpose

Every release has a rollback plan. No plan = lose sleep + data.

## Workflow

1. Identify the release's commits (by SHA).
2. Categorize by reversibility:
   - Code — `git revert` the commit
   - Migration — write a reverse migration OR plan forward-fix
   - Config — revert `.env` / compose
   - Events — noop if schema-additive
3. Write the rollback commands as a runbook.
4. Test the revert locally before shipping.
5. Store the plan in the release notes.

## Strict rules

- **MUST** have a written rollback plan for every release.
- **MUST NOT** rely on memory for rollback steps.

## Validation checklist

- [ ] Rollback steps written
- [ ] Tested locally
- [ ] Stored in release doc

## Quality gate

| Check               | Blocker? | Evidence |
| ------------------- | -------- | -------- |
| Plan in release doc | yes      | Doc      |

## Definition of done

1. Plan exists.
2. Tested.
3. Stored.
