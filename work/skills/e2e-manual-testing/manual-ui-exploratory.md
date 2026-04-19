---
id: manual-ui-exploratory
title: Manual UI exploratory testing
category: e2e-manual-testing
level: mandatory
applies_to:
  - frontend-page
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - qa-lead
---

# Manual UI exploratory testing

## Purpose

Click buttons in the wrong order. Paste a 100KB string into a search box. Refresh mid-flow. Real users do weird things — the UI must survive them.

## Workflow

For every new page:

1. **Happy path**: complete the golden flow.
2. **Loading**: throttle network, watch loading states.
3. **Empty**: log in as a user with no data, confirm empty state.
4. **Error**: block the API (DevTools → network → block URL), confirm error state.
5. **Double-click**: click submit twice rapidly — no double-submit.
6. **Refresh**: refresh mid-flow — does state restore?
7. **Resize**: shrink viewport to 375px — does it still work?
8. **RTL**: switch to Arabic, confirm layout.
9. **Dark mode**: toggle, confirm contrast.
10. **Keyboard**: tab through every element.

Capture screenshots for the PR.

## Strict rules

- **MUST** perform all 10 checks before claiming done.
- **MUST** attach evidence (screenshots or recording) to the PR.

## Anti-patterns

- "I tested it locally and it works" — which state? which viewport?
- Only testing happy path.
- Not testing RTL for Arabic.

## Validation checklist

- [ ] All 10 checks performed
- [ ] Screenshots/recording in PR
- [ ] All 4 states visible
- [ ] Arabic RTL verified
- [ ] Dark mode verified
- [ ] Keyboard nav verified

## Quality gate

| Check          | Blocker? | Evidence       |
| -------------- | -------- | -------------- |
| Evidence in PR | yes      | PR attachments |

## Definition of done

1. 10 checks run.
2. Evidence captured.

## References

- `docs/16-quality-engineering/UI_BROWSER_TESTING_STANDARD.md`
