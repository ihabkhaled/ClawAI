# ADR-080: One reservation, not two — PAYG credit extends the quota Lua script

**Status**: Accepted
**Date**: 2026-08-29
**Deciders**: ClawAI core team
**Slice**: Pay-as-you-go connector credit (PAYG flagship)

## Context

A PAYG request has to pass two admission checks before it may reach a provider:
the existing plan quotas (daily/weekly/monthly tokens, provider cost, concurrency,
chats, messages) and the new credit balance. Both must hold, and both must be
decided **atomically** — a request that consumes a concurrency slot but is then
refused for credit has to give the slot back, and a request admitted by two
independent checks can be admitted twice under concurrency.

What already existed and worked:

- `RESERVE_QUOTA_LUA` in
  `apps/claw-auth-service/src/modules/quota/constants/quota-redis.constants.ts` —
  a single Redis Lua script enforcing **seven** windows atomically and failing
  closed. Its window list was
  `{ 'DAY','WEEK','MONTH','PROVIDER_COST','CONCURRENCY','CHATS','MESSAGES' }`,
  and both its check loop and its rollback loop were already generic over
  `i = 1..n`.
- `WeightedUsageRecord` — a per-execution row carrying the reserve→finalize→
  release lifecycle, with raw and weighted token columns and an
  `estimatedCostMicroUsd`.
- `QuotaService.reserveWeighted` (`modules/quota/services/quota.service.ts:109`)
  — the reserve half of that lifecycle, fully written, tested, and with **zero
  callers** anywhere in `apps/` outside its own spec.

The naive design for the flagship was a second table, `CreditReservation`, with
its own Lua script and its own lifecycle beside the quota one.

## Decision

**PAYG credit extends the existing reservation. `RESERVE_QUOTA_LUA` goes from
seven windows to nine, and `WeightedUsageRecord` gains three columns. There is no
`CreditReservation` table, because that row already exists.**

```lua
local names = {
  'DAY', 'WEEK', 'MONTH', 'PROVIDER_COST', 'CONCURRENCY', 'CHATS', 'MESSAGES',
  'CREDIT_GRANT', 'CREDIT_PURCHASED'
}
```

`QuotaRejectionWindow` gains the two matching members. `WeightedUsageRecord` gains
`isPayg`, `creditGrantMicroUsd` and `creditPurchasedMicroUsd`. All three default
to a non-PAYG value, so every historical row stays valid and code that predates
the change keeps running.

The two credit windows are kept per-bucket rather than as one total because
**releasing a hold has to give GRANT back as GRANT**. Returning perishable
allowance as purchased credit would mint permanent money out of an expiring one.

A non-PAYG request costs nothing extra: the script's existing `amounts[i] > 0`
guard makes it skip both new windows.

### The credit windows invert the encoding, deliberately

For the seven token windows, the "limit" is a plan cap and the Redis counter
accumulates **consumption**. For the two credit windows, the **limit is the
wallet bucket's balance read from Postgres**, and the counter holds only the
currently **outstanding holds**.

That inversion is the load-bearing detail. Settled spend is subtracted from the
balance in Postgres and never accumulated in Redis, so **losing the Redis tail
costs a safety margin, not a balance**. Production Redis is RDB-only
(`docker/docker-compose.prod.databases.yml`, no `--appendonly`); a counter that
had to survive forever would eventually hand out free money.

For the same reason there is deliberately **no `version` optimistic-lock column**
on `UserCreditWallet`. Redis+Lua is the concurrency authority; Postgres is the
durability authority. Two mechanisms guarding one value is how the two drift
apart.

### `PROVIDER_COST` stays

Window 4 is not removed. It is the same dollars as the credit grant
([ADR-078](adr-078-payg-connector-credit.md)) and therefore never binds first in
practice, but deleting a live enforcement window in the same change that
introduces its replacement would leave no fallback if the wallet path is
disabled by the kill switch. Removing it is a follow-up, once the wallet has run
a full billing period in production.

## Consequences

**Gained:**

- One atomicity domain. A request is admitted or refused by one `EVALSHA`, and
  the script's existing rollback loop already gives back every window it
  incremented before the failing one.
- `RESERVE_QUOTA_LUA` and `WeightedUsageRecord` finally have a production caller:
  `modules/credit/managers/credit-reservation.manager.ts` (`:302` for the script,
  and `WeightedUsageRepository` for the row). The scaffolding audit that found
  them unwired is closed by wiring, not by deleting.
