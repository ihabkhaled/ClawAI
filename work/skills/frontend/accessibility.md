---
id: accessibility
title: Accessibility
category: frontend
level: mandatory
applies_to:
  - frontend-page
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - frontend-team
---

# Accessibility

## Purpose

A11y isn't a polish pass. Every feature MUST be usable by keyboard, screen reader, and at low vision. WCAG 2.1 AA is the floor.

## Strict rules

- **MUST** ensure keyboard navigation reaches every interactive element.
- **MUST** provide `alt` text on every `<img>`.
- **MUST** use semantic HTML (`<button>`, `<a>`, `<label>`) — not clickable divs.
- **MUST** label form inputs with `<Label>` or `aria-label`.
- **MUST** maintain focus order (tab key).
- **MUST NOT** use color alone to convey meaning.
- **MUST NOT** auto-play sound or motion.
- **MUST** respect `prefers-reduced-motion`.

## Anti-patterns

- Clickable `<div onClick={…}>` without keyboard handler.
- Icon-only button with no aria-label.
- Error shown only in red color, no icon/text.

## Validation checklist

- [ ] Tab through the whole page — every action reachable
- [ ] Every image has alt text (empty `alt=""` for decorative)
- [ ] Every button is a `<button>`
- [ ] Every input has a `<Label>`
- [ ] No color-only signals
- [ ] `prefers-reduced-motion` respected

## Quality gate

| Check                        | Blocker? | Evidence     |
| ---------------------------- | -------- | ------------ |
| ESLint `jsx-a11y` rules pass | yes      | CI           |
| Keyboard test passes         | yes      | Manual check |

## Definition of done

1. a11y lint passes.
2. Keyboard nav works.
3. Reviewer confirms.

## References

- ESLint `jsx-a11y` plugin rules
