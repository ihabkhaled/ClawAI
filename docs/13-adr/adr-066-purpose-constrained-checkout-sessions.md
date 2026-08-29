# ADR-066: Purpose-constrained checkout sessions

**Status**: Accepted

**Date**: 2026-07-27

**Deciders**: ClawAI core team
**Slice**: Subscription completion

> **Amended by [ADR-083](adr-083-credit-topup-checkout-purpose.md) (2026-08-29).**
> `CREDIT_TOPUP` is a **third** purpose class, not a fifth enum member: it carries
> no plan fields (like a setup) but a real amount (like a subscription), so it
> satisfied neither branch of the constraint below. The check constraint now has
> three branches. The decision recorded here is unchanged; read ADR-083 with it.

## Context

Paymob card vaulting starts with an order-like session, but it does not sell a
plan. The original `CheckoutSession` required a plan, price version, and billing
interval, which made a standalone payment-method setup impossible without
inventing a purchase.

The gateway callback already resolves an order through `CheckoutSession`.
Creating a second session table would require a second callback lookup path and
duplicate replay handling.

## Decision

Use the existing `CheckoutSession` with a required `CheckoutSessionPurpose`:

- `SUBSCRIPTION` requires `planId`, `planSlug`, `planPriceVersionId`, and
  `billingInterval`.
- `PAYMENT_METHOD_SETUP` requires all four plan fields to be null.
- A PostgreSQL check constraint enforces the relationship independently of
  application validation.
- Existing rows migrate to `SUBSCRIPTION`.
- Callback ownership is derived from our order-to-session-to-user chain, never
  from callback-supplied identity.
- A setup completion may store only encrypted gateway token material and masked
  card metadata. It cannot create a subscription, transaction, or invoice.

## Consequences

- Subscription and setup callbacks share one idempotent lookup path.
- Every query that processes purchases must exclude setup-purpose sessions.
- The conditional invariant is visible in both Prisma intent and the database
  migration; application code cannot silently weaken it.

## Alternatives considered

- **Separate `PaymentMethodSetupSession`.** Rejected because it duplicates the
  callback and replay path without adding a distinct lifecycle.
- **Sentinel free plan.** Rejected because it records a false purchase and
  contaminates billing analytics.
- **Nullable fields without a purpose constraint.** Rejected because malformed
  half-subscription rows would become valid.

## Validation

Migration tests assert both valid purposes and reject mixed/null-invalid rows.
Service and webhook tests cover replay, wrong-purpose reuse, ownership
resolution, and the absence of plan side effects.

## Rollback

Disable new setup-session creation first. Preserve existing setup sessions until
their gateway callbacks can no longer arrive. Do not coerce them into
subscription rows.
