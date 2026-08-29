# Plan Allowances — the one authoritative dollar figure per plan

**Last reviewed**: 2026-08-29
**Ground truth**: `apps/claw-auth-service/prisma/seeders/plan-catalog.json` (fresh
installs) and the `plans` table (a running install an operator may have tuned).

---

## The number

Each plan grants **one monthly dollar allowance** for paid cloud inference. It is
`Plan.monthlyProviderCostCeilingMicroUsd`, and since
[ADR-078](../13-adr/adr-078-payg-connector-credit.md) it is also the user's PAYG
credit `GRANT`. It is **not** three numbers.

| Plan          | Price /mo | **Monthly allowance** | % of revenue | Daily | Weekly | Concurrency |
| ------------- | --------: | --------------------: | -----------: | ----: | -----: | ----------: |
| **Free**      |        $0 |             **$0.30** |            — | $0.05 |  $0.15 |           1 |
| **Starter**   |        $5 |             **$1.50** |          30% | $0.15 |  $0.60 |           2 |
| **Plus**      |       $10 |             **$3.00** |          30% | $0.30 |  $1.20 |           3 |
| **Pro**       |       $20 |             **$5.00** |          25% | $0.50 |  $2.00 |           5 |
| **Team**      |       $50 |            **$12.50** |          25% | $1.25 |  $5.00 |          10 |
| **Scale**     |      $100 |            **$25.00** |          25% | $2.50 | $10.00 |          20 |
| **Unlimited** |      $200 |            **$50.00** |          25% | $5.00 | $20.00 |          30 |

Yearly is ten months of the monthly rate (two months free). The allowance does not
change with the billing interval — it is granted per **period**, monthly either way.

### The same table in storage units

Every figure is integer micro-USD, and `monthlyTokenQuota` is **byte-identical** to
`monthlyProviderCostCeilingMicroUsd` by construction.

| slug      | `dailyTokenQuota` | `weeklyTokenQuota` | `monthlyTokenQuota` | `monthlyProviderCostCeilingMicroUsd` |
| --------- | ----------------: | -----------------: | ------------------: | -----------------------------------: |
| free      |            50,000 |            150,000 |             300,000 |                             "300000" |
| starter   |           150,000 |            600,000 |           1,500,000 |                            "1500000" |
| plus      |           300,000 |          1,200,000 |           3,000,000 |                            "3000000" |
| pro       |           500,000 |          2,000,000 |           5,000,000 |                            "5000000" |
| team      |         1,250,000 |          5,000,000 |          12,500,000 |                           "12500000" |
| scale     |         2,500,000 |         10,000,000 |          25,000,000 |                           "25000000" |
| unlimited |         5,000,000 |         20,000,000 |          50,000,000 |                           "50000000" |

---

## Which limit binds first, and why that question exists

A request can be refused by any of nine windows. Three of them are denominated in
the same dollars, and **that is the whole reason this page exists**:

| Window                   | Unit            | Binds when                                             |
| ------------------------ | --------------- | ------------------------------------------------------ |
| `DAY` / `WEEK` / `MONTH` | weighted tokens | The user has spent their daily / weekly / monthly pace |
| `PROVIDER_COST`          | micro-USD       | The monthly cost ceiling is reached                    |
| `CREDIT_GRANT`           | micro-USD       | The wallet's perishable half is empty                  |
| `CREDIT_PURCHASED`       | micro-USD       | The wallet's bought half is empty                      |
| `CONCURRENCY`            | slots           | Too many in-flight requests                            |
| `CHATS` / `MESSAGES`     | counts          | Daily thread / message caps                            |

`1 weighted token === 1 micro-USD` (`WEIGHTED_TOKENS_PER_USD === MICRO_USD_PER_USD`,
guarded by `billing.constants.spec.ts:26`). So `MONTH`, `PROVIDER_COST` and
`CREDIT_GRANT` are **the same dollars measured three ways**, and they are seeded to
the same number so that **none of them binds before the others**.

**What actually binds first, in practice:**

1. **`DAY`** — a burst of work in one afternoon hits the daily pacing window long
   before the month runs out. This is the limit most users meet.
