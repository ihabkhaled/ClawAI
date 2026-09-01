# Admin Plan Grants and Multi-Month Checkout Design

## Goal

Two related gaps, closed together because they share the same "term length"
concept:

1. **Admin plan grants have no duration today.** `POST admin/plans/users/:userId/assign`
   sets a plan with no expiry, no attribution, and no audit reason — an admin
   grant is indistinguishable from a default free assignment in the ledger.
   Admins need to grant a plan for a chosen number of months, with the grant
   properly attributed and time-limited.
2. **Self-service checkout only offers monthly or yearly.** Users should be
   able to prepay for 1, 3, 6 or 12 months, with a 10% discount on the 3- and
   6-month terms. The 12-month term keeps its existing price (already ~16.7%
   off monthly, i.e. "10 months for the price of 12").

## Business outcome

An admin can give a user a real, working entitlement for a specific, bounded
window (a support gesture, a partnership, a bug-compensation credit) without
writing to the database by hand, and every such grant is attributable to the
admin who made it and the reason they gave. A paying user can commit to a
longer term and see the discount up front, resolved server-side from an
immutable price, never computed from client input.

## Non-goals

- No auto-renewal. Every purchase — monthly, quarterly, semiannual, or
  yearly — remains a single prepaid period the user manually renews, matching
  every existing interval today. This feature does not introduce recurring
  billing.
- No promo-code / coupon system. The discount is a fixed property of the
  3-month and 6-month terms, not a code a user enters.
- No new expiry-enforcement mechanism. `entitlementValidUntil` already lazily
  gates access in `findEffectiveForUser`; this feature only ensures admin
  grants populate that field correctly. A lapsed admin grant behaves exactly
  like a lapsed paid subscription today: silent fallback to the default plan,
  not a hard block.

## Considered approaches

1. **Compute discounted prices inline at checkout time from `monthly × N ×
0.9`.** Rejected: the billing threat model requires every price to be
   pinned to an immutable, server-resolved row at session creation, never
   computed from a formula at the moment of charge — this is how the existing
   `YEARLY` price already works and where the invariant against "an unverified
   price" comes from.
2. **A single generic `termMonths: number` field with a runtime discount
   function, no interval enum.** Rejected: `PlanPriceVersion` is keyed by
   `(planId, billingInterval)` with a partial-unique "one active price per
   plan+interval" constraint, and every consumer (checkout, entitlement
   events, invoices) already treats billing interval as a small closed enum.
   A free-form month count breaks that constraint and would require touching
   every consumer of `BillingInterval`. Two new enum members is a much smaller
   change than replacing the enum with an integer everywhere it appears.
3. **Add `QUARTERLY`/`SEMIANNUAL` as two new `BillingInterval` values, priced
   as new immutable `PlanPriceVersion` rows (selected).** Fits the existing
   pattern exactly: `resolvePeriodEndMs` already special-cases interval to
   calendar months, `PlanPriceVersion` is already versioned per interval, and
   every downstream consumer (invoices, entitlement events, admin pricing
   UI) already reads through the same interval-keyed lookup.

## Authoritative data model

**`packages/shared-types/src/enums/billing-interval.enum.ts`**

```ts
export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY', // 3 months, 10% off
  SEMIANNUAL = 'SEMIANNUAL', // 6 months, 10% off
  YEARLY = 'YEARLY', // unchanged: ~10 months of the monthly rate
}
```

**auth-service** (`apps/claw-auth-service/prisma/schema.prisma`)

- `BillingIntervalKind` enum gets `QUARTERLY` and `SEMIANNUAL` added
  (migration; additive, no data change to existing rows).
- For every paid `Plan`, seed two new immutable `PlanPriceVersion` rows:
  `QUARTERLY` = `round(monthlyMinor × 3 × 0.90)`, `SEMIANNUAL` =
  `round(monthlyMinor × 6 × 0.90)`. Computed once, by a seed/migration script,
  in integer minor units — never at request time. `YEARLY` rows are untouched.
- `UserPlanAssignment` gains no new columns. `grantType`, `grantReason`,
  `assignedByUserId`, `entitlementValidUntil` already exist and are simply
  populated correctly by the admin-assign path (they are not today).

**payment-service** (`apps/claw-payment-service/prisma/schema.prisma`)

- No schema change. `Subscription.billingInterval` and
  `CheckoutSession.billingInterval` are already plain `String` columns,
  validated against the shared `BillingInterval` enum at the application
  layer, so the two new values need no migration here.

## Admin plan grant flow (auth-service)

`POST admin/plans/users/:userId/assign` request body changes from
`{ planId }` to:

```ts
{
  planId: string,
  durationMonths: number, // positive integer, admin's free choice (e.g. up to 24)
  grantReason: string,    // required, non-empty, max 500 chars
}
```

`plans.service.ts#assignUserToPlan` / `plans.repository.ts#assignUserToPlan`:
one transaction, mirroring the existing trial-assignment pattern —

1. Expire the user's current `ACTIVE` assignment (unchanged from today).
2. Compute `entitlementValidUntil = addCalendarMonths(now, durationMonths)`,
   reusing the same calendar-safe month arithmetic as
   `resolvePeriodEndMs` (31 Jan + 1 month clamps to 28/29 Feb, not 3 Mar) —
   extracted to a small shared utility both services can call, since the
   logic is identical and currently only lives in payment-service.
