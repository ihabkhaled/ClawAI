# Mobile UI Revamp Design

## Goal

Make every ClawAI route usable, polished, accessible, and visually consistent on
supported mobile viewports without changing desktop behavior.

## Scope

- Audit all routes in `.ai/manifests/frontend-routes.json` as public, normal-user,
  and administrator access permits.
- Exercise 320x568, 360x800, 390x844, 430x932, and 768x1024 viewports, with a
  1440x900 desktop regression viewport.
- Inspect navigation, content hierarchy, typography, forms, dialogs, sheets,
  menus, tables, cards, lists, empty/loading/error states, touch targets,
  keyboard focus, scrolling, safe areas, RTL, and PWA surfaces.
- Build on the fixes already present on `agent/mobile-pwa-critical-fixes`.

## Approach

Use a route matrix backed by browser evidence and bounded geometry checks. Fix
shared layout and UI primitives before route-specific defects so a single change
can resolve repeated failures. Each fix batch receives a failing Vitest or
Playwright regression test first, browser verification at affected viewports,
desktop regression verification, and the frontend validation lane.

## Defect Evidence

Each defect records route, role, viewport, severity, component, observed result,
expected result, source cause, fix batch, and verification status. A route passes
only when it has no unintended horizontal page overflow, clipped controls,
unreachable actions, overlapping fixed UI, undersized interactive targets,
unreadable text, or broken responsive/RTL behavior.

## Delivery Batches

1. Audit harness and shared shell.
2. Shared form, overlay, navigation, table, and content primitives.
3. Public marketing and authentication routes.
4. Normal-user portal routes grouped by feature family.
5. Administrator routes and data-dense workflows.
6. RTL, PWA, landscape, and desktop regression closure.

## Constraints

- TSX remains render-only and uses existing controller-hook patterns.
- Form controls use shadcn/ui.
- User-visible copy uses all 13 locales and updates `i18n.types.ts` atomically.
- Every changed behavior has a test written before its implementation.
- No generated artifact is edited by hand.
- Validation runs only in `apps/claw-frontend`, followed by required knowledge
  and inventory regeneration after formatting settles.

## Completion

All reachable routes and representative dynamic routes are recorded in the
matrix; every found defect is fixed or has a concrete environmental reason; all
mobile viewports and the desktop control viewport pass; frontend typecheck,
lint, tests, build, knowledge verification, and inventory checks are green.
