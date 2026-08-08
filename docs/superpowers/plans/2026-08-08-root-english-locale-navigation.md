# Root English Locale Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the English homepage directly at `/`, preserve localized routes, and show an accessible full-page loader during public language navigation.

**Architecture:** Add a root-only exception to the existing locale middleware and inject the default locale header for `/`. Extend the existing marketing locale controller with pending state and render that state through a focused overlay component using the shared loading spinner.

**Tech Stack:** Next.js 16 middleware, React 19, TypeScript, Vitest, Testing Library, Tailwind, existing i18n and UI primitives.

## Global Constraints

- Preserve `/en`, `/ar`, other locale routes, and non-root unprefixed redirects.
- Reuse `common.loading`; add no locale keys.
- Keep TSX render-only and place state in the controller hook.
- Preserve the unrelated password-reset notes file.

---

### Task 1: Root English middleware behavior

**Files:**

- Modify: `apps/claw-frontend/src/__tests__/middleware.test.ts`
- Modify: `apps/claw-frontend/src/middleware.ts`

**Interfaces:**

- Consumes: `DEFAULT_LOCALE`, `LOCALE_REQUEST_HEADER`, existing rewrite/redirect utilities.
- Produces: `/` response with English request context and no redirect.

- [ ] Add failing middleware tests for `/`, `/en`, `/ar`, and `/contact`.
- [ ] Run the middleware test and confirm `/` fails by returning 308.
- [ ] Add the root-only redirect exception and default locale request header.
- [ ] Re-run the middleware test until green.

### Task 2: Pending language navigation

**Files:**

- Modify: `apps/claw-frontend/src/types/marketing.types.ts`
- Modify: `apps/claw-frontend/src/hooks/marketing/use-marketing-locale-switcher.ts`
- Create: `apps/claw-frontend/src/hooks/marketing/__tests__/use-marketing-locale-switcher.test.ts`
- Create: `apps/claw-frontend/src/components/marketing/marketing-locale-loading-overlay.tsx`
- Modify: `apps/claw-frontend/src/components/marketing/marketing-locale-switcher.tsx`
- Modify: `apps/claw-frontend/src/components/marketing/__tests__/marketing-locale-switcher.test.tsx`

**Interfaces:**

- Produces: `UseMarketingLocaleSwitcherReturn.isPending` and no-op same-locale selection.
- Consumes: existing locale context, navigation hook, `common.loading`, and shared `LoadingSpinner`.

- [ ] Add failing hook tests for pending navigation and same-locale no-op.
- [ ] Add failing component test for disabled trigger and accessible overlay.
- [ ] Run targeted tests and verify expected failures.
- [ ] Implement pending state and the overlay with minimal code.
- [ ] Re-run targeted tests until green.

### Task 3: Verification and delivery

**Files:**

- Regenerate: `.ai/**`, workspace `AGENTS.md`, inventory snapshot when generators require changes.

**Interfaces:**

- Consumes: completed routing and UI behavior.
- Produces: verified commit on `main` and remote push.

- [ ] Format touched files.
- [ ] Run frontend typecheck, lint, targeted tests, full tests, build, and Lighthouse.
- [ ] Regenerate knowledge and audit artifacts after formatting.
- [ ] Run knowledge and audit verification.
- [ ] Commit through hooks and push immediately.