2. **`WEEK`** — a sustained heavy week.
3. **`CREDIT_GRANT` / `MONTH` / `PROVIDER_COST`** — the monthly wall, all three at
   once, at which point the user is offered a top-up. Once `PURCHASED` credit
   exists, `CREDIT_PURCHASED` is what keeps them working past it.
4. **`CONCURRENCY` / `CHATS` / `MESSAGES`** — shape limits, not spend limits.

**The invariant that keeps this honest**: a shorter window may never allow more
than a longer one (`findQuotaWindowConflicts`, enforced on plan create and update
with `PLAN_QUOTA_WINDOWS_INCOHERENT`;
[rule 28](../../rules/28-billing-integrity-and-api-contracts.md)). Every row above
widens as the window lengthens.

**`null` means unlimited, `0` means disabled.** They are never interchangeable, and
neither participates in the comparison above.

---

## What changed, and why nobody lost

Every tier's monthly allowance **went up or stayed equal** in the PAYG migration.
That is what made it safe to migrate a live entitlement.

| Plan      | Before |  After | Delta  |
| --------- | -----: | -----: | ------ |
| free      |  $0.30 |  $0.30 | —      |
| starter   |  $0.75 |  $1.50 | +$0.75 |
| plus      |  $1.75 |  $3.00 | +$1.25 |
| pro       |  $4.00 |  $5.00 | +$1.00 |
| team      | $11.00 | $12.50 | +$1.50 |
| scale     | $24.00 | $25.00 | +$1.00 |
| unlimited | $50.00 | $50.00 | —      |

### Free stayed at $0.30 on purpose

A conservative option showed Free at $0.00. It kept $0.30 because its seeded
description is _"Try every frontier model with a small daily allowance"_ — $0
makes that copy false, and Free is the only funnel the 30-day trial has.

Free's previous windows were **incoherent**: `300,000/day` against a `20,000/week`
ceiling. The real enforced allowance was about **$0.02 a week** while the pricing
page advertised fifteen times that per **day**. It is now a widening
`$0.05 / $0.15 / $0.30`.

### Existing installs

Moved by `prisma/seeders/plan-payg-allowance.seeder.js`, **not** by a
`plan-catalog` version bump — trace `plan-catalog.seeder.js`'s `run()` on an
install where v2 already ran and every plan takes the else-branch, so a v3 bump
would apply the new allowances to **zero rows** and report success.

Every update is **targeted at the old value**. An operator who has already tuned a
plan keeps their number and the seeder reports it skipped. Two installs of the same
release can therefore enforce different allowances — read the table, do not assume
the release.

---

## Sign-off status

**These figures need a named business owner and do not have one.**

| Figure                         | Status                                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 25–30% of revenue as allowance | **Unsigned.** Chosen during planning as a defensible band, not derived from measured usage. See [margin-model.md](margin-model.md).                               |
| Free at $0.30                  | **Unsigned**, but low-risk: it is the current live figure, unchanged.                                                                                             |
| The daily/weekly split         | **Unsigned.** Derived to satisfy the widening invariant, not from a pacing study.                                                                                 |
| Lowering any of these later    | **Needs notice.** See [rollout-and-notice.md](rollout-and-notice.md) — the allowance is now customer-visible, so it is a commitment rather than an internal knob. |

The right evidence is one full billing period of `credit_ledger_entries` data:
median and p95 monthly spend per plan, and the fraction of users who hit each wall.
Until then these are estimates that were reviewed, not measurements.

## Related

- [ADR-078](../13-adr/adr-078-payg-connector-credit.md) — why this is one number and not three
- [margin-model.md](margin-model.md) · [topup-pricing.md](topup-pricing.md) · [rollout-and-notice.md](rollout-and-notice.md)
- [`docs/06-data/plan-and-quota-specification.md`](../06-data/plan-and-quota-specification.md) — the technical quota contract
- [`rules/28-billing-integrity-and-api-contracts.md`](../../rules/28-billing-integrity-and-api-contracts.md) — the widening invariant