- The ledger and the reservation share a request identity, so
  "which request held this money" is one join and not a correlation exercise.

**Accepted — the Lua script now carries 21 ARGV positions and is the most
position-sensitive code in the service.** Its header comment is the contract, and
an off-by-one in the argument list is a silent mischarge rather than an error. It
is covered by `quota.service.spec.ts` and
`modules/credit/managers/__tests__/credit-reservation.manager.spec.ts`, and any
change to the argument order must update the header block in the same edit.

**Accepted — the two hold counters have different key lifetimes, and mixing them
up is a real bug.** `creditGrantHoldKey` is period-scoped (`quota:credit:grant:
{userId}:{periodKey}`) because the grant itself resets; a hold taken in one period
must never be counted against the next one's allowance.
`creditPurchasedHoldKey` is **not** period-scoped (`quota:credit:purchased:{userId}`)
because purchased credit never expires — a period key there would silently forget
holds at every month boundary.

**Accepted — `CREDIT_HOLD_TTL_SECONDS` (1800 s) must stay longer than
`PAYG_RESERVATION_TTL_MS` (900 s).** If the counter expired before the hold the
sweeper is responsible for, the counter would reset to zero while money was still
held. Postgres still bounds the total, so the failure mode is a smaller safety
margin rather than free money — but the ordering is a constraint, not a
coincidence.

## Alternatives considered

**A separate `CreditReservation` table with its own Lua script.** The obvious
design, and the one this ADR rejects.

Two scripts are **two atomicity domains**. A request must pass A (quota) and B
(credit). If A succeeds and B fails, A's increments must be compensated — and
that compensating release is itself a Redis call that can fail, at which point the
user has silently lost a concurrency slot and a day's tokens for a request that
never ran. The compensation has no natural retry point: the request is already
being refused, so there is nothing left to hold the retry.

It also duplicates a working lifecycle. `WeightedUsageRecord` already models
reserve → finalize → release with a sweeper for abandoned rows. A second table
would need its own sweeper, its own idempotency, its own reconciliation query, and
its own answer to "these two disagree about whether the request happened".

**Reserve credit in Postgres with `SELECT … FOR UPDATE`.** Correct and simple, and
rejected on the hot path: it serializes every concurrent request from one user on
a row lock held for the duration of a network round-trip, and it puts a database
write in front of every provider call. Postgres remains the authority for the
balance; it is not the admission gate.

**Do not reserve at all — meter after the fact.** What the platform did before:
`finalizeQuota` was called post-hoc, fire-and-forget, fail-soft. It cannot bound
spend, because by the time it runs the provider has already been paid. It is the
reason "a user can never exceed their credit" had to become a construction
property (the D6 clamp) rather than a reconciliation one.

## Validation

`quota.service.spec.ts` covers admission and refusal on each of the nine windows
and asserts the rollback loop returns every earlier window's increment.
`credit-reservation.manager.spec.ts` covers the GRANT→PURCHASED debit order,
release returning each bucket to its own side, an idempotent retry on
`(userId, requestId)` reusing its hold, and ten concurrent requests against a
balance funding exactly one admitting exactly one.

## Known gaps

**`QuotaService.reserveWeighted` still has no production caller.**
`CreditReservationManager` calls `RESERVE_QUOTA_LUA` and `WeightedUsageRepository`
directly rather than going through it, because it needs the wallet read and the
bucket split between the two. The method is therefore now _duplicated_ logic
rather than _dead_ logic, which is a smaller problem but still a real one: two
places construct the same 21-argument ARGV array. Collapsing them — either by
moving `reserveWeighted` into the credit manager or by widening it to take the
credit windows — is a follow-up refactor, deliberately not attempted inside a
flagship that already changes the money path.

## Rollback

The two windows are additive: with metering disabled, both amounts are zero and
the script's `amounts[i] > 0` guard skips them, restoring the previous seven-window
behaviour exactly. The `WeightedUsageRecord` columns default to non-PAYG values
and need no migration to ignore.

## Related

- [ADR-078](adr-078-payg-connector-credit.md) — the wallet and the clamp
- [ADR-067](adr-067-owner-token-locks-for-scheduled-jobs.md) — the lock idiom the reservation sweeper reuses
- [`docs/03-architecture/payg-credit.md`](../03-architecture/payg-credit.md)
- [`rules/37-payg-credit-integrity.md`](../../rules/37-payg-credit-integrity.md)
