# Plan, Quota and Feature Specification

Canonical description of the seven public plans, how allowances are measured,
and how each ceiling is enforced. The machine-readable source of truth is
[`apps/claw-auth-service/prisma/seeders/plan-catalog.json`](../../apps/claw-auth-service/prisma/seeders/plan-catalog.json);
this document explains it.

> Prices are **never** environment variables. They live in the database as
> immutable `PlanPriceVersion` rows so a repricing creates a new version instead
> of silently rewriting what existing subscriptions and historical invoices were
> charged.

---

## 1. Units

| Concept       | Unit                    | Example                              |
| ------------- | ----------------------- | ------------------------------------ |
| Money         | integer **minor units** | `$5.00` → `500`                      |
| Provider cost | integer **micro-USD**   | `$0.75` → `750000`                   |
| Allowance     | **weighted tokens**     | `1,000,000 weighted tokens == $1.00` |

No floating-point value ever touches a billing path. Provider cost is widened to
`BigInt`, which is why the JSON carries `costCeilingMicroUsd` as a **string** —
JSON has no BigInt, and parsing it as a `Number` would reintroduce a float.

### Why weighted tokens

Raw token count is not an economic unit: providers charge different rates for
input, output, cached reads, reasoning tokens, images and tool calls. A plan
priced in raw tokens would be wildly profitable on one model and loss-making on
another. Normalising to cost means one number stays fair across every model:

```
weightedTokens = ceil(actualProviderCostMicroUsd)
```

### `null` vs `0`

These are **not** interchangeable anywhere in this system:

- `null` — genuinely unlimited (not enforced, still counted for reporting)
- `0` — disabled (any positive request is rejected)

Conflating them would either lock the most expensive plan out of chatting or
hand the cheapest plan an unbounded allowance.

---

## 2. Plan matrix

| Plan      | Monthly | Yearly |     Daily |     Weekly |    Monthly | Cost ceiling |
| --------- | ------: | -----: | --------: | ---------: | ---------: | -----------: |
| Free      |      $0 |      — |     5,000 |     20,000 |     50,000 |        $0.05 |
| Starter   |      $5 |    $50 |    50,000 |    250,000 |    750,000 |        $0.75 |
| Plus      |     $10 |   $100 |   100,000 |    600,000 |  1,750,000 |        $1.75 |
| Pro       |     $20 |   $200 |   250,000 |  1,500,000 |  4,000,000 |        $4.00 |
| Team      |     $50 |   $500 |   750,000 |  4,000,000 | 11,000,000 |       $11.00 |
| Scale     |    $100 | $1,000 | 1,500,000 |  9,000,000 | 24,000,000 |       $24.00 |
| Unlimited |    $200 | $2,000 | 5,000,000 | 30,000,000 |  unlimited |       $50.00 |

Yearly is exactly ten months of the monthly rate (two months free).

**The cost ceiling is an internal profitability control and is never returned to
a normal user.** Only authorised administrators can see it.

### What "Unlimited" actually means

Unlimited chats, unlimited messages, and an unlimited _raw_ monthly token
allowance — but **not** unlimited money. Premium cloud spend stops at the
$50/month fair-use ceiling, after which routing falls back to eligible cheap or
local models and the user is told plainly that the premium boundary was reached.
Continuing to accrue unbounded provider charges is never an option.

---

## 3. Product limits

| Plan      | Chats/day | Messages/day | Workspaces | Context packs | Memory items |
| --------- | --------: | -----------: | ---------: | ------------: | -----------: |
| Free      |         2 |           12 |          0 |             1 |            5 |
| Starter   |        10 |          100 |          1 |             5 |           50 |
| Plus      |        25 |          250 |          2 |            15 |          200 |
| Pro       |        75 |          750 |          5 |            50 |        1,000 |
| Team      |       250 |        2,500 |         15 |           200 |        5,000 |
| Scale     |     1,000 |       10,000 |         50 |         1,000 |       25,000 |
| Unlimited | unlimited |    unlimited |        200 |         5,000 |      100,000 |

Every limit is enforced on the backend. Hiding a control in the UI is a
usability affordance, never an access control.

---

## 4. Feature allowances

`PlanFeatureRule` replaces the boolean-only `Plan.allow*` columns, which could
not express "one lifetime use" or "ten per month". The booleans remain as
compatibility projections during the migration window; the rules are
authoritative.

| Plan                   | Compare      | Judge        | Research     | Critic       |
| ---------------------- | ------------ | ------------ | ------------ | ------------ |
| Free                   | 1 / lifetime | 1 / lifetime | 1 / lifetime | 1 / lifetime |
| Starter                | 10 / month   | 2 / month    | 2 / month    | 1 / month    |
| Plus                   | 30 / month   | 10 / month   | 10 / month   | 5 / month    |
| Pro                    | 150 / month  | 75 / month   | 50 / month   | 50 / month   |
| Team, Scale, Unlimited | enabled      | enabled      | enabled      | enabled      |

Workspaces are disabled on Free; memory and context packs are enabled on every
plan within the item limits above.

### Reserve → consume → release

A trial is **held** before execution and only **spent** once the user actually
received a result. If execution fails first, the hold is **released**. Without
that cycle a provider outage would silently burn a Free user's only lifetime
Compare run.

The counter is a durable `FeatureUsageRecord` row keyed by
`(userId, feature, requestId)`:

- durable, so clearing the browser or switching device does not grant a second
  trial;
- keyed by request id, so a retry reuses its reservation rather than consuming a
  second run;
- `LIFETIME` allowances use a period-free key, so they never reset.

---

## 5. Model access

