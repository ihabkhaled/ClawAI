# ADR-162: The free allowance is a count and a meter, and it does not cover expensive models

**Status:** Accepted

**Date:** 2026-10-07

## Decision

The plan's free credit-connector allowance (ADR-142) now has two more limits, both set per plan in the database and editable in the admin plan form:

1. **A money meter.** `Plan.creditConnectorFreeBudgetMicroUsd`: the most provider cost, in integer micro-USD, one UTC month of free requests may add up to. `credit_free_allowance_usage.spent_micro_usd` holds the month's total. Admission takes a request's worst-case cost (already clamped to the per-request ceiling and to what is left of the month) in the SAME single `INSERT .. ON CONFLICT .. WHERE` that takes the count slot, so the count and the meter cannot be raced. When the call finishes, the held worst case is replaced by what it really cost (`settleSpend`), so cheap answers free budget for the next one; a failed or cancelled call gives the hold back. `NULL` means no meter (the count alone, as before). The user sees a percentage ("35% of your free credit used"), never a price (rule 28).
2. **A price limit.** `Plan.creditConnectorFreeMaxModelOutputMicroUsd`: the dearest model the allowance covers, as its output price in micro-USD per million tokens. A dearer model is refused at reservation with `PAYG_MODEL_NOT_IN_FREE_ALLOWANCE` and takes no slot. `NULL` means no limit.

AUTO routing leaves dearer models out. The limit travels `auth entitlements -> chat-service -> message.created (freeModelPriceCap) -> routing-service`; the cloud router's candidate list drops models above it before ranking, and a final guard swaps a dear pick for the first cheaper fallback. A model the user picked is never swapped by routing; auth-service refuses it with the new code and the credit fallback of ADR-161 moves the turn to a cheaper credit model if one passes, or an included model, with a notice that says the model is not covered by the free plan.

Defaults (migration `20261007130000_free_allowance_meter`, only where an administrator has set neither): Free gets a $0.25 monthly meter and models up to $5.00 per million output tokens (the STANDARD price class and below; PREMIUM and ULTRA are out). Paid plans have neither, because they have no free allowance.

## Rationale

Ten free requests on a $25-per-million model can cost more than ten on a $0.40 one by two orders of magnitude, and the plan's cost ceiling is the only protection. The count alone treats them the same. A meter bounds the real cost, and a price limit stops the dear models from being offered at all, so a Free user spends their ten requests on models that answer well and cheaply instead of discovering a refusal.

## Consequences

- A user with purchased credit is unaffected: the allowance is the fallback for them, and AUTO is only steered away from dear models by plan, not by wallet.
- The numbers are per plan and visible only to administrators. They are integer micro-USD end to end; the form takes dollars and converts on the decimal text.
- An unpriced model is not judged by the price limit (routing cannot know it); auth-service already refuses an unpriced credit model.
- With the metering kill switch off nothing is priced, so only the count applies, exactly as before.
- The per-request ceiling of ADR-142 is unchanged and still applies; the meter can only tighten it.

QA: `docs/qa-evidence/2026-10-07-free-allowance-meter.md`.

## Addendum (2026-10-14): Threads is allowance-eligible, and its calls are not held to the request count

A Free user passed the Threads plan gate (one research, Judge and Critic review for life) and then had every model call refused, because `PaygSurface.THREADS` was not in `FREE_ALLOWANCE_ELIGIBLE_SURFACES`: the allowance was never tried and the empty wallet answered `PAYG_CREDIT_EXHAUSTED`.

`THREADS` is now eligible, and also listed in `FREE_ALLOWANCE_COUNT_WAIVED_SURFACES`. A Thread is one user action but a dozen model calls, so holding each call to "10 requests a month" would let a Free user start their one Thread and fail it at the eleventh call. A Threads call therefore takes a slot with the counter's limit lifted (INT4 max), and is still bounded by the month's money meter and by the price limit (a dear model is `PAYG_MODEL_NOT_IN_FREE_ALLOWANCE`). ~~The waiver applies only while the plan HAS a money meter~~ (withdrawn in the production round 5 addendum below: it applies under every plan shape). The slot is still taken and given back like any other (a failed call returns it), so the books stay symmetrical.

Consequence, stated plainly: the slots a Thread takes count toward `used`, so after a Free Thread the month's request count reads as used and a credit-connector chat falls back to an included model (ADR-161) until the next UTC month. The owner may prefer a separate counter; that needs a column and is not done here. The product spec says only "Free 1 for life"; it does not say what a Thread may cost a Free user, so the meter (`$0.25` by default) is the bound, and a Thread on a dear model still stops at it.

