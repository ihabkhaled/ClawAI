# Plan Limits Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose and enforce every subscription quota and orchestration-lab entitlement, with backend-authoritative localized failures and end-to-end proof for the configured Free account.

**Architecture:** Extend the existing auth entitlement DTO and atomic owner-service guards. Render catalog and effective-plan limits through the existing frontend components, map stable backend codes to translations, and verify the current Compare/lab gates with direct API tests instead of creating a second authorization layer.

**Tech Stack:** NestJS 11, Prisma 7.8, Zod 4.4, Next.js 16, React 19, Vitest, Jest, Playwright, TanStack Query, repository i18n.

**Spec:** `docs/superpowers/specs/2026-08-20-plan-limits-enforcement-design.md`

## Global Constraints

- `null` means unlimited; `0` means disabled.
- Free-plan target: 300,000 daily tokens, 20,000 weekly tokens, unlimited monthly tokens, and 5 chat threads per UTC day.
- Backend errors are authoritative; known quota/feature errors must never depend on raw English messages.
- Every plan feature requires both its plan flag and matching role permission at the backend boundary.
- All user-facing additions require real translations in every repository locale plus `i18n.types.ts` in the same commit.
- Credentials are runtime-only and must not enter source, logs, screenshots, QA documents, commits, or PR text.
- Tests are written and observed failing before production changes.

---

### Task 1: Complete the plan administration contract

**Files:**

- Modify: `apps/claw-auth-service/src/modules/plans/dto/create-plan.dto.ts`
- Modify: `apps/claw-auth-service/src/modules/plans/dto/update-plan.dto.ts`
- Modify: `apps/claw-auth-service/src/modules/plans/types/plans.types.ts`
- Modify: `apps/claw-auth-service/src/modules/plans/services/plans.service.ts`
- Test: `apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-quota.dto.spec.ts`
- Test: `apps/claw-auth-service/src/modules/plans/services/__tests__/plans.service.spec.ts`
- Modify: `apps/claw-frontend/src/types/plan.types.ts`
- Modify: `apps/claw-frontend/src/constants/plan.constants.ts`
- Modify: `apps/claw-frontend/src/lib/validation/plan.schema.ts`
- Modify: `apps/claw-frontend/src/hooks/plans/use-plan-form.ts`
- Modify: `apps/claw-frontend/src/components/admin/plans/plan-form.tsx`
- Modify: `apps/claw-frontend/src/types/i18n.types.ts`
- Modify: `apps/claw-frontend/src/lib/i18n/locales/{en,ar,de,es,fa,fr,hi,it,ja,pt,ru,th,zh}.ts`
- Test: `apps/claw-frontend/src/hooks/plans/__tests__/use-plan-form.test.ts`
- Test: `apps/claw-frontend/src/repositories/admin/__tests__/plans.repository.test.ts`

**Interfaces:**

- Produces: `weeklyTokenQuota: number | null` on `PlanView`; optional `weeklyTokenQuota` on create/update requests; controlled `weeklyTokenQuota: string` in `PlanFormState`.
- Consumes: existing Prisma `Plan.weeklyTokenQuota` and plan repository create/update data.

- [ ] **Step 1: Write failing backend DTO and service tests** proving `weeklyTokenQuota` accepts a non-negative integer, rejects negative/fractional/oversized values, persists on create, and updates to a finite value.
- [ ] **Step 2: Run targeted auth tests** with `npm test -- --runInBand src/modules/plans/dto/__tests__/plan-quota.dto.spec.ts src/modules/plans/services/__tests__/plans.service.spec.ts`; expect failures because the field is stripped or omitted.
- [ ] **Step 3: Add the backend field** to create/update schemas, view/data types, and service mappings using the same maximum as other token windows.
- [ ] **Step 4: Run the targeted auth tests** and expect all cases to pass.
- [ ] **Step 5: Write failing frontend tests** proving edit hydration and exact create/update request bodies include `weeklyTokenQuota: 20_000`, while blank input serializes as omitted/unlimited according to the existing DTO convention.
- [ ] **Step 6: Run targeted frontend tests** with `npm test -- --run src/hooks/plans/__tests__/use-plan-form.test.ts src/repositories/admin/__tests__/plans.repository.test.ts`; expect missing-field failures.
- [ ] **Step 7: Add frontend types, default state, Zod validation, payload mapping, a shadcn `Input`, and real translations in all 13 user locale dictionaries plus `i18n.types.ts`** for weekly token quota.
- [ ] **Step 8: Run targeted frontend tests** and expect all cases to pass.
- [ ] **Step 9: Format, regenerate, run auth/frontend scoped gates, commit, and push** as `fix(plans): complete weekly quota contract`.

