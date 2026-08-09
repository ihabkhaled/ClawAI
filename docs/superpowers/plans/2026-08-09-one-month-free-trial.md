# One-Month Free Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a once-per-account, fixed 30-day Free trial and require an expired user to activate a non-trial paid plan before consuming further AI quota.

**Architecture:** Auth-service owns trial configuration, lifetime redemption, assignment expiry, and the central entitlement decision. Existing internal entitlement/quota clients propagate the stable rejection code to chat/model callers; the frontend consumes presentation-safe trial state for the portal banner and translates the same backend code for chat/toast errors.

**Tech Stack:** PostgreSQL/Prisma, NestJS, Zod DTOs, shared TypeScript contracts, Next.js 16/React Query, Vitest/Jest, 13-locale i18n.

## Global Constraints

- Trial eligibility is once per authenticated account across all trial-flagged plans.
- Only the seeded Free plan is trial-flagged; the $1 testing plan is unchanged.
- Trial duration is exactly 30 days and expiry is inclusive (`now >= expiresAt`).
- Auth-service is the sole database owner; no service reads another service's database.
- Admin bypass remains unchanged; non-admin AI usage fails closed after expiry.
- The stable backend code is `PLAN_TRIAL_EXPIRED`; no English backend message is used as a translation key.
- All user-facing copy exists in EN/AR/DE/ES/FA/FR/HI/IT/JA/PT/RU/TH/ZH.
- Existing user-owned `next-env.d.ts` and password-reset notes remain untouched.

---

### Task 1: Trial schema, migration, and seed

**Files:**

- Modify: `apps/claw-auth-service/prisma/schema.prisma`
- Create: `apps/claw-auth-service/prisma/migrations/<timestamp>_one_month_plan_trials/migration.sql`
- Modify: `apps/claw-auth-service/prisma/seeders/plan-catalog.json`
- Modify: `apps/claw-auth-service/prisma/seeders/plan-catalog.seeder.js`
- Test: `apps/claw-auth-service/src/modules/plans/__tests__/plan-catalog.spec.ts`

**Interfaces:**

- Produces Plan fields `isTrial: boolean` and `trialDurationDays: number | null`.
- Produces `PlanTrialRedemption` with unique `userId`, `planId`, `assignmentId`, `startedAt`, and `expiresAt`.
- Existing `UserPlanAssignment.entitlementValidUntil` carries the redemption deadline.

- [ ] **Step 1: Write failing catalog/migration assertions**

Assert the Free catalog row declares `isTrial: true`, `trialDurationDays: 30`, every other seeded plan is non-trial, and schema/migration text contains the unique user redemption constraint and existing-Free backfill.

- [ ] **Step 2: Run the focused plan-catalog test and observe RED**

Run `cd apps/claw-auth-service && npm test -- --runInBand src/modules/plans/__tests__/plan-catalog.spec.ts` and confirm failure is caused by missing trial fields/schema.

- [ ] **Step 3: Add schema and safe backfill migration**

Add the two Plan columns, redemption relation/model, and SQL constraints. Backfill `free` to 30 days; derive each existing user's redemption/deadline from the earliest Free assignment without extending old accounts. Do not alter prices or payment rows.

- [ ] **Step 4: Update the seed catalog and idempotent seeder**

Persist the two fields from catalog input. Reject `isTrial=true` with a duration other than 30, and normalize non-trial duration to null.

- [ ] **Step 5: Run the focused test and observe GREEN**

Run the same focused test once.

### Task 2: Atomic redemption and plan admin contracts

**Files:**

- Modify: `apps/claw-auth-service/src/modules/plans/dto/create-plan.dto.ts`
- Modify: `apps/claw-auth-service/src/modules/plans/dto/update-plan.dto.ts`
- Modify: `apps/claw-auth-service/src/modules/plans/types/plans.types.ts`
- Modify: `apps/claw-auth-service/src/modules/plans/repositories/plans.repository.ts`
- Modify: `apps/claw-auth-service/src/modules/plans/services/plans.service.ts`
- Test: `apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts`
- Test: `apps/claw-auth-service/src/modules/plans/services/__tests__/plans.service.spec.ts`
- Add DTO tests beside existing plan DTO tests.

