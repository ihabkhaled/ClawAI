# ADR-161: A used-up credit model falls back to an included model, with a notice

**Status:** Accepted

**Date:** 2026-10-07

## Decision

When a credit model is refused because the user's connector credit or free credit-model requests are used up (or this prompt costs more than the credit left), the turn moves to a model that needs no credit (a PAYG-exempt provider such as the included cloud models or a local model) instead of ending in an error. The answer carries `metadata.creditFallback` (`CREDIT_EXHAUSTED`, `FREE_ALLOWANCE_EXHAUSTED` or `PROMPT_TOO_EXPENSIVE`, plus the model the user wanted) and the bubble says, in the user's language, that the credit was used up, which model answered, that no credit was used, and how to get the model back (add credit or upgrade).

- Applies to a picked model (MANUAL_MODEL) and to AUTO. It reverses the earlier rule that a picked model's own credit refusal reaches the user as an error.
- Once the credit itself is gone, only included models are tried. A "this prompt is too expensive" refusal leaves cheaper credit models in play.
- A refusal costs nothing, so it does not use up the picked-model substitute allowance.
- Routing always ends the substitute list with an included model when one is eligible.
- If no included model is on offer, the user still sees the credit refusal (the upgrade notice).
- Plan/exposure (403) and quota (429) refusals are unchanged: they are the user's answer.

## Rationale

The owner asked that a user who has spent their plan's connector credit keeps getting answers and is told what happened. An error ends the conversation for no good reason when an included model could answer. The notice keeps it honest: the model changed, no credit was touched, and the way back is stated.

## Consequences

No credit is ever spent on the fallback (included providers are exempt from the meter). The answer may come from a weaker model than the one picked, which is why the notice is mandatory and why it replaces the generic "X failed" notice for this case. Billing, plan limits and the free allowance counters are unchanged. QA: `docs/qa-evidence/2026-10-07-credit-fallback-plan-rounds.md`.

## Amendment 2026-11-02: the user chooses FALLBACK or STOP

The fall-back is now a per-user setting. `User.creditFallbackMode` (enum `CreditFallbackMode` in `@claw/shared-types`, column default `FALLBACK`, idempotent migration `20261102100000_add_user_credit_fallback_mode`) holds `FALLBACK` (the default, the behaviour above) or `STOP`.

- **STOP:** the turn ends with the original 402 credit refusal; no included model answers. Set through `PATCH /users/me/preferences` (`creditFallbackMode`), returned by `/auth/me`, and carried in `GET /internal/users/:id/entitlements` as the optional `UserEntitlements.creditFallbackMode` (absent means `FALLBACK`). Entitlements are fetched fresh per call, so there is no cache to go stale.
- **chat-service:** `AccessControlService.creditFallbackModeFor`. The candidate chain reads the mode lazily, only after the first 402 (a turn that never hits a credit refusal costs no extra call). Under STOP `skipChainCandidate` skips every remaining candidate (`creditFallbackStops`, `skipsAfterCreditStop` in `utilities/credit-fallback.utility.ts`, the `creditStopped` flag in `candidate-chain.utility.ts`), so the chain ends in the original refusal. Spec: `credit-fallback-mode.spec.ts`.
- **Unchanged:** a provider outage (not a credit refusal) still falls to a substitute under STOP. Routing's `withIncludedSafetyNet` is unchanged; the choice is made in chat-service, not in the routing list. Plan (403) and quota (429) refusals are as before.
- **Web:** a settings card (`components/settings/credit-fallback-mode-card.tsx`, `hooks/settings/use-credit-fallback-mode.ts`), 5 `settings.creditFallbackMode*` keys in 13 locales.
- **Not proved live:** QA record `2026-11-02-credit-fallback-user-setting` is PARTIAL (unit tests only).