## Addendum (2026-10-14, local QA round 2): a Thread takes no request slot, and cap refusals have their own code

**D-L2-04.** The 2026-10-14 addendum above said a waived call "takes a slot with the limit lifted", and noted that a Thread would therefore use up the month's request count. Local QA showed it: one Free Thread drove `used_count` to 12 of 10 and would have left no credit-connector chat. That consequence is withdrawn. A count-waived call (Threads under a plan with a money meter) now lifts the limit AND takes no slot: `tryConsume(.., countsSlot=false)` checks the budget but adds 0 to `used_count`, the admission records `countsSlot`, the usage ledger row is written `FREE_ALLOWANCE_USED:UNCOUNTED`, and a release reads that row and returns the hold only. A Threads call under a plan with no meter is still counted, because nothing else would bound it. The money meter is unchanged. No schema change.

**D-L2-06.** Inside a Thread, a cap smaller than the call's hold, with a wallet that could pay, is `PAYG_CAP_TOO_LOW` (402, `availableMicroUsd` is the cap left), not `PAYG_CREDIT_EXHAUSTED`. A genuinely empty wallet or a fully spent cap stays `PAYG_CREDIT_EXHAUSTED`; a model with no usable price stays `PAYG_MODEL_UNPRICED` and is refused before any hold. Older callers still see a boolean unless `detailed: true` is sent.

**D-L2-03.** `POST internal/threads/budgets/summary` also returns `settledMicroUsd`, the budget row's settled total in every billing mode.

## Addendum (2026-10-14, local QA round 3): the meter counts real tokens, and an unpriced model is refused for a Thread

**N-3 (checked, no leak).** Round 3 reported a Free user's four failed Threads taking 242,805 of 250,000 micro-USD. The local database shows 55 free calls, all FINALIZED, whose `actual_cost_micro_usd` sums to exactly 242,805 (their worst-case holds summed to 1,210,259): every one was a call the provider really answered (an invalid or truncated answer is still billed tokens), and none was left held. The lifecycle is therefore as designed and now pinned by tests: admission holds the worst case, a finalize replaces it with the real cost (zero tokens frees all of it), and a release (failed, cancelled, timed out) returns the full held cost. We did NOT refund the money of failed-but-answered calls: the platform paid the provider for them. A Free user whose Thread keeps failing on output validity can still run out of the `$0.25` meter; that is a product decision (a larger meter, or fewer retries per job), not a counting defect. One real gap was closed: `PaygMeter.release` skipped the Threads budget release when the credit release request failed, leaving the call reserved against the cap until the job closed; the two releases are now independent.

**D06-b.** routing-service prices a model with no row at the provider's dearest rate and sets `isFallbackRate`. auth-service now reads that flag. A Threads call (one that names `threadJobBudgetId`) on such a model is refused with `PAYG_MODEL_UNPRICED` (402) before any hold or allowance slot, so the owner is told to pick another model instead of paying a made-up price and seeing `PAYG_CAP_TOO_LOW`. A plain chat keeps the fallback rate (bounded, usable). Not done here: refusing at job start. The model is only known to auth-service when the first call reserves, so the job fails at its first call; a start-time check belongs to thread-generation.

## Addendum (2026-10-14, production round 5): a Free Thread must finish under every plan shape

**Defect (D-P5-01, HIGH).** On production a brand-new Free user's first Thread (Gemini flash-lite) failed after 33 s with `PAYG_FREE_ALLOWANCE_EXHAUSTED` (402), spent 6,475 micro-USD, `allowanceRefunded=false`; a second start was accepted and failed the same way. Cause: the count waiver of the first addendum applied only `while the plan HAS a money meter`. The ADR-162 migration sets the meter ONLY on a Free row whose count is exactly 10 and whose meter and price limit are unset. Production's Free row had another count (5; ADR-142 seeded 2) and so no meter: every Thread call took a request slot, and the call that reached the count was refused. The local seed (10, `$0.25`, `$5.00`) never showed it. The refusal was then classified an owner refusal (`NON_RETRYABLE_STEP_CODES`), so the close was RELEASED, not PLATFORM_FAILED: the meter charge stayed.

