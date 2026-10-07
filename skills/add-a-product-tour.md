---
name: add-a-product-tour
summary: Add or change a guided product tour in the portal (data, target attributes, 13 locales, tests).
task_keywords: [product tour, onboarding tour, guided tour, tour library, data-tour, help button]
applies_to: [frontend]
required_rules:
  [
    20-i18n-and-user-facing-messages,
    12-types-enums-constants-and-declaration-ownership,
    49-qa-team-discipline-and-test-evidence,
  ]
required_context: [codebase-navigation]
affected_workspaces: [apps/claw-frontend]
required_tests: [tours-content-completeness, tour route, position and storage utilities]
required_docs: [../docs/13-adr/adr-163-product-tours-are-data-driven-and-never-act-for-the-user.md]
validation_lane: frontend typecheck, eslint on touched files, vitest for the tour files, Playwright walk of the new tour
---

# Skill: Add a Product Tour

## When to use

Use when a page or flow needs a walkthrough, or an existing tour's steps change.

## Read first

- [ADR-163](../docs/13-adr/adr-163-product-tours-are-data-driven-and-never-act-for-the-user.md)

## Steps

1. Add an id to `enums/tour-id.enum.ts`.
2. Add a `TourDefinition` to `constants/tours.constants.ts`: `routes` (no locale prefix; `/x/*` means anything deeper), `excludedRoutes`, `autoOffer`, and steps `{ id, target }`. `target: null` is a centered card.
3. Put `data-tour="<target>"` on the element to highlight. Put it on the real control or a thin wrapper, never on something that moves.
4. Add title, description and every step's `title` and `body` to **all 13** files in `constants/tours-content/`. Write real translations; keep `{placeholders}` unchanged.
5. Run `npm test -- src/constants/__tests__/tours-content` in `apps/claw-frontend`. It fails on a missing locale text or a target no component carries.
6. Walk it with Playwright from the help button (`data-testid="tour-launcher"`, entry `tour-entry-<id>`): each targeted step should show a spotlight, and the card must stay on screen at 390 px and in RTL.

## Do not

- Make a step click, type or navigate. The person does the action.
- Auto-start a tour. `autoOffer` only shows the small offer.
- Point at an element that only exists in a closed dialog and expect a highlight; it falls back to a centered card.
