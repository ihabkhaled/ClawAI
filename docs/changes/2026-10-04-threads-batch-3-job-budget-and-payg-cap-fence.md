# Change - Threads batch 3 job budget and PAYG cap fence

## Files

- `apps/claw-auth-service/prisma/migrations/20261004180000_add_threads_job_budgets/migration.sql` (A)
- `apps/claw-auth-service/src/modules/credit/constants/thread-job-budget.constants.ts` (A)
- `apps/claw-auth-service/src/modules/credit/enums/thread-job-budget-close-status.enum.ts` (A)
- `apps/claw-auth-service/src/modules/credit/services/__tests__/thread-job-budget.service.spec.ts` (A)
- `apps/claw-auth-service/src/modules/credit/services/thread-job-budget.service.ts` (A)
- `apps/claw-auth-service/src/modules/entitlements/controllers/thread-job-budget-internal.controller.ts` (A)
- `apps/claw-auth-service/src/modules/entitlements/dto/thread-job-budget.dto.ts` (A)
- `apps/claw-auth-service/src/modules/entitlements/dto/__tests__/thread-job-budget.dto.spec.ts` (A)
- `apps/claw-auth-service/src/modules/entitlements/repositories/thread-job-budget.repository.ts` (A)
- `docs/qa-evidence/2026-10-04-threads-job-budget.md` (A)
- `docs/qa-evidence/README.md` (M)
- `CHANGELOG.md` (A)
- `docs/CHANGELOG.md` (M)
- `apps/claw-auth-service/prisma/schema.prisma` (M)
- `apps/claw-auth-service/prisma/seed-permissions.cjs` (M)
- `apps/claw-auth-service/prisma/seed.cjs` (M)
- `apps/claw-auth-service/src/common/constants/rbac.constants.ts` (M)
- `apps/claw-auth-service/src/modules/entitlements/entitlements.module.ts` (M)
- `context/permission-map.md` (M)
- `context/service-dependency-map.md` (M)
- `docs/02-business-product/clawai-threads-product-spec.md` (M)
- `docs/02-business-product/payg-credit-spec.md` (M)
- `docs/03-architecture/clawai-threads-architecture.md` (M)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (M)
- `packages/shared-entitlements/src/__tests__/payg-meter-units.spec.ts` (M)
- `packages/shared-entitlements/src/payg-meter.ts` (M)
- `packages/shared-entitlements/src/payg-meter.types.ts` (M)
- `packages/shared-types/src/enums/permission.enum.ts` (M)
- `skills/meter-a-paid-provider-call.md` (M)
- `wiki/Package-Shared-Entitlements.md` (M)
- `wiki/Threads.md` (M)

## Before

Threads had no generation entitlement, durable aggregate cap, or accounting
fence linking a job to existing provider wallet reservations.

## Change

Added Threads permissions, Auth-owned job/call budget tables and guarded service
routes, existing plan-feature reservations, and optional `PaygMeter` call-level
sub-holds tied to existing wallet reservations. Updated product, architecture,
PAYG, permission/dependency, package wiki, and metering guidance.

## Now

The backend can reserve an explicit nonnegative integer micro-USD cap and refuse
provider call holds above it. Existing plan features are held once per job and
settled/released on close. Generation enqueue/worker wiring, runtime migration,
concurrent DB proof, and full product QA remain outstanding; rollout stays
disabled.

## Why

The owner selected existing plan/credit rules, no PAYG price, and a user-selected
cap before enqueue. The cap must bound aggregate retries and parallel calls
without duplicating the wallet or provider price catalog.

## Verification

- Auth budget and DTO specs: 9 focused tests passed.
- Credit reservation + prior budget tests: 75 tests passed before two new close
  cases were added; those new cases passed in the 7-test focused run.
- Shared-entitlements meter: 8 focused tests passed, including budget-service
  outage release and conservative settlement when the credit result is unknown.
- Auth/shared-entitlements typechecks passed, shared-entitlements build passed;
  changed-file lint had zero errors.
- Live API, migration, concurrency, browser, and full QA: not run; see
  [`QA evidence`](../qa-evidence/2026-10-04-threads-job-budget.md).

**Stale when:** generation does not pass a budget id through every paid provider
call, the credit settlement contract changes, or the open runtime/QA lanes close.

Release versioning follows `tools/release/version.mjs`, which updates every
workspace manifest and internal package pin from the conventional commit. The
version for this feature commit is `1.177.0`.
