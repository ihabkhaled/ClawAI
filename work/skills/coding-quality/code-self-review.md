---
id: code-self-review
title: Code self-review
category: coding-quality
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Code self-review

## Purpose

Review your own diff as if a stranger wrote it. Catches 60% of issues before reviewers ever see them.

## Workflow

Before opening a PR, do all of these:

1. `git diff origin/main` — read every line.
2. For each hunk ask:
   - Does this belong in this PR?
   - Is the name right?
   - Is there a simpler version?
   - What breaks if this runs twice?
   - What happens if the input is `null` / `[]` / `''`?
   - Is there a test?
3. Look for leftover `console.log`, `TODO`, commented-out code — remove.
4. Re-read CLAUDE.md rules relevant to the change.
5. Run the QA script one more time.

## Strict rules

- **MUST** self-review the full diff before opening PR.
- **MUST** remove `console.log`, debug prints, commented-out code.
- **MUST** address obvious simplifications before review.

## Anti-patterns

- Opening PR with `console.log` left in.
- Relying on reviewers to catch your typos.
- 30-file diff mixing 3 unrelated changes.

## Validation checklist

- [ ] Diff read line-by-line
- [ ] Debug noise removed
- [ ] Scope is single-topic
- [ ] Tests cover the change
- [ ] QA re-run

## Quality gate

| Check              | Blocker? | Evidence       |
| ------------------ | -------- | -------------- |
| Self-reviewed diff | yes      | PR description |

## Definition of done

1. Full diff self-reviewed.
2. No debug noise.
3. Scope tight.
