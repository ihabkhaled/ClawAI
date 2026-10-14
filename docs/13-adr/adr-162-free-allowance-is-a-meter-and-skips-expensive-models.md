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

`THREADS` is now eligible, and also listed in `FREE_ALLOWANCE_COUNT_WAIVED_SURFACES`. A Thread is one user action but a dozen model calls, so holding each call to "10 requests a month" would let a Free user start their one Thread and fail it at the eleventh call. A Threads call therefore takes a slot with the counter's limit lifted (INT4 max), and is still bounded by the month's money meter and by the price limit (a dear model is `PAYG_MODEL_NOT_IN_FREE_ALLOWANCE`). The waiver applies only while the plan HAS a money meter; without one nothing would bound the total, so the count applies as before. The slot is still taken and given back like any other (a failed call returns it), so the books stay symmetrical.

Consequence, stated plainly: the slots a Thread takes count toward `used`, so after a Free Thread the month's request count reads as used and a credit-connector chat falls back to an included model (ADR-161) until the next UTC month. The owner may prefer a separate counter; that needs a column and is not done here. The product spec says only "Free 1 for life"; it does not say what a Thread may cost a Free user, so the meter (`$0.25` by default) is the bound, and a Thread on a dear model still stops at it.

## Addendum (2026-10-14, local QA round 2): a Thread takes no request slot, and cap refusals have their own code

**D-L2-04.** The 2026-10-14 addendum above said a waived call "takes a slot with the limit lifted", and noted that a Thread would therefore use up the month's request count. Local QA showed it: one Free Thread drove `used_count` to 12 of 10 and would have left no credit-connector chat. That consequence is withdrawn. A count-waived call (Threads under a plan with a money meter) now lifts the limit AND takes no slot: `tryConsume(.., countsSlot=false)` checks the budget but adds 0 to `used_count`, the admission records `countsSlot`, the usage ledger row is written `FREE_ALLOWANCE_USED:UNCOUNTED`, and a release reads that row and returns the hold only. A Threads call under a plan with no meter is still counted, because nothing else would bound it. The money meter is unchanged. No schema change.

**D-L2-06.** Inside a Thread, a cap smaller than the call's hold, with a wallet that could pay, is `PAYG_CAP_TOO_LOW` (402, `availableMicroUsd` is the cap left), not `PAYG_CREDIT_EXHAUSTED`. A genuinely empty wallet or a fully spent cap stays `PAYG_CREDIT_EXHAUSTED`; a model with no usable price stays `PAYG_MODEL_UNPRICED` and is refused before any hold. Older callers still see a boolean unless `detailed: true` is sent.

**D-L2-03.** `POST internal/threads/budgets/summary` also returns `settledMicroUsd`, the budget row's settled total in every billing mode.
