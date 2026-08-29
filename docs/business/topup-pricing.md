# Top-Up Pricing — the 0.60 ratio, and why not 1:1

**Last reviewed**: 2026-08-29
**Status**: **the 0.60 ratio is a seeded default. No business owner has signed it
off (open question Q1).** It is defensible arithmetic, not a decision.

---

## The five packages

Fixed, server-priced SKUs. The request body carries `{ packageId, gateway,
idempotencyKey }` and **never an amount**
([ADR-083](../13-adr/adr-083-credit-topup-checkout-purpose.md)).

| Slug         | Customer pays | Credit received | Ratio |
| ------------ | ------------: | --------------: | ----: |
| `credit-5`   |         $5.00 |           $3.00 |  0.60 |
| `credit-10`  |        $10.00 |           $6.00 |  0.60 |
| `credit-25`  |        $25.00 |          $15.00 |  0.60 |
| `credit-50`  |        $50.00 |          $30.00 |  0.60 |
| `credit-100` |       $100.00 |          $60.00 |  0.60 |

Seeded by `apps/claw-auth-service/prisma/seeders/credit-packages.seeder.js`.
`priceMinor` is integer minor units; `creditMicroUsd` is integer micro-USD; the
ratio is applied as **BigInt arithmetic**, so 60% of $5 is exactly $3.000000 and
never `2999999.9999999995`. No float touches either number.

## Why not 1:1

**A dollar of top-up does not buy a dollar of provider inference.**

Selling credit at par books **negative gross margin on every single purchase**, for
two independent reasons that both apply at once:

1. **The gateway takes its cut before the money arrives.** A card payment costs
   roughly 2.9% plus a fixed fee. On a $5 top-up the fixed component alone is a
   material fraction of the sale.
2. **The platform still pays the provider list price** for the inference the credit
   buys. There is no volume discount being passed through — if anything the
   opposite, since the operator may be on list pricing themselves.

Worked, at 1:1 on the smallest package:

```
Customer pays                 $5.00
Gateway fee (~2.9% + $0.30)  −$0.45      ← illustrative, gateway-dependent
Net received                  $4.55
Credit granted                $5.00      ← at 1:1
Provider cost when spent     −$5.00
─────────────────────────────────────
Gross margin                 −$0.45      on every purchase, before anything else
```

At 0.60:

```
Customer pays                 $5.00
Gateway fee (~2.9% + $0.30)  −$0.45
Net received                  $4.55
Credit granted                $3.00
Provider cost when spent     −$3.00
─────────────────────────────────────
Gross margin                 +$1.55      31% of the sale
```

The gateway fee figures are **illustrative**, not contracted. They are the
difference between the two rows above being roughly right and being wrong in the
same direction, so replacing them with real numbers is Q1's actual work.

## Why the ratio is a column and not a constant

`CreditPackageVersion` carries `priceMinor` and `creditMicroUsd` as **two
independent columns**. The ratio is what falls out of them; it is never stored as a
multiplier and never compiled into code.

Three consequences follow, all deliberate:

- **An operator can reprice without a deploy.** A negotiated provider contract, a
  different gateway, or a different market all move the right ratio, and none of
  them should require an engineer.
- **Every historical purchase keeps the ratio it was actually sold at.** A version
  row is immutable; a reprice creates a **new** version. The seeder does
  `findUnique`-then-`create` on `activeKey` and **never `upsert`** — an upsert
  would rewrite the price a completed purchase was quoted, which is the one thing a
  versioned price table exists to prevent.
- **The number never appears in `shared-constants`.** The header of
  `packages/shared-constants/src/payg-credit.constants.ts` says it outright: _"The
  one number this file must never contain is a price."_ Prices live in the
  database ([rule 28](../../rules/28-billing-integrity-and-api-contracts.md)).

`activeKey` is the emulated partial-unique index copied from `PlanPriceVersion`: it
holds the package id while a version is the active price and `NULL` once retired.
Postgres treats every `NULL` as distinct, so any number of retired rows coexist
while a **second active price for one package is rejected by the database itself**,
rather than by an "unset the others" that two admins can race.

## Guardrails on the purchase path

| Guardrail                                     | Where                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| The client never names an amount              | `CreditTopupDto` — `{ packageId, gateway, idempotencyKey }`                                                                           |
| The charge is derived server-side             | `CreditChargeResolverService`, sibling of `ChargeResolverService`                                                                     |
| A zero- or negative-priced package is refused | `CreditChargeResolverService` — some gateways accept a zero-amount order and report it paid, which would mint credit against no money |
| The version id is frozen onto the session     | `checkout_sessions.credit_package_version_id`                                                                                         |
| FX changes the charge, never the credit       | Credit is denominated in micro-USD; the wallet always receives the package's own figure                                               |
| A duplicate credit grant collides at the DB   | `credit_ledger_entries.source_event_id` is `@unique`                                                                                  |

## How a customer reads it

The purchase flow must show **the credit received**, not the ratio. "$5.00 → $3.00
of credit" is a price a customer can evaluate; "0.60x" is a rate that invites the
question of what the other 40% is. Whether the ratio itself must be disclosed as a
rate is legal question **L7** in [credit-terms.md](credit-terms.md).

## Open questions

| #      | Question                                                                                  | Owner          |
| ------ | ----------------------------------------------------------------------------------------- | -------------- |
| **Q1** | Is 0.60 right, per SKU, against **real** gateway fees and **real** provider rates?        | **unassigned** |
| **Q5** | Should larger packages carry a better ratio (a volume discount)? All five are 0.60 today. | **unassigned** |
| Q1a    | Does the $5 package survive its fixed gateway fee, or should the smallest SKU be $10?     | **unassigned** |
| Q1b    | Is there a floor ratio below which the offer stops being credible to a customer?          | **unassigned** |

## Related

- [margin-model.md](margin-model.md) — where the rest of the margin comes from
- [credit-terms.md](credit-terms.md) — what the customer is buying
- [credit-refund-and-reversal.md](credit-refund-and-reversal.md) — what happens if they want it back
- [ADR-083](../13-adr/adr-083-credit-topup-checkout-purpose.md)