**Decision.** (1) A Threads call is count-waived (limit lifted, no slot, `FREE_ALLOWANCE_USED:UNCOUNTED`) under every plan shape, meter or not. (2) `PAYG_FREE_ALLOWANCE_EXHAUSTED` raised inside a Thread is platform-caused (a Thread takes no slot, so it is the platform's own holds and retries): the generation service closes such a job `PLATFORM_FAILED`, which returns the lifetime Thread and the meter money. Every other PAYG code is still the owner's to fix. (3) A refused plan feature (`reserve`) answers 403 `THREAD_ALLOWANCE_UNAVAILABLE` with `feature`, `used`, `limit`, `window` and a message that says how much is used and when it frees up.

**Plan-config assumptions (what `plans` columns the Threads path reads).**

| Column                                                            | Meaning for a Free Thread                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `credit_connector_free_requests_per_month`                        | `0`: allowance off, a Free Thread is refused. `null`: unlimited. N: chat is held to N, a Thread is not. Also divides the cost ceiling into the per-request ceiling.                                                                                                                                 |
| `credit_connector_free_budget_micro_usd`                          | Optional meter. Present: it bounds the month's Thread spend. Absent: nothing bounds the dollar spend of a Thread except the plan's lifetime Thread allowance, the job's spend cap and the per-request ceiling (min of `$0.15` and ceiling / count); an admin who wants a hard bound sets the meter. |
| `credit_connector_free_max_model_output_micro_usd`                | Optional price limit; a dearer model is `PAYG_MODEL_NOT_IN_FREE_ALLOWANCE` for a Thread too.                                                                                                                                                                                                        |
| `monthly_provider_cost_ceiling_micro_usd`                         | Input to the per-request ceiling only.                                                                                                                                                                                                                                                              |
| Plan feature rules `RESEARCH_MODE`, `JUDGE_MODE`, `CRITIC_REVIEW` | The "one Thread for life" is these three `LIMITED 1 LIFETIME` holds, reserved at job start and consumed only on a completed draft.                                                                                                                                                                  |

Table-driven specs pin five shapes (10 + meter + limit, 5 no meter, 2 no meter, 1 no meter + limit, 5 + meter): a 30-call Thread is admitted with no slot in each, and a chat on the same plan is still counted.

**Not done here.** A second start while a failed job still holds the lifetime hold is refused by auth with the new message, but threads-service `threads-generation.client.ts` turns every 403 from generation into its own NOT_IN_PLAN text, and thread-generation's `ThreadBudgetClient.reserve` drops the auth body, so used/limit do not yet reach the browser. That is a two-line pass-through in those two services (outside this change). A failed job whose close is retrying keeps the hold until the close lands (bounded back-off).

## Addendum (2026-10-14, free generation policy): a platform failure costs the Free user nothing

**Decision (owner approved).** A failed or cancelled Thread generation with no completed draft does not consume the Free plan allowance when the PLATFORM caused the failure. Platform-caused: OUTPUT_INVALID, PROVIDER_ERROR, CLOUD_PROVIDER__, MODEL_IDLE_TIMEOUT, MODEL_HARD_CEILING, MODEL_REASONED_NO_ANSWER, MODEL_CATALOG__, GENERATION_FAILED, CANDIDATES_EXHAUSTED, RESEARCH_FAILED/EMPTY, queue expiry and recovery-sweep failures. Not platform-caused: REVIEW_NOT_PASSED (the models ran, the draft did not pass) and owner/billing refusals (PAYG_*, cap too low, plan/allowance codes, validation). This reverses the N-3 position above ("we did NOT refund the money of failed-but-answered calls") for platform-caused failures only.

**Mechanism (auth-service).** The generation service closes the budget with the new status `PLATFORM_FAILED`. The close (a) releases in-flight calls and their holds, (b) settles the plan-feature holds RELEASE, which returns the one lifetime Thread, so a "Retry on us" needs no new allowance, and (c) refunds the money the Free meter charged for the job's finished calls: `credit_free_allowance_usage.spent_micro_usd` is lowered by the sum of `actual_cost_micro_usd` of the job's free usage rows, per month. Exactly once: the claim of `thread_job_budgets.free_refunded_at` and the meter update share one transaction. If the refund fails the lifetime hold is still released and the caller gets 503 THREAD_BUDGET_BUSY to retry. Request slots are not involved (a Thread takes none, D-L2-04). Additive migrations: enum value `PLATFORM_FAILED`, column `free_refunded_at`.

**Progress.** `POST internal/threads/budgets/summary` adds `freeAllowanceMicroUsd` (what the meter charges for the job now; 0 for non-free and after the refund) so a Free job can show real spend.

**Residuals.** The auth sweeper still closes dead jobs as RELEASED (no money refund of finished calls). A late finalize of a call whose credit release failed during close can leave at most that one call's cost on the meter. Choosing PLATFORM_FAILED versus the other statuses is the caller's job (thread-generation), not done here.