3. Create the new `UserPlanAssignment` with `status: ACTIVE`, `grantType:
ADMIN_GRANT`, `grantReason`, `assignedByUserId` (the authenticated admin,
   already available in the controller), `entitlementValidUntil`.
4. Point `User.activePlanId` at the new plan (unchanged from today).

The trial path (`assignTrialPlanOnce`) is untouched — it is a distinct,
already-correct flow for `isTrial` plans and does not accept a duration or
reason from the admin.

**No new expiry sweep.** `findEffectiveForUser`'s existing filter
(`status: 'ACTIVE', OR: [{ entitlementValidUntil: null }, {
entitlementValidUntil: { gt: now } }]`) already excludes a lapsed admin grant
the moment `entitlementValidUntil` passes, falling back to the default plan —
the same lazy mechanism a lapsed paid subscription already relies on. This
feature's only job is making sure `entitlementValidUntil` is no longer left
`null` for admin grants.

## Self-service multi-month checkout flow (payment-service)

`POST billing/checkout-sessions` already accepts `billingInterval` as one of
a closed set of strings; the only change is validating it against the
4-member enum instead of 2, and `resolvePeriodEndMs` gains two branches:

```ts
const MONTHS_BY_INTERVAL: Record<BillingInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  YEARLY: 12,
};
```

replacing the current binary `YEARLY`-or-else-add-one-month branching, with
the same calendar-clamping logic applied for whichever month count is
resolved. Price resolution (already reads the active `PlanPriceVersion` for
`(planId, billingInterval)`) needs no change beyond the two new rows existing
to be found — this is the same code path `YEARLY` already exercises.

Frontend: the pricing/upgrade page's monthly/yearly toggle becomes a 4-way
term selector (1 / 3 / 6 / 12 months). Each option's price is read from the
checkout-session response (server-resolved), never computed in the browser.
The 3- and 6-month options are labelled with their discount ("10% off");
the 12-month option keeps its existing "2 months free"-style copy.

## Error handling

- `durationMonths` missing, zero, negative, non-integer, or greater than 60
  (5 years — a deliberate ceiling, not a real expected case, to keep a typo
  like `240` from silently granting two decades) → 400
  `PLAN_GRANT_DURATION_INVALID`.
- `grantReason` missing or empty → 400 `PLAN_GRANT_REASON_REQUIRED` (mirrors
  the existing `ADMIN_ADJUSTMENT` pattern on credit ledger entries, which
  already refuses an unattributed operator action).
- An unsupported `billingInterval` string reaching checkout → the existing
  validation path (Zod schema on `CheckoutController`) rejects it before any
  price lookup runs; no new failure mode.
- A plan missing a `QUARTERLY`/`SEMIANNUAL` `PlanPriceVersion` row (e.g. a
  newly added plan the seed script hasn't covered yet) → the existing
  "no active price for this plan+interval" checkout error fires unchanged;
  the term simply isn't offered for that plan until priced.

## Testing

**auth-service**

- `assignUserToPlan` sets `grantType: ADMIN_GRANT`, `grantReason`,
  `assignedByUserId`, and a correctly calendar-computed
  `entitlementValidUntil` for a range of `durationMonths` (1, 12, 24,
  including a 31-Jan start clamping into February).
- Rejects assignment with missing/invalid `durationMonths` or empty
  `grantReason`.
- `findEffectiveForUser` falls back to the default plan once an admin
  grant's `entitlementValidUntil` is in the past — proving the existing lazy
  mechanism covers this new grant type with no new code path.
- The trial assignment path (`assignTrialPlanOnce`) is unaffected — a
  regression test pins its request shape as still `{ planId }` only.

**payment-service**

- `resolvePeriodEndMs` for `QUARTERLY` and `SEMIANNUAL`, including
  month-end clamping (e.g. 31 Jan + 6 months → 31 Jul, 31 Aug + 6 months
  → 28/29 Feb).
- A price-integrity test: for every paid plan, `QUARTERLY` equals
  `round(monthly × 3 × 0.9)` and `SEMIANNUAL` equals `round(monthly × 6 ×
0.9)`; `YEARLY` is byte-identical to its current seeded value (regression
  guard against accidentally re-deriving it).
- Checkout-session creation for all four intervals resolves the correct
  `PlanPriceVersion` and stamps the correct `currentPeriodEnd`.

**frontend**

- Admin assign-plan dialog: month-count input and reason field are required
  before submit is enabled; i18n keys added in all 13 locales.
- Pricing page: 4-way term selector renders the server-provided price per
  term, never a client-computed one; discount copy only shows on
  3-/6-month options.

## Rollout

Additive only — new enum members, new price rows, new optional-until-used
request fields on an admin-only endpoint. No existing plan, price, or
assignment is modified except that `PlanPriceVersion` gains rows and
`assignUserToPlan`'s Zod schema gains two required fields (a breaking change
to that one admin-only endpoint's request shape, acceptable since it has no
external consumers outside the admin dashboard, which ships in the same
change).
