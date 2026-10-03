> **AMENDED 2026-08-29 (ADR-078 amendment).** The connector-credit allowance is
> no longer an absolute per-plan figure. It is
> `monthlyPrice × Plan.paygCreditPercentBps / 10000` — a share of what the user
> actually pays. Seeded rates: 30% (free, starter, plus) and 25% (pro, team,
> scale, unlimited).
>
> Those rates were chosen so every PAID plan grants exactly what the table below
> already says. **Free is the exception: a $0 price converts to $0 of credit**,
> where it previously carried $0.30. Free keeps its token allowance and local
> models.
>
> The `cost ceiling` column below is NOT the credit allowance any more. It is the
> fair-use bound on total weighted spend across every provider, local included,
> and a PAYG request does not check it — the wallet is the sole dollar bound.

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

Longer terms are discounted (10% quarterly, 15% semiannual, 20% yearly by default; an admin can change them per plan — [ADR-135](../13-adr/adr-135-term-discounts-derive-price-versions.md)). The allowance does not
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

## AI-written files per day (ADR-110, 2026-09-19)

Chosen by the owner: daily limits, generous, with Free at 15. Exports of an
answer the user already has never count, because no model runs.

| Plan      | AI-written files / day |
| --------- | ---------------------: |
| Free      |                     15 |
| Starter   |                     30 |
| Plus      |                     75 |
| Pro       |                    200 |
| Team      |                 no cap |
| Scale     |                 no cap |
| Unlimited |                 no cap |

This is a count, and it sits on top of the token allowance above, not instead
of it. A file writer call is typically 2–8k weighted tokens, so Free's daily
token pace ($0.05, 50,000 tokens) usually binds before the 15th large file.
Stored as `plan_feature_rules` rows (`FILE_GENERATION`, `DAY`); a change is
one row, and it survives redeploys.

## Media features per plan (ADR-122, 2026-09-25)

Owner decision: **Free keeps the basics, paid gets everything.** Image
understanding (a model that can see, or OCR + an honest note), voice notes
(transcription, PAYG-metered on its own) and short video are on every plan.
The four entitlements below are the paid half.

| Plan      | Image generation / edit | Helper vision | Text-to-speech | Max video length |
| --------- | :---------------------: | :-----------: | :------------: | ---------------: |
| Free      |           no            |      no       |       no       |             60 s |
| Starter   |           yes           |      yes      |      yes       |            600 s |
| Plus      |           yes           |      yes      |      yes       |            600 s |
| Pro       |           yes           |      yes      |      yes       |            600 s |
| Team      |           yes           |      yes      |      yes       |            600 s |
| Scale     |           yes           |      yes      |      yes       |            600 s |
| Unlimited |           yes           |      yes      |      yes       |            600 s |

Why each one is paid:

- **Image generation / edit** (`allowImageGeneration`) — every generation is a
  real per-image provider charge (gpt-image-1 high 1024² is $0.167). Free has
  no connector credit to pay it from (30% of $0 is $0), so it would only ever
  have been refused at the PAYG hold anyway; the plan gate says so honestly
  and earlier, before the vision prompt hop spends anything.
- **Helper vision** (`allowHelperVision`) — a second paid model describing an
  image the chat model cannot see. Free still gets the image's OCR text and a
  truthful "this model cannot see it" note.
- **Text-to-speech** (`allowTextToSpeech`) — per-character provider cost
  (`ttsPerCharacterMicroUsd`: tts-1 $15 / 1M characters) or Gemini TTS audio
  tokens ($10 / 1M). **Enforced** since batch 9: chat-service's
  `POST /chat-messages/:id/speech` answers 403 `PLAN_FEATURE_DISABLED` before
  any hold, and the "Read aloud" control is dimmed with the plan reason.
- **Max video length** (`maxVideoSeconds`) — `null` unlimited, `0` disabled.
  Ten minutes on every paid tier, **including Unlimited**: ffmpeg frame
  extraction is local CPU that no PAYG surface prices yet, so no tier is
  uncapped until it is. Enforced by the video batches.
  **Owner decision (2026-09-25): `maxVideoSeconds` = 600 for every paid plan,
  Unlimited included — never `null`.** Revisit only if ffmpeg CPU becomes a
  PAYG-metered surface.

Stored as `Plan` columns (`allow_image_generation`, `allow_helper_vision`,
`allow_text_to_speech`, `max_video_seconds`), edited in the admin plan editor.
Existing installs are moved by migration `20260925200000_add_media_plan_gates`
by slug; an administrator-created custom plan keeps the free defaults until an
operator switches it on. A trial carries the gates of the plan it trials.
ADMIN bypasses all four.

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
makes that copy false, and Free is the only funnel the free trial has (30 days by default; the length is a per-plan setting).

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

## Checkout-term discount (1 / 3 / 6 / 12 months)

Checkout offers four commitment lengths, not two. `BillingInterval` is
`MONTHLY`, `QUARTERLY` (3 months), `SEMIANNUAL` (6 months), `YEARLY` (12
months), and each has its own immutable `PlanPriceVersion` row — there is no
"apply a discount at checkout" code path, and there must never be one: a
discount computed at the moment of payment is a number that can be raced,
mis-rounded, or disagree between the price shown and the price charged.

