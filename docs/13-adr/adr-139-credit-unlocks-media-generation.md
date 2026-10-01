# ADR-139: PAYG credit unlocks image and video generation

- **Status:** Accepted
- **Date:** 2026-10-01
- **Deciders:** Product owner, engineering
- **Related:** rule [37](../../rules/37-payg-credit-integrity.md) item 21,
  [payg-credit.md](../03-architecture/payg-credit.md), ADR-122, ADR-137

## Context

`allowImageGeneration` locked image and video generation on Free. A Free user who
bought credit still got "Video generation isn't included in your current plan", so the
credit they paid for could not be spent on the thing it was bought for.

## Decision

Auth-service entitlements gain `hasPaygCredit` (metering enabled and wallet
`availableMicroUsd > 0`). `hasPlanFeature` in `@claw/shared-entitlements` returns true
for features in `CREDIT_UNLOCKABLE_FEATURES` when it is set. The set holds only
`allowImageGeneration`. TTS and the vision helper are not unlocked.

## Consequences

- The spend gate is unchanged: the PAYG reservation refuses with 402 when the balance
  cannot cover the hold. No second balance check at the plan gate.
- Fail closed: an unreadable wallet or setting yields `false`; an older auth-service that
  omits the field reads as `false`.
- No cache: the adapter fetches fresh per call, so a top-up unlocks on the next request.
- A user with only a tiny balance passes the gate and is then refused by the hold.
