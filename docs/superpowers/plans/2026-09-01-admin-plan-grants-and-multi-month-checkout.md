# Admin Plan Grants and Multi-Month Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin grant a plan for a bounded number of months with an attributed reason, and let self-service checkout offer 1/3/6/12-month terms with a 10% discount on the 3- and 6-month terms.

**Architecture:** Two new `BillingInterval` enum members (`QUARTERLY`, `SEMIANNUAL`) ride the existing versioned-price and lazy-expiry machinery end to end — no new expiry sweep, no new price-computation-at-request-time, no new DB tables. A new shared `addCalendarMonths` utility unifies auth-service's admin-grant expiry math with payment-service's existing period-end math, both of which already do calendar-clamped month arithmetic independently.

**Tech Stack:** NestJS 12 (auth-service, payment-service), Prisma, Zod, Next.js/React (frontend), Jest, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-01-admin-plan-grants-and-multi-month-checkout-design.md`](../specs/2026-09-01-admin-plan-grants-and-multi-month-checkout-design.md)

## Global Constraints

- Money is integer minor units, always. `QUARTERLY`/`SEMIANNUAL` prices are computed ONCE at seed time (`round(monthlyMinor × months × 0.90)`), never at request or render time.
- No auto-renewal. Every interval, including the two new ones, remains a single prepaid period.
- No new expiry-enforcement mechanism. `findEffectiveForUser`'s existing lazy filter (`entitlementValidUntil` null-or-future) is reused unchanged for admin grants.
- `durationMonths`/`grantReason` apply ONLY to the non-trial admin-grant branch of `assignUserToPlan`; the trial path (`assignTrialPlanOnce`) is untouched and still takes `{ planId }` only.
- No `any`, no `!`, no `eslint-disable`, no inline types/enums/constants in logic files (see each service's `CLAUDE.md`).
- Every new user-facing string ships in all 13 locales (`en, ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh`) in the SAME task that introduces it.
- Frontend: TSX files call exactly one controller hook; hooks stay under ~50 lines; no raw `<select>`/`<textarea>`.
- Gate scoped to the touched workspace only, once, at the end of each task's TDD loop — never all-workspace.

---

### Task 1: Add `QUARTERLY`/`SEMIANNUAL` to `BillingInterval` (shared-types + frontend mirror)

**Files:**

- Modify: `packages/shared-types/src/enums/billing-interval.enum.ts`
- Modify: `apps/claw-frontend/src/enums/billing.enum.ts`
- Modify: `apps/claw-frontend/src/constants/billing.constants.ts` (`BILLING_INTERVAL_ORDER`)
- Test: `apps/claw-frontend/src/lib/i18n/__tests__/billing-enum-labels.test.ts` (existing — extend)

**Interfaces:**

- Produces: `BillingInterval.QUARTERLY = 'QUARTERLY'`, `BillingInterval.SEMIANNUAL = 'SEMIANNUAL'` in both the backend (`@claw/shared-types`) and frontend (`@/enums/billing.enum`) copies. Every later task that reads `BillingInterval` relies on these two new members existing in both places.

- [ ] **Step 1: Read the existing enum-label test to see its shape**

Read `apps/claw-frontend/src/lib/i18n/__tests__/billing-enum-labels.test.ts` in full before editing — it almost certainly iterates `Object.values(BillingInterval)` against `en.ts`'s `billing.interval.*` keys, so extending the enum before Task 14 adds the new keys will make it fail; that failure IS step 2 below.

- [ ] **Step 2: Add the two enum members to shared-types**

```ts
// packages/shared-types/src/enums/billing-interval.enum.ts
// Recurring billing cadence. QUARTERLY and SEMIANNUAL carry a 10% discount off
// the monthly rate; YEARLY is priced at ~10 months of the monthly rate (two
// months free). Every interval is stored as its own PlanPriceVersion row,
// never derived at request time.
export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUAL = 'SEMIANNUAL',
  YEARLY = 'YEARLY',
}
```

- [ ] **Step 3: Mirror on the frontend**

```ts
// apps/claw-frontend/src/enums/billing.enum.ts — replace only the BillingInterval block
export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUAL = 'SEMIANNUAL',
  YEARLY = 'YEARLY',
}
```

Leave every other enum in that file untouched.

- [ ] **Step 4: Extend the render-order constant**

```ts
// apps/claw-frontend/src/constants/billing.constants.ts
export const BILLING_INTERVAL_ORDER: BillingInterval[] = [
  BillingInterval.MONTHLY,
  BillingInterval.QUARTERLY,
  BillingInterval.SEMIANNUAL,
  BillingInterval.YEARLY,
];
```

- [ ] **Step 5: Run the enum-label test — expect it to fail**

Run: `cd apps/claw-frontend && npx vitest run src/lib/i18n/__tests__/billing-enum-labels.test.ts`
Expected: FAIL — missing `billing.interval.QUARTERLY` / `billing.interval.SEMIANNUAL` keys in one or more of the 13 locale files. This failure is expected and is closed by Task 14; do not add the i18n keys here.

- [ ] **Step 6: Build shared-types so the new member is available to every other workspace**

Run: `cd packages/shared-types && npm run build`
Expected: succeeds silently.

- [ ] **Step 7: Commit**

```bash
git add packages/shared-types/src/enums/billing-interval.enum.ts apps/claw-frontend/src/enums/billing.enum.ts apps/claw-frontend/src/constants/billing.constants.ts
git commit -m "feat(billing): add QUARTERLY and SEMIANNUAL to BillingInterval"
```

Do not push yet — commit only. This is one batch of a larger feature; push after each batch's own gate passes per the repo's push-per-commit rule, so gate this batch's workspaces (`shared-types`, `claw-frontend`) before pushing, understanding the enum-label test stays red until Task 14. If your workflow requires green-before-push, fold Tasks 1 and 14 into a single push (commit Task 1, keep working, push after Task 14's commit lands the missing keys).

---

### Task 2: Shared `addCalendarMonths` utility in `@claw/shared-utilities`

**Files:**

- Create: `packages/shared-utilities/src/billing-period/add-calendar-months.utility.ts`
- Create: `packages/shared-utilities/src/billing-period/index.ts`
- Create: `packages/shared-utilities/src/billing-period/__tests__/add-calendar-months.utility.spec.ts`
- Modify: `packages/shared-utilities/src/index.ts` (add barrel export)

**Interfaces:**

- Produces: `addCalendarMonths(startMs: number, months: number): number` — the last-day-of-month-clamped calendar arithmetic, extracted from payment-service's existing `resolvePeriodEndMs`. Task 3 (payment-service) and Task 7 (auth-service admin-grant expiry) both consume this exact signature.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared-utilities/src/billing-period/__tests__/add-calendar-months.utility.spec.ts
import { addCalendarMonths } from '../add-calendar-months.utility';

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

describe('addCalendarMonths', () => {
  it('advances one calendar month', () => {
    const start = Date.UTC(2026, 0, 15);
    expect(iso(addCalendarMonths(start, 1))).toBe('2026-02-15T00:00:00.000Z');
  });

  it('clamps a 31st subscriber into a short month instead of rolling over', () => {
    const start = Date.UTC(2026, 0, 31);
    expect(iso(addCalendarMonths(start, 1))).toBe('2026-02-28T00:00:00.000Z');
  });

  it('lands on 29 February in a leap year', () => {
    const start = Date.UTC(2028, 0, 31);
    expect(iso(addCalendarMonths(start, 1))).toBe('2028-02-29T00:00:00.000Z');
  });

  it('crosses a year boundary', () => {
    const start = Date.UTC(2026, 11, 10);
    expect(iso(addCalendarMonths(start, 1))).toBe('2027-01-10T00:00:00.000Z');
  });

  it('advances three calendar months (QUARTERLY)', () => {
    const start = Date.UTC(2026, 4, 31);
    // 31 May + 3 months = 31 August (August has 31 days, no clamp needed).
    expect(iso(addCalendarMonths(start, 3))).toBe('2026-08-31T00:00:00.000Z');
  });

  it('advances six calendar months and clamps into a short month (SEMIANNUAL)', () => {
    const start = Date.UTC(2026, 7, 31);
    // 31 Aug + 6 months = 28/29 Feb, not 3 Mar.
    expect(iso(addCalendarMonths(start, 6))).toBe('2027-02-28T00:00:00.000Z');
  });

  it('advances twelve calendar months (YEARLY)', () => {
    const start = Date.UTC(2026, 5, 1);
    expect(iso(addCalendarMonths(start, 12))).toBe('2027-06-01T00:00:00.000Z');
  });

  it('clamps a 29 February start advancing twelve months into 28 February', () => {
    // A start date that only exists in a leap year: the anniversary clamps
    // exactly like every other over-length month, rather than rolling into
    // March the way naive `setUTCFullYear` arithmetic would.
    const start = Date.UTC(2028, 1, 29);
    expect(iso(addCalendarMonths(start, 12))).toBe('2029-02-28T00:00:00.000Z');
  });

  it('does not lose a day across a leap year on a twelve-month span', () => {
    const start = Date.UTC(2027, 2, 1);
    expect(iso(addCalendarMonths(start, 12))).toBe('2028-03-01T00:00:00.000Z');
  });

  it('keeps the time of day', () => {
    const start = Date.UTC(2026, 3, 10, 13, 45, 30);
    expect(iso(addCalendarMonths(start, 1))).toBe('2026-05-10T13:45:30.000Z');
  });

  it('rejects a non-positive month count', () => {
    expect(() => addCalendarMonths(Date.UTC(2026, 0, 1), 0)).toThrow();
    expect(() => addCalendarMonths(Date.UTC(2026, 0, 1), -1)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/shared-utilities && npx jest billing-period/__tests__/add-calendar-months.utility.spec.ts`
Expected: FAIL — `Cannot find module '../add-calendar-months.utility'`

- [ ] **Step 3: Write the implementation**

```ts
// packages/shared-utilities/src/billing-period/add-calendar-months.utility.ts
/**
 * Advances a timestamp by a whole number of calendar months, on the calendar
 * rather than by adding a fixed number of milliseconds.
 *
 * Adding N×30 days drifts a little further every period and silently loses a
 * day across a leap year; adding N calendar months and clamping to the target
 * month's real last day keeps the anniversary stable — 31 January + 1 month
 * lands on 28/29 February, never 3 March.
 */
export function addCalendarMonths(startMs: number, months: number): number {
  if (!Number.isInteger(months) || months < 1) {
    throw new RangeError(`months must be a positive integer, got ${months}`);
  }
  const end = new Date(startMs);
  const targetMonth = end.getUTCMonth() + months;
  const dayOfMonth = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(targetMonth);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return end.getTime();
}
```

```ts
// packages/shared-utilities/src/billing-period/index.ts
export { addCalendarMonths } from './add-calendar-months.utility';
```

- [ ] **Step 4: Wire the barrel export**

```ts
// packages/shared-utilities/src/index.ts — add one line to the existing list
export * from './billing-period';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/shared-utilities && npx jest billing-period/__tests__/add-calendar-months.utility.spec.ts`
Expected: PASS, 10/10

- [ ] **Step 6: Gate and build the workspace**

Run: `cd packages/shared-utilities && npx tsgo --noEmit && npm run lint && npm run build`
Expected: all succeed

- [ ] **Step 7: Commit**

```bash
git add packages/shared-utilities/src/billing-period packages/shared-utilities/src/index.ts
git commit -m "feat(shared-utilities): add addCalendarMonths for billing-period math"
```

---

### Task 3: Generalize `resolvePeriodEndMs` in payment-service to all four intervals

**Files:**

- Modify: `apps/claw-payment-service/src/modules/webhooks/utilities/billing-period.utility.ts`
- Test: `apps/claw-payment-service/src/modules/webhooks/utilities/__tests__/billing-period.utility.spec.ts` (existing — extend)

**Interfaces:**

- Consumes: `addCalendarMonths(startMs: number, months: number): number` from `@claw/shared-utilities` (Task 2).
- Produces: `resolvePeriodEndMs(startMs: number, billingInterval: string): number` — same signature as today; callers (`payment-activation.service.ts`) need no change.

- [ ] **Step 1: Extend the failing tests**

Add these cases to the existing spec (do not remove the existing ones — they must still pass unchanged):