**Interfaces:**

- Create/update inputs accept `isTrial` and `trialDurationDays` with the invariant `(false,null) | (true,30)`.
- Repository exposes `assignTrialPlanOnce(userId, planId, assignedBy, now): Promise<UserPlanAssignment | null>`; null represents an already-consumed trial.
- Service raises `PLAN_TRIAL_ALREADY_USED` for a repeated redemption.

- [ ] **Step 1: Write failing DTO, exact repository, and service tests**

Cover valid enable/disable payloads, invalid durations, a first atomic redemption, a uniqueness conflict, and non-trial assignment retaining existing behavior.

- [ ] **Step 2: Run only those tests and observe RED**

Use Jest file paths for the DTO, repository, and service suites; verify failures are missing contracts/methods.

- [ ] **Step 3: Implement DTO/type/repository/service changes**

Keep transaction and Prisma operations in the repository. Compute `expiresAt` from the injected `now + 30 * 24 * 60 * 60 * 1000`; never accept client timestamps.

- [ ] **Step 4: Run focused tests and observe GREEN**

Confirm repeated assignment cannot create or reactivate a trial.

### Task 3: Central entitlement expiry and shared error propagation

**Files:**

- Modify: `apps/claw-auth-service/src/modules/entitlements/types/entitlements.types.ts`
- Modify: `apps/claw-auth-service/src/modules/entitlements/services/entitlements.service.ts`
- Modify: `apps/claw-auth-service/src/modules/entitlements/services/runtime-admission.service.ts`
- Modify: `apps/claw-auth-service/src/modules/entitlements/services/usage-view.service.ts`
- Modify: `apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts`
- Modify: `packages/shared-entitlements/src/types.ts`
- Modify: `packages/shared-entitlements/src/entitlements-adapter.ts`
- Modify: `packages/shared-types/src/enums/api-error-code.enum.ts` or the existing shared business-error catalog.
- Test: entitlement, runtime-admission, quota-controller, and shared-adapter suites.

**Interfaces:**

- Entitlement plan view adds `isTrial`, `trialEndsAt`, `isTrialExpired`.
- A non-admin expired trial throws/returns HTTP 403 with `errorCode: 'PLAN_TRIAL_EXPIRED'`.
- Adapter preserves bounded structured error codes rather than replacing them with a generic transport error.

- [ ] **Step 1: Write failing boundary tests**

Cover one millisecond before expiry, exact expiry, after expiry, admin bypass, active paid replacement, quota reservation, and runtime admission.

- [ ] **Step 2: Run focused tests and observe RED**

Confirm current behavior still grants quota at/after the deadline.

- [ ] **Step 3: Implement one reusable trial-expiry policy**

Resolve trial state from the active plan assignment in auth-service. Reuse it from entitlements, usage, runtime admission, and quota; do not duplicate `Date.now()` comparisons across controllers/services.

- [ ] **Step 4: Preserve the error through shared adapters**

Runtime-validate the internal response/error shape and fail closed for malformed or unavailable auth responses.

- [ ] **Step 5: Run focused tests and observe GREEN**

Verify paid entitlement activation removes the block while the redemption history remains.

### Task 4: Admin plan form and exact API serialization

**Files:**

- Modify: `apps/claw-frontend/src/types/plan.types.ts`
- Modify: `apps/claw-frontend/src/constants/plan.constants.ts`
- Modify: `apps/claw-frontend/src/lib/validation/plan.schema.ts`
- Modify: `apps/claw-frontend/src/hooks/plans/use-plan-form.ts`
- Modify: `apps/claw-frontend/src/components/admin/plans/plan-form.tsx`
- Modify the existing frontend plan repository and its tests.
- Test: `apps/claw-frontend/src/components/admin/plans/__tests__/plan-form.test.tsx`
- Test: `apps/claw-frontend/src/hooks/plans/__tests__/use-plan-form.test.ts`

**Interfaces:**

