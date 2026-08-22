# Mobile UI Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit and repair responsive UI behavior across all ClawAI routes for mobile launch while preserving desktop behavior.

**Architecture:** A browser-driven route matrix identifies defects at five mobile/tablet viewports and one desktop control. Fixes move from shared primitives and shells to route families, with a regression test preceding every behavior change.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, shadcn/ui, Vitest, Playwright, Chrome responsive viewport control.

**Spec:** `docs/superpowers/specs/2026-08-20-mobile-ui-revamp-design.md`

## Global Constraints

- Work directly on `agent/mobile-pwa-critical-fixes` in the isolated worktree.
- Audit 320x568, 360x800, 390x844, 430x932, 768x1024, and desktop 1440x900.
- Preserve TSX render-only architecture, shadcn controls, 13-locale i18n, RTL, and safe-area behavior.
- Write a failing Vitest or Playwright regression before each implementation change.
- Run validation only in `apps/claw-frontend`; regenerate knowledge and inventory artifacts after formatting.

---

### Task 1: Baseline and Audit Matrix

**Files:**

- Create: `apps/claw-frontend/tests/e2e/mobile-full-regression.spec.ts`
- Create: `docs/16-quality-engineering/mobile-regression-findings.md`
- Modify: `apps/claw-frontend/playwright.config.ts`

**Interfaces:**

- Consumes: `.ai/manifests/frontend-routes.json` route entries.
- Produces: automated route geometry assertions and the canonical defect ledger.

- [ ] **Step 1:** Run frontend tests and record existing failures without changing code.
- [ ] **Step 2:** Add a Playwright route matrix that authenticates both supplied roles and checks document overflow, fixed-element overlap, visible control bounds, and 44px touch targets at each viewport.
- [ ] **Step 3:** Run the new spec and confirm it fails on concrete routes and selectors.
- [ ] **Step 4:** Capture each failure in `mobile-regression-findings.md` with route, role, viewport, severity, observed result, expected result, and status.
- [ ] **Step 5:** Commit and push the audit harness and evidence ledger after scoped checks pass.

### Task 2: Shared Shell and Navigation

**Files:**

- Modify: `apps/claw-frontend/src/components/layout/topbar.tsx`
- Modify: `apps/claw-frontend/src/components/layout/sidebar.tsx`
- Modify: `apps/claw-frontend/src/components/layout/mobile-bottom-nav.tsx`
- Modify: `apps/claw-frontend/src/components/layout/mobile-bottom-nav-item.tsx`
- Test: matching tests under `apps/claw-frontend/src/components/layout/__tests__/`

**Interfaces:**

- Consumes: existing responsive layout props and sidebar controller.
- Produces: stable content viewport, safe-area spacing, reachable navigation, and non-overlapping fixed regions.

- [ ] **Step 1:** Add failing tests for every shell defect in the ledger.
- [ ] **Step 2:** Run only the affected tests and confirm each new assertion fails.
- [ ] **Step 3:** Apply minimal mobile-first class and structure changes without changing desktop classes.
- [ ] **Step 4:** Run affected tests and browser-check all six viewports in LTR and RTL.
- [ ] **Step 5:** Commit and push after frontend typecheck, lint, tests, and build pass.

### Task 3: Shared Controls and Overlays

**Files:**

- Modify: affected files in `apps/claw-frontend/src/components/ui/`
- Test: matching tests in `apps/claw-frontend/src/components/ui/__tests__/`

**Interfaces:**

- Consumes: existing shadcn component APIs.
- Produces: mobile-safe inputs, textareas, buttons, selects, tabs, dropdowns, dialogs, sheets, popovers, commands, and toasts.

- [ ] **Step 1:** Add failing tests for clipping, sizing, focus, scrolling, RTL, and virtual-keyboard defects found by the matrix.
- [ ] **Step 2:** Confirm the new assertions fail against current shared primitives.
- [ ] **Step 3:** Fix only proven primitive defects, preserving public component APIs.
- [ ] **Step 4:** Run component tests and browser-check every affected primitive at 320px and desktop widths.
- [ ] **Step 5:** Commit and push after the frontend validation lane passes.

### Task 4: Public and Authentication Routes

**Files:**

