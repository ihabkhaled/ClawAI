# 46 — Token quota enforcement and window integrity

**Status:** active · **Owner:** billing · **Introduced:** 2026-09-15

A quota that is measured after the fact is not a limit. It is a receipt.

## What went wrong

Production showed a user 150 tokens past a hard daily limit; local reproduction
put the same account **1,655 tokens over a 20,000 limit** in a single request.
Three separate defects stacked:

1. `assertQuotaRemaining` admitted any request while `remaining > 0` and
   reserved **nothing**. One token left bought a full-length reply.
2. `recordUsage` finalised with `estimatedTokens: 0`, so the entire measured
   cost landed after the answer was already delivered.
3. Only the DAY window existed on the chat path. `weeklyTokenQuota` and
   `monthlyTokenQuota` were configured on every plan, shown on the billing
   page, and enforced by nothing.

And a fourth, found while fixing them: `finalize()` incremented the day counter
without ever setting a TTL. A user whose first write of the day came from
`finalize` — which is every chat user, because chat never calls `reserve` —
carried that counter **forever**.

## The rules

1. **Count the prompt BEFORE the call.** It is the half that can be known
   exactly. A user who cannot afford to ask is refused, not billed for finding
   out.
2. **Clamp the output to what is left.** `maxOutputTokens` is sized to the
   remaining allowance, so the reply physically cannot overrun. Below
   `MIN_USEFUL_OUTPUT_TOKENS` refuse instead of clamping — a three-token stub is
   not an answer.
3. **Every configured window is enforced, and the TIGHTEST one wins.** Day,
   week and month. A user with day headroom and no month headroom is refused on
   the MONTH, and told so — reporting it as a daily block tells them to come
   back tomorrow when they must wait weeks.
4. **`limit: null` is unlimited, `0` is disabled.** Never collapse them.
5. **A missing `windows` array falls back to day-only, never to "no limits".**
   An older service build must degrade to less permissive, not more.
6. **Every window counter moves together and gets its reset TTL on first
   write.** A counter with no expiry is a permanent ban.

## Where this lives

- `apps/claw-chat-service/src/modules/chat-messages/utilities/quota-headroom.utility.ts`
- `apps/claw-chat-service/src/modules/chat-messages/constants/quota-window-error.constants.ts`
- `apps/claw-auth-service/src/modules/quota/services/quota.service.ts`
- `apps/claw-auth-service/src/modules/quota/utilities/quota-window.utility.ts`

Related: [`rules/28-billing-integrity-and-api-contracts.md`](28-billing-integrity-and-api-contracts.md)
