# Visual Testing Standard

Guards against visual regressions the type system and unit tests can't see: invisible
text in dark mode, broken RTL mirroring, overflow on mobile, and raw i18n keys rendering
where a translation should be.

## Why here

ClawAI theming is CSS-variable driven (no `dark:` prefixes), ships 9 locales including
RTL Arabic, and is mobile-responsive. The failure modes are visual: a wrong variable
pair makes text invisible in one theme; a missing RTL rule breaks Arabic; a stringly-
typed `t()` key renders raw (see [`../memory/known-pitfalls.md`](../memory/known-pitfalls.md)).
None of these fail a green gate.

## The matrix

Every visually-significant page/component is checked across:

| Axis      | Values                      |
| --------- | --------------------------- |
| Theme     | light, dark                 |
| Direction | LTR (e.g. `en`), RTL (`ar`) |
| Viewport  | desktop, mobile (375×812)   |

## What to assert

- **Dark mode:** no invisible text (foreground/background variable pair has contrast),
  no white flashes on load. Contrast overlaps with
  [accessibility-testing-standard](accessibility-testing-standard.md).
- **RTL:** layout mirrors; icons/arrows that imply direction flip; text aligns right.
- **Mobile:** no horizontal overflow; the page body never scrolls sideways; collapsible
  sidebar and responsive grids behave.
- **i18n render:** in a non-English locale, no raw key strings render (assert visible
  text is a real translation, not `some.dotted.key`).
- **States:** loading / empty / error / success each render without layout breakage.

## How to test

- **Playwright screenshot comparison** on representative pages across the matrix axes,
  with a stable baseline. Mask genuinely dynamic regions (timestamps, ids) to avoid
  false diffs.
- **Deterministic rendering:** pin locale/timezone, disable animations, freeze data —
  a flaky visual test is worse than none ([flaky-test-policy](flaky-test-policy.md)).
- Review baseline updates deliberately — a baseline change is a reviewed decision, never
  an auto-accept.

## Scope discipline

Visual tests are targeted, not blanket — snapshot the pages where a regression would be
costly (chat thread, compare, model catalog, admin pages), not every trivial component.
Unit and E2E cover behavior; visual tests cover appearance.

## Related

- [Frontend E2E](frontend-e2e-standard.md) · [Accessibility testing](accessibility-testing-standard.md) ·
  [`../memory/frontend-patterns.md`](../memory/frontend-patterns.md)