- Modify: affected components under `apps/claw-frontend/src/components/marketing/` and `src/components/auth/`
- Test: matching component and page tests plus `mobile-full-regression.spec.ts`

**Interfaces:**

- Consumes: shared shell and controls from Tasks 2-3.
- Produces: polished public, login, registration, verification, and password-recovery mobile flows.

- [ ] **Step 1:** Add failing regressions for every public/auth defect in the ledger.
- [ ] **Step 2:** Confirm failures at their recorded viewport.
- [ ] **Step 3:** Apply route-family fixes, including long-copy wrapping and keyboard-safe form layout.
- [ ] **Step 4:** Verify all public/auth routes at six viewports and confirm desktop screenshots remain stable.
- [ ] **Step 5:** Commit and push after scoped gates pass.

### Task 5: Normal-User Portal Routes

**Files:**

- Modify: affected portal components under `apps/claw-frontend/src/components/`
- Test: matching component/page tests plus `mobile-full-regression.spec.ts`

**Interfaces:**

- Consumes: normal-user credentials and existing seeded data.
- Produces: responsive chat, files, models, connectors, settings, billing, routing, research, agent, and workspace experiences.

- [ ] **Step 1:** Add failing tests for each normal-user defect, grouped by feature family.
- [ ] **Step 2:** Confirm each group fails before implementation.
- [ ] **Step 3:** Fix shared family components before individual pages, including empty/error/loading states.
- [ ] **Step 4:** Verify every reachable normal-user route and representative dynamic route across the viewport matrix.
- [ ] **Step 5:** Commit and push each independently reviewable feature-family batch after scoped gates pass.

### Task 6: Administrator Routes

**Files:**

- Modify: affected files under `apps/claw-frontend/src/components/admin/` and portal admin pages.
- Test: matching admin component/page tests plus `mobile-full-regression.spec.ts`

**Interfaces:**

- Consumes: administrator credentials, permissions, and existing seeded records.
- Produces: mobile-safe admin dashboards, tables, filters, forms, editors, and destructive-action confirmations.

- [ ] **Step 1:** Add failing tests for each admin defect, including dense-table and filter interactions.
- [ ] **Step 2:** Confirm each assertion fails at the recorded viewport.
- [ ] **Step 3:** Implement compact card/list alternatives or bounded horizontal regions where data cannot stack safely.
- [ ] **Step 4:** Verify every reachable admin route and representative dynamic route across the viewport matrix.
- [ ] **Step 5:** Commit and push each independently reviewable admin batch after scoped gates pass.

### Task 7: RTL, PWA, Landscape, and Desktop Closure

**Files:**

- Modify: only files tied to residual defects in `mobile-regression-findings.md`
- Test: `apps/claw-frontend/tests/e2e/mobile-full-regression.spec.ts` and affected unit tests

**Interfaces:**

- Consumes: completed route-family fixes.
- Produces: final cross-direction, PWA, rotation, and desktop regression coverage.

- [ ] **Step 1:** Run the complete matrix in English, Arabic, and Persian and record residual failures.
- [ ] **Step 2:** Add failing tests for every residual RTL, standalone, safe-area, landscape, or desktop defect.
- [ ] **Step 3:** Apply minimal fixes at the narrowest shared ownership point.
- [ ] **Step 4:** Re-run all six viewports, keyboard navigation, console-error checks, and desktop controls.
- [ ] **Step 5:** Mark ledger entries verified only after visual and automated checks agree.

### Task 8: Final Gates and Evidence

**Files:**

- Modify: `docs/16-quality-engineering/mobile-regression-findings.md`
- Regenerate: `.ai/**`, workspace `AGENTS.md`, and `docs/features/ai-native-engineering-os/inventory.snapshot.json`

**Interfaces:**

- Consumes: completed defect ledger and final code diff.
- Produces: release-ready validation evidence.

- [ ] **Step 1:** Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` in `apps/claw-frontend`.
- [ ] **Step 2:** Format touched files, then run `npm run knowledge:build` and `npm run audit` from the repository root.
- [ ] **Step 3:** Run `npm run knowledge:verify`, `npm run audit:check`, and `npm run affected:list`.
- [ ] **Step 4:** Confirm every ledger defect is verified and every route has an audit result.
- [ ] **Step 5:** Commit generated evidence, push, and confirm the branch has no unpushed commits.
