# Margin Model

**Last reviewed**: 2026-08-29
**Status**: **estimates, not measurements. No business owner has signed these
figures off.** Every number below is arithmetic over a seeded allowance and a
list-price rate card. None of it is derived from production usage, because
production usage of a metered wallet does not exist yet.

---

## What the platform actually sells

A subscription buys three separable things:

1. **A bounded allowance of paid cloud inference** — the dollars in
   [plan-allowances.md](plan-allowances.md). This has a hard marginal cost.
2. **Unlimited local inference** — Ollama and llama.cpp on hardware the operator or
   the user already owns. Marginal cost to ClawAI: **zero**.
3. **The product** — orchestration modes, compare, judge, workspaces, memory, the
   coding agent, routing. Marginal cost: near zero, amortised engineering.

Only (1) draws down credit. **That is the point of the split**: the expensive
component is bounded and visible, and the free components are not rationed by a
mechanism designed for money.

## Worst case, per plan

The worst case is a user who draws their **entire** monthly allowance every month,
forever. Because the allowance is a hard ceiling enforced before the provider call
([ADR-078](../13-adr/adr-078-payg-connector-credit.md) D6), this is a genuine upper
bound and not a projection.

| Plan      | Revenue /mo | Max provider cost | Gross margin at full draw | Margin % |
| --------- | ----------: | ----------------: | ------------------------: | -------: |
| Free      |       $0.00 |             $0.30 |                    −$0.30 |        — |
| Starter   |       $5.00 |             $1.50 |                     $3.50 |      70% |
| Plus      |      $10.00 |             $3.00 |                     $7.00 |      70% |
| Pro       |      $20.00 |             $5.00 |                    $15.00 |      75% |
| Team      |      $50.00 |            $12.50 |                    $37.50 |      75% |
| Scale     |     $100.00 |            $25.00 |                    $75.00 |      75% |
| Unlimited |     $200.00 |            $50.00 |                   $150.00 |      75% |

Before payment-gateway fees and before every other cost of running the platform.
**This is gross margin on inference alone, not contribution margin.**

### What is missing from that table

| Cost                                        | Treatment                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Payment-gateway fees (roughly 2.9% + fixed) | **Not modelled here.** They matter most on top-ups; see [topup-pricing.md](topup-pricing.md).          |
| Free-tier cost                              | A **marketing expense**, capped at $0.30 per free account per month.                                   |
| Infrastructure (databases, broker, egress)  | Not per-plan. Real, and outside this document.                                                         |
| Search / research SaaS                      | Metered separately from model inference. Not credit.                                                   |
| Refunds and chargebacks                     | Reduce revenue, not provider cost. See [credit-refund-and-reversal.md](credit-refund-and-reversal.md). |
| Local inference                             | Zero marginal cost, and deliberately unbounded.                                                        |

## The real margin driver: nobody draws the full allowance

At full draw the margin is 70–75%. **Actual** margin will be materially higher,
because most users on most plans will not spend their entire allowance every month
— that is how every allowance-based product works.

The consequence for planning is the important part: **the allowance is an upper
bound on our exposure, not a forecast of our cost.** Raising it makes the worst
case worse and the expected case almost unchanged, which is why the migration in
ADR-078 could raise every tier without a business argument about revenue.

Sizing the allowance is therefore a question about the **tail**, not the median:
what fraction of users hit the wall, and does hitting it make them upgrade, top up,
or leave.

## Where credit actually earns

Three distinct margins, and they are easy to conflate:

| Source           | Margin                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| **Subscription** | Revenue minus the allowance actually drawn. 70–75% at worst case, higher in practice.                 |
| **Top-up**       | The price→credit ratio, seeded at 0.60, minus gateway fees. See [topup-pricing.md](topup-pricing.md). |
| **Unused GRANT** | Swept at the period roll, no rollover. Not "revenue" — it is the worst case not materialising.        |

**Unused GRANT is not breakage income and must not be modelled as such.** No
rollover exists to bound the monthly liability, not to harvest unspent allowance.
`PURCHASED` credit — the money a customer actually paid — never expires, which is
the line that keeps the two apart. See [credit-terms.md](credit-terms.md).

## Rate assumptions

Provider rates come from `ModelCostVersion` rows, seeded by
`ModelCostSeedService` from `constants/model-cost-seed.constants.ts`: **16 models
across OpenAI, Anthropic, Gemini, DeepSeek and Grok**, seeded as
`source: SEED, confidence: ESTIMATED`.

**They are list prices off public price cards.** An operator with a negotiated
contract, committed-use discount or a resale agreement pays something else, and
every margin figure on this page moves with that. The seed only ever fills a gap —
an admin override is never clobbered — so the correct action for an operator is to
enter their real rates, not to trust these.

**Open question Q6**: nobody has reconciled the seeded list prices against a real
month of provider invoices. Until someone does, the cost column above is an
estimate of an estimate.

## What would change these numbers

| Change                                 | Effect                                                                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A provider raises prices               | Worst-case margin falls. The allowance is denominated in **dollars**, so the user's allowance is unaffected — the platform absorbs it. This is the intended direction. |
| A provider cuts prices                 | Worst-case margin rises; users get more tokens for the same allowance, automatically.                                                                                  |
| Raising an allowance                   | Worst case worsens 1:1. Expected case barely moves.                                                                                                                    |
| Lowering an allowance                  | Improves the worst case, and is a **customer-visible reduction** with notice obligations. [rollout-and-notice.md](rollout-and-notice.md)                               |
| Reasoning tokens priced correctly (C1) | **Increases measured cost.** Before C1, reasoning models billed zero on their most expensive component. Margin did not change; the measurement did.                    |
| Metering Ollama Cloud                  | Moves an operator-paid cost onto the user's wallet. Currently unmetered by choice.                                                                                     |

## Sign-off needed

| Question                                                                | Owner          |
| ----------------------------------------------------------------------- | -------------- |
| Is 25–30% of revenue the right allowance band?                          | **unassigned** |
| Are the seeded list prices close enough to real invoices? (Q6)          | **unassigned** |
| Should the Free tier's $0.30 be treated as CAC, and what is the budget? | **unassigned** |
| What margin floor triggers a repricing?                                 | **unassigned** |

The evidence that would settle all four is one full billing period of
`credit_ledger_entries`: spend distribution per plan, wall-hit rate, and top-up
conversion. That query belongs in the admin usage dashboard, not in this document.

## Related

- [plan-allowances.md](plan-allowances.md) — the allowance figures
- [topup-pricing.md](topup-pricing.md) — the 0.60 ratio
- [`docs/03-architecture/billing-threat-model.md`](../03-architecture/billing-threat-model.md) — why margin inputs stay private
- [ADR-078](../13-adr/adr-078-payg-connector-credit.md)
