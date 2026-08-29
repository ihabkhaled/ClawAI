# Business Layer

The commercial documents behind ClawAI's money paths: what a plan gives, what a
top-up costs, what credit legally is, and what we owe a customer before changing
any of it.

This directory exists because [rule 33](../../rules/33-knowledge-compounding-and-context-velocity.md)
makes business and product knowledge first-class: pricing, entitlement, quota and
refund semantics must be answerable **in the language of the business case**,
without reading a repository method. An agent asked "what is a Pro plan actually
worth to us?" should not have to open `plan-catalog.json` and do arithmetic.

## What is here

| Document                                                       | Answers                                                                                   |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [plan-allowances.md](plan-allowances.md)                       | **One authoritative dollar figure per plan**, and which limit actually binds first        |
| [margin-model.md](margin-model.md)                             | What a plan costs us at full allowance draw, and where the margin actually comes from     |
| [credit-terms.md](credit-terms.md)                             | What credit legally is: non-withdrawable, non-transferable, GRANT vs PURCHASED expiry     |
| [topup-pricing.md](topup-pricing.md)                           | The $5→$3.00 ratio, and why 1:1 books a loss on every purchase                            |
| [credit-refund-and-reversal.md](credit-refund-and-reversal.md) | What may be refunded, capped at what, and how it does not contradict ADR-064              |
| [rollout-and-notice.md](rollout-and-notice.md)                 | How the feature is switched on, and what notice a future allowance change owes a customer |

## The honesty rule for this directory

Several numbers here **need a named business owner's sign-off and do not have
one**. Where that is true, the document says so at the top, in bold, rather than
implying the figure is settled. A seeded default is a starting point, not
authority.

Nothing in this directory is legal advice, and the credit terms in particular need
counsel review before the feature is enabled for real customers.

## Ground truth vs authority

| Layer                                                     | Role                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/claw-auth-service/prisma/seeders/plan-catalog.json` | **Ground truth** for a fresh install — what the code will actually seed |
| The `plans` table in a running install                    | **Ground truth** for that install — an operator may have tuned it       |
| [plan-allowances.md](plan-allowances.md)                  | **Authority** for what the numbers are supposed to be, and why          |

When the first two disagree with the third, the third is either wrong or the
install has been tuned. Read the table before assuming.

## Related

- [`docs/02-business-product/payg-credit-spec.md`](../02-business-product/payg-credit-spec.md) — intent and acceptance criteria
- [`docs/03-architecture/payg-credit.md`](../03-architecture/payg-credit.md) — the mechanism
- [`docs/06-data/plan-and-quota-specification.md`](../06-data/plan-and-quota-specification.md) — the technical quota contract
- [`docs/03-architecture/billing-threat-model.md`](../03-architecture/billing-threat-model.md)
- [ADR-078](../13-adr/adr-078-payg-connector-credit.md) · [ADR-083](../13-adr/adr-083-credit-topup-checkout-purpose.md)
- [`rules/28-billing-integrity-and-api-contracts.md`](../../rules/28-billing-integrity-and-api-contracts.md) · [`rules/37-payg-credit-integrity.md`](../../rules/37-payg-credit-integrity.md)
