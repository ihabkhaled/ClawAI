# Accessibility Testing Standard

Accessibility is a first-class requirement of the ClawAI frontend (shadcn/ui + Radix
primitives, 9 locales incl. RTL Arabic, dark mode via CSS variables). It is verified,
not assumed.

## What the linter already enforces

`eslint-plugin-jsx-a11y` runs as part of the frontend gate:

- **Errors:** `alt-text`, `anchor-is-valid`, `jsx-no-target-blank`.
- **Warnings:** `click-events-have-key-events`, `no-static-element-interactions`,
  `label-has-associated-control`.

Lint is the floor. It cannot see focus order, contrast, or screen-reader semantics —
those need tests.

## What to test (risk-based)

- **Keyboard navigation:** every interactive control is reachable and operable by
  keyboard; tab order is logical; no keyboard trap. Radix primitives give this for free —
  test that custom compositions don't break it.
- **Focus management:** visible focus rings; focus moves into an opened dialog and
  returns on close; focus is not lost after a route change or a mutation.
- **Labels & roles:** every form control (shadcn `Input`/`Select`/`Textarea`/`Checkbox`)
  has an associated label; buttons/links have accessible names; images have `alt`.
- **Contrast:** text meets WCAG AA in **both** light and dark themes (CSS variables must
  produce compliant pairs). See [visual-testing-standard](visual-testing-standard.md).
- **RTL:** with Arabic, layout mirrors and reading order is correct.
- **Live regions:** async status (thinking indicator, toasts, error banners) is announced
  to assistive tech, not only shown visually.

## How to test

- **Automated smoke** in Playwright E2E (`@axe-core/playwright` or equivalent) on
  representative pages, per light and dark theme, per LTR and RTL. Treat new violations
  as failures.
- **Keyboard-only walkthrough** of each golden path — no mouse — as part of manual UAT.
- **No raw HTML form controls** — the "no raw `<select>`/`<input>`/`<textarea>`" rule
  exists partly for accessibility; assert shadcn/ui usage.

## Definition of done

A new or changed page passes: axe smoke (light+dark, LTR+RTL) with zero new violations,
a keyboard-only pass of its golden path, and labels present on every control. An
inaccessible control is a defect, not a polish item.

## Related

- [Frontend E2E](frontend-e2e-standard.md) · [Visual testing](visual-testing-standard.md) ·
  `CLAUDE.md` → Frontend ESLint accessibility rules
