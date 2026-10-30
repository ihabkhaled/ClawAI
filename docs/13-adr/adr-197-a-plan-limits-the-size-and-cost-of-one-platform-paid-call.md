# ADR-197: A plan limits the size and cost of one platform-paid call

**Status:** Accepted
**Date:** 2026-10-30

## Context

A plan limited how much a user may use per day, week and month, and how many requests run at once. It
did not limit one call. A single request to a dear model could cost a large share of the plan's whole
month: on Unlimited, one `gpt-5.5-pro` call at 200,000 input and 64,000 output tokens is about $17.52
against a $50 monthly provider-cost ceiling. The credit wallet bounds spend for a call the user pays
for, but a call the platform pays for (a plan's own key, or the free allowance) answered
`metered: false` with the requested output size and no check at all.

The numbers come from [the price ledger](../03-architecture/model-price-ledger-2026-10-30.md): one call may
spend at most 10% of the plan's monthly provider-cost ceiling, input is capped at 200,000 tokens so no
plan crosses a provider's long-context price tier, and output follows the plan size. The owner approved
the table on 2026-10-30.

## Decision

1. Three nullable columns on `plans`: `max_input_tokens_per_call`, `max_output_tokens_per_call`,
   `max_cost_per_call_micro_usd`. NULL means no cap; 0 means refuse. A versioned seeder
   (`plan-call-limits`) fills a NULL only, so an administrator's value, including 0, is never overwritten.
2. `CreditReservationManager.reserve` applies the limits to a request the platform pays for: the
   `NOT_PAYG` and `METERING_DISABLED` branches. Local and exempt providers cost nothing and are skipped;
   an administrator is skipped. A call paid from the credit wallet is not limited by the plan, because the
   wallet already bounds it and the user is spending their own money.
3. `applyPlanCallLimits` is a pure function over the same worst-case arithmetic as the wallet
   (`clampOutputTokensToBalance`). The smallest limit wins. The output ceiling is clamped, so a user gets a
   shorter answer instead of no answer; a request is refused only when the prompt is longer than the plan
   accepts or the prompt alone costs more than the per-call cap.
4. A refusal is HTTP 402 with the new code `PLAN_CALL_LIMIT_EXCEEDED`, carrying no figure (the plan's dollar
   cap is an internal control). The frontend shows "This request is larger than your plan allows for one
   message. Shorten it or choose a cheaper model." in all 13 locales.
5. A model with no usable price gets the token limits only: the dollar cap cannot be computed. Refusing
   unpriced models is a separate, open owner decision.

## Consequences

- A plan can now be edited to refuse or allow bigger calls without code; the admin plan editor does not show
  the three fields yet, so they change by seeder or database until it does.
- The daily token quota check in chat-service runs before this one and counts the default 30,512-token output
  ceiling, so on Free a prompt over about 19,000 tokens is refused as `QUOTA_DAILY_EXCEEDED` first.
- Credit connectors that route through the free allowance keep their own per-request ceiling.
- Compare, Judge, fallback chains and agent runs are still separate calls with no shared parent budget.
- The Runtime V2 admission path and the legacy token-only `/quota/reserve` are unchanged.
