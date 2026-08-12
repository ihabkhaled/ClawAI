# Chat Routing and Quality Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make checkout loading visually atomic, make AUTO routing choose only reachable text models, and expose thread Judge/Critic controls in a focused header panel.

**Architecture:** Preserve the existing PayPal readiness state and thread-settings state owner. Strengthen the PayPal visual boundary, make deterministic routing health-strict when the local router is unavailable, and split quality workflow presentation into a new props-driven component rendered by the chat shell.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest/Testing Library, NestJS, Jest.

## Global Constraints

- No database migration or API contract change.
- No new user-facing copy unless all 13 locales and `i18n.types.ts` are updated together.
- Never select image/file execution for plain text chat.
- Never select a provider explicitly marked unhealthy.
- Every production behavior change begins with a failing regression test.
- Regenerate knowledge and inventory artifacts after formatting settles.

---

### Task 1: Make PayPal loading visually atomic

**Files:**

- Modify: `apps/claw-frontend/src/components/billing/gateway-checkout-dialog.tsx`
- Test: `apps/claw-frontend/src/components/billing/__tests__/gateway-checkout-dialog.test.tsx`

**Interfaces:**

- Consumes: existing `isPaypalLoading` readiness derived from `paypalReadySessionId`.
- Produces: an opaque loader and a non-interactive, `aria-hidden` SDK container until both renders finish.

- [x] **Step 1: Write the failing test**

Assert the SDK container has `opacity-0`, `pointer-events-none`, and `aria-hidden="true"` while either render promise is unresolved; assert the loader has `z-20` and `bg-white`.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/components/billing/__tests__/gateway-checkout-dialog.test.tsx`

Expected: FAIL because the existing component uses inherited `visibility` and a transparent `z-10` loader.

- [x] **Step 3: Implement the minimal loader boundary**

Use parent opacity and pointer blocking for the SDK container, `aria-hidden={isPaypalLoading}`, and an opaque higher-z loader.

- [x] **Step 4: Run focused and full frontend gates**

Run: `npm run typecheck && npm run lint && npm test && npm run build`

Expected: PASS; lint may retain only documented pre-existing warnings.

### Task 2: Make AUTO routing health-strict and capability-safe

**Files:**

- Modify: `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts`
- Modify if required: `apps/claw-routing-service/src/modules/routing/types/routing.types.ts`
- Test: `apps/claw-routing-service/src/modules/routing/__tests__/routing.manager.spec.ts`
- Test: `apps/claw-routing-service/src/modules/routing/__tests__/routing.semantic-guard.spec.ts`

**Interfaces:**

- Consumes: `RoutingContext.connectorHealth`, `RoutingContext.runtimeHealth`, and the existing cloud priority list.
- Produces: a text-capable reachable primary decision, or an explicit non-executable unavailable result when none exists.

- [ ] **Step 1: Write failing routing regressions**

Add literal cases proving that an unavailable Anthropic connector is never selected, a healthy OpenAI/Gemini connector is promoted, and `Hi` cannot select an `IMAGE_*` provider.

- [ ] **Step 2: Run routing tests and verify RED**

Run: `npm test -- --runInBand src/modules/routing/__tests__/routing.manager.spec.ts src/modules/routing/__tests__/routing.semantic-guard.spec.ts`

Expected: FAIL on the branch that currently chooses the first cloud provider despite explicit unhealthy status.

- [ ] **Step 3: Implement health-strict deterministic fallback**

Remove the explicit-unhealthy best-effort branch. Select only healthy providers from the text priority list and preserve only healthy text fallbacks. Represent no reachable execution model using the repository's existing unsatisfiable/error decision contract discovered from current routing consumers.

- [ ] **Step 4: Run routing-service gates**

Run: `npm run typecheck && npm run lint && npm test && npm run build`

Expected: PASS with zero new warnings or failures.

### Task 3: Extract a focused Judge & Critic panel

**Files:**

- Create: `apps/claw-frontend/src/components/chat/thread-quality-panel.tsx`
- Modify: `apps/claw-frontend/src/components/chat/chat-thread-shell.tsx`
- Modify: `apps/claw-frontend/src/components/chat/thread-settings.tsx`
- Modify: `apps/claw-frontend/src/hooks/chat/use-thread-detail-page.ts`
- Modify: `apps/claw-frontend/src/types/component.types.ts`
- Test: `apps/claw-frontend/src/components/chat/__tests__/thread-quality-panel.test.tsx`
- Test: `apps/claw-frontend/src/components/chat/__tests__/thread-settings.test.tsx`
- Test: `apps/claw-frontend/src/hooks/chat/__tests__/use-thread-detail-page.test.tsx`

**Interfaces:**

- Consumes: Judge/Critic/quality fields and `handleSave` from `useThreadSettings`.
- Produces: `ThreadQualityPanelProps` and chat-shell toggle/label props for one combined header entry point.

- [ ] **Step 1: Write failing presentation tests**

Assert Thread Settings contains no Judge, Critic, threshold, or reroute controls. Assert the new panel renders all allowed controls, honors Judge/Critic plan gates, and invokes the shared save callback.

- [ ] **Step 2: Run focused frontend tests and verify RED**

Run: `npm test -- --run src/components/chat/__tests__/thread-settings.test.tsx src/components/chat/__tests__/thread-quality-panel.test.tsx src/hooks/chat/__tests__/use-thread-detail-page.test.tsx`

Expected: FAIL because the quality component and shell props do not yet exist and Thread Settings still owns the presentation.

- [ ] **Step 3: Implement the component and prop split**

Create the focused panel using existing `CompareJudgeControls` and `CompareCriticControls`. Move threshold, reroute, and Save presentation into it. Reduce `ThreadSettingsProps` to non-quality fields and introduce `ThreadQualityPanelProps` for quality fields.

- [ ] **Step 4: Wire the header toggle beside Compare Models**

Add one plan-gated button after Compare Models, render the panel beneath the header, and pass existing `useThreadSettings` state/actions from `useThreadDetailPage`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the command from Step 2.

Expected: PASS.

### Task 4: Verify and refresh repository artifacts

**Files:**

- Regenerate: `.ai/**`
- Regenerate: workspace `AGENTS.md` files as selected by the generator
- Regenerate: `docs/features/ai-native-engineering-os/inventory.snapshot.json`

**Interfaces:**

- Consumes: final formatted source tree.
- Produces: CI-consistent generated hashes and inventory.

- [ ] **Step 1: Format exact touched source and documentation files**

Run Prettier against the explicit touched paths only.

- [ ] **Step 2: Run scoped frontend and routing validation**

Run typecheck, lint, tests, and build inside `apps/claw-frontend` and `apps/claw-routing-service`.

- [ ] **Step 3: Regenerate artifacts**

Run: `npm run knowledge:build && npm run audit`

- [ ] **Step 4: Verify generated artifacts**

Run: `npm run knowledge:verify && npm run audit:check`

- [ ] **Step 5: Review the final diff**

Confirm the unrelated existing `apps/claw-frontend/next-env.d.ts` change remains untouched and report it separately.