- `PlanFormState.isTrial: boolean`.
- Form serialization sends `isTrial` and `trialDurationDays: state.isTrial ? 30 : null` in the exact create/update body.

- [ ] **Step 1: Write failing form/controller/repository tests**

Assert switch rendering, editing an existing trial plan, toggle state, fixed 30-day helper text, and the complete serialized request body.

- [ ] **Step 2: Run focused frontend tests and observe RED**

- [ ] **Step 3: Implement render-only UI and controller logic**

Use the existing shadcn `Switch`; keep constants, mapping, and mutation payload construction outside TSX.

- [ ] **Step 4: Run focused tests and observe GREEN**

### Task 5: Portal banner, chat/toast mapping, and 13 locales

**Files:**

- Modify: `apps/claw-frontend/src/enums/api-error-code.enum.ts`
- Modify: `apps/claw-frontend/src/types/plan.types.ts`
- Create: `apps/claw-frontend/src/components/layout/trial-status-banner.tsx`
- Create: `apps/claw-frontend/src/hooks/layout/use-trial-status-banner.ts`
- Modify: `apps/claw-frontend/src/components/layout/portal-shell.tsx` or `portal-content.tsx`
- Modify the existing chat API error-to-message utility/hook used by send-message failures.
- Modify: `apps/claw-frontend/src/utilities/toast.utility.ts` only if the central mapping belongs there.
- Modify: `apps/claw-frontend/src/types/i18n.types.ts`
- Modify all 13 files under `apps/claw-frontend/src/lib/i18n/locales/`.
- Test: portal/trial banner, chat error mapping, toast mapping, and locale completeness suites.

**Interfaces:**

- Banner controller consumes `UserEntitlements` and produces `hidden | active | expired`, localized date/days parameters, and `/billing` upgrade action.
- `PLAN_TRIAL_EXPIRED` maps to a dedicated translation key for both persistent chat error and toast.

- [ ] **Step 1: Write failing banner and error-mapping tests**

Cover active trial, expired trial, paid/non-trial absence, upgrade link, backend-code mapping, and no raw backend English leakage.

- [ ] **Step 2: Run focused tests and observe RED**

- [ ] **Step 3: Implement controller, render component, and error mapping**

Mount the banner directly below the navbar/topbar and above portal content. Chat keeps its existing error state while also invoking the mapped toast.

- [ ] **Step 4: Add all 13 translations and update typed dictionary/count tests**

Translate trial-active title/body, trial-expired title/body, days remaining, upgrade action, admin toggle/help, and chat rejection.

- [ ] **Step 5: Run focused tests and observe GREEN**

### Task 6: Cross-layer review, generated artifacts, and delivery

**Files:**

- Update service/frontend docs and ADR only where the final implementation changes documented contracts.
- Regenerate `.ai/**`, workspace `AGENTS.md`, Prisma clients, and inventory via repository hooks/generators.

**Interfaces:**

- No new public payment endpoint, environment variable, Docker service, or nginx route.

- [ ] **Step 1: Review security and database boundaries**

Confirm userId is principal-derived, trial clocks are server-owned, payment DB is untouched, unique redemption is concurrent-safe, and admin bypass is explicit/tested.

- [ ] **Step 2: Run one scoped validation boundary**

Run affected auth/shared/frontend typecheck, lint, focused/full tests as required, and builds once immediately before commit. Do not run Playwright unless browser-only behavior cannot be proven by component tests.

- [ ] **Step 3: Commit normally and push**

Do not bypass hooks. Preserve user-owned dirty files and let the pre-commit hook format before regeneration.

## Self-review result

- Spec coverage: all schema, once-per-account, expiry enforcement, paid upgrade, admin UI, banner/chat/toast, i18n, backfill, and non-goals map to a task.
- Placeholder scan: no deferred implementation placeholders remain.
- Type consistency: `isTrial`, `trialDurationDays`, `trialEndsAt`, `isTrialExpired`, `PlanTrialRedemption`, and `PLAN_TRIAL_EXPIRED` use identical names across tasks.
- Scope: payment-service receives no schema change because Free entitlement has no payment; existing paid entitlement events remain the upgrade path.
