# Pay-As-You-Go Connector Credit — Product Specification

**Status**: specified, implementation landing in batches C1–C8
**Owner**: unassigned — see [Open questions](#open-questions)
**Last reviewed**: 2026-08-29

The mechanism is in
[`docs/03-architecture/payg-credit.md`](../03-architecture/payg-credit.md); the
decisions are in [ADR-078](../13-adr/adr-078-payg-connector-credit.md)–[083](../13-adr/adr-083-credit-topup-checkout-purpose.md);
the dollar figures are in [`docs/business/`](../business/README.md). This page is
what the product is supposed to do, and how we will know it does it.

---

## The intent, in the user's words

> "Every connector that costs real money should draw down a credit balance the
> user can see. Give each plan a monthly dollar allowance, let people buy more
> when they run out, and never let anyone spend past what they have. Local models
> stay free."

Three things in that sentence carry the whole design:

- **"can see"** — a number the user reads, in dollars, on their billing page.
  Tokens are not a unit a customer can reason about; "how many tokens is a long
  code review?" has no answer and "how many dollars" has one.
- **"buy more"** — the allowance has to be top-up-able, so it has to be a wallet
  and not a counter.
- **"never let anyone spend past what they have"** — the strong form. Not
  "reconcile afterwards", not "usually". That is why the affordability clamp
  exists: the provider is called with a token ceiling the balance can pay for, so
  overspend is impossible by construction rather than corrected after the fact.

## Who it is for

| Persona                       | What changes for them                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| A paying user on a small plan | Sees a dollar allowance instead of an opaque token count; gets a shorter answer near the wall instead of a hard refusal   |
| A heavy user                  | Can buy credit instead of jumping a plan tier for one busy month                                                          |
| A free-trial visitor          | Gets $0.30 of frontier-model access that actually matches the copy on the pricing page                                    |
| An operator                   | Can meter or exempt a connector from the admin UI, adjust a wallet with an audited reason, and turn the whole feature off |
| The business                  | Has a per-user upper bound on provider spend, for the first time                                                          |

## What ships

1. **A two-bucket wallet per user.** `GRANT` (the plan allowance, resets monthly,
   no rollover) and `PURCHASED` (bought with money, never expires). Debits take
   GRANT first.
2. **A monthly allowance on every plan**, raised on every tier — the promoted
   `monthlyProviderCostCeilingMicroUsd`. Authoritative figures:
   [`docs/business/plan-allowances.md`](../business/plan-allowances.md).
3. **Metering on every surface that reaches a paid provider** — chat, compare,
   judge, the nine orchestration labs, the coding agent, images, file generation,
   workspace AI actions, and the router's own calls.
4. **Top-up**: five fixed, server-priced packages ($5/$10/$25/$50/$100).
5. **A visible balance, a ledger the user can audit, and low-balance warnings.**
6. **A kill switch** (`SystemSetting` `payg.credit.enabled`) and a per-connector
   admin toggle.

## Acceptance criteria

| #         | Criterion                                                                                                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AC-1**  | A user can read their balance in **dollars** — remaining, this period's allowance, and purchased credit — on the billing page, without doing arithmetic.                                                                      |
| **AC-2**  | A paid-provider request **cannot** settle for more than the balance it started with. Demonstrated by a property test: a request whose clamped `maxOutputTokens` × output rate exceeds the balance is impossible to construct. |
| **AC-3**  | At zero balance, **PAYG is blocked and local still works**. AUTO routing degrades to a local model and returns an answer; it does not refuse.                                                                                 |
| **AC-4**  | A request whose answer was shortened to fit the balance **says so** — visibly, in the UI, not only in metadata.                                                                                                               |
| **AC-5**  | Every debit names a **surface** (and a workflow where one applies), so "where did my $5 go" is answerable from the ledger alone.                                                                                              |
| **AC-6**  | A completed top-up raises `PURCHASED` **exactly once**. A redelivered gateway callback or event does not double-credit.                                                                                                       |
| **AC-7**  | For every wallet, `grant + purchased == SUM(ledger deltas)` — after a concurrency test with 10 parallel requests against a balance funding exactly one.                                                                       |
| **AC-8**  | An unpriced model on a metered provider is **blocked**, not free. A PAYG provider never resolves through the local-compute zero-rate path.                                                                                    |
| **AC-9**  | An operator can turn metering off platform-wide in **one write**, with no deploy, and exempt a single connector in one more.                                                                                                  |
| **AC-10** | Every user-facing string ships in **all 13 locales** as real translations, with `i18n.types.ts` updated, and a check asserting each new key differs from `en` in ar/fa/ja/zh/hi/ru/th.                                        |

## Decision log

Append-only. A decision is superseded by a **new dated row**, never by editing an
old one. E-rows are the edge cases that were resolved during planning.

| Date       | Ref     | Question                                                                                                  | Decision                                                                                                                                                                                                                                                           |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-29 | **D**   | Where does the allowance live?                                                                            | It **is** `Plan.monthlyProviderCostCeilingMicroUsd`, promoted. Not a new column. [ADR-078](../13-adr/adr-078-payg-connector-credit.md)                                                                                                                             |
| 2026-08-29 | **E1**  | **Mid-stream exhaustion** — the balance runs out while tokens are streaming                               | Cannot happen. The clamp fixes the ceiling **before** the call, so the provider cannot exceed the hold. If the clamp had to shorten the answer, the user is told (AC-4). No mid-stream cut-off was built, because none is reachable.                               |
| 2026-08-29 | **E2**  | **Compare fan-out** — 4 lanes, balance funds 3                                                            | **All-or-nothing.** Every lane's hold is taken up front; if one does not fit, none is taken and `PAYG_COMPARE_CREDIT_INSUFFICIENT` is raised. A partial comparison is a comparison the user cannot use, charged for.                                               |
| 2026-08-29 | **E3**  | **Async image jobs** — the request returns before the provider does                                       | The hold is taken at job **start** and released or finalized by the job, not by the HTTP response. Each attempt of an auto-fallback chain takes its own hold, because each is a real paid call. A crashed job is reclaimed by the 15-minute sweeper.               |
| 2026-08-29 | **E4**  | **Plan downgrade with purchased credit**                                                                  | `PURCHASED` **survives** in full. Only `GRANT` changes, and only at the next period roll — a downgrade does not claw back the allowance already granted for the current period.                                                                                    |
| 2026-08-29 | **E5**  | **Refund after the credit was spent**                                                                     | A reversal is capped at the **unspent `PURCHASED`** balance. The wallet never goes negative. Spent credit is not refundable, and this must be in the ToS before the flag goes on. [`credit-refund-and-reversal.md`](../business/credit-refund-and-reversal.md)     |
| 2026-08-29 | **E6**  | **Headless coding agent hits zero mid-run**                                                               | The run **pauses** at the turn boundary with a resumable state and a `PAYG_CREDIT_EXHAUSTED` reason, rather than failing the whole run. One hold per turn is what makes a clean pause point exist. Unattended runs are exactly where a silent failure costs most.  |
| 2026-08-29 | **E7**  | **AUTO routing with no credit**                                                                           | **Degrade to local, do not refuse** (D4). A refused reservation becomes `RouterErrorCode.BUDGET_EXCEEDED`, which is request-scoped: the cloud walk stops and AUTO falls to the local heuristic router. The user gets an answer.                                    |
| 2026-08-29 | **E8**  | **Double top-up submit** — the user clicks Buy twice                                                      | The client sends an `idempotencyKey`; the checkout session is idempotent on it; and the credit grant is keyed on a **unique `source_event_id`** in the ledger, so a duplicate collides at the database rather than at an application check two consumers can race. |
| 2026-08-29 | **E9**  | **Race between the model picker and Send** — the balance changes between rendering the picker and sending | The picker is **advisory**; the reservation at send time is authoritative. A model that was affordable when listed and is not when sent produces a normal 402 with the current numbers, not a stale promise.                                                       |
| 2026-08-29 | **E10** | **An unpriced model in the picker**                                                                       | Hidden from the picker for metered providers, and refused with `PAYG_MODEL_UNPRICED` if reached anyway. Never silently free — an unpriced paid model is an unbounded liability. This is why the model-cost seeder is launch-blocking.                              |
| 2026-08-29 | **E11** | **routing-service outage** — no prices available                                                          | Metered requests are refused with `PAYG_PRICING_UNAVAILABLE` and copy that says the platform cannot price the request right now and has **not** charged for it. Local models keep working. Fail closed on money, open on the product.                              |
| 2026-08-29 | **A3**  | Ollama **Cloud**                                                                                          | Defaults to **unmetered**. It is a routing-only provider name connector-service does not carry, so it resolves unclassified. The admin toggle is the lever. Recorded with its mechanism in [ADR-082](../13-adr/adr-082-payg-classification-grain.md).              |
| 2026-08-29 | **U7**  | Admin routing replay / shadow evaluation                                                                  | **Out of scope, unmetered, recorded rather than hidden.** No `userId` is recoverable (`RoutingDecision` has no such column), so charging anyone would charge the wrong person. `router-shadow-evaluation.manager.ts:138`.                                          |

## Non-goals

Each marked **never** (a deliberate permanent exclusion) or **not yet** (deferred,
with the condition that would change it).

| Non-goal                                             | Status      | Why                                                                                                                                                  |
| ---------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credit is withdrawable as cash                       | **never**   | It is a service allowance, not stored value. Making it withdrawable turns ClawAI into a money transmitter with the licensing that implies.           |
| Credit is transferable between users                 | **never**   | Same reason, plus it creates a secondary market and a fraud surface.                                                                                 |
| Credit expires after purchase                        | **never**   | `PURCHASED` never expires. Expiring money someone paid for is a chargeback generator and a reputational cost far above the float it saves.           |
| The wallet can go negative                           | **never**   | The whole point is a hard upper bound. A negative wallet means the bound failed.                                                                     |
| Per-model prices are shown to users                  | **never**   | The margin is not public. The user sees their allowance and their spend, never the platform's rate card.                                             |
| Metering the operator's own spend (admin replay, U7) | **not yet** | Needs `RoutingDecision.userId` or an operator-scoped budget. Would be a routing-service feature, not a user wallet.                                  |
| Arbitrary top-up amounts ("enter any number")        | **not yet** | Fixed SKUs keep the charge fully server-derived and the margin a per-SKU decision. Revisit when a customer actually asks.                            |
| Team / pooled wallets                                | **not yet** | The Team and Scale plans describe a "pooled allowance" in copy but the wallet is per-user today. Revisit when workspaces own billing.                |
| Auto top-up when the balance runs low                | **not yet** | Needs a stored payment method, a consent flow and a spending cap of its own. Manual top-up first.                                                    |
| Rollover of unused `GRANT`                           | **not yet** | Deliberate: no rollover keeps the monthly liability bounded. Revisit only with a business owner's sign-off on the accrual it creates.                |
| Metering Ollama Cloud                                | **not yet** | Needs connector-service to carry the provider. One admin toggle away once it does.                                                                   |
| Currency other than USD for credit                   | **not yet** | Credit is denominated in micro-USD; FX changes what the bank is charged, never what the wallet receives. Multi-currency credit is a separate design. |

## Open questions

All dated **2026-08-29**. Each needs a **named owner**, and several need a
business owner's sign-off before the flag can go on. This documentation is not
authority for any of them.

| #      | Question                                                                                 | Blocks                                     | Needs                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Q1** | Is **0.60** the right price→credit ratio, per SKU?                                       | Top-up going live                          | Business owner + real gateway fee data. [`topup-pricing.md`](../business/topup-pricing.md)              |
| **Q2** | Are the plan allowances (25–30% of revenue) sustainable at real usage?                   | Nothing — they are strictly generous today | Business owner + one period of production ledger data. [`margin-model.md`](../business/margin-model.md) |
| **Q3** | Does the credit ToS copy hold up?                                                        | **Flag-on. Hard blocker.**                 | Legal counsel. [`credit-terms.md`](../business/credit-terms.md)                                         |
| **Q4** | What notice is owed before lowering an allowance later?                                  | Any future reduction                       | Legal counsel + business owner. [`rollout-and-notice.md`](../business/rollout-and-notice.md)            |
| **Q5** | Should larger packages carry a better ratio (a volume discount)?                         | Nothing — all five are 0.60 today          | Business owner                                                                                          |
| **Q6** | Are the seeded model list prices close enough to real invoices?                          | Margin accuracy, not correctness           | An operator reconciling one month of provider invoices                                                  |
| **Q7** | Does "pooled allowance" in the Team/Scale plan copy now mislead, given per-user wallets? | Marketing copy accuracy                    | Product owner                                                                                           |
| **Q8** | Where should the low-balance warning appear, and how often may it re-fire?               | Warning UX                                 | Product owner                                                                                           |

## Known gaps at time of writing

- **nginx has no `/api/v1/credit` location.** `grep -rn "credit" infra/nginx/`
  returns nothing today. Until batch C7 adds it, the user-facing wallet routes are
  unreachable from the browser and only the internal and admin paths work. This is
  a delivery-checklist item, not a design gap.
- **`docs/06-data/plan-and-quota-specification.md` carried the pre-migration
  allowance table.** It has been corrected in the same change as this document;
  if the two ever disagree again,
  [`docs/business/plan-allowances.md`](../business/plan-allowances.md) is the
  authority and `plan-catalog.json` is the ground truth.
- **`QuotaService.reserveWeighted` is now duplicated rather than dead.** See the
  known-gaps section of [ADR-080](../13-adr/adr-080-one-reservation-not-two.md).

## Related

- [`docs/03-architecture/payg-credit.md`](../03-architecture/payg-credit.md) — the mechanism
- [`docs/business/README.md`](../business/README.md) — the business layer
- [`docs/11-runbooks/runbook-payg-credit.md`](../11-runbooks/runbook-payg-credit.md) — deploying it
- [`rules/37-payg-credit-integrity.md`](../../rules/37-payg-credit-integrity.md)
- [`docs/06-data/plan-and-quota-specification.md`](../06-data/plan-and-quota-specification.md)
