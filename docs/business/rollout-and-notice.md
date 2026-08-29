# Rollout and Notice

**Last reviewed**: 2026-08-29
**Status**: the switch-on sequence is engineering-owned and complete. **The notice
policy needs a named business owner and counsel review (Q4, L-series).**

The operational procedure — commands, verification queries, kill switches, the
point of no return — is
[`docs/11-runbooks/runbook-payg-credit.md`](../11-runbooks/runbook-payg-credit.md).
This page is the **commercial** side: what customers are told, when, and what we
owe them later.

---

## Why turning this on is a commitment, not a deploy

Before this feature, `monthlyProviderCostCeilingMicroUsd` was an internal
profitability control that no user could see — `plan-and-quota-specification.md`
said so explicitly, and `billing-threat-model.md` listed "learn margins from an
error" as a threat.

[ADR-078](../13-adr/adr-078-payg-connector-credit.md) reverses that on purpose. The
moment a customer reads "$5.00 of credit this month" on their billing page, that
number stops being a knob and becomes **something we told them they were buying**.

Everything on this page follows from that one sentence.

## The switch-on sequence

The feature ships **dark**: `payg.credit.enabled` defaults to `false` and every
connector's `isPayAsYouGo` can be flipped independently, so code can land in
production for days before anything is metered.

| Stage | What happens                                                                                        | Customer sees                            | Reversible?          |
| ----- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------- |
| **0** | Code deployed, flag off, allowances seeded, model prices seeded, **verified by reading the tables** | Nothing                                  | Yes — flag stays off |
| **1** | Allowances raised on every plan (strictly generous, every tier up or equal)                         | More allowance, if they look             | Yes                  |
| **2** | Wallet and balance UI visible, metering still **off**                                               | Their balance, not yet moving            | Yes                  |
| **3** | Metering **on** for internal / staff accounts only, via the connector toggle                        | Nothing                                  | Yes                  |
| **4** | Metering **on** for everyone                                                                        | Balance falls; refusals possible at zero | Yes — flag off       |
| **5** | Top-up purchase enabled                                                                             | Can buy credit                           | **No.** See below.   |

**Stage 5 is the commercial point of no return.** Before it, everything is
reversible with one write. After the first successful top-up, a customer has paid
real money for a balance, and rolling the feature back means refunding people
rather than flipping a flag.

## Gates on stage 5

Stage 5 must not happen until all of these are true. Each is a hard blocker.

| Gate                                                                       | Owner          | Status                      |
| -------------------------------------------------------------------------- | -------------- | --------------------------- |
| ToS and purchase-flow copy drafted and **approved by counsel** (Q3, L1–L7) | counsel        | **Not done — hard blocker** |
| The 0.60 price→credit ratio signed off against real gateway fees (Q1)      | business owner | **Not done**                |
| Refund policy signed off (R1–R3)                                           | business owner | **Not done**                |
| All customer-facing strings in 13 locales as real translations             | engineering    | Batch C7                    |
| Balance, ledger, exhaustion and clamp surfaces verified in a browser       | engineering    | Batch C7 / Q-B              |
| `/api/v1/credit` proxied by nginx                                          | engineering    | Batch C7 — **absent today** |
| The runbook's verification queries return the expected rows                | engineering    | Per-deploy                  |

## Notice policy

### Raising an allowance

**No notice required.** Strictly generous; nobody loses anything. This is what the
initial migration does — every tier goes up or stays equal, which is precisely what
made it safe to change a live entitlement in one deploy.

### Lowering an allowance

**This is a price change in substance and must be treated as one.**

Lowering `monthlyProviderCostCeilingMicroUsd` reduces what a subscriber receives
for the same money. Before this feature it was invisible and arguably an internal
tuning decision. Now it is a published figure on the billing page.

Proposed policy — **unsigned, needs a business owner and counsel (Q4)**:

| Change                                     | Proposed treatment                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Reduction to any paid tier                 | Notice before the change, effective at the **next billing period**, never mid-period |
| Reduction affecting an annual subscriber   | Effective no earlier than their **renewal**                                          |
| Reduction to the Free tier                 | Notice on the pricing page; no individual notice                                     |
| Emergency reduction (provider price shock) | **Undefined.** Needs a policy before it is needed, not during.                       |

Two things must be true regardless of what the policy turns out to be:

- **A reduction never touches `PURCHASED` credit.** That was bought separately, at
  a stated rate, and does not expire ([credit-terms.md](credit-terms.md)).
- **A reduction never applies retroactively within a period.** The grant for the
  current period has already been made and appears in the ledger as a `PLAN_GRANT`
  row; clawing it back would be an edit to financial history, which
  [rule 37](../../rules/37-payg-credit-integrity.md) forbids.

### Changing the top-up ratio

A new `CreditPackageVersion`, never an edit. Every historical purchase keeps the
ratio it was sold at, so no notice is owed for **past** purchases. Whether notice is
owed before **future** purchases at a worse ratio is Q5/L7 territory — counsel.

### Changing which providers are metered

Turning metering **on** for a provider that was free reduces what a customer gets
for their subscription, even though no allowance number changed. Treat it as a
reduction and give the same notice. This is the case most likely to be missed,
because it is an admin toggle rather than a plan edit — for example enabling
metering on Ollama Cloud, which is unmetered by default today.

## Communications checklist

Before stage 4, and again before stage 5:

- [ ] Pricing page reflects the new allowances, in dollars, per tier
- [ ] Every plan's seeded description still matches what the plan actually gives
      (Free's copy — _"Try every frontier model with a small daily allowance"_ —
      was the reason Free kept $0.30 rather than dropping to $0)
- [ ] "Pooled allowance" in Team/Scale copy is reviewed against the fact that
      wallets are **per-user** today (open question Q7)
- [ ] Changelog entry describing the visible balance and the raised allowances
- [ ] Support has the runbook, the ledger queries, and the adjustment bounds
- [ ] Support knows the difference between a subscription refund and a credit
      reversal, and that the two are never summed
      ([credit-refund-and-reversal.md](credit-refund-and-reversal.md))

## If it has to be turned off after stage 5

Summarised; the mechanics are in the runbook.

1. Flip `payg.credit.enabled` to `false`. Nothing is metered from the next request.
2. Disable top-up purchases so no further money arrives.
3. **Do not drop the credit tables.** Balances people paid for live there, and
   payment-service holds `CheckoutSession` rows referencing them.
4. Decide, with counsel, what happens to outstanding `PURCHASED` balances: honoured
   as an unmetered courtesy, or refunded. **This decision has not been made.**

## Open questions

| #      | Question                                                                              | Owner                    |
| ------ | ------------------------------------------------------------------------------------- | ------------------------ |
| **Q4** | What notice is owed before lowering an allowance?                                     | **unassigned**           |
| N1     | What is the emergency-reduction policy for a provider price shock?                    | **unassigned**           |
| N2     | Do outstanding purchased balances get honoured or refunded if the feature is retired? | **unassigned** + counsel |
| N3     | Who approves moving from stage 3 to stage 4, and on what evidence?                    | **unassigned**           |

## Related

- [`docs/11-runbooks/runbook-payg-credit.md`](../11-runbooks/runbook-payg-credit.md) — the operational procedure
- [plan-allowances.md](plan-allowances.md) · [credit-terms.md](credit-terms.md) · [topup-pricing.md](topup-pricing.md)
- [`docs/02-business-product/payg-credit-spec.md`](../02-business-product/payg-credit-spec.md) — acceptance criteria and open questions
- [ADR-078](../13-adr/adr-078-payg-connector-credit.md)