### Task 2: Show every limit and lab on plan surfaces

**Files:**

- Modify: `apps/claw-frontend/src/types/plan.types.ts`
- Modify: `apps/claw-frontend/src/components/account/plan-limits.tsx`
- Modify: `apps/claw-frontend/src/components/account/plan-feature-gates.tsx`
- Modify: `apps/claw-frontend/src/components/billing/billing-plan-card.tsx`
- Modify: `apps/claw-frontend/src/components/marketing/home/plan-tier-card.tsx`
- Create or modify: `apps/claw-frontend/src/constants/plan-limit.constants.ts`
- Test: `apps/claw-frontend/src/components/account/__tests__/account-plan-components.test.tsx`
- Test: `apps/claw-frontend/src/components/billing/__tests__/billing-components.test.tsx`
- Test: `apps/claw-frontend/src/components/marketing/home/__tests__/plan-tier-card.test.tsx`
- Test: `apps/claw-frontend/src/app/(portal)/plan/__tests__/plan-page.test.tsx`
- Test: `apps/claw-frontend/src/app/(portal)/billing/checkout/__tests__/page.test.tsx`

**Interfaces:**

- Produces: complete `EntitlementPlanLimits` with `dailyTokens`, `weeklyTokens`, `monthlyTokens`, `chatsPerDay`, `messagesPerDay`, `workspaceConnections`, `contextPacks`, and `memoryItems`.
- Consumes: existing `PLAN_FEATURE_GATE_FIELDS` registry containing all general gates and nine labs.

- [ ] **Step 1: Write failing component/page tests** asserting all eight limits and the nine named labs render, including `Unlimited` for null and `Disabled` for zero where catalog semantics apply.
- [ ] **Step 2: Run the five targeted frontend test files** and observe missing limit labels/values.
- [ ] **Step 3: Expand entitlement types and introduce declarative limit-row metadata** so account, billing, and public cards use one canonical field order without inline declarations.
- [ ] **Step 4: Render every limit on My Plan, subscription cards, and checkout/public plan cards** while retaining responsive `dl` semantics and existing feature-gate rendering.
- [ ] **Step 5: Re-run targeted tests** and expect all assertions to pass.
- [ ] **Step 6: Format, run frontend scoped gates, regenerate managed artifacts, commit, and push** as `fix(frontend): show complete plan entitlements`.

### Task 3: Translate backend quota failures at every frontend entry point

**Files:**

- Modify: `apps/claw-frontend/src/enums/api-error-code.enum.ts`
- Modify: `apps/claw-frontend/src/utilities/api-error-message.utility.ts`
- Modify: `apps/claw-frontend/src/hooks/chat/use-send-message.ts`
- Modify: `apps/claw-frontend/src/hooks/chat/use-create-thread.ts`
- Test: `apps/claw-frontend/src/hooks/chat/__tests__/use-create-thread.test.ts`
- Modify: `apps/claw-frontend/src/types/i18n.types.ts`
- Modify: all locale dictionaries under `apps/claw-frontend/src/lib/i18n/locales/{en,ar,de,es,fa,fr,hi,it,ja,pt,ru,th,zh}.ts`
- Test: `apps/claw-frontend/src/utilities/__tests__/api-error-message.utility.test.ts`
- Test: message/thread hook tests adjacent to the modified hooks

**Interfaces:**

- Produces: enum members `PLAN_DAILY_CHAT_LIMIT_EXCEEDED` and `PLAN_DAILY_MESSAGE_LIMIT_EXCEEDED`; `resolveApiErrorMessage()` maps them to typed locale keys.
- Consumes: backend `BusinessException` payload `{ code, message, statusCode }` preserved by `api-client.ts`.

- [ ] **Step 1: Write failing utility and hook tests** for both 429 codes, proving translated text appears in chat/thread state or toast and raw backend English does not.
- [ ] **Step 2: Run targeted tests** and observe fallback/raw-message failures.
- [ ] **Step 3: Add stable enum and resolver mappings** for thread and message limits.
- [ ] **Step 4: Route message and thread mutation errors through the resolver** without changing unknown-error fallback behavior.
- [ ] **Step 5: Add real translations to all 13 user locale dictionaries and the matching `i18n.types.ts` keys**; do not edit auxiliary translation fragments unless their schema owns the key.
- [ ] **Step 6: Re-run targeted tests and `node tools/audit-untranslated-i18n.cjs`**; expect zero new untranslated entries.
- [ ] **Step 7: Format, run frontend scoped gates, regenerate managed artifacts, commit, and push** as `fix(frontend): localize plan quota failures`.

