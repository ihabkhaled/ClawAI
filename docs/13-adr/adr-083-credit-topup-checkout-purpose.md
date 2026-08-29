# ADR-083: Credit top-up is a third checkout purpose class

**Status**: Accepted (**amends [ADR-066](adr-066-purpose-constrained-checkout-sessions.md)**)
**Date**: 2026-08-29
**Deciders**: ClawAI core team
**Slice**: Pay-as-you-go connector credit (PAYG flagship)

## Context

[ADR-066](adr-066-purpose-constrained-checkout-sessions.md) established
`CheckoutSession` as the one order-like row every gateway callback resolves
through, with a required `CheckoutSessionPurpose` and a PostgreSQL check
constraint enforcing which columns each purpose may carry. It recognised **two**
shapes:

- `SUBSCRIPTION` (`NEW_SUBSCRIPTION` / `UPGRADE` / `RENEWAL`) — plan fields
  required, amounts required;
- `PAYMENT_METHOD_SETUP` — all four plan fields null, a small verification amount
  required, consent timestamp required.

`checkout_sessions_purpose_fields_check` (added by migration `20260727013000`,
widened by `20260728150000`) is a **two-branch** `CHECK`.

A credit top-up satisfies **neither branch**. It carries no plan fields (like a
setup) but it carries a real, customer-chosen amount and produces a real
entitlement (like a subscription). Adding `CREDIT_TOPUP` to the enum without
touching the constraint would have made **every top-up insert fail at the
database** — the row would satisfy no branch of the `OR`.

That is the entire reason this ADR exists as an amendment rather than a footnote:
ADR-066's invariant was written for two shapes, and a third shape is not a new
member of an existing class.

## Decision

**`CREDIT_TOPUP` is a third purpose class with its own branch of the check
constraint, and it is priced entirely server-side.** ADR-066 is not edited in
place; this ADR is the forward link.

### The third branch

Migration `20260829120200_add_credit_topup_checkout` drops the constraint,
rebuilds the enum, adds three columns, and re-adds the constraint with three
branches. The two pre-existing branches are **reproduced verbatim** and then
extended to require the three new credit columns be `NULL`, so a subscription or
a card-setup row can never carry credit fields — the activation branch is chosen
from exactly these fields, and a half-typed row that looks like both would
otherwise be valid.

The `CREDIT_TOPUP` branch requires: all plan fields, `subscription_id` and
`proration_quote_id` `NULL`; a positive `base_amount_minor` and
`charge_amount_minor` with their currencies; and all three of
`credit_package_id`, `credit_package_version_id` and a positive
`credit_micro_usd` `NOT NULL`.

Two mechanical details are load-bearing and are recorded in the migration itself:

- **The constraint is dropped before the enum is rebuilt**, because its
  expression compares the column against enum literals.
- **The enum is rename-and-recreated, not `ALTER TYPE … ADD VALUE`.** Prisma runs
  a migration file in one transaction, and PostgreSQL refuses to _use_ an enum
  value added in the same transaction that added it — which the new `CHECK`
  branch does on its first line. `checkout_sessions.purpose` is the only column
  of this type, so swapping the type is safe.
- `payment_transactions.type` is a **TEXT** column, not a PostgreSQL enum, so
  `PaymentTransactionType.CREDIT_TOPUP` needs no database change.

### Fixed, server-priced packages

Top-ups are **not** an arbitrary amount the customer types. Five fixed SKUs are
seeded — `credit-5`, `credit-10`, `credit-25`, `credit-50`, `credit-100` — and the
request body carries `{ packageId, gateway, idempotencyKey }` and **never an
amount**. `CreditChargeResolverService` derives the charge from the immutable
`CreditPackageVersion` fetched out of auth-service, exactly as
`ChargeResolverService` derives a subscription charge from `PlanPriceVersion`.

A zero- or negative-priced package is refused before it reaches a gateway: some
providers accept a zero-amount order and report it paid, which would mint credit
against no money.

FX follows the plan path exactly — a non-USD gateway settles against a bound
quote whose id is stored on the session — but **the credit granted is always the
package's own micro-USD figure, never a converted one.** Credit is a service
allowance denominated in micro-USD; FX changes what the customer's bank is
charged, not how much the wallet receives.

### The price→credit ratio is a column, seeded at 0.60

`CreditPackageVersion` carries `priceMinor` and `creditMicroUsd` as **independent
columns**. The ratio between them is the platform's gross margin on a top-up.

It is seeded at **0.60** — $5.00 buys $3.00 of credit — and it is **not 1:1**. A
dollar of top-up does not buy a dollar of provider inference: the gateway takes
its cut before the money arrives and the platform still pays the provider list
price, so selling credit at par books negative gross margin on **every single
purchase**.