The formula, computed **when the monthly price or a discount changes** (never at
checkout), from each plan's own monthly price and its three discounts
([ADR-135](../13-adr/adr-135-term-discounts-derive-price-versions.md)):

`amount = round(monthlyMinor x months x (10000 - discountBps) / 10000)`

| Interval     | Months | Default discount | Column                                 |
| ------------ | ------ | ---------------- | -------------------------------------- |
| `QUARTERLY`  | 3      | 10%              | `plans.quarterly_discount_bps` = 1000  |
| `SEMIANNUAL` | 6      | 15%              | `plans.semiannual_discount_bps` = 1500 |
| `YEARLY`     | 12     | 20%              | `plans.yearly_discount_bps` = 2000     |
| `MONTHLY`    | 1      | none             | —                                      |

Yearly at 20% is exactly `monthly x 12 x 80 / 100` (Plus at $10 a month is $96.00
a year). `round()` is a single `Math.round` at the one minor-unit boundary —
never truncated, never re-derived from a float at render time. An admin sets
the monthly price (`POST /admin/plans/:id/price-versions`, MONTHLY only) and the
discounts (`PUT /admin/plans/:id/interval-discounts`); the service mints the
derived versions in one transaction. Publishing a longer-term price by hand is
refused with `PLAN_INTERVAL_PRICE_DERIVED`.

**History.** Before 2026-09-30 quarterly and semiannual were a flat 10% and yearly
was a seeded ten-months-for-twelve figure (~16.7%). The `plan-interval-discounts`
seeder (v1) re-priced every existing plan once, retiring the old versions;
existing subscriptions keep the version they bought.

### Deploy order matters on an existing install

A fresh install gets all four `PlanPriceVersion` rows the moment
`plan-catalog` seeds a plan for the first time. An **existing** install is
different: `plan-catalog`'s run-once guard means its `run()` — and the
`upsertPrices` call inside it that would create the QUARTERLY/SEMIANNUAL rows —
never executes again once that install's `plan-catalog` version has already
completed, which is every install seeded before this feature shipped. Without
`plan-quarterly-semiannual-pricing.seeder.cjs` running at least once, an
existing install's checkout page can show the 4-way term selector with two of
its four options priced as "unavailable" forever — the frontend has nothing
wrong with it; the price rows simply do not exist. That seeder must run before
any deploy that expects all four checkout terms to actually be purchasable on
an install that predates this feature. `plan-interval-discounts` then runs after
it and re-derives all three longer terms from each plan's live monthly price, so
an install that skipped a step still ends on the 10 / 15 / 20% figures.

---

## Sign-off status

**These figures need a named business owner and do not have one.**

| Figure                         | Status                                                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 25–30% of revenue as allowance | **Unsigned.** Chosen during planning as a defensible band, not derived from measured usage. See [margin-model.md](margin-model.md).                                                |
| Free at $0.30                  | **Unsigned**, but low-risk: it is the current live figure, unchanged.                                                                                                              |
| The daily/weekly split         | **Unsigned.** Derived to satisfy the widening invariant, not from a pacing study.                                                                                                  |
| 10% / 15% / 20% term discounts | **Owner direction 2026-09-30** (product owner; the individual's name is not recorded in the repository). Not derived from a margin floor — see [margin-model.md](margin-model.md). |
| Lowering any of these later    | **Needs notice.** See [rollout-and-notice.md](rollout-and-notice.md) — the allowance is now customer-visible, so it is a commitment rather than an internal knob.                  |

The right evidence is one full billing period of `credit_ledger_entries` data:
median and p95 monthly spend per plan, and the fraction of users who hit each wall.
Until then these are estimates that were reviewed, not measurements.

## Related

- [ADR-078](../13-adr/adr-078-payg-connector-credit.md) — why this is one number and not three
- [margin-model.md](margin-model.md) · [topup-pricing.md](topup-pricing.md) · [rollout-and-notice.md](rollout-and-notice.md)
- [`docs/06-data/plan-and-quota-specification.md`](../06-data/plan-and-quota-specification.md) — the technical quota contract
- [`rules/28-billing-integrity-and-api-contracts.md`](../../rules/28-billing-integrity-and-api-contracts.md) — the widening invariant

## Free requests on credit connectors (ADR-142, 2026-10-01)

A user with no credit may still try the cloud providers: **Free gets 2 requests per UTC month, one
total across all credit connectors (amended 2026-10-02, ADR-142); every paid plan gets 0** (they pay
with credit). The window is monthly, never daily. The platform absorbs the
provider cost, bounded per request by `min($0.15, monthlyProviderCostCeiling / allowance)`, so
Free's worst case across all providers is $0.30 a month. `null` = unlimited, `0` = none. Only token-priced
surfaces qualify; image, video, transcription and speech never do. Edit it per plan in the admin plan
form (`creditConnectorFreeRequestsPerMonth`); raise the plan's provider-cost ceiling with it, because
each request's budget shrinks as the count grows.