### Task 4: Prove backend quota and feature enforcement

**Files:**

- Test: `apps/claw-chat-service/src/modules/chat-threads/__tests__/chat-threads.service.spec.ts`
- Test: `apps/claw-chat-service/src/modules/chat-messages/__tests__/chat-messages.service.spec.ts`
- Test: `apps/claw-chat-service/src/modules/chat-messages/__tests__/compare-judge-plan-gates.spec.ts`
- Test: `apps/claw-chat-service/src/modules/chat-messages/__tests__/orchestration-plan-gates.spec.ts`
- Test or modify only if evidence finds a gap: workspace/context-pack/memory service tests beside their existing atomic guards.

**Interfaces:**

- Consumes: `createWithinDailyLimit`, `createUserMessageWithinDailyLimit`, and `AccessControlService.assertCanSendMessage`.
- Produces: regression proof for 429 thread/message limits and 403 plan/RBAC denial for Compare plus nine labs.

- [ ] **Step 1: Add boundary tests** for the fifth allowed and sixth rejected thread, the last allowed and next rejected message, null unlimited, zero disabled, and concurrent creates delegated to atomic repositories.
- [ ] **Step 2: Run targeted chat tests** and record whether existing implementation passes; a passing test verifies existing behavior rather than authorizing unnecessary production edits.
- [ ] **Step 3: Add table-driven direct-service tests** for Compare and each lab with plan disabled, permission missing, and both enabled.
- [ ] **Step 4: Run the plan-gate tests**; if any case fails, trace the exact endpoint to `assertCanSendMessage`, write the smallest failing reproduction, and patch only that missing gate.
- [ ] **Step 5: Run chat-service typecheck, lint, tests, and build** with zero failures.
- [ ] **Step 6: Commit and push test-only proof or minimal fixes** as `test(chat): prove plan limit enforcement` or `fix(chat): close plan enforcement gaps`.

### Task 5: Live E2E, PR, and release

**Files:**

- Modify: `apps/claw-frontend/tests/e2e/public-pricing.spec.ts`
- Modify: `apps/claw-frontend/tests/e2e/orchestration-labs.spec.ts`
- Create: `apps/claw-frontend/tests/e2e/plan-limit-enforcement.spec.ts`
- Create: `.claude/Integrations/plan-limits-enforcement__QA_output.md`

**Interfaces:**

- Consumes: deployed/local API, supported login flow, supplied Free account, plan catalog, chat/thread APIs.
- Produces: browser and direct-API evidence without persisted credentials.

- [ ] **Step 1: Write failing Playwright assertions** for all visible plan limits/labs and direct API denial of disabled Compare and each disabled lab.
- [ ] **Step 2: Run the focused Playwright specs in a fresh browser context** and confirm failures reflect missing UI/error behavior rather than environment setup.
- [ ] **Step 3: Through supported admin APIs, verify the supplied account is on Free and its plan has the requested token/thread values**; update plan configuration only if the authenticated admin surface permits it and capture no secrets.
- [ ] **Step 4: Exercise five successful thread creations and assert the sixth returns 429 with `PLAN_DAILY_CHAT_LIMIT_EXCEEDED`; exercise the configured message boundary similarly.** Clean up test-created resources through supported APIs where deletion does not alter quota history.
- [ ] **Step 5: Switch to Arabic or German and verify translated quota UX, dark mode, 375×812 layout, keyboard order, and no overflow.**
- [ ] **Step 6: Run full scoped gates** for every touched workspace, `knowledge:verify`, `audit:check`, and the applicable Lighthouse assertions.
- [ ] **Step 7: Write sanitized QA evidence**, regenerate after final formatting, commit, and push as `test(e2e): cover subscription limit enforcement`.
- [ ] **Step 8: Open the GitHub PR** with audit verdict, screenshots/evidence references, test counts, and no credentials.
- [ ] **Step 9: Monitor and fix every required PR check** until green; do not merge around failures.
- [ ] **Step 10: Merge through the repository-supported path and monitor the automatic release workflow** that creates the version bump, tag, GitHub release, and deployment. Verify the released SHA and smoke-test the production plan and rejection paths.
