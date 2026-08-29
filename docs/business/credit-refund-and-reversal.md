# Credit Refund and Reversal

**Last reviewed**: 2026-08-29
**Status**: the mechanism is implemented; the **policy** below needs a named
business owner, and the enforceability questions need counsel
([credit-terms.md](credit-terms.md) L2–L4).

---

## The rule, in one line

**A credit reversal is capped at the unspent `PURCHASED` balance. The wallet never
goes negative. Spent credit is not refundable.**

## Why it is capped at unspent PURCHASED

| Bucket                  | Refundable? | Why                                                                                                                                                                               |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unspent **PURCHASED**   | **Yes**     | The customer paid cash and received nothing for it yet.                                                                                                                           |
| Spent **PURCHASED**     | **No**      | The service was rendered. The platform paid a provider for it, and that money is gone.                                                                                            |
| **GRANT**, spent or not | **No**      | It was never bought. It came with the subscription, and the subscription's own refund rules govern it — see [ADR-064](../13-adr/adr-064-refund-ledger-and-entitlement-policy.md). |

If a customer bought $30 of credit, spent $20 and asks for their money back, the
reversal is **$10** of credit and the corresponding fraction of the payment. Not
$30 — the platform already bought $20 of inference on their behalf.

## The wallet may never go negative

This is a hard invariant, not a preference. A negative wallet would mean the
platform had already let a customer spend money they did not have, which is the
exact failure the whole reservation-and-clamp design exists to make impossible.

Consequences that follow from it:

- A reversal larger than the unspent balance is **refused**, not clamped silently
  and not allowed to overdraw.
- Two concurrent reversals cannot both succeed against the same balance — the
  ledger's append-only arithmetic and the wallet's materialized sum are checked
  together.
- A chargeback on a top-up whose credit has already been spent leaves the platform
  out of pocket. That is a **fraud loss to be monitored**, not a case to be solved
  by pushing the wallet negative.

## A reversal is a new row, never an edit

`credit_ledger_entries` is append-only
([ADR-078](../13-adr/adr-078-payg-connector-credit.md),
[rule 37](../../rules/37-payg-credit-integrity.md)). A reversal is a compensating
`TOPUP_REVERSAL` row against the `PURCHASED` bucket, carrying the source event id
of the reversal for idempotency. The original `TOPUP` row is untouched, so the
history reads as what actually happened rather than as a corrected version of it.

The same rule the payment service already follows for prices, invoices and refunds
([rule 28](../../rules/28-billing-integrity-and-api-contracts.md)).

## How this relates to ADR-064 — and why it does not contradict it

[ADR-064](../13-adr/adr-064-refund-ledger-and-entitlement-policy.md) governs
**subscription** refunds and says: a partial refund preserves paid access; when
cumulative successful refunds equal the captured amount, the subscription becomes
`REFUNDED` and paid entitlement ends immediately; a chargeback is terminal and
revokes immediately.

Those rules are about a **subscription's entitlement**. A top-up has no
subscription to revoke, so the two policies govern different objects:

| Object          | Governed by                                                                   | On full reversal                                                |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Subscription    | [ADR-064](../13-adr/adr-064-refund-ledger-and-entitlement-policy.md)          | Subscription → `REFUNDED`, paid entitlement ends immediately    |
| A credit top-up | This document + [ADR-083](../13-adr/adr-083-credit-topup-checkout-purpose.md) | `PURCHASED` reduced by the unspent amount; nothing else changes |

They compose without conflicting:

- **A full subscription refund does not confiscate PURCHASED credit.** The
  customer bought that separately. Their **plan** entitlement ends; their
  **purchased** balance survives, exactly as it survives a downgrade or a
  cancellation ([credit-terms.md](credit-terms.md)).
- **A credit reversal does not touch the subscription.** It is not a partial
  subscription refund and must never be counted toward ADR-064's cumulative total,
  or a customer reversing a top-up would eventually appear to have fully refunded
  their plan and lose access to it.
- **`PaymentTransactionType.CREDIT_TOPUP` is in `REFUNDABLE_CHARGE_TYPES`** because
  it is money captured from a customer, and it is **deliberately absent from the
  operator's refundable-transactions list**, which is subscription-shaped by
  contract. The two lists answer different questions
  (`modules/refunds/constants/refundable-charge.constants.ts`).

**The invariant to preserve**: subscription refunds and credit reversals are
tracked against **different captured amounts** and are never summed together.
Breaking that is how a customer loses plan access for reversing a $5 top-up.

## Operator adjustments are not refunds

An operator can move a wallet directly with `ADMIN_CREDIT_MANAGE`, writing an
`ADMIN_ADJUSTMENT` ledger row. It is bounded and attributed:

| Guardrail                 | Value                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| Maximum single adjustment | `PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD` = $1,000                        |
| Reason required           | 8–500 characters                                                      |
| Actor recorded            | `actor_user_id` on the row                                            |
| Refused without both      | An unattributed credit is indistinguishable from a fabricated payment |

**An adjustment must never be used to imitate a payment.** A goodwill grant is an
`ADMIN_ADJUSTMENT` with a reason, not a `TOPUP` — a `TOPUP` row asserts money
arrived, and finance will read it that way.

## What is not built

| Gap                                                   | Status                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Partial-refund UI for a top-up                        | **Not built.** Reversal is driven by the payment-service refund path and the credit event.  |
| Automatic clawback on chargeback of spent credit      | **Not built, and deliberately not.** The wallet may not go negative; the loss is monitored. |
| Reversal of an `ADMIN_ADJUSTMENT`                     | A second, opposite `ADMIN_ADJUSTMENT` with its own reason. There is no undo.                |
| Fraud monitoring on top-up-then-spend-then-chargeback | **Not built.** The signal exists in the ledger; nothing watches it yet.                     |

## Open questions

| #   | Question                                                                                   | Owner          |
| --- | ------------------------------------------------------------------------------------------ | -------------- |
| R1  | What is the refund window for **unspent** purchased credit — always, or bounded in time?   | **unassigned** |
| R2  | Is spent credit ever refunded as a goodwill gesture, and who may authorise it?             | **unassigned** |
| R3  | What chargeback rate on top-ups triggers a change to the purchase flow?                    | **unassigned** |
| L2  | Do consumer-protection regimes require refunding purchased balances on request regardless? | **counsel**    |
| L4  | Is forfeiting purchased credit on termination for abuse enforceable?                       | **counsel**    |

## Related

- [credit-terms.md](credit-terms.md) — what credit legally is
- [topup-pricing.md](topup-pricing.md) — what was paid for it
- [ADR-064](../13-adr/adr-064-refund-ledger-and-entitlement-policy.md) · [ADR-083](../13-adr/adr-083-credit-topup-checkout-purpose.md)
- [`docs/11-runbooks/runbook-billing-reconciliation.md`](../11-runbooks/runbook-billing-reconciliation.md)
