# ADR-142: Free requests on credit connectors

- Status: Accepted
- Date: 2026-10-01
- Deciders: Product owner, engineering
- Related: rule [37](../../rules/37-payg-credit-integrity.md) item 22,
  [payg-credit.md](../03-architecture/payg-credit.md#free-allowance-on-credit-connectors),
  ADR-078, ADR-080, ADR-082, ADR-139, [rule 46](../../rules/46-token-quota-enforcement-and-window-integrity.md)

## Context

A Free account has no credit, so every cloud connector (a "credit connector": a provider the
platform meters with PAYG credit, classified by `isMeteredProvider` from the connector policy map)
answered its first message with `PAYG_CREDIT_EXHAUSTED`. The owner wants a Free user to be able to try
each cloud provider before paying: **2 requests per credit connector per month**, editable in
plan settings.

## Decision

**A plan setting.** `Plan.creditConnectorFreeRequestsPerMonth` (`Int?`, column
`credit_connector_free_requests_per_month`). `null` = unlimited, `0` = none; never interchangeable
(rule 46 item 4). The column default is `0`, so a plan created without the field gives nothing away.
Seeded Free = 2, every other plan = 0 (they pay with credit). Create and update plan DTOs accept
`0..1,000,000` or `null`; the admin plan view and the public catalog carry it.

**Enforcement in the reservation chokepoint.** `CreditReservationManager.takeHold` runs the normal
credit path first. Only when credit cannot cover the call (empty wallet, prompt larger than the
balance, output below the minimum viable size, or the atomic Lua step refusing a race) does it call
`CreditFreeAllowanceService.tryAdmit`:

1. The surface must be eligible (below) and carry no per-unit quantity.
2. The plan must give an allowance (`> 0` or `null`).
3. The output ceiling is clamped so one free request cannot cost the platform more than
   `min($0.15, monthlyProviderCostCeiling / allowance)` (integer micro-USD). The sum of one provider's
   free requests in a month therefore stays inside the plan's own ceiling, and a plan with no ceiling
   is bounded by the $0.15 constant. Raising the allowance shrinks each request's budget unless the
   ceiling is raised too.
4. The counter slot is taken last, atomically (below).

An admitted call gets a normal-looking metered outcome with `heldMicroUsd: 0` and
`freeAllowance: true`, a `WeightedUsageRecord` (`isPayg`, `isFreeAllowance`, zero bucket holds,
`estimatedCostMicroUsd` = the absorbed worst case) and one zero-amount `FREE_ALLOWANCE` ledger row.
There is no wallet hold and no Redis hold counter. A spent allowance re-throws the original
credit refusal, so it reads exactly like an empty wallet: HTTP 402 `PAYG_CREDIT_EXHAUSTED`.

**Atomic counter.** Table `credit_free_allowance_usage`, unique `(user_id, provider, period_key)`
with `provider` upper-cased and `period_key` the UTC `YYYY-MM`. Admission is one statement,
`INSERT ... ON CONFLICT DO UPDATE SET used_count = used_count + 1 WHERE used_count < limit`
`RETURNING`, so Postgres serialises concurrent requests on the index row and two parallel requests
cannot both take the last slot. Counters are per provider (2 on Grok and 2 on OpenAI are separate)
and reset by the UTC calendar month key, with no job.

**Settlement.** `finalize` on an allowance record writes the measured usage and the absolute cost the
platform paid (`actualCostMicroUsd`) and moves no money; the slot stays used. `release` (provider
error, cancel, the sweeper's timeout) is gated on the same `markReleased` row count as every other
hold, gives the slot back to the month the call was taken in, floors at zero, and appends a
compensating `FREE_ALLOWANCE` row (`FREE_ALLOWANCE_RETURNED:<reason>`). A double release returns
the slot once.

**Wire.** `PaygMeter` needed no behavioural change: the allowance outcome is `metered: true` with a
`reservationId`, so the existing finalize and release calls reach auth. `PaygHold` gains an optional
`freeAllowance` flag (present only when true) that call sites may ignore.

**Visibility.** `GET /credit/me` carries `freeAllowance: [{ provider, limit, used, remaining }]`, one
entry per credit connector, empty for administrators, with metering off, or when the plan gives none.
`limit` and `remaining` are `null` for unlimited.

## Credit first

A user with enough credit is charged normally; the allowance is a fallback, never a discount. Spending
the allowance first would let a paying customer burn a free request they will not remember and leave
them with a smaller allowance on the day their credit runs out, and it would make a paid wallet look
untouched in the ledger. The cost to the platform is the same either way; credit-first keeps the
ledger honest about who paid.

## Why per-unit surfaces are excluded

Eligible surfaces are an explicit allow-list: CHAT, COMPARE, JUDGE, ORCHESTRATION, FILE_GENERATION,
WORKSPACE_ACTION, ROUTING. IMAGE, VIDEO, TRANSCRIPTION and TTS are excluded because they are priced per
unit, and one video clip can cost $1.60: "2 requests" there is an unbounded giveaway rather than a
bounded trial. The unit check also looks at the quantities on the call, so a video call mislabelled
CHAT is still refused. VISION_HELPER (not a request the user made) and CODING_AGENT (a hold per turn
of a tool loop, so two "requests" would be two turns) are excluded too. A new `PaygSurface` is not
free until someone adds it to the list.

## Consequences

- Free requests are real provider spend. They are visible in `weighted_usage_records` (and so in the
  plan-cost aggregates) and in the ledger, never in the wallet.
- The plan token windows of rule 46 still apply upstream (chat-service checks them before it reserves),
  so a free request also counts against, and can be refused by, the daily, weekly and monthly token
  quotas. The credit reservation deliberately ignores those windows (they measure the same dollars the
  wallet holds), so the allowance does too.
- `CreditLedgerKind.FREE_ALLOWANCE` is a new shared enum member. A frontend `Record<CreditLedgerKind, ...>`
  label map needs the new key in all 13 locales.
- Migration `20261001150000_credit_connector_free_allowance` seeds Free = 2 only inside a guard that
  runs when the column is created, so a re-run never overwrites an administrator's value. The catalog
  seeder's create branch writes it for fresh installs; the administrator-edited branch never touches it.
- Deploy order: migration and auth-service first. An older chat-service reads the allowance outcome as an
  ordinary metered hold with `heldMicroUsd: 0`, which behaves correctly.

## Risks

- **Free-account farming.** Two requests per provider per month per account is a cost multiplier on
  every provider a Free account can register. Bounded by the per-request ceiling and by email
  verification, but not by anything stronger. Watch Free-plan provider cost in the plan-cost report.
- **The $0.15 constant is a number in code.** It is a liability cap, not a price, and no customer figure
  derives from it, but it ignores the provider's real rate: a model priced far above the reference makes
  the clamp very short rather than refusing. An unpriced model is still refused first (rule 37 item 5).
- **Allowance raised above ~5 with a $0.30 ceiling** gives requests of $0.06 or less; prompts above that
  are refused with the credit message. Raise the ceiling with the allowance.
- **A refusal is indistinguishable from "no credit".** Intentional (rule 37 item 8), but a user who spent
  their two requests sees the credit message and not "your free requests are used"; the frontend can
  read `freeAllowance` to say so.
- **Counter drift if a release is lost.** A crash between admission and the usage row is compensated in
  code; a request that dies mid-call is returned by the sweeper after the reservation TTL. A missed
  release can only under-count the allowance (the user loses a request), never over-count it.

## What would make it stale

- A per-unit surface becoming token-priced, or a new `PaygSurface` that should be free.
- The platform adopting per-plan provider budgets, which would make the per-request ceiling formula the
  wrong place to bound the spend.
- Free accounts gaining a monthly credit grant, which would make the fallback rarely reachable.
- The connector policy map moving away from `isMeteredProvider`, which defines "credit connector" here.
- A second place that admits a metered call without `CreditReservationManager`.