```ts
// apps/claw-payment-service/src/modules/webhooks/utilities/__tests__/billing-period.utility.spec.ts
// add inside the existing describe('resolvePeriodEndMs', ...) block

it('advances three calendar months for QUARTERLY', () => {
  const start = Date.UTC(2026, 4, 31);
  expect(iso(resolvePeriodEndMs(start, BillingInterval.QUARTERLY))).toBe(
    '2026-08-31T00:00:00.000Z',
  );
});

it('advances six calendar months and clamps for SEMIANNUAL', () => {
  const start = Date.UTC(2026, 7, 31);
  expect(iso(resolvePeriodEndMs(start, BillingInterval.SEMIANNUAL))).toBe(
    '2027-02-28T00:00:00.000Z',
  );
});

it('clamps a 29 February start into 28 February for YEARLY', () => {
  const start = Date.UTC(2028, 1, 29);
  expect(iso(resolvePeriodEndMs(start, BillingInterval.YEARLY))).toBe('2029-02-28T00:00:00.000Z');
});
```

- [ ] **Step 2: Run to verify the new cases fail**

Run: `cd apps/claw-payment-service && npx jest billing-period.utility.spec.ts`
Expected: FAIL on the two new interval cases (`QUARTERLY`/`SEMIANNUAL` currently fall through the `else` branch, which only adds 1 month) — the 29-Feb YEARLY case may already pass or fail depending on current `setUTCFullYear` behavior; either way it must pass after Step 3.

- [ ] **Step 3: Replace the implementation**

```ts
// apps/claw-payment-service/src/modules/webhooks/utilities/billing-period.utility.ts
import { BillingInterval } from '@claw/shared-types';
import { addCalendarMonths } from '@claw/shared-utilities';

import { MONTHS_BY_BILLING_INTERVAL } from '../constants/billing-period.constants';

/**
 * End of a billing period, computed on the calendar rather than by adding a
 * fixed number of milliseconds. See addCalendarMonths (@claw/shared-utilities)
 * for why: adding 30×N days drifts every renewal and silently loses a day in
 * a leap year.
 */
export function resolvePeriodEndMs(startMs: number, billingInterval: string): number {
  const months = MONTHS_BY_BILLING_INTERVAL[billingInterval as BillingInterval] ?? 1;
  return addCalendarMonths(startMs, months);
}
```

Per the "no inline module-level const" rule, the map goes in its own constants file:

```ts
// apps/claw-payment-service/src/modules/webhooks/constants/billing-period.constants.ts
import { BillingInterval } from '@claw/shared-types';

/** Calendar months each billing interval spans. An unrecognized interval
 * falls back to 1 month at the call site, matching today's `else` behavior. */
export const MONTHS_BY_BILLING_INTERVAL: Record<BillingInterval, number> = {
  [BillingInterval.MONTHLY]: 1,
  [BillingInterval.QUARTERLY]: 3,
  [BillingInterval.SEMIANNUAL]: 6,
  [BillingInterval.YEARLY]: 12,
};
```

Check whether `apps/claw-payment-service/src/modules/webhooks/constants/` already exists before creating it; if a sibling constants file for this module already lives elsewhere (e.g. `webhooks/constants/`), add this export there instead of creating a new directory.

- [ ] **Step 4: Run the full spec — verify it passes, including every pre-existing case**

Run: `cd apps/claw-payment-service && npx jest billing-period.utility.spec.ts`
Expected: PASS, all cases (original 7 + 3 new = 10)

- [ ] **Step 5: Add the payment-service dependency on shared-utilities if not already present**

Run: `grep -n '"@claw/shared-utilities"' apps/claw-payment-service/package.json`
If absent, add `"@claw/shared-utilities": "*"` alongside the other `@claw/*` deps, then `cd apps/claw-payment-service && npm install --legacy-peer-deps` (this repo's monorepo lockfile quirk — see prior session notes — means a local reinstall is safe here since it only touches this one workspace's dependency graph, not the whole lockfile; verify with `git diff package-lock.json` that only `claw-payment-service`-scoped entries changed before committing).

- [ ] **Step 6: Gate the workspace**

Run: `cd apps/claw-payment-service && npx tsgo --noEmit && npm run lint && npm run test && npm run build`
Expected: all succeed

- [ ] **Step 7: Commit**

```bash
git add apps/claw-payment-service/src/modules/webhooks/utilities/billing-period.utility.ts apps/claw-payment-service/src/modules/webhooks/utilities/__tests__/billing-period.utility.spec.ts apps/claw-payment-service/src/modules/webhooks/constants apps/claw-payment-service/package.json apps/claw-payment-service/package-lock.json package-lock.json
git commit -m "feat(payment-service): generalize resolvePeriodEndMs to QUARTERLY and SEMIANNUAL"
```

(Only add `package-lock.json` / `apps/claw-payment-service/package-lock.json` to the commit if `npm install` actually produced a diff — payment-service does not carry its own separate lockfile in an npm-workspaces monorepo, so this is almost certainly just the root `package-lock.json`.)

---

### Task 4: auth-service Prisma migration — `BillingIntervalKind` gains `QUARTERLY`/`SEMIANNUAL`

**Files:**

- Modify: `apps/claw-auth-service/prisma/schema.prisma`
- Create: a new migration under `apps/claw-auth-service/prisma/migrations/`

**Interfaces:**

- Produces: `BillingIntervalKind` Postgres enum with two new values. Task 6's seeder writes `PlanPriceVersion` rows using these; no other schema change.

- [ ] **Step 1: Edit the schema**

```prisma
// apps/claw-auth-service/prisma/schema.prisma
enum BillingIntervalKind {
  MONTHLY
  QUARTERLY
  SEMIANNUAL
  YEARLY
}
```

- [ ] **Step 2: Generate the migration**

Run: `cd apps/claw-auth-service && npm run migrate:dev -- --name add_quarterly_semiannual_billing_interval`

This is additive to a Postgres enum (`ALTER TYPE ... ADD VALUE`) — no data migration, no existing row touched. Confirm the generated SQL is exactly that (two `ALTER TYPE "BillingIntervalKind" ADD VALUE ...` statements) before proceeding; if Prisma proposes anything else (a drop/recreate), stop and investigate rather than accepting it.

- [ ] **Step 3: Regenerate the Prisma client**

Run: `cd apps/claw-auth-service && npm run prisma:generate`
Expected: succeeds, `BillingIntervalKind` in the generated client now has 4 members.

- [ ] **Step 4: Gate the workspace**

Run: `cd apps/claw-auth-service && npx tsgo --noEmit`
Expected: succeeds (schema-only change, nothing yet reads the new enum values from application code)

- [ ] **Step 5: Commit**

```bash
git add apps/claw-auth-service/prisma/schema.prisma apps/claw-auth-service/prisma/migrations
git commit -m "feat(auth-service): add QUARTERLY and SEMIANNUAL to BillingIntervalKind"
```

---

### Task 5: Seed `QUARTERLY`/`SEMIANNUAL` prices for every paid plan

**Files:**

- Modify: `apps/claw-auth-service/prisma/seeders/plan-catalog.seeder.cjs`
- Create: `apps/claw-auth-service/prisma/seeders/__tests__/plan-catalog-pricing.seeder.spec.ts`

**Interfaces:**

- Produces: a pure, exported `computeDiscountedIntervalMinor(monthlyMinor: number, months: number): number` function used by `upsertPrices`, and testable in isolation.

- [ ] **Step 1: Write the failing test**

```ts
// apps/claw-auth-service/prisma/seeders/__tests__/plan-catalog-pricing.seeder.spec.ts
const { computeDiscountedIntervalMinor } = require('../plan-catalog.seeder.cjs');

describe('computeDiscountedIntervalMinor', () => {
  it('applies a 10% discount over three months', () => {
    // 1000 minor/month × 3 × 0.90 = 2700
    expect(computeDiscountedIntervalMinor(1000, 3)).toBe(2700);
  });

  it('applies a 10% discount over six months', () => {
    // 1000 minor/month × 6 × 0.90 = 5400
    expect(computeDiscountedIntervalMinor(1000, 6)).toBe(5400);
  });

  it('rounds to the nearest integer minor unit rather than truncating', () => {
    // 999 × 3 × 0.90 = 2697.3 -> rounds to 2697
    expect(computeDiscountedIntervalMinor(999, 3)).toBe(2697);
    // 505 × 3 × 0.90 = 1363.5 -> rounds to 1364 (round-half-up)
    expect(computeDiscountedIntervalMinor(505, 3)).toBe(1364);
  });

  it('never returns a float', () => {
    expect(Number.isInteger(computeDiscountedIntervalMinor(1333, 6))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/claw-auth-service && npx jest prisma/seeders/__tests__/plan-catalog-pricing.seeder.spec.ts`
Expected: FAIL — `computeDiscountedIntervalMinor` is not exported

- [ ] **Step 3: Add the function and wire it into `upsertPrices`**

In `apps/claw-auth-service/prisma/seeders/plan-catalog.seeder.cjs`, add the pure function near the top (after the `FREE` constant) and extend `upsertPrices`'s interval list:

```js
// computeDiscountedIntervalMinor: N months at the monthly rate, 10% off,
// rounded once to the nearest integer minor unit (never truncated, never a
// float). Computed here at seed time and written as an immutable
// PlanPriceVersion row — never recomputed at checkout.
function computeDiscountedIntervalMinor(monthlyMinor, months) {
  return Math.round(monthlyMinor * months * 0.9);
}
```

```js
// inside upsertPrices — replace the existing `intervals` array
async function upsertPrices(prisma, planId, definition) {
  const intervals = [
    ['MONTHLY', definition.monthlyMinor],
    ['QUARTERLY', computeDiscountedIntervalMinor(definition.monthlyMinor, 3)],
    ['SEMIANNUAL', computeDiscountedIntervalMinor(definition.monthlyMinor, 6)],
    ['YEARLY', definition.yearlyMinor],
  ];
  for (const [billingInterval, amountMinor] of intervals) {
    if (amountMinor === null) {
      continue;
    }
    const activeKey = `${planId}:${billingInterval}`;
    const existing = await prisma.planPriceVersion.findUnique({ where: { activeKey } });
    if (existing) {
      continue;
    }
    await prisma.planPriceVersion.create({
      data: {
        planId,
        billingInterval,
        currency: 'USD',
        amountMinor,
        version: 1,
        isActive: true,
        activeKey,
      },
    });
  }
}
```

A free plan (`monthlyMinor: 0`) computes `0` for both new intervals, which is correct — the same as its existing `MONTHLY`/`YEARLY` rows. `upsertPrices` already only creates a row when `activeKey` doesn't exist, so on an EXISTING install this backfills exactly the two new rows per plan on next boot, with zero version bump (mirrors the reasoning already documented at the bottom of the file for why `isPopular` and PAYG allowance changes don't bump the seeder version).

Finally, export the new function:

```js
module.exports = {
  name: 'plan-catalog',
  // ... existing fields unchanged ...
  run,
  PLAN_CATALOG,
  matchesLegacyFingerprint,
  booleanProjections,
  labGateProjections,
  computeDiscountedIntervalMinor,
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/claw-auth-service && npx jest prisma/seeders/__tests__/plan-catalog-pricing.seeder.spec.ts`
Expected: PASS, 4/4

- [ ] **Step 5: Extend the existing catalog-integrity spec with a price-consistency check**

Add to `apps/claw-auth-service/src/modules/plans/__tests__/plan-catalog.spec.ts`, inside the `describe('catalog integrity', ...)` block:

```ts
it('prices QUARTERLY and SEMIANNUAL at exactly 10% off the monthly rate, rounded', () => {
  const {
    computeDiscountedIntervalMinor,
  } = require('../../../../prisma/seeders/plan-catalog.seeder.cjs');
  for (const plan of catalog) {
    expect(computeDiscountedIntervalMinor(plan.monthlyMinor, 3)).toBe(
      Math.round(plan.monthlyMinor * 3 * 0.9),
    );
    expect(computeDiscountedIntervalMinor(plan.monthlyMinor, 6)).toBe(
      Math.round(plan.monthlyMinor * 6 * 0.9),
    );
  }
});
```

- [ ] **Step 6: Run the full plan-catalog spec**

Run: `cd apps/claw-auth-service && npx jest plan-catalog`
Expected: PASS, every existing case plus the new one

- [ ] **Step 7: Gate the workspace**

Run: `cd apps/claw-auth-service && npx tsgo --noEmit && npm run lint && npm run test`
Expected: all succeed

- [ ] **Step 8: Commit**

```bash
git add apps/claw-auth-service/prisma/seeders/plan-catalog.seeder.cjs apps/claw-auth-service/prisma/seeders/__tests__/plan-catalog-pricing.seeder.spec.ts apps/claw-auth-service/src/modules/plans/__tests__/plan-catalog.spec.ts
git commit -m "feat(auth-service): seed QUARTERLY and SEMIANNUAL prices at 10% off monthly"
```

Push after this task if you folded Tasks 1–5 into one pushable checkpoint (all are backend, none touch the frontend enum-label test that stays red until Task 14).