0.60 is a seeded starting point, not a constant. It lives in an immutable version
row so an operator can reprice without a deploy, and every historical purchase
keeps the ratio it was actually sold at. The seeder does `findUnique`-then-`create`
on `activeKey` — never `upsert` — because an upsert would rewrite the price a
completed purchase was quoted, which is the one thing a versioned price table
exists to prevent.

**The 0.60 figure needs a named business owner's sign-off before the flag goes
on.** It is documented, with its arithmetic, in
[`docs/business/topup-pricing.md`](../business/topup-pricing.md) and
[`docs/business/margin-model.md`](../business/margin-model.md); neither this ADR
nor the seeder is the authority for what the number _should_ be.

## Consequences

**Gained:**

- One callback path still. A top-up resolves through the same
  order → session → user chain as everything else, with the same replay handling.
- The database, not the application, rejects a malformed top-up row.
- A reprice cannot rewrite a completed purchase.

**Accepted — the constraint is now a three-way `OR` and is the most
change-sensitive object in the payment schema.** A fourth purpose class means
reproducing three branches verbatim and extending each. The migration comment is
the contract.

**Accepted — a top-up is refundable, and that interacts with
[ADR-064](adr-064-refund-ledger-and-entitlement-policy.md).**
`PaymentTransactionType.CREDIT_TOPUP` is in `REFUNDABLE_CHARGE_TYPES` because it
_is_ money captured from a customer. It is deliberately **absent from the
operator's refundable-transactions list**, which is subscription-shaped by
contract — the two lists answer different questions.

ADR-064's entitlement rule ("a partial refund preserves paid access; a cumulative
full refund revokes it") is about a **subscription**, and a top-up has no
subscription to revoke. The credit-side rule is separate and additive: a reversal
is capped at the **unspent `PURCHASED` balance**, the wallet may never go
negative, and the reversal is a compensating `TOPUP_REVERSAL` ledger row, never an
edit. Spent credit is not refundable. This does not contradict ADR-064; it is the
credit analogue of it, written out in
[`docs/business/credit-refund-and-reversal.md`](../business/credit-refund-and-reversal.md).

**Accepted — `credit_package_id` and `credit_package_version_id` are opaque
strings with no foreign key**, because they name rows in **auth-service's**
database. That is the standing ownership boundary
(`apps/claw-payment-service/CLAUDE.md`), and it is also why dropping the credit
tables in auth is never a valid rollback: payment still holds rows referencing
them with nothing to stop you.

## Alternatives considered

**A separate `CreditTopupSession` table.** Rejected for exactly the reason
ADR-066 rejected `PaymentMethodSetupSession`: it duplicates the callback lookup
and the replay handling without adding a distinct lifecycle. A top-up is
order-shaped, and the order table already exists.

**A sentinel "credit plan" so a top-up looks like a subscription.** Rejected —
it records a false purchase, contaminates subscriber counts and MRR, and makes
every billing query filter it out by name.

**Relax the check constraint to allow a top-up through the existing branches.**
Rejected because the branch is what makes a half-typed row impossible, and
loosening it to fit a third shape would legalise the malformed rows the
constraint exists to reject.

**Customer-entered top-up amounts.** Rejected for launch. Fixed SKUs keep the
charge fully server-derived, keep the gateway's minimum and maximum out of the
UI, and make the margin ratio a per-SKU decision. An arbitrary-amount top-up is a
later product question, not a schema one.

**A single `CREDIT_RATIO` constant in `shared-constants`.** Rejected — it would
put a price in a compiled package, contradicting both the seeded-price rule and
the "prices are never constants" rule at the top of
`packages/shared-constants/src/payg-credit.constants.ts`.

## Validation

A migration test asserts that a valid row of each of the three purposes is
accepted and that every cross-shaped row (a subscription carrying credit fields, a
top-up carrying plan fields, a top-up with a null or non-positive
`credit_micro_usd`) is rejected by the database. Service tests cover
server-derived pricing, a refused zero-priced package, an idempotent replay
raising `PURCHASED` exactly once, and a reversal capped at the unspent balance.

## Rollback

Stop creating new top-up sessions first, and let existing ones reach their
callback — a session whose gateway callback can still arrive must not be
destroyed. Do **not** narrow the constraint back to two branches while any
`CREDIT_TOPUP` row exists; the migration is additive and safe to leave in place.

**After the first successful top-up, the money is real.** See the point-of-no-return
section of [`runbook-payg-credit.md`](../11-runbooks/runbook-payg-credit.md).

## Related

- [ADR-066](adr-066-purpose-constrained-checkout-sessions.md) — the invariant this amends
- [ADR-064](adr-064-refund-ledger-and-entitlement-policy.md) — refunds and entitlement
- [ADR-078](adr-078-payg-connector-credit.md) — the wallet a top-up credits
- [`docs/business/topup-pricing.md`](../business/topup-pricing.md) · [`docs/business/margin-model.md`](../business/margin-model.md)