`Plan.modelAccessMode` replaces the unsafe legacy rule where an **empty**
`PlanModelAccess` array meant "unrestricted" — which silently exposed ULTRA-cost
models to every newly created plan.

| Mode                  | Meaning                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| `ALLOW_ALL`           | every model                                                                 |
| `DENY_ALL`            | no model                                                                    |
| `ALLOW_LIST`          | only the explicitly listed provider/model rows                              |
| `ALLOW_COST_CLASSES`  | any model whose registry cost class is permitted, narrowed by explicit rows |
| `LEGACY_UNRESTRICTED` | migration-window compatibility only                                         |

Seeded classes:

| Plan                   | Cost classes                           |
| ---------------------- | -------------------------------------- |
| Free                   | `FREE`                                 |
| Starter                | `FREE`, `CHEAP`                        |
| Plus                   | `FREE`, `CHEAP`, `STANDARD`            |
| Pro                    | `FREE`, `CHEAP`, `STANDARD`, `PREMIUM` |
| Team, Scale, Unlimited | all, including `ULTRA`                 |

Existing installs migrate as `LEGACY_UNRESTRICTED` so no deployment loses access
on upgrade, and every seeded plan gets an explicit mode. An unknown or
incomplete policy **fails closed** for non-admin users. ADMIN bypass stays
explicit and audited.

---

## 6. Atomic enforcement

Every reservation checks **all** of these in a single Redis Lua script:

daily / weekly / monthly weighted tokens · monthly provider-cost ceiling ·
concurrency · daily chats · daily messages

Separate check-then-increment commands are **not** equivalent: two concurrent
requests can both read "one slot left" and both pass. Lua runs to completion
without interleaving, so the check and the increment are one atomic step.

Implementation notes that matter:

- **Check before mutate.** Every window is checked before any is incremented, so
  a rejection cannot leave a partial increment on an earlier window.
- **Counters advance even when unlimited.** Usage reporting and the
  reconciliation job need the real number, not a gap.
- **Release clamps at zero.** A double release must never drive a counter
  negative, which would hand out free quota.
- **`EXISTS` guards every write-back.** Writing to a missing key would recreate
  it without a TTL and leak the counter past its period; and when a period has
  rolled over between reserve and finalize, charging the _new_ period for the
  old period's usage would be wrong.
- **Unparseable reply fails closed.** A Redis fault rejects the request rather
  than waving it through.

### Period keys

All UTC, so a timezone change cannot reset a counter and two replicas in
different regions always agree:

| Window         | Key                                  |
| -------------- | ------------------------------------ |
| Day            | `YYYY-MM-DD`                         |
| Week           | ISO-8601 `YYYY-Www`                  |
| Month          | `YYYY-MM`                            |
| Billing period | the subscription's current period id |

The week key uses the **ISO week-year**, which can differ from the calendar year
at a boundary — `2027-01-01` belongs to `2026-W53`. Keying on the calendar year
would collide two distinct weeks once a year.

### Durable ledger

`WeightedUsageRecord` stores one row per execution (reservation id, request id,
provider, model, workflow, raw/cached/reasoning/output tokens, weighted tokens,
estimated and actual cost). It is deliberately a different grain from the
per-day `TokenUsageLedger` rollup, and it is the source the reconciliation job
rebuilds or verifies the Redis counters against.

---

## 7. Migration and seeding

Migrations and versioned seeds run at container start, but a completed seeder is
**never** executed twice. Two independent guards, because either alone is
insufficient:

1. A Postgres **advisory lock** serialises concurrent starters — without it two
   replicas booting together both read "not yet seeded" and both insert.
2. A **`SeedExecution`** row records name + version + checksum. The lock only
   orders the racers; this is what makes the second run a no-op.

A changed seed requires a **new version**. Editing a completed seeder and hoping
it re-runs is the exact failure mode this design prevents; the checksum turns
that mistake into a loud warning instead of silent drift.

### Existing plans are never clobbered

`free`, `pro` and `team` predate billing and may have been tuned by an
administrator. The seeder compares each row against the old system-seed
fingerprint:

- still matching → safely upgraded to the new baseline;
- edited → **left exactly as the administrator set it**, with only the new
  billing columns backfilled, and the preservation reported in the logs.

Pre-billing manual assignments become `MIGRATION` grants. They are **not**
converted into paid subscriptions — fabricating a payment that never happened
would corrupt every revenue report downstream.

### Verified behaviour

Proven against a real PostgreSQL 16 instance rather than asserted:

| Property                                  | Result                                       |
| ----------------------------------------- | -------------------------------------------- |
| First run applies the catalog             | 7 plans, 13 price versions, 49 feature rules |
| Second run                                | skipped (`already-completed`)                |
| Two concurrent runs                       | both skipped, no duplicate rows              |
| Second ACTIVE price for one plan+interval | rejected by the database unique index        |
| Administrator-edited `pro`                | quota and description preserved verbatim     |
| Untouched `free`                          | upgraded to the new baseline                 |
| `migrate deploy` twice                    | second run reports no pending migrations     |

---

## 8. Entitlement safety

A client can never assign itself a paid plan. `UserPlanAssignment.grantType`
records provenance and keeps an admin grant permanently distinguishable from a
paid subscription:

`PAID_SUBSCRIPTION` · `ADMIN_GRANT` · `PROMOTIONAL` · `MIGRATION` ·
`FREE_DEFAULT`

Paid entitlement arrives only through a verified billing event consumed via
`EntitlementInboxEvent`, whose unique `eventId` rejects redelivery and whose
`effectiveAt` lets a stale event be skipped rather than overwrite newer state.
An admin grant requires a reason and an issuing administrator, and must never
fabricate a payment transaction.