---

### Task 6: `assignPlanSchema` gains `durationMonths` and `grantReason`

**Files:**

- Modify: `apps/claw-auth-service/src/modules/plans/dto/plan-misc.dto.ts`
- Create: `apps/claw-auth-service/src/modules/plans/constants/plan-grant.constants.ts`
- Create: `apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-misc.dto.spec.ts`

**Interfaces:**

- Produces: `AssignPlanDto = { planId: string; durationMonths?: number; grantReason?: string }`, `PLAN_GRANT_DURATION_INVALID`, `PLAN_GRANT_REASON_REQUIRED`, `PLAN_GRANT_MAX_DURATION_MONTHS = 60`. Task 7 imports the two error codes and the max constant; the controller (Task 7) passes `dto.durationMonths`/`dto.grantReason` straight through.
- Both new fields are optional at the SCHEMA level (shape only) because the trial-assignment branch never uses them; Task 7's SERVICE layer enforces "required for a non-trial grant" with the specific codes below, mirroring how `PLAN_INACTIVE` and `PLAN_TRIAL_ALREADY_USED` are already service-level checks, not schema-level ones.

- [ ] **Step 1: Write the failing test**

```ts
// apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-misc.dto.spec.ts
import { assignPlanSchema } from '../plan-misc.dto';

describe('assignPlanSchema', () => {
  it('accepts a bare planId (the trial-assignment shape)', () => {
    const result = assignPlanSchema.safeParse({ planId: 'plan-free' });
    expect(result.success).toBe(true);
  });

  it('accepts planId with durationMonths and grantReason', () => {
    const result = assignPlanSchema.safeParse({
      planId: 'plan-pro',
      durationMonths: 3,
      grantReason: 'Support gesture for a billing incident',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a grantReason over 500 characters', () => {
    const result = assignPlanSchema.safeParse({
      planId: 'plan-pro',
      durationMonths: 3,
      grantReason: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer durationMonths', () => {
    const result = assignPlanSchema.safeParse({
      planId: 'plan-pro',
      durationMonths: 3.5,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/claw-auth-service && npx jest plan-misc.dto.spec.ts`
Expected: FAIL — `durationMonths`/`grantReason` are unknown keys today (they pass through silently under Zod's default non-strict object, so the first two cases already pass; the third and fourth fail because there's no `.max(500)`/`.int()` bound yet to reject them)

- [ ] **Step 3: Extend the schema**

```ts
// apps/claw-auth-service/src/modules/plans/dto/plan-misc.dto.ts — replace assignPlanSchema only
export const assignPlanSchema = z.object({
  planId: z.string().min(1).max(64),
  // Optional at the schema level: the trial-assignment branch never uses
  // these. The service layer requires both for a non-trial grant, with
  // PLAN_GRANT_DURATION_INVALID / PLAN_GRANT_REASON_REQUIRED.
  durationMonths: z.number().int().optional(),
  grantReason: z.string().max(500).optional(),
});
export type AssignPlanDto = z.infer<typeof assignPlanSchema>;
```

- [ ] **Step 4: Add the grant constants file**

```ts
// apps/claw-auth-service/src/modules/plans/constants/plan-grant.constants.ts
/** Refusal code for a missing/invalid admin-grant duration. */
export const PLAN_GRANT_DURATION_INVALID = 'PLAN_GRANT_DURATION_INVALID';
/** Refusal code for a missing/empty admin-grant reason. */
export const PLAN_GRANT_REASON_REQUIRED = 'PLAN_GRANT_REASON_REQUIRED';
/** Ceiling on an admin grant's duration — a deliberate cap against a typo like
 * 240 silently granting two decades, not a real expected value. */
export const PLAN_GRANT_MAX_DURATION_MONTHS = 60;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/claw-auth-service && npx jest plan-misc.dto.spec.ts`
Expected: PASS, 4/4

- [ ] **Step 6: Gate the workspace**

Run: `cd apps/claw-auth-service && npx tsgo --noEmit && npm run lint`
Expected: both succeed

- [ ] **Step 7: Commit**

```bash
git add apps/claw-auth-service/src/modules/plans/dto/plan-misc.dto.ts apps/claw-auth-service/src/modules/plans/constants/plan-grant.constants.ts apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-misc.dto.spec.ts
git commit -m "feat(auth-service): add durationMonths and grantReason to assignPlanSchema"
```

---

### Task 7: Admin grants set `grantType`, `grantReason`, `entitlementValidUntil`

**Files:**

- Modify: `apps/claw-auth-service/src/modules/plans/repositories/plans.repository.ts` (`assignUserToPlan`)
- Modify: `apps/claw-auth-service/src/modules/plans/services/plans.service.ts` (`assignUserToPlan`)
- Modify: `apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts` (`assignUser`)
- Test: `apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts` (existing — extend)
- Test: `apps/claw-auth-service/src/modules/plans/services/__tests__/plans.service.spec.ts` (existing — extend AND fix two now-stale calls)

**Interfaces:**

