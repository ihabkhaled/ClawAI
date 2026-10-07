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
