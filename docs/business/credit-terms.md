# Credit Terms

**Last reviewed**: 2026-08-29

> ### This document needs legal counsel sign-off before the feature is enabled
>
> It is written by engineers to state **what the system actually does**, so that
> counsel has something concrete to review. It is **not legal advice**, it is not
> the terms of service, and nothing here has been reviewed by a lawyer.
>
> **Open question Q3 is a hard blocker on flag-on**: the customer-facing ToS and
> purchase-flow copy must be drafted and approved before a real customer can buy
> credit. Selling something whose terms are undefined is the risk this warning
> exists to prevent.

---

## What credit is

**A prepaid service allowance for paid cloud inference on ClawAI, denominated in
US dollars.**

It is a unit of account for a service the customer has already bought. It is not
money, not a deposit, not a gift card, and not stored value.

## What credit is not — and why each line matters

| Property                            | Statement                                                                       | Why it is drawn this way                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Non-withdrawable**                | Credit can never be converted back to cash by the customer.                     | Withdrawable balances are stored value. That is a money-transmission activity in many jurisdictions, with licensing, bonding and reporting obligations ClawAI does not have and does not want. |
| **Non-transferable**                | Credit cannot be moved to another account, gifted, or sold.                     | Transferability creates a secondary market, a fraud surface (buy with a stolen card, transfer, abandon), and a much stronger argument that the balance is stored value.                        |
| **Not a security or an investment** | Credit does not appreciate, earn interest, or represent a claim on the company. | It is a prepayment for a service at a stated rate.                                                                                                                                             |
| **Denominated in USD**              | Credit is micro-USD regardless of the currency the customer paid in.            | FX changes what the bank charges; it never changes how much credit the wallet receives. Enforced in `CreditChargeResolverService`.                                                             |
| **Consumed at our rates**           | Credit is drawn down at the platform's per-model rates, which may change.       | Provider prices move. The allowance is denominated in dollars, so a provider price rise costs the platform, not the customer's balance.                                                        |

## The two buckets, and their very different expiry

This is the distinction with the largest legal and reputational weight, so it is
stated plainly.

| Bucket        | Origin                         | Expiry                                                            | On plan change                                                                                |
| ------------- | ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **GRANT**     | Included with the subscription | **Resets at the end of each billing period. Does not roll over.** | The next period's grant reflects the new plan. The current period's grant is not clawed back. |
| **PURCHASED** | Bought with money, separately  | **Never expires.**                                                | Survives upgrade, downgrade, and cancellation of the subscription in full.                    |

**The asymmetry is deliberate and must never be reversed.**

- Debits take **GRANT first** — spend the perishable half before the money someone
  paid for. A customer must never lose purchased credit to an expiring allowance
  they also had.
- Refunds return to **PURCHASED** — handing cash back as a bucket that expires at
  the end of the month would quietly confiscate it.
- Unused **GRANT** is swept at the period roll and written to the ledger as
  `GRANT_EXPIRY`, so the ledger still sums to the wallet. **It is not revenue and
  is not modelled as breakage** ([margin-model.md](margin-model.md)).

The no-rollover rule on GRANT exists to bound the monthly liability, not to harvest
unspent allowance. That is exactly why PURCHASED does not expire: the moment a
customer's own money could expire, the argument that this is a service allowance
rather than stored value gets much weaker, and so does the customer's trust.

## What happens on cancellation

| Event                                  | GRANT                             | PURCHASED                                                                                                                  |
| -------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Downgrade                              | Next period reflects the new plan | Untouched                                                                                                                  |
| Upgrade                                | Next period reflects the new plan | Untouched                                                                                                                  |
| Subscription cancelled                 | Stops granting at period end      | **Retained.** Spendable while the account exists.                                                                          |
| Account deleted by the user            | Gone                              | **Forfeited.** This must be stated explicitly in the purchase flow, not only in the ToS — see the copy requirements below. |
| Account terminated by ClawAI for abuse | Gone                              | **Unsettled.** See open questions.                                                                                         |

## Refunds

Summarised here; the full rules are in
[credit-refund-and-reversal.md](credit-refund-and-reversal.md).

- A refund is capped at the **unspent `PURCHASED`** balance.
- **Spent credit is not refundable** — the service was rendered.
- The wallet may never go negative.
- A reversal is a compensating `TOPUP_REVERSAL` ledger row, never an edit.

## Copy that must exist before flag-on

Each of these is a place a customer forms an expectation. All 13 locales, as real
translations ([rule 20](../../rules/20-i18n-and-user-facing-messages.md)).

| Surface                  | Must say                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Top-up purchase flow     | The exact credit received, that it is non-refundable once spent, non-transferable, and not withdrawable |
| Top-up confirmation      | Credit added, new balance, and that purchased credit does not expire                                    |
| Billing / wallet page    | The GRANT vs PURCHASED split, and the date GRANT resets                                                 |
| Exhaustion message       | What is blocked (paid models) and what still works (local), plus how to top up                          |
| Clamped-answer notice    | That the answer was shortened to fit the remaining credit                                               |
| Plan change confirmation | That purchased credit is unaffected                                                                     |
| Account deletion         | That purchased credit is forfeited                                                                      |
| Terms of service         | All of the above, as terms                                                                              |

## Open questions for counsel — all dated 2026-08-29

| #   | Question                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | Does a non-withdrawable, non-transferable, USD-denominated service allowance avoid money-transmitter treatment in the jurisdictions ClawAI sells into? |
| L2  | Do any consumer-protection regimes (EU, UK, some US states) require that **purchased** balances be refundable on request, regardless of our terms?     |
| L3  | Is forfeiting purchased credit on **user-initiated account deletion** enforceable, and what notice does it need?                                       |
| L4  | Is forfeiting purchased credit on **termination for abuse** enforceable, and should it instead be refunded net of the abuse?                           |
| L5  | Does GRANT expiry need explicit consent at each period, or is disclosure at purchase and on the billing page sufficient?                               |
| L6  | Do sales-tax or VAT obligations attach at **purchase** of credit or at **consumption**? This changes the invoice, not just the terms.                  |
| L7  | Does the 0.60 price→credit ratio need to be disclosed as a rate, or is "you pay $5, you receive $3.00 of credit" sufficient?                           |

**Owner: unassigned.** Until L1–L7 have answers from counsel, this feature should
not take real money from a real customer.

## Related

- [credit-refund-and-reversal.md](credit-refund-and-reversal.md) · [topup-pricing.md](topup-pricing.md) · [rollout-and-notice.md](rollout-and-notice.md)
- [ADR-083](../13-adr/adr-083-credit-topup-checkout-purpose.md) — how a top-up is charged
- [ADR-064](../13-adr/adr-064-refund-ledger-and-entitlement-policy.md) — subscription refund policy
- [`packages/shared-types/src/enums/credit-bucket.enum.ts`](../../packages/shared-types/src/enums/credit-bucket.enum.ts) — the two buckets in code