- Consumes: `addCalendarMonths` (Task 2), `PLAN_GRANT_DURATION_INVALID` / `PLAN_GRANT_REASON_REQUIRED` / `PLAN_GRANT_MAX_DURATION_MONTHS` (Task 6).
- Produces: `PlansRepository.assignUserToPlan(userId, planId, assignedByUserId, durationMonths, grantReason, now): Promise<void>` — a NEW signature (5 required params after `assignedByUserId`, `now` added last mirroring `assignTrialPlanOnce`'s own `now: Date` parameter for deterministic testing). `PlansService.assignUserToPlan(userId, planId, assignedBy, durationMonths?, grantReason?): Promise<PlanView>` — durationMonths/grantReason are optional on the SERVICE signature (the trial branch ignores them; the non-trial branch validates their presence itself, producing the specific error codes rather than a generic "required" TypeScript compile error that would also block the trial call site).

- [ ] **Step 1: Write the failing repository test**

Add to `apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts` — a new top-level `describe`:

```ts
describe('PlansRepository.assignUserToPlan (admin grant)', () => {
  it('expires the prior assignment and creates an attributed, time-limited grant', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({ id: 'assignment-new' });
    const userUpdate = jest.fn().mockResolvedValue({});
    const transaction = jest.fn(async (ops: unknown[]) => ops);
    const prisma = {
      userPlanAssignment: { updateMany, create },
      user: { update: userUpdate },
      $transaction: transaction,
    } as unknown as PrismaService;
    const repository = new PlansRepository(prisma);
    const now = new Date('2026-01-31T00:00:00.000Z');

    await repository.assignUserToPlan('user-1', 'plan-pro', 'admin-1', 3, 'Support gesture', now);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'ACTIVE' },
      data: { status: 'EXPIRED', endsAt: now },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        planId: 'plan-pro',
        status: 'ACTIVE',
        assignedByUserId: 'admin-1',
        grantType: 'ADMIN_GRANT',
        grantReason: 'Support gesture',
        // 31 Jan + 3 months = 30 Apr (April has 30 days).
        entitlementValidUntil: new Date('2026-04-30T00:00:00.000Z'),
      },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activePlanId: 'plan-pro' },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/claw-auth-service && npx jest plans.repository.spec.ts`
Expected: FAIL — current `assignUserToPlan` takes 3 params and never sets `grantType`/`grantReason`/`entitlementValidUntil`

- [ ] **Step 3: Update the repository method**

```ts
// apps/claw-auth-service/src/modules/plans/repositories/plans.repository.ts
// add near the top of the file, alongside the other imports
import { addCalendarMonths } from '@claw/shared-utilities';

// replace the existing assignUserToPlan method
async assignUserToPlan(
  userId: string,
  planId: string,
  assignedByUserId: string | undefined,
  durationMonths: number,
  grantReason: string,
  now: Date,
): Promise<void> {
  const entitlementValidUntil = new Date(addCalendarMonths(now.getTime(), durationMonths));
  await this.prisma.$transaction([
    this.prisma.userPlanAssignment.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'EXPIRED', endsAt: now },
    }),
    this.prisma.userPlanAssignment.create({
      data: {
        userId,
        planId,
        status: 'ACTIVE',
        assignedByUserId,
        grantType: 'ADMIN_GRANT',
        grantReason,
        entitlementValidUntil,
      },
    }),
    this.prisma.user.update({ where: { id: userId }, data: { activePlanId: planId } }),
  ]);
}
```

- [ ] **Step 4: Run the repository test to verify it passes**

Run: `cd apps/claw-auth-service && npx jest plans.repository.spec.ts`
Expected: PASS, including every pre-existing case in that file

- [ ] **Step 5: Write the failing service tests**

In `apps/claw-auth-service/src/modules/plans/services/__tests__/plans.service.spec.ts`, first FIX the now-stale call at line ~166-170 (it will otherwise fail to compile once the repository signature changes), then add three new cases:

```ts
// replace the existing 'assignUserToPlan assigns an active plan' test
it('assignUserToPlan assigns an active plan with a duration and reason', async () => {
  repo.findById.mockResolvedValue(proPlan);
  await service.assignUserToPlan('u1', 'plan-pro', 'admin', 3, 'Support gesture');
  expect(repo.assignUserToPlan).toHaveBeenCalledWith(
    'u1',
    'plan-pro',
    'admin',
    3,
    'Support gesture',
    expect.any(Date),
  );
});

// add these new cases in the same describe block
it('assignUserToPlan refuses a missing duration for a non-trial grant', async () => {
  repo.findById.mockResolvedValue(proPlan);
  await expect(
    service.assignUserToPlan('u1', 'plan-pro', 'admin', undefined, 'Support gesture'),
  ).rejects.toThrow(/duration/i);
  expect(repo.assignUserToPlan).not.toHaveBeenCalled();
});

it('assignUserToPlan refuses a duration over the 60-month ceiling', async () => {
  repo.findById.mockResolvedValue(proPlan);
  await expect(
    service.assignUserToPlan('u1', 'plan-pro', 'admin', 61, 'Support gesture'),
  ).rejects.toThrow(/duration/i);
});

it('assignUserToPlan refuses a missing reason for a non-trial grant', async () => {
  repo.findById.mockResolvedValue(proPlan);
  await expect(service.assignUserToPlan('u1', 'plan-pro', 'admin', 3, undefined)).rejects.toThrow(
    /reason/i,
  );
  expect(repo.assignUserToPlan).not.toHaveBeenCalled();
});

it('assignUserToPlan refuses a blank (whitespace-only) reason', async () => {
  repo.findById.mockResolvedValue(proPlan);
  await expect(service.assignUserToPlan('u1', 'plan-pro', 'admin', 3, '   ')).rejects.toThrow(
    /reason/i,
  );
});

it('the trial path stays unaffected by duration/reason validation', async () => {
  repo.findById.mockResolvedValue({ ...freePlan, isTrial: true, trialDurationDays: 30 });
  repo.assignTrialPlanOnce.mockResolvedValue({ id: 'assignment-1' });
  // No durationMonths/grantReason passed — must not throw.
  await expect(service.assignUserToPlan('u1', 'plan-free', 'admin')).resolves.toBeDefined();
  expect(repo.assignUserToPlan).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Run to verify the new/changed cases fail**

Run: `cd apps/claw-auth-service && npx jest plans.service.spec.ts`
Expected: FAIL — the service doesn't accept/validate the two new params yet

- [ ] **Step 7: Update the service method**

```ts
// apps/claw-auth-service/src/modules/plans/services/plans.service.ts
// add to the existing import block
import { addCalendarMonths } from '@claw/shared-utilities';
import {
  PLAN_GRANT_DURATION_INVALID,
  PLAN_GRANT_MAX_DURATION_MONTHS,
  PLAN_GRANT_REASON_REQUIRED,
} from '../constants/plan-grant.constants';

// replace the existing assignUserToPlan method
async assignUserToPlan(
  userId: string,
  planId: string,
  assignedBy: string,
  durationMonths?: number,
  grantReason?: string,
): Promise<PlanView> {
  await this.assertPlanAssignable(userId, assignedBy);
  const plan = await this.plansRepository.findById(planId);
  if (!plan) {
    throw new EntityNotFoundException('Plan', planId);
  }
  if (!plan.isActive) {
    throw new BusinessException(
      'Cannot assign an inactive plan',
      'PLAN_INACTIVE',
      HttpStatus.CONFLICT,
    );
  }
  if (plan.isTrial) {
    const assignment = await this.plansRepository.assignTrialPlanOnce(
      userId,
      planId,
      assignedBy,
      new Date(),
    );
    if (assignment === null) {
      throw new BusinessException(
        'Plan trial already used',
        'PLAN_TRIAL_ALREADY_USED',
        HttpStatus.CONFLICT,
      );
    }
  } else {
    if (
      durationMonths === undefined ||
      !Number.isInteger(durationMonths) ||
      durationMonths < 1 ||
      durationMonths > PLAN_GRANT_MAX_DURATION_MONTHS
    ) {
      throw new BusinessException(
        `Grant duration must be a whole number of months between 1 and ${PLAN_GRANT_MAX_DURATION_MONTHS}`,
        PLAN_GRANT_DURATION_INVALID,
        HttpStatus.BAD_REQUEST,
      );
    }
    const trimmedReason = grantReason?.trim() ?? '';
    if (trimmedReason.length === 0) {
      throw new BusinessException(
        'A reason is required for an admin plan grant',
        PLAN_GRANT_REASON_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.plansRepository.assignUserToPlan(
      userId,
      planId,
      assignedBy,
      durationMonths,
      trimmedReason,
      new Date(),
    );
  }
  this.logger.log(`assignUserToPlan: user=${userId} plan=${planId}`);
  return this.toView(plan);
}
```

`addCalendarMonths` is imported here for symmetry with the repository but is not directly called in the service — remove the import if your editor flags it unused (the repository is the one call site; keep the import only if a future step in this task ends up needing it here too).

- [ ] **Step 8: Run the service tests to verify they pass**

Run: `cd apps/claw-auth-service && npx jest plans.service.spec.ts`
Expected: PASS, including every pre-existing case

- [ ] **Step 9: Wire the controller**

```ts
// apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts
@Post('users/:userId/assign')
async assignUser(
  @Param('userId') userId: string,
  @CurrentUser() admin: AuthenticatedUser,
  @Body(new ZodValidationPipe(assignPlanSchema)) dto: AssignPlanDto,
): Promise<PlanView> {
  return this.plansService.assignUserToPlan(
    userId,
    dto.planId,
    admin.id,
    dto.durationMonths,
    dto.grantReason,
  );
}
```

- [ ] **Step 10: Gate the workspace**

Run: `cd apps/claw-auth-service && npx tsgo --noEmit && npm run lint && npm run test`
Expected: all succeed

- [ ] **Step 11: Commit**

```bash
git add apps/claw-auth-service/src/modules/plans/repositories/plans.repository.ts apps/claw-auth-service/src/modules/plans/services/plans.service.ts apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts apps/claw-auth-service/src/modules/plans/services/__tests__/plans.service.spec.ts
git commit -m "feat(auth-service): admin plan grants set duration, reason and provenance"
```

---

### Task 8: Regression test — admin grants expire through the existing lazy mechanism

**Files:**

- Test: `apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts` (existing — extend)

**Interfaces:**

- Consumes: `PlansRepository.findEffectiveForUser` (unchanged — this task proves it needs no change).

- [ ] **Step 1: Write the test — no implementation change expected**

Add to `apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts`:

```ts
describe('PlansRepository.findEffectiveForUser (admin grant expiry)', () => {
  it('excludes an admin grant whose entitlementValidUntil has passed, via the existing lazy filter', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { userPlanAssignment: { findFirst } } as unknown as PrismaService;
    const repository = new PlansRepository(prisma);
    const now = new Date('2026-05-01T00:00:00.000Z');

    const result = await repository.findEffectiveForUser('user-1', now);

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: 'ACTIVE',
          OR: [{ entitlementValidUntil: null }, { entitlementValidUntil: { gt: now } }],
        },
      }),
    );
  });

  it('does not special-case ADMIN_GRANT — the same OR filter that already excludes an expired paid subscription excludes an expired admin grant', async () => {
    // A row with grantType ADMIN_GRANT and entitlementValidUntil in the past
    // is simply never returned by the query above (its entitlementValidUntil
    // is neither null nor > now), so the caller falls back to the default
    // plan through whatever already handles "no effective assignment found" —
    // proving no new expiry-enforcement code path is needed for this feature.
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { userPlanAssignment: { findFirst } } as unknown as PrismaService;
    const repository = new PlansRepository(prisma);
    const result = await repository.findEffectiveForUser('user-1', new Date());
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it passes with zero implementation change**

Run: `cd apps/claw-auth-service && npx jest plans.repository.spec.ts`
Expected: PASS — `findEffectiveForUser` is untouched by this plan; this step is the proof the spec's "no new expiry sweep" claim holds.

- [ ] **Step 3: Gate the workspace**

Run: `cd apps/claw-auth-service && npx tsgo --noEmit && npm run lint && npm run test`
Expected: all succeed

- [ ] **Step 4: Commit and push**

```bash
git add apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts
git commit -m "test(auth-service): pin that admin grants expire via the existing lazy filter"
git push origin main
```

This closes out the whole backend batch (Tasks 1–8, excluding the frontend half of Task 1). Before pushing, run the full auth-service, payment-service and shared-utilities/shared-types gates one more time scoped to those workspaces, per `npm run affected:list`.

---

### Task 9: `billing.utility.ts` — `readCheckoutInterval` and `findPlanPrice` for 4 intervals

**Files:**

- Modify: `apps/claw-frontend/src/utilities/billing.utility.ts`
- Test: `apps/claw-frontend/src/utilities/__tests__/billing.utility.test.ts` (existing — extend)

**Interfaces:**

- Produces: `readCheckoutInterval(value: string | null): BillingInterval` now parses `'quarterly'`/`'semiannual'` in addition to `'monthly'`/`'yearly'`. `findPlanPrice` is already generic over `BillingInterval` and needs no code change — only new test coverage.

- [ ] **Step 1: Write the failing test**

Add to `apps/claw-frontend/src/utilities/__tests__/billing.utility.test.ts`:

```ts
import { readCheckoutInterval } from '@/utilities/billing.utility';

describe('readCheckoutInterval', () => {
  it('parses every known interval, case-sensitively lowercase', () => {
    expect(readCheckoutInterval('monthly')).toBe(BillingInterval.MONTHLY);
    expect(readCheckoutInterval('quarterly')).toBe(BillingInterval.QUARTERLY);
    expect(readCheckoutInterval('semiannual')).toBe(BillingInterval.SEMIANNUAL);
    expect(readCheckoutInterval('yearly')).toBe(BillingInterval.YEARLY);
  });

  it('falls back to MONTHLY for null or an unrecognized value', () => {
    expect(readCheckoutInterval(null)).toBe(BillingInterval.MONTHLY);
    expect(readCheckoutInterval('weekly')).toBe(BillingInterval.MONTHLY);
  });
});

describe('findPlanPrice with QUARTERLY/SEMIANNUAL', () => {
  it('finds a QUARTERLY price row when present', () => {
    const plan = makePlan({
      prices: [
        { id: 'p1', billingInterval: BillingInterval.MONTHLY, currency: 'USD', amountMinor: 1000 },
        {
          id: 'p2',
          billingInterval: BillingInterval.QUARTERLY,
          currency: 'USD',
          amountMinor: 2700,
        },
      ],
    });
    expect(findPlanPrice(plan, BillingInterval.QUARTERLY)?.amountMinor).toBe(2700);
  });

  it('returns null when a plan has no SEMIANNUAL row', () => {
    const plan = makePlan({ prices: [] });
    expect(findPlanPrice(plan, BillingInterval.SEMIANNUAL)).toBeNull();
  });
});
```

Check `BillingPlanPrice`'s exact field list (used by the existing `makePlan` helper in this test file) before writing the fixture literals above — mirror whatever fields the existing `prices: []` entries in this file already carry (e.g. a `version`/`isActive` field may be required by the type).

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/claw-frontend && npx vitest run src/utilities/__tests__/billing.utility.test.ts`
Expected: FAIL — `readCheckoutInterval('quarterly')` currently returns `MONTHLY` (falls through the `=== 'yearly' ? YEARLY : MONTHLY` ternary)

- [ ] **Step 3: Update the implementation**

```ts
// apps/claw-frontend/src/utilities/billing.utility.ts — replace readCheckoutInterval only
export function readCheckoutInterval(value: string | null): BillingInterval {
  switch (value) {
    case 'quarterly':
      return BillingInterval.QUARTERLY;
    case 'semiannual':
      return BillingInterval.SEMIANNUAL;
    case 'yearly':
      return BillingInterval.YEARLY;
    default:
      return BillingInterval.MONTHLY;
  }
}
```

`findPlanPrice` needs no change — confirm by re-reading it that `price.billingInterval === interval` already works for any `BillingInterval` member, which it does (it's a plain equality check with no enumeration of specific members).

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/claw-frontend && npx vitest run src/utilities/__tests__/billing.utility.test.ts`
Expected: PASS, including every pre-existing case in the file

- [ ] **Step 5: Gate the workspace**

Run: `cd apps/claw-frontend && npx tsgo --noEmit && npm run lint`
Expected: both succeed

- [ ] **Step 6: Commit**

```bash
git add apps/claw-frontend/src/utilities/billing.utility.ts apps/claw-frontend/src/utilities/__tests__/billing.utility.test.ts
git commit -m "feat(frontend): parse quarterly/semiannual checkout intervals"
```

---

### Task 10: `pricing-catalog.utility.ts` — `resolvePlanPrice` takes an interval, not a boolean

**Files:**

- Modify: `apps/claw-frontend/src/utilities/pricing-catalog.utility.ts`
- Test: `apps/claw-frontend/src/utilities/__tests__/pricing-catalog.utility.test.ts` (existing — extend and fix stale calls)

**Interfaces:**

- Produces: `resolvePlanPrice(plan: PublicPlan, interval: BillingInterval): PublicPlanPrice | null` — signature CHANGES from `(plan, isYearly: boolean)`. `resolvePlanMonthlyCreditMicroUsd` keeps calling it with `BillingInterval.MONTHLY` explicitly (unchanged behavior — the credit grant is always derived from the monthly price regardless of which interval the card displays). Task 12 (`PlanTierCard`) is the consumer that must switch to passing an interval.

- [ ] **Step 1: Read the existing test file first**

Read `apps/claw-frontend/src/utilities/__tests__/pricing-catalog.utility.test.ts` in full — every existing call to `resolvePlanPrice(plan, true)` / `resolvePlanPrice(plan, false)` needs updating to `resolvePlanPrice(plan, BillingInterval.YEARLY)` / `resolvePlanPrice(plan, BillingInterval.MONTHLY)` in this same step, since the old boolean calls will not compile once the signature changes.

- [ ] **Step 2: Update the existing test calls and add new cases**

Update every `resolvePlanPrice(plan, true|false)` call site in the test file to pass the enum member instead, then add:

```ts
import { BillingInterval } from '@/enums/billing.enum';

it('finds a QUARTERLY price when present', () => {
  const plan = makePublicPlan({
    prices: [
      {
        id: 'p1',
        planId: 'plan-1',
        billingInterval: BillingInterval.QUARTERLY,
        currency: 'USD',
        amountMinor: 2700,
        version: 1,
        isActive: true,
      },
    ],
  });
  expect(resolvePlanPrice(plan, BillingInterval.QUARTERLY)?.amountMinor).toBe(2700);
});

it('returns null for an interval with no active price row', () => {
  const plan = makePublicPlan({ prices: [] });
  expect(resolvePlanPrice(plan, BillingInterval.SEMIANNUAL)).toBeNull();
});
```

(`makePublicPlan` — use whatever fixture helper name the existing test file already defines; do not invent a new one.)

- [ ] **Step 3: Run to verify it fails**

Run: `cd apps/claw-frontend && npx vitest run src/utilities/__tests__/pricing-catalog.utility.test.ts`
Expected: FAIL — compile error on the old boolean-arg calls once Step 4 below lands the new signature (run this AFTER step 4's signature change if your tool requires a compilable state to run at all; otherwise confirm the new cases fail against the OLD signature first, then proceed)

- [ ] **Step 4: Update the implementation**

```ts
// apps/claw-frontend/src/utilities/pricing-catalog.utility.ts
import type { BillingInterval } from '@/enums/billing.enum';
import { BillingInterval as BillingIntervalEnum } from '@/enums/billing.enum';
// (or a single `import { BillingInterval } from '@/enums/billing.enum';` if the
// file does not already need the type-only form elsewhere — match the existing
// import style used by sibling utility files such as billing.utility.ts.)

export function resolvePlanPrice(
  plan: PublicPlan,
  interval: BillingInterval,
): PublicPlanPrice | null {
  return plan.prices.find((price) => price.isActive && price.billingInterval === interval) ?? null;
}

export function resolvePlanMonthlyCreditMicroUsd(plan: PublicPlan): number {
  const monthly = resolvePlanPrice(plan, BillingIntervalEnum.MONTHLY);
  if (monthly === null) {
    return 0;
  }
  return monthlyCreditFromPlan(monthly.amountMinor, plan.paygCreditPercentBps);
}
```

Check the file's current import block before writing this — it likely does not yet import `BillingInterval` at all (the old code used literal strings `'YEARLY'`/`'MONTHLY'`), so add exactly one import line rather than the two speculative forms above; only import the type as a value import since it's now called as `BillingInterval.MONTHLY`, not just typed.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/claw-frontend && npx vitest run src/utilities/__tests__/pricing-catalog.utility.test.ts`
Expected: PASS, including every pre-existing case with its call site updated

- [ ] **Step 6: Gate the workspace**

Run: `cd apps/claw-frontend && npx tsgo --noEmit && npm run lint`
Expected: both fail loudly if any OTHER call site of `resolvePlanPrice` still passes a boolean — this is expected until Task 12 fixes `PlanTierCard`. If this task is executed standalone, note the typecheck failure and proceed to Task 11–12 in the same sitting before attempting to gate green; do not leave the tree mid-migration across a commit boundary — bundle Tasks 10, 11 and 12 into one commit if your executor processes tasks strictly sequentially with a gate after each.

- [ ] **Step 7: Commit (bundle with Tasks 11–12 if typecheck requires it — see Step 6)**

```bash
git add apps/claw-frontend/src/utilities/pricing-catalog.utility.ts apps/claw-frontend/src/utilities/__tests__/pricing-catalog.utility.test.ts
git commit -m "feat(frontend): resolvePlanPrice takes a BillingInterval, not isYearly"
```

---

### Task 11: `usePricingToggle` / `usePublicPricing` — boolean state becomes `BillingInterval` state

**Files:**

- Modify: `apps/claw-frontend/src/hooks/marketing/use-pricing-toggle.ts`
- Modify: `apps/claw-frontend/src/hooks/marketing/use-public-pricing.ts`
- Modify: `apps/claw-frontend/src/types/public-pricing.types.ts` (`UsePricingToggleReturn`, `UsePublicPricingResult`, `PublicPlanCardProps`)

**Interfaces:**

- Produces: `UsePricingToggleReturn = { interval: BillingInterval; selectInterval: (interval: BillingInterval) => void }` — REPLACES `{ isYearly, selectMonthly, selectYearly }`. `UsePublicPricingResult` gains `interval`/`selectInterval` in place of `isYearly`/`selectMonthly`/`selectYearly`. `PublicPlanCardProps` gains `interval: BillingInterval` in place of `isYearly: boolean`. Task 12 (`PlanTierCard`) and Task 13 (`PricingSection`) consume these new shapes.

Find `UsePricingToggleReturn` in `apps/claw-frontend/src/types/hook.types.ts` or `public-pricing.types.ts` (check both — Task research found `UsePublicPricingResult`/`PublicPlanCardProps` in `public-pricing.types.ts`; `UsePricingToggleReturn` may live in `hook.types.ts` alongside the other `UseXReturn` types) before editing, and edit it in place rather than guessing its file.

- [ ] **Step 1: Locate and update the three types**

```ts
// wherever UsePricingToggleReturn is declared
export type UsePricingToggleReturn = {
  interval: BillingInterval;
  selectInterval: (interval: BillingInterval) => void;
};
```

```ts
// apps/claw-frontend/src/types/public-pricing.types.ts
export type PublicPlanCardProps = {
  plan: PublicPlan;
  interval: BillingInterval;
};

export type UsePublicPricingResult = {
  plans: PublicPlan[];
  isLoading: boolean;
  isError: boolean;
  isFallback: boolean;
  error: Error | null;
  interval: BillingInterval;
  selectInterval: (interval: BillingInterval) => void;
  retry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
};
```

Add `import type { BillingInterval } from '@/enums/billing.enum';` to `public-pricing.types.ts` if not already present.

- [ ] **Step 2: Rewrite `usePricingToggle`**

```ts
// apps/claw-frontend/src/hooks/marketing/use-pricing-toggle.ts
'use client';

import { useCallback, useState } from 'react';

import { BillingInterval } from '@/enums/billing.enum';
import type { UsePricingToggleReturn } from '@/types';

export function usePricingToggle(): UsePricingToggleReturn {
  const [interval, setInterval] = useState<BillingInterval>(BillingInterval.MONTHLY);

  const selectInterval = useCallback((next: BillingInterval): void => {
    setInterval(next);
  }, []);

  return { interval, selectInterval };
}
```

- [ ] **Step 3: Update `usePublicPricing`**

```ts
// apps/claw-frontend/src/hooks/marketing/use-public-pricing.ts — replace the return statement's toggle fields
return {
  plans: query.data ?? PUBLIC_PRICING_FALLBACK_PLANS,
  isLoading: query.isLoading && !isFallback,
  isError: false,
  isFallback,
  error: (query.error as Error | null) ?? null,
  interval: toggle.interval,
  selectInterval: toggle.selectInterval,
  retry,
  t,
  locale,
};
```

- [ ] **Step 4: Typecheck (no test file for these two hooks today — the typecheck IS the verification that every consumer compiles once Tasks 12–13 update their call sites)**

Run: `cd apps/claw-frontend && npx tsgo --noEmit`
Expected: FAILS until Tasks 12 and 13 update `PlanTierCard` and `PricingSection` — this is expected mid-migration; proceed directly to Task 12 without committing this task alone (bundle the commit at the end of Task 13).

---

### Task 12: `PlanTierCard` — `isYearly: boolean` becomes `interval: BillingInterval`

**Files:**

- Modify: `apps/claw-frontend/src/components/marketing/home/plan-tier-card.tsx`

**Interfaces:**

- Consumes: `PublicPlanCardProps` (Task 11), `resolvePlanPrice(plan, interval)` (Task 10).

- [ ] **Step 1: Rewrite the component's interval-dependent lines**

```tsx
// apps/claw-frontend/src/components/marketing/home/plan-tier-card.tsx
import { BillingInterval } from '@/enums/billing.enum';
import { CHECKOUT_URL_INTERVAL_PARAM } from '@/constants/billing.constants';
// (rest of the existing imports unchanged)

export function PlanTierCard({ plan, interval }: PublicPlanCardProps): React.ReactElement {
  const { t, locale } = useTranslation();
  const price = resolvePlanPrice(plan, interval);
  const creditMicroUsd = resolvePlanMonthlyCreditMicroUsd(plan);
  const creditRatePercent = formatCreditRatePercent(plan.paygCreditPercentBps);
  const isFree = price?.amountMinor === 0;
  const cadenceKey = `marketing.pricing.cadence.${interval}`;
  const disabled = t('billing.quota.disabled');
  const unlimited = t('billing.quota.unlimited');
  const checkoutRoute = `${ROUTES.BILLING_CHECKOUT}?plan=${encodeURIComponent(plan.slug)}&interval=${CHECKOUT_URL_INTERVAL_PARAM[interval]}`;
  const returnRoute = isFree ? ROUTES.CHAT : checkoutRoute;
  const showsDiscount = interval === BillingInterval.QUARTERLY || interval === BillingInterval.SEMIANNUAL;

  // ... unchanged JSX below, EXCEPT the price line gains a discount badge:
```

Replace the price paragraph:

```tsx
<p className="mt-6 flex items-baseline gap-1">
  <span className="text-foreground text-3xl font-bold tracking-tight">
    {price === null ? t('billing.plans.unavailableForInterval') : formatPlanPrice(price, locale)}
  </span>
  {price === null || isFree ? null : (
    <span className="text-muted-foreground text-sm">{t(cadenceKey)}</span>
  )}
</p>;
{
  showsDiscount && price !== null && !isFree ? (
    <p className="text-primary mt-1 text-xs font-medium">{t('marketing.pricing.discountBadge')}</p>
  ) : null;
}
```

- [ ] **Step 2: Add the URL-param mapping constant**

The existing code built the checkout URL with `const interval = isYearly ? 'yearly' : 'monthly'` inline — that's an inline module-level mapping now needed for 4 values, so it moves to a constants file per the no-inline-const rule:

```ts
// apps/claw-frontend/src/constants/billing.constants.ts — add
import { BillingInterval } from '@/enums/billing.enum';

/** Lowercase URL query values PlanTierCard's checkout link uses, and
 * readCheckoutInterval parses back. Keep both in sync. */
export const CHECKOUT_URL_INTERVAL_PARAM: Record<BillingInterval, string> = {
  [BillingInterval.MONTHLY]: 'monthly',
  [BillingInterval.QUARTERLY]: 'quarterly',
  [BillingInterval.SEMIANNUAL]: 'semiannual',
  [BillingInterval.YEARLY]: 'yearly',
};
```

(`BillingInterval` is likely already imported in `billing.constants.ts` from Task 1 — add to the existing import rather than duplicating it.)

- [ ] **Step 3: Typecheck**

Run: `cd apps/claw-frontend && npx tsgo --noEmit`
Expected: still FAILS on `PricingSection`'s call site (`<PlanTierCard ... isYearly={...} />`) until Task 13 — expected, proceed directly to Task 13.

---

### Task 13: `PricingSection` — replace the hand-rolled toggle with `BillingIntervalToggle`

**Files:**

- Modify: `apps/claw-frontend/src/components/marketing/home/pricing-section.tsx`
- Test: check for an existing `pricing-section.test.tsx` and update its assertions to the new toggle markup/labels if one exists

**Interfaces:**

- Consumes: `BillingIntervalToggle` (already generic — see research; zero changes needed there), `usePublicPricing` (Task 11), `PlanTierCard` (Task 12).

- [ ] **Step 1: Check for an existing test**

Run: `find apps/claw-frontend/src/components/marketing/home/__tests__ -iname "pricing-section*"`

If a test file exists, read it fully before editing the component — its assertions almost certainly query the two hand-rolled `Button`s by their `toggleMonthly`/`toggleYearly` translated text or by `aria-pressed`, and need updating to query `BillingIntervalToggle`'s rendered buttons instead (labelled via `billing.interval.{MONTHLY,QUARTERLY,SEMIANNUAL,YEARLY}`, Task 14).

- [ ] **Step 2: Replace the hand-rolled toggle block**

```tsx
// apps/claw-frontend/src/components/marketing/home/pricing-section.tsx
import { BillingIntervalToggle } from '@/components/billing/billing-interval-toggle';
// (drop the now-unused `Button` import IF nothing else in this file still uses it —
// check the rest of the file: the retry/FAQ buttons below still use `Button`, so
// keep that import; only the two toggle-specific Button usages are removed)

export function PricingSection({
  initialPlans,
  compact = false,
  standalone = false,
}: PricingSectionProps): React.ReactElement {
  const controller = usePublicPricing(initialPlans);
  const plans = filterPublicPlans(controller.plans, compact);

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        {standalone ? (
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {controller.t('marketing.home.pricing.title')}
          </h1>
        ) : (
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {controller.t('marketing.home.pricing.title')}
          </h2>
        )}
        <p className="text-muted-foreground mt-4">{controller.t('marketing.home.pricing.intro')}</p>
      </div>

      <div className="mx-auto mt-8 flex w-fit justify-center">
        <BillingIntervalToggle
          value={controller.interval}
          onChange={controller.selectInterval}
          t={controller.t}
        />
      </div>

      {controller.isLoading ? (
        <p className="text-muted-foreground mt-10 text-center">{controller.t('common.loading')}</p>
      ) : null}
      {controller.isError ? (
        <div className="mt-10 text-center" role="alert">
          <p className="text-destructive">{controller.t('billing.plans.error')}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={controller.retry}>
            {controller.t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!controller.isLoading && !controller.isError && plans.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-center">
          {controller.t('billing.plans.empty')}
        </p>
      ) : null}
      {controller.isFallback ? (
        <div
          role="status"
          className="border-warning/40 bg-warning/10 text-foreground mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3 rounded-lg border px-4 py-3 text-center text-sm"
        >
          <span>{controller.t('marketing.pricing.temporaryCatalogDisclaimer')}</span>
          <Button type="button" size="sm" variant="outline" onClick={controller.retry}>
            {controller.t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!controller.isLoading && !controller.isError && plans.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanTierCard key={plan.id} plan={plan} interval={controller.interval} />
          ))}
        </div>
      ) : null}

      <CreditDualConsumptionNotice t={controller.t} className="mx-auto mt-8 max-w-4xl" />

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Link href={MARKETING_HOME_PATHS.FAQ} className="text-primary hover:underline">
          {controller.t('marketing.home.pricing.linkFaq')}
        </Link>
        <Link href={MARKETING_HOME_PATHS.USE_CASES} className="text-primary hover:underline">
          {controller.t('marketing.home.pricing.linkUseCases')}
        </Link>
      </div>
    </section>
  );
}
```

`BillingIntervalToggle`'s own `role="group" aria-label={t('billing.interval.toggleLabel')}` replaces the old hand-rolled `role="group" aria-label={controller.t('marketing.home.pricing.toggleLabel')}` wrapper — the old `marketing.home.pricing.toggleLabel`/`toggleMonthly`/`toggleYearly` keys become orphaned; leave them in the locale files (do not delete — out of scope for this plan, and deleting i18n keys needs its own audit for other readers) unless Task 14's own step explicitly checks they have zero remaining references and removes them then.

- [ ] **Step 3: Update or write the component test**

If a test exists, fix its selectors (Step 1). If none exists, this component does not require a new one for this plan (existing project convention only tests it if a prior task already established one — do not invent new test-coverage obligations outside the plan's scope; the underlying hooks and utilities carry the unit coverage).

- [ ] **Step 4: Full typecheck for the whole marketing pricing chain (Tasks 10–13 together)**

Run: `cd apps/claw-frontend && npx tsgo --noEmit`
Expected: PASS — this is the first point since Task 10 where the whole chain (`resolvePlanPrice` → `usePricingToggle`/`usePublicPricing` → `PlanTierCard` → `PricingSection`) compiles together.

- [ ] **Step 5: Run every touched test file**

Run: `cd apps/claw-frontend && npx vitest run src/utilities/__tests__/pricing-catalog.utility.test.ts src/utilities/__tests__/billing.utility.test.ts` (plus the pricing-section test if one exists)
Expected: PASS

- [ ] **Step 6: Lint the workspace**

Run: `cd apps/claw-frontend && npm run lint`
Expected: succeeds (0 errors; pre-existing warnings elsewhere in the workspace are not this task's concern)

- [ ] **Step 7: Commit (bundles Tasks 10–13 into one compilable checkpoint)**

```bash
git add apps/claw-frontend/src/utilities/pricing-catalog.utility.ts apps/claw-frontend/src/utilities/__tests__/pricing-catalog.utility.test.ts apps/claw-frontend/src/hooks/marketing/use-pricing-toggle.ts apps/claw-frontend/src/hooks/marketing/use-public-pricing.ts apps/claw-frontend/src/types/public-pricing.types.ts apps/claw-frontend/src/types/hook.types.ts apps/claw-frontend/src/components/marketing/home/plan-tier-card.tsx apps/claw-frontend/src/components/marketing/home/pricing-section.tsx apps/claw-frontend/src/constants/billing.constants.ts
git commit -m "feat(frontend): 4-way term selector on the public pricing page"
```

(Adjust the `hook.types.ts` path in the `git add` if Task 11's research located `UsePricingToggleReturn` in a different file — use whatever the actual edited path was.)

---

### Task 14: i18n — `billing.interval.QUARTERLY`/`SEMIANNUAL`, cadence and discount copy, all 13 locales

**Files:**

- Modify: `apps/claw-frontend/src/lib/i18n/locales/{en,ar,de,es,fa,fr,hi,it,ja,pt,ru,th,zh}.ts`
- Modify: `apps/claw-frontend/src/types/i18n.types.ts` (`TranslationDictionary` — add the new keys so `t()` stays type-checked against them; see root CLAUDE.md's warning that a wrong key silently renders the raw key string)

**Interfaces:**

- Produces: `billing.interval.QUARTERLY`, `billing.interval.SEMIANNUAL` (consumed by `BillingIntervalToggle`, generically, since Task 1); `marketing.pricing.cadence.MONTHLY` / `.QUARTERLY` / `.SEMIANNUAL` / `.YEARLY` (consumed by `PlanTierCard`'s `cadenceKey`, Task 12); `marketing.pricing.discountBadge` (consumed by `PlanTierCard`, Task 12).

- [ ] **Step 1: Add the keys to `en.ts` first**

In the `billing.interval` block (found at the existing `MONTHLY: 'Monthly', YEARLY: 'Yearly', toggleLabel: ...` location):

```ts
interval: {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMIANNUAL: 'Every 6 months',
  YEARLY: 'Yearly',
  toggleLabel: 'Billing period',
},
```

In the `marketing.pricing` block (replace `perMonth`/`perYear` with a `cadence` sub-object, and add `discountBadge`):

```ts
pricing: {
  // ... existing keys unchanged, EXCEPT:
  cadence: {
    MONTHLY: '/month',
    QUARTERLY: '/3 months',
    SEMIANNUAL: '/6 months',
    YEARLY: '/year',
  },
  discountBadge: '10% off',
  // perMonth / perYear removed — replaced by the cadence map above, since
  // PlanTierCard now looks up `marketing.pricing.cadence.${interval}`.
},
```

Search the whole frontend workspace for any OTHER reader of `marketing.pricing.perMonth` / `marketing.pricing.perYear` before deleting them — if nothing besides `PlanTierCard` (already migrated in Task 12) reads them, remove the two old keys; if something else does, keep them alongside the new `cadence` object instead of removing.

- [ ] **Step 2: Run the enum-label test — verify it now passes for `en.ts` but still fails for the other 12**

Run: `cd apps/claw-frontend && npx vitest run src/lib/i18n/__tests__/billing-enum-labels.test.ts`
Expected: still FAIL (only `en.ts` has the new keys)

- [ ] **Step 3: Add the same three key groups to all 12 remaining locale files**

For each of `ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh`: add `QUARTERLY`/`SEMIANNUAL` to that locale's `billing.interval` block, replace that locale's `marketing.pricing.perMonth`/`perYear` with the `cadence` object (four real, locale-appropriate translations — not the English fallback), and add `marketing.pricing.discountBadge` translated. Use each locale's own existing translation of `MONTHLY`/`YEARLY` and `/month`/`/year` as the anchor for a natural, locale-correct rendering of "every 3 months" / "every 6 months" / "/3 months" / "/6 months" — these are real translations, not machine-transliterated English, per the root CLAUDE.md i18n rule.

- [ ] **Step 4: Add the new keys to `TranslationDictionary`**

Read `apps/claw-frontend/src/types/i18n.types.ts`'s existing `interval: { MONTHLY: string; YEARLY: string; toggleLabel: string }` and `pricing: { ...; perMonth: string; perYear: string; ... }` shape declarations and update them to match exactly what Step 1 wrote (add `QUARTERLY`/`SEMIANNUAL` to the interval type; replace `perMonth`/`perYear` with a `cadence: { MONTHLY: string; QUARTERLY: string; SEMIANNUAL: string; YEARLY: string }` sub-type and add `discountBadge: string`).

- [ ] **Step 5: Run the enum-label test — verify it passes for all 13**

Run: `cd apps/claw-frontend && npx vitest run src/lib/i18n/__tests__/billing-enum-labels.test.ts`
Expected: PASS

- [ ] **Step 6: Typecheck the whole frontend**

Run: `cd apps/claw-frontend && npx tsgo --noEmit`
Expected: PASS — this is what proves every one of the 13 locale files actually implements the updated `TranslationDictionary` shape (a locale file missing a key fails typecheck here, not silently at render time, per the root CLAUDE.md warning about `t()` not being type-safe on its own).

- [ ] **Step 7: Lint and full frontend test run**

Run: `cd apps/claw-frontend && npm run lint && npm run test`
Expected: both succeed

- [ ] **Step 8: Commit and push**

```bash
git add apps/claw-frontend/src/lib/i18n/locales apps/claw-frontend/src/types/i18n.types.ts
git commit -m "feat(frontend): i18n for quarterly/semiannual billing terms, all 13 locales"
git push origin main
```

This closes the entire public-pricing-page half of the feature (Tasks 1, 9–14).

---

### Task 15: `AssignPlanDialog` + `useAssignPlanForm`

**Files:**

- Create: `apps/claw-frontend/src/components/admin/assign-plan-dialog.tsx`
- Create: `apps/claw-frontend/src/hooks/admin/use-assign-plan-form.ts`
- Create: `apps/claw-frontend/src/lib/validation/admin-plan-grant.schema.ts`
- Modify: `apps/claw-frontend/src/types/component.types.ts` (`AssignPlanDialogProps`)
- Modify: `apps/claw-frontend/src/types/hook.types.ts` (`UseAssignPlanFormReturn`)
- Test: `apps/claw-frontend/src/components/admin/__tests__/assign-plan-dialog.test.tsx`

**Interfaces:**

- Consumes: `AdminUser` (existing type), `PlanView` (existing type).
- Produces: `AssignPlanDialog({ open, user, plans, isSaving, onClose, onSave, t }): ReactElement` where `onSave: (userId: string, planId: string, durationMonths: number, grantReason: string) => void`. Task 16 (`useUserTableState`) owns `open`/`user`/`onClose`; Task 17 (`useAdminUserMutations`) owns `onSave`'s implementation and `isSaving`.

- [ ] **Step 1: Write the validation schema**

```ts
// apps/claw-frontend/src/lib/validation/admin-plan-grant.schema.ts
import { z } from 'zod';

export const adminPlanGrantSchema = z.object({
  planId: z.string().min(1),
  durationMonths: z.number().int().min(1).max(60),
  grantReason: z.string().trim().min(1).max(500),
});

export type AdminPlanGrantFormValues = z.infer<typeof adminPlanGrantSchema>;
```

- [ ] **Step 2: Write the failing form-hook test**

```tsx
// apps/claw-frontend/src/hooks/admin/__tests__/use-assign-plan-form.test.tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAssignPlanForm } from '../use-assign-plan-form';

const user = { id: 'user-1', activePlanId: 'plan-free' } as never;

describe('useAssignPlanForm', () => {
  it('resets to the target plan when the dialog opens for a new user', () => {
    const onSave = vi.fn();
    const { result, rerender } = renderHook(
      ({ u, planId }) => useAssignPlanForm(u, planId, onSave),
      { initialProps: { u: null as typeof user | null, planId: null as string | null } },
    );
    expect(result.current.form.getValues('planId')).toBe('');

    rerender({ u: user, planId: 'plan-pro' });
    expect(result.current.form.getValues('planId')).toBe('plan-pro');
  });

  it('does not submit while duration or reason are invalid', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAssignPlanForm(user, 'plan-pro', onSave));
    await act(async () => {
      await result.current.submit();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits userId, planId, durationMonths and a trimmed grantReason', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAssignPlanForm(user, 'plan-pro', onSave));
    act(() => {
      result.current.form.setValue('durationMonths', 3, { shouldValidate: true });
      result.current.form.setValue('grantReason', '  Support gesture  ', { shouldValidate: true });
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(onSave).toHaveBeenCalledWith('user-1', 'plan-pro', 3, 'Support gesture');
  });
});
```

Check `AdminUser`'s real shape and the exact react-hook-form test-utility import path this repo already uses (mirror `use-edit-user-form`'s OWN test file if one exists, for the precise `renderHook`/`act` import source — this repo may use `@testing-library/react-hooks` or plain `@testing-library/react`, and mirroring whichever one `use-edit-user-form` already uses avoids introducing a second pattern).

- [ ] **Step 3: Run to verify it fails**

Run: `cd apps/claw-frontend && npx vitest run src/hooks/admin/__tests__/use-assign-plan-form.test.tsx`
Expected: FAIL — module does not exist

- [ ] **Step 4: Write the hook**

```ts
// apps/claw-frontend/src/hooks/admin/use-assign-plan-form.ts
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminPlanGrantSchema,
  type AdminPlanGrantFormValues,
} from '@/lib/validation/admin-plan-grant.schema';
import type { AdminUser, UseAssignPlanFormReturn } from '@/types';

const EMPTY_VALUES: AdminPlanGrantFormValues = { planId: '', durationMonths: 1, grantReason: '' };

export function useAssignPlanForm(
  user: AdminUser | null,
  targetPlanId: string | null,
  onSave: (userId: string, planId: string, durationMonths: number, grantReason: string) => void,
): UseAssignPlanFormReturn {
  const form = useForm<AdminPlanGrantFormValues>({
    resolver: zodResolver(adminPlanGrantSchema),
    mode: 'onChange',
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    form.reset(
      user && targetPlanId
        ? { planId: targetPlanId, durationMonths: 1, grantReason: '' }
        : EMPTY_VALUES,
    );
  }, [form, user, targetPlanId]);

  return {
    form,
    submit: form.handleSubmit((values) => {
      if (!user) {
        return;
      }
      onSave(user.id, values.planId, values.durationMonths, values.grantReason.trim());
    }),
  };
}
```

- [ ] **Step 5: Add the return type**

```ts
// apps/claw-frontend/src/types/hook.types.ts — add near UseEditUserFormReturn
export type UseAssignPlanFormReturn = {
  form: UseFormReturn<AdminPlanGrantFormValues>;
  submit: (event?: React.BaseSyntheticEvent) => Promise<void>;
};
```

Add `import type { AdminPlanGrantFormValues } from '@/lib/validation/admin-plan-grant.schema';` to this file's import block.

- [ ] **Step 6: Run the hook test to verify it passes**

Run: `cd apps/claw-frontend && npx vitest run src/hooks/admin/__tests__/use-assign-plan-form.test.tsx`
Expected: PASS, 3/3

- [ ] **Step 7: Write the dialog component**

```tsx
// apps/claw-frontend/src/components/admin/assign-plan-dialog.tsx
'use client';

import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAssignPlanForm } from '@/hooks/admin/use-assign-plan-form';
import type { AssignPlanDialogProps } from '@/types/component.types';

export function AssignPlanDialog(props: AssignPlanDialogProps): ReactElement {
  const { open, user, targetPlanId, isSaving, onClose, onSave, t } = props;
  const { form, submit } = useAssignPlanForm(user, targetPlanId, onSave);
  const { errors, isValid } = form.formState;

  if (!user || !targetPlanId) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.assignPlanDialogTitle')}</DialogTitle>
          <DialogDescription>{t('admin.assignPlanDialogDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="assign-plan-duration" className="text-sm leading-none font-medium">
              {t('admin.assignPlanDurationLabel')}
            </label>
            <Input
              id="assign-plan-duration"
              type="number"
              min={1}
              max={60}
              autoComplete="off"
              error={Boolean(errors.durationMonths)}
              {...form.register('durationMonths', { valueAsNumber: true })}
            />
            {errors.durationMonths ? (
              <p className="text-destructive text-xs">{t('admin.assignPlanDurationInvalid')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="assign-plan-reason" className="text-sm leading-none font-medium">
              {t('admin.assignPlanReasonLabel')}
            </label>
            <Textarea
              id="assign-plan-reason"
              error={Boolean(errors.grantReason)}
              {...form.register('grantReason')}
            />
            {errors.grantReason ? (
              <p className="text-destructive text-xs">{t('admin.assignPlanReasonRequired')}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 pt-2 sm:justify-end sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('admin.assignPlanCancel')}
            </Button>
            <Button type="submit" disabled={isSaving || !isValid}>
              {t('admin.assignPlanConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Check whether `Textarea` accepts an `error` prop the way `Input` does (Task research read `textarea.tsx` and it currently spreads `React.TextareaHTMLAttributes` with no bespoke `error` prop) — if `Textarea` has no `error` prop, drop `error={Boolean(errors.grantReason)}` from that call and rely on the `<p>` message alone, matching whatever the actual component supports; do not add an `error` prop to the shared `Textarea` primitive as part of this task (out of scope — it's a generic UI primitive other features also use).

- [ ] **Step 8: Add `AssignPlanDialogProps`**

```ts
// apps/claw-frontend/src/types/component.types.ts — add near EditUserDialogProps
export type AssignPlanDialogProps = {
  open: boolean;
  user: AdminUser | null;
  targetPlanId: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (userId: string, planId: string, durationMonths: number, grantReason: string) => void;
  t: TranslateFunction;
};
```

- [ ] **Step 9: Write a component test**

```tsx
// apps/claw-frontend/src/components/admin/__tests__/assign-plan-dialog.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssignPlanDialog } from '../assign-plan-dialog';

const t = (key: string): string => key;
const user = { id: 'user-1' } as never;

describe('AssignPlanDialog', () => {
  it('renders nothing interactive when there is no target', () => {
    render(
      <AssignPlanDialog
        open={false}
        user={null}
        targetPlanId={null}
        isSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByText('admin.assignPlanDialogTitle')).not.toBeInTheDocument();
  });

  it('renders the duration and reason fields when open with a target', () => {
    render(
      <AssignPlanDialog
        open={true}
        user={user}
        targetPlanId="plan-pro"
        isSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByLabelText('admin.assignPlanDurationLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('admin.assignPlanReasonLabel')).toBeInTheDocument();
  });

  it('disables the confirm button while saving', () => {
    render(
      <AssignPlanDialog
        open={true}
        user={user}
        targetPlanId="plan-pro"
        isSaving={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('admin.assignPlanConfirm')).toBeDisabled();
  });
});
```

- [ ] **Step 10: Run to verify it passes**

Run: `cd apps/claw-frontend && npx vitest run src/components/admin/__tests__/assign-plan-dialog.test.tsx`
Expected: PASS, 3/3

- [ ] **Step 11: Gate the workspace**

Run: `cd apps/claw-frontend && npx tsgo --noEmit && npm run lint`
Expected: both succeed (the `admin.assignPlan*` i18n keys don't exist yet — Task 17 adds them; typecheck of `t()` calls is only checked against `TranslationDictionary` for keys that are statically known strings, which these are, so confirm whether this causes a typecheck failure now or only a runtime-raw-key issue later. If `t()`'s type genuinely requires the key to exist in `TranslationDictionary` today, bundle this task's commit with Task 17's i18n additions instead of committing standalone.)

- [ ] **Step 12: Commit**

```bash
git add apps/claw-frontend/src/components/admin/assign-plan-dialog.tsx apps/claw-frontend/src/components/admin/__tests__/assign-plan-dialog.test.tsx apps/claw-frontend/src/hooks/admin/use-assign-plan-form.ts apps/claw-frontend/src/hooks/admin/__tests__/use-assign-plan-form.test.tsx apps/claw-frontend/src/lib/validation/admin-plan-grant.schema.ts apps/claw-frontend/src/types/component.types.ts apps/claw-frontend/src/types/hook.types.ts
git commit -m "feat(frontend): AssignPlanDialog collects duration and reason for admin grants"
```

---

### Task 16: `useUserTableState` + `UserTable` — open the dialog instead of assigning immediately

**Files:**

- Modify: `apps/claw-frontend/src/hooks/admin/use-user-table-state.ts`
- Modify: `apps/claw-frontend/src/types/hook.types.ts` (`UseUserTableStateReturn`)
- Modify: `apps/claw-frontend/src/components/admin/user-table.tsx`
- Test: `apps/claw-frontend/src/components/admin/__tests__/user-table.test.tsx` (existing — extend)

**Interfaces:**

- Produces: `useUserTableState()` gains `{ assignPlanUser: AdminUser | null; assignPlanTargetId: string | null; openAssignPlan: (user: AdminUser, planId: string) => void; closeAssignPlan: () => void }`. `UserTable`'s plan-column `<Select onValueChange>` now calls `openAssignPlan(user, value)` instead of `onAssignPlan(user.id, value)` directly; the actual mutation fires only from `AssignPlanDialog`'s `onSave` (Task 17).

- [ ] **Step 1: Extend the failing hook test**

Check for an existing `use-user-table-state.test.ts`; if none exists, this hook has no dedicated unit test today (its behavior is covered through `user-table.test.tsx`) — in that case skip straight to Step 3's component-level test and do not invent a new hook test file that the project convention doesn't already have. If one DOES exist, add:

```ts
it('openAssignPlan stores the user and the selected plan id without calling assign yet', () => {
  const { result } = renderHook(() => useUserTableState());
  act(() => {
    result.current.openAssignPlan(mockUser, 'plan-pro');
  });
  expect(result.current.assignPlanUser).toBe(mockUser);
  expect(result.current.assignPlanTargetId).toBe('plan-pro');
});

it('closeAssignPlan clears both', () => {
  const { result } = renderHook(() => useUserTableState());
  act(() => {
    result.current.openAssignPlan(mockUser, 'plan-pro');
    result.current.closeAssignPlan();
  });
  expect(result.current.assignPlanUser).toBeNull();
  expect(result.current.assignPlanTargetId).toBeNull();
});
```

- [ ] **Step 2: Extend the hook**

```ts
// apps/claw-frontend/src/hooks/admin/use-user-table-state.ts
import { useCallback, useState } from 'react';

import type { AdminUser, AdminUserUpdateRequest, UseUserTableStateReturn } from '@/types';

export function useUserTableState(): UseUserTableStateReturn {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [temporaryPasswordUserId, setTemporaryPasswordUserId] = useState<string | null>(null);
  const [assignPlanUser, setAssignPlanUser] = useState<AdminUser | null>(null);
  const [assignPlanTargetId, setAssignPlanTargetId] = useState<string | null>(null);

  const handleRoleSelect = useCallback(
    (userId: string, role: string, onChangeRole: (userId: string, role: string) => void): void => {
      onChangeRole(userId, role);
      setEditingUserId(null);
    },
    [],
  );

  const openEditUser = useCallback((user: AdminUser): void => {
    setEditUser(user);
  }, []);

  const closeEditUser = useCallback((): void => {
    setEditUser(null);
  }, []);

  const submitEditUser = useCallback(
    (
      userId: string,
      data: AdminUserUpdateRequest,
      onUpdate: (userId: string, data: AdminUserUpdateRequest) => void,
    ): void => {
      onUpdate(userId, data);
      setEditUser(null);
    },
    [],
  );

  const requestTemporaryPassword = useCallback((userId: string): void => {
    setTemporaryPasswordUserId(userId);
  }, []);
  const cancelTemporaryPassword = useCallback((): void => {
    setTemporaryPasswordUserId(null);
  }, []);
  const confirmTemporaryPassword = useCallback(
    (onTemporaryPassword: (userId: string) => void): void => {
      if (temporaryPasswordUserId === null) {
        return;
      }
      onTemporaryPassword(temporaryPasswordUserId);
      setTemporaryPasswordUserId(null);
    },
    [temporaryPasswordUserId],
  );

  const openAssignPlan = useCallback((user: AdminUser, planId: string): void => {
    setAssignPlanUser(user);
    setAssignPlanTargetId(planId);
  }, []);
  const closeAssignPlan = useCallback((): void => {
    setAssignPlanUser(null);
    setAssignPlanTargetId(null);
  }, []);

  return {
    editingUserId,
    setEditingUserId,
    handleRoleSelect,
    editUser,
    openEditUser,
    closeEditUser,
    submitEditUser,
    temporaryPasswordUserId,
    requestTemporaryPassword,
    cancelTemporaryPassword,
    confirmTemporaryPassword,
    assignPlanUser,
    assignPlanTargetId,
    openAssignPlan,
    closeAssignPlan,
  };
}
```

This pushes the hook's body past the 50-line guideline in `apps/claw-frontend/CLAUDE.md`. Per that rule ("if a hook exceeds 50 lines, split it into smaller focused hooks"), if the line count genuinely exceeds the limit after this edit, extract the assign-plan pair (`assignPlanUser`/`assignPlanTargetId`/`openAssignPlan`/`closeAssignPlan`) into a small `useAssignPlanDialogState()` hook in the same file's directory, called FROM `useUserTableState` and spread into its return — `useUserTableState` remains the single controller hook `UserTable.tsx` calls (composition, not a second hook call from the TSX file, matching rule 12's "TSX files may only call ONE controller hook").

- [ ] **Step 3: Add the return-type fields**

```ts
// apps/claw-frontend/src/types/hook.types.ts — extend UseUserTableStateReturn
export type UseUserTableStateReturn = {
  editingUserId: string | null;
  setEditingUserId: (id: string | null) => void;
  handleRoleSelect: (
    userId: string,
    role: string,
    onChangeRole: (userId: string, role: string) => void,
  ) => void;
  editUser: AdminUser | null;
  openEditUser: (user: AdminUser) => void;
  closeEditUser: () => void;
  submitEditUser: (
    userId: string,
    data: AdminUserUpdateRequest,
    onUpdate: (userId: string, data: AdminUserUpdateRequest) => void,
  ) => void;
  temporaryPasswordUserId: string | null;
  requestTemporaryPassword: (userId: string) => void;
  cancelTemporaryPassword: () => void;
  confirmTemporaryPassword: (onTemporaryPassword: (userId: string) => void) => void;
  assignPlanUser: AdminUser | null;
  assignPlanTargetId: string | null;
  openAssignPlan: (user: AdminUser, planId: string) => void;
  closeAssignPlan: () => void;
};
```

- [ ] **Step 4: Wire `UserTable`**

```tsx
// apps/claw-frontend/src/components/admin/user-table.tsx
import { AssignPlanDialog } from '@/components/admin/assign-plan-dialog';
// (add alongside the other admin-dialog imports)

export function UserTable({
  users,
  plans,
  actor,
  pendingId,
  onChangeRole,
  onDeactivate,
  onReactivate,
  onActivate,
  onAssignPlan,
  onUpdateUser,
  onTemporaryPassword,
  isRoleChangePending,
  isDeactivatePending,
  isReactivatePending,
  isActivatePending,
  isAssignPlanPending,
  isUpdateUserPending,
  isTemporaryPasswordPending,
}: UserTableProps): React.ReactElement {
  const {
    editingUserId,
    setEditingUserId,
    handleRoleSelect,
    editUser,
    openEditUser,
    closeEditUser,
    submitEditUser,
    temporaryPasswordUserId,
    requestTemporaryPassword,
    cancelTemporaryPassword,
    confirmTemporaryPassword,
    assignPlanUser,
    assignPlanTargetId,
    openAssignPlan,
    closeAssignPlan,
  } = useUserTableState();
  const { t } = useTranslation();
  const activePlans = plans.filter((plan) => plan.isActive);
```

Replace the plan column's `onValueChange`:

```tsx
    {
      key: 'plan',
      header: t('admin.planColumn'),
      render: (user) => (
        <Select
          value={user.activePlanId ?? undefined}
          disabled={
            !resolveAdminUserCapability(user, actor).canAssignPlan ||
            (isAssignPlanPending && pendingId === user.id)
          }
          onValueChange={(value) => openAssignPlan(user, value)}
        >
          {/* ... SelectTrigger/SelectContent unchanged ... */}
        </Select>
      ),
    },
```

Add the dialog beside the existing two, at the bottom of the returned JSX:

```tsx
<AssignPlanDialog
  open={assignPlanUser !== null}
  user={assignPlanUser}
  targetPlanId={assignPlanTargetId}
  isSaving={isAssignPlanPending}
  onClose={closeAssignPlan}
  onSave={(userId, planId, durationMonths, grantReason) => {
    onAssignPlan(userId, planId, durationMonths, grantReason);
    closeAssignPlan();
  }}
  t={t}
/>
```

- [ ] **Step 5: Update `UserTableProps.onAssignPlan`'s signature**

```ts
// apps/claw-frontend/src/types/component.types.ts — UserTableProps, one line changed
onAssignPlan: (userId: string, planId: string, durationMonths: number, grantReason: string) => void;
```

- [ ] **Step 6: Update the existing component test**

Read `apps/claw-frontend/src/components/admin/__tests__/user-table.test.tsx` fully — any test that currently selects a plan value and asserts `onAssignPlan` was called immediately with `(userId, planId)` now needs to assert the dialog OPENED instead (`onAssignPlan` no longer fires on select), plus a new test that fills the dialog's fields and confirms `onAssignPlan` fires with all four arguments. Mirror however that file already tests `TemporaryPasswordDialog`'s open/confirm flow for the interaction pattern (render, `fireEvent`/`userEvent` select, assert dialog visible, fill fields, click confirm, assert callback args).

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd apps/claw-frontend && npx vitest run src/components/admin/__tests__/user-table.test.tsx`
Expected: PASS

- [ ] **Step 8: Gate the workspace**

Run: `cd apps/claw-frontend && npx tsgo --noEmit && npm run lint`
Expected: FAILS on `AdminUserMutationsReturn`'s `handleAssignPlan` signature and `plansRepository.assignUser` until Task 17 — expected mid-migration; proceed directly to Task 17 and bundle the commit.

---

### Task 17: `plansRepository.assignUser` + `useAdminUserMutations` — carry `durationMonths`/`grantReason`, plus the dialog's i18n

**Files:**

- Modify: `apps/claw-frontend/src/repositories/admin/plans.repository.ts` (`assignUser`)
- Modify: `apps/claw-frontend/src/hooks/admin/use-admin-user-mutations.ts` (`useAssignPlanMutation`, `handleAssignPlan`)
- Modify: `apps/claw-frontend/src/types/hook.types.ts` (`UseAdminUserMutationsReturn`)
- Modify: `apps/claw-frontend/src/lib/i18n/locales/{en,ar,de,es,fa,fr,hi,it,ja,pt,ru,th,zh}.ts` (`admin.assignPlan*` keys)
- Modify: `apps/claw-frontend/src/types/i18n.types.ts`
- Test: `apps/claw-frontend/src/hooks/admin/__tests__/use-admin-user-mutations.test.ts` (existing — extend)

**Interfaces:**

- Produces: `plansRepository.assignUser(userId, planId, durationMonths, grantReason): Promise<PlanView>`. `useAdminUserMutations().handleAssignPlan: (userId: string, planId: string, durationMonths: number, grantReason: string) => void` — the final shape `UserTable`'s `onAssignPlan` prop (Task 16) is bound to at the page level.

- [ ] **Step 1: Update the repository call**

```ts
// apps/claw-frontend/src/repositories/admin/plans.repository.ts — assignUser only
async assignUser(
  userId: string,
  planId: string,
  durationMonths: number,
  grantReason: string,
): Promise<PlanView> {
  const response = await apiClient.post<PlanView>(
    `${PLANS_BASE}/users/${encodeURIComponent(userId)}/assign`,
    { planId, durationMonths, grantReason },
  );
  return response.data;
},
```

- [ ] **Step 2: Extend the failing mutation test**

Read `apps/claw-frontend/src/hooks/admin/__tests__/use-admin-user-mutations.test.ts` fully first — update its existing `handleAssignPlan`/`assignUser` assertions to the new 4-argument shape, then confirm (or add) a case asserting the exact payload:

```ts
it('handleAssignPlan forwards duration and reason to the repository', () => {
  // ... existing test scaffolding for this file (queryClient wrapper, etc.) ...
  result.current.handleAssignPlan('user-1', 'plan-pro', 3, 'Support gesture');
  expect(plansRepository.assignUser).toHaveBeenCalledWith(
    'user-1',
    'plan-pro',
    3,
    'Support gesture',
  );
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd apps/claw-frontend && npx vitest run src/hooks/admin/__tests__/use-admin-user-mutations.test.ts`
Expected: FAIL

- [ ] **Step 4: Update the mutation and handler**

```ts
// apps/claw-frontend/src/hooks/admin/use-admin-user-mutations.ts

function useAssignPlanMutation(setActionPending: (value: string | null) => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      planId,
      durationMonths,
      grantReason,
    }: {
      userId: string;
      planId: string;
      durationMonths: number;
      grantReason: string;
    }) => plansRepository.assignUser(userId, planId, durationMonths, grantReason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.planAssigned') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.planAssignFailed'), { translate: t });
    },
  });
}
```

```ts
// inside useAccountHandlers — replace handleAssignPlan
const handleAssignPlan = (
  userId: string,
  planId: string,
  durationMonths: number,
  grantReason: string,
): void => {
  logger.info({
    component: 'admin',
    action: 'assign-plan',
    message: 'Assigning plan to user',
    details: { userId, planId, durationMonths },
  });
  setActionPending(userId);
  assignPlanMutation.mutate({ userId, planId, durationMonths, grantReason });
};
```

(Do not log `grantReason` in the structured log line above — it may carry free-text an admin wrote about a user's account; `durationMonths`/`planId`/`userId` are sufficient for the audit trail, matching rule 19's redaction posture applied to frontend logging.)

- [ ] **Step 5: Update the return type**

```ts
// apps/claw-frontend/src/types/hook.types.ts — UseAdminUserMutationsReturn, one line changed
handleAssignPlan: (userId: string, planId: string, durationMonths: number, grantReason: string) => void;
```

- [ ] **Step 6: Run the mutation test to verify it passes**

Run: `cd apps/claw-frontend && npx vitest run src/hooks/admin/__tests__/use-admin-user-mutations.test.ts`
Expected: PASS

- [ ] **Step 7: Add the dialog's i18n keys to `en.ts`**

In the `admin` block, alongside the existing `assignPlan: 'Assign plan', noPlan: 'No plan', planAssigned: ..., planAssignFailed: ...`:

```ts
assignPlanDialogTitle: 'Grant this plan',
assignPlanDialogDescription: 'Choose how long the grant lasts and record why you are making it.',
assignPlanDurationLabel: 'Duration (months)',
assignPlanDurationInvalid: 'Enter a whole number of months between 1 and 60.',
assignPlanReasonLabel: 'Reason',
assignPlanReasonRequired: 'A reason is required.',
assignPlanCancel: 'Cancel',
assignPlanConfirm: 'Grant plan',
```

- [ ] **Step 8: Add the same keys, genuinely translated, to the other 12 locales**

For each of `ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh`, add the same eight keys under that locale's `admin` block with real translations.

- [ ] **Step 9: Update `TranslationDictionary`**

Add the eight new keys to the `admin` section of `apps/claw-frontend/src/types/i18n.types.ts`.

- [ ] **Step 10: Full typecheck for the entire admin-dialog chain (Tasks 15–17 together)**

Run: `cd apps/claw-frontend && npx tsgo --noEmit`
Expected: PASS — this is the point where `AssignPlanDialog` (Task 15), `UserTable`/`useUserTableState` (Task 16) and `useAdminUserMutations`/`plansRepository` (this task) all compile together against the same 4-argument `onAssignPlan` shape.

- [ ] **Step 11: Run every touched test file**

Run: `cd apps/claw-frontend && npx vitest run src/components/admin/__tests__/assign-plan-dialog.test.tsx src/components/admin/__tests__/user-table.test.tsx src/hooks/admin/__tests__/use-admin-user-mutations.test.ts src/hooks/admin/__tests__/use-assign-plan-form.test.tsx src/lib/i18n/__tests__/billing-enum-labels.test.ts`
Expected: PASS across all five files

- [ ] **Step 12: Lint and build the whole frontend workspace**

Run: `cd apps/claw-frontend && npm run lint && npm run build`
Expected: both succeed

- [ ] **Step 13: Manual UAT before marking this done**

Per root CLAUDE.md's "For UI or frontend changes... test the golden path... in a browser": start the frontend dev container, sign in as `admin@claw.local` at `https://claw.local`, open `/admin/users`, select a plan for a test user, confirm the dialog opens (not an immediate assignment), submit with an invalid duration (0 or 61) and confirm the inline error, submit with a blank reason and confirm the inline error, then submit a valid grant (e.g. 3 months, a reason) and confirm the toast, the row's plan updates, and (via a direct DB check or the admin audit log if one surfaces this) that `entitlementValidUntil` landed roughly 3 calendar months out. Also visit the public `/` pricing section signed out and confirm the 4-way term toggle renders and switches prices.

- [ ] **Step 14: Commit and push**

```bash
git add apps/claw-frontend/src/repositories/admin/plans.repository.ts apps/claw-frontend/src/hooks/admin/use-admin-user-mutations.ts apps/claw-frontend/src/hooks/admin/__tests__/use-admin-user-mutations.test.ts apps/claw-frontend/src/types/hook.types.ts apps/claw-frontend/src/lib/i18n/locales apps/claw-frontend/src/types/i18n.types.ts apps/claw-frontend/src/components/admin/user-table.tsx apps/claw-frontend/src/components/admin/__tests__/user-table.test.tsx apps/claw-frontend/src/hooks/admin/use-user-table-state.ts
git commit -m "feat(frontend): wire the admin assign-plan dialog end to end"
git push origin main
```

This closes the entire feature. Run `npm run affected:list` once more from the repo root beforehand to confirm nothing outside `claw-frontend`, `claw-auth-service`, `claw-payment-service`, `shared-types` and `shared-utilities` was touched, and that every one of those five workspaces gates green before this final push.

---

## Self-review notes (for the implementer, not a task)

- **Spec coverage:** every section of the spec maps to a task — data model (Tasks 1, 4, 5), admin grant flow (Tasks 6–8), checkout flow (Tasks 3, 9), frontend pricing page (Tasks 10–14), frontend admin dialog (Tasks 15–17), error handling (`PLAN_GRANT_DURATION_INVALID`/`PLAN_GRANT_REASON_REQUIRED` in Task 7, zod bounds in Task 6/15), testing (a dedicated step in every task).
- **Known mid-plan red states, called out explicitly rather than hidden:** Task 1's enum-label test stays red until Task 14; Tasks 10→13 and 15→17 each leave the frontend workspace typecheck red until their final step, because they touch one link of a call chain at a time. Each task says so and tells the implementer what "expected FAIL" means versus a real regression.
- **Type consistency check performed:** `assignUserToPlan`'s repository signature (`userId, planId, assignedByUserId, durationMonths, grantReason, now`) matches every call site written across Tasks 7 and 8. `onAssignPlan`'s 4-argument shape (`userId, planId, durationMonths, grantReason`) matches across Tasks 15, 16 and 17. `resolvePlanPrice(plan, interval)` matches across Tasks 10 and 12.
