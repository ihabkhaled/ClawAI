---
id: form-design
title: Form design
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

# Form design

## Purpose

Forms are high-friction surfaces. Bad forms lose users. ClawAI forms use shadcn/ui + Zod validation + explicit field-level error messaging.

## Strict rules

- **MUST** use shadcn/ui components (`Input`, `Select`, `Textarea`, `Checkbox`). No raw HTML form elements.
- **MUST** validate with Zod (schema shared with backend where possible).
- **MUST** show field-level errors inline, not only in a toast.
- **MUST** disable submit during pending mutation.
- **MUST** restore focus to the failed field on error.

## Anti-patterns

- `<select>` / `<input type="text">` raw HTML.
- Validation only on submit — validate on blur too.
- Generic "something went wrong" toast with no inline error.
- Submit button that stays enabled during pending.

## Validation checklist

- [ ] All inputs are shadcn/ui
- [ ] Zod schema on form
- [ ] Field-level errors visible
- [ ] Submit disabled while pending
- [ ] Keyboard navigation works
- [ ] Arabic RTL tested

## Quality gate

| Check                            | Blocker? | Evidence    |
| -------------------------------- | -------- | ----------- |
| Lint `no-restricted-syntax`      | yes      | CI          |
| Manual form test (invalid input) | yes      | UI evidence |

## Definition of done

1. shadcn/ui everywhere.
2. Zod validates.
3. Inline errors render.
4. Keyboard + RTL tested.

## References

- `CLAUDE.md` — Component Rules, Frontend File-Specific Restrictions
