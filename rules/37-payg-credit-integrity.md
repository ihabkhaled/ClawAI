# 37 — PAYG Credit Integrity

## Purpose

PAYG credit is the first mechanism in ClawAI that spends a customer's money
**before** the customer sees a result. Every other billing path charges for
something already delivered; this one holds real dollars, calls a provider, and
reconciles. That inverts the usual failure mode: a bug here does not produce a
wrong invoice, it produces an unbounded provider bill or a user refused at a
number their billing page never showed them.

Three properties have to hold no matter who touches the code next:

1. **A user can never spend past their balance** — by construction, not by
   reconciliation.
2. **Every dollar is attributable** — to a user, a surface, a request and a ledger
   row.
3. **The platform's margin inputs stay private** while the user's own allowance
   stays visible.

[ADR-078](../docs/13-adr/adr-078-payg-connector-credit.md) deliberately reversed a
documented decision to publish the cost ceiling. This rule is what keeps that
reversal narrow.

## Applies to

`apps/claw-auth-service/src/modules/credit/**` and `modules/quota/**`,
`apps/claw-connector-service` PAYG classification, `apps/claw-routing-service`
model-cost and metered router calls, `apps/claw-payment-service` credit top-up and
reversal, `packages/shared-entitlements` (`PaygMeter`), `packages/shared-constants`
(`payg-credit.constants.ts`), `packages/shared-types` (the PAYG enums and types),
and **every service that can reach a paid provider**: chat, image, workspace,
routing.

Deliberately NOT research: `claw-research-service` reaches search SaaS (Brave,
Exa, Tavily, ...), never a paid model, and is metered through
`FeatureUsageRecord`'s WEB_SEARCH / WEB_FETCH / WEB_EXTRACT allowances. It has
zero `PaygMeter` references and no `PaygSurface` member. The moment it calls a
paid model, rule 1 applies to it like anything else.

## Mandatory rules

1. **Every new money-spending surface reserves, finalizes and releases — and adds a
   `PaygSurface` member.** The three-call idiom is not optional and neither is the
   enum member. A surface with no member makes its spend **anonymous**, and "where
   did my $5 go" becomes unanswerable, which becomes a support ticket and then a
   chargeback. The enum and the caller change in the **same commit**.
   Runbook: [`skills/meter-a-paid-provider-call.md`](../skills/meter-a-paid-provider-call.md).

2. **The caller uses the granted ceiling, never the one it asked for.**
   `hold.maxOutputTokens` goes to the provider. Passing the requested value is what
   turns "overspend is impossible" back into "overspend is reconciled", and it
   typechecks either way, so it is a review target.

3. **Money is integer micro-USD. Floats are banned in every credit path.** No
   `parseFloat`, no `Math.round` (`Math.round(-0.5) === 0` while
   `Math.round(0.5) === 1`, so a credit and the charge offsetting it round
   asymmetrically), no `/` on a money value that is not integer division. Ratios are
   applied as `BigInt` arithmetic. Round **once**, at the final boundary.

4. **A balance is never logged next to a user id.** A log line pairing a `userId`
   with a wallet figure is a financial profile in a log store three services can
   read. Log the reservation id, the surface, and the outcome — never the balance
   with an identity attached. Redaction applies to `grantMicroUsd`,
   `purchasedMicroUsd`, `availableMicroUsd`, `heldMicroUsd` and every ledger amount.

5. **An unpriced model on a metered provider is blocked, never free.**
   `PAYG_MODEL_UNPRICED`, not a zero charge. An unpriced paid model is an unbounded
   liability, not a giveaway. This is why the model-cost seeder is launch-blocking.

6. **A PAYG provider may never resolve through the local zero-rate fallback.**
   `ModelCostService.unpricedSnapshot` answers a **local** provider with
   `isPriced: true` at a rate of **0** — correct for a user's own GPU, catastrophic
   for a metered provider, and it looks exactly like a healthy lookup in the logs.
   `isUsablePaygRate` rejects any rate carrying `isLocalComputeFallback`. Never
   remove that check, and never add a paid provider to `LOCAL_COST_PROVIDERS`.

7. **The ledger is append-only. A correction is a new compensating row.** Never
   `UPDATE` or `DELETE` a `credit_ledger_entries` row. The wallet is a materialized
   sum of the ledger and must always reconcile to it:
   `wallet.grant + wallet.purchased == SUM(deltas)`. The same rule
   [rule 28](28-billing-integrity-and-api-contracts.md) applies to prices, invoices
   and refunds.

8. **Error payloads never carry a cost ceiling, a margin, or a provider rate.** A
   402 carries `errorCode`, `availableMicroUsd` and `requiredMicroUsd` — the
   user's own numbers plus the code the frontend maps, beside the envelope every
   error carries. No rate, no ceiling, no margin. The
   user's own allowance is public; the platform's rate card is not. This is the
   narrowed survivor of the threat
   [`billing-threat-model.md`](../docs/03-architecture/billing-threat-model.md)
   records as "learn margins from an error".

9. **Classification is decided server-side in auth-service only.** Never in
   `shared-entitlements`, never in a calling service. A predicate compiled into six
   `node_modules` copies changes only on a six-container rebuild, which would make
   the per-connector admin toggle unenforceable
   ([ADR-082](../docs/13-adr/adr-082-payg-classification-grain.md)). `PaygMeter`
   stays a thin client: call auth, return the answer.

10. **Fail closed for metered providers, open for exempt ones.** An unreachable
    auth-service refuses a PAYG request and lets a local one through. An outage must
    not hand out unbounded provider spend, and must not take the product down
    either.

11. **A release returns each bucket to its own side, and is idempotent.** GRANT back
    to GRANT, PURCHASED back to PURCHASED — returning perishable allowance as
    purchased credit mints permanent money out of an expiring one. A second release
    of the same reservation is a **no-op**, not a second refund: gate on the row
    count `markReleased` returns.

12. **Money arriving from outside auth-service is idempotent at the database.**
    `credit_ledger_entries.source_event_id` is `@unique`, so a redelivered
    `billing.credit.topup_succeeded` collides in Postgres rather than at an
    application check two consumers can race.

13. **A price never lives in a constant.** Plan allowances live in `plans`; package
    prices and ratios live in immutable `CreditPackageVersion` rows. The header of
    `packages/shared-constants/src/payg-credit.constants.ts` states it: _"The one
    number this file must never contain is a price."_

14. **An operator adjustment is attributed and bounded.** An `ADMIN_ADJUSTMENT` row
    without both an `actor_user_id` and an 8–500 character reason is refused — an
    unattributed credit is indistinguishable from a fabricated payment. Bounded by
    `PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD`. **Never** write a `TOPUP` row for a
    goodwill grant: `TOPUP` asserts money arrived, and finance reads it that way.

15. **`requestId` must not collide under fan-out.** Reservation is idempotent on
    `(userId, requestId)`, which is a feature for a retried request and a silent
    under-charge for a fan-out that reuses one key. Compare keys per lane; routing
    keys `${traceId}:${entryId}:${attemptNumber}`, because a retry inside an entry is
    a second paid call.

16. **A clamped answer is visible to the user.** A silently shortened reply is worse
    than a refusal — the user cannot tell a truncation from the model's judgement.
    `clamped: true` must reach a rendered surface, and the test must assert the
    string is **visible**, not merely mounted.

## Prohibited patterns

- Calling a paid provider with `maxTokens` set to anything but `hold.maxOutputTokens`.
- Adding a metered surface without a `PaygSurface` member, or reusing a member that
  does not describe the spend.
- `parseFloat`, `Math.round`, or non-integer arithmetic anywhere on a money value.
- `logger.log(\`user=${userId} balance=${wallet.availableMicroUsd}\`)` — or any
  variant that pairs an identity with a balance.
- Charging zero for an unpriced model on a metered provider.
- Adding a paid provider to `LOCAL_COST_PROVIDERS`, or bypassing
  `isUsablePaygRate`'s `isLocalComputeFallback` check.
- `UPDATE`/`DELETE` on `credit_ledger_entries`, or "fixing" a wallet by writing the
  balance directly.
- Returning `monthlyProviderCostCeilingMicroUsd`, a provider rate, or a margin in
  any error body or non-admin response.
- Implementing `isPayg` in `shared-entitlements` or in a calling service.
- Failing **open** on a metered provider when auth is unreachable.
- A release that credits the wrong bucket, or that is not gated on the update count.
- Writing a `TOPUP` ledger row for anything other than money that actually arrived.
- A price, ratio or allowance as a constant, an env var, or a client-supplied value.
- One `requestId` shared across the lanes of a fan-out.

## Correct pattern

The three-line idiom every metered surface uses:

```ts
const hold = await this.payg.reserve({
  userId,
  requestId, // unique per PAID CALL, not per user request
  provider,
  model,
  surface: PaygSurface.CHAT,
  promptTokens,
  cachedPromptTokens,
  requestedMaxOutputTokens,
});

try {
  // ALWAYS hold.maxOutputTokens — never the value you asked for.
  const out = await this.callProvider({ ...args, maxTokens: hold.maxOutputTokens });
  await this.payg.finalize(hold, extractUsage(out), { toolCalls });
  return out;
} catch (error) {
  await this.payg.release(hold, 'PROVIDER_ERROR'); // PaygReleaseReason: PROVIDER_ERROR | CANCELLED | TIMEOUT
  throw error;
}
```

`reserve` throws `PaygCreditExhaustedError` on a 402, carrying `errorCode`,
`availableMicroUsd` and `requiredMicroUsd`, so the caller maps it to a
`BusinessException` with `HttpStatus.PAYMENT_REQUIRED` — and nothing else.

## Enforcement

Each mechanism below **exists today**. Where a rule is review-only, it says so
rather than claiming a check that is not there.

| Rule                                   | Mechanism                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — surface enum member                | **Unit test** — `tools/__tests__/payg-surface-exhaustiveness.test.mjs` reads the real call sites and fails on a member no service emits, or one with no user-facing ledger label. It lives in `tools/` so `npm run knowledge:test` runs it on EVERY commit and push: `tools/affected` fans a package change out to its dependents and never the reverse, so a guard beside the enum would not run when an app deletes its last call site — exactly the change it exists to catch. `payg-credit-surfaces.spec.ts` covers the per-surface behaviour. |
| 2 — granted ceiling used               | **Unit test** per surface asserting the provider mock received `hold.maxOutputTokens`, plus **review checklist**.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 3 — integer money                      | **ESLint** `no-restricted-syntax` bans `Math.round` and `parseFloat` in payment-service logic files. **Extending the same block to auth-service's credit module is an open follow-up** — until then, auth is **review checklist** + `BigInt` column types.                                                                                                                                                                                                                                                                                         |
| 4 — no balance beside a user id        | **Review checklist**, backed by [rule 19](19-logging-observability-and-redaction.md)'s redaction list. No automated check exists; a log-string scanner is the obvious future one.                                                                                                                                                                                                                                                                                                                                                                  |
| 5 — unpriced is blocked                | **Unit test** — a metered provider with no price row yields `PAYG_MODEL_UNPRICED` and no hold.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 6 — no local zero-rate fallback        | **Unit test** — `payg-classification.utility.spec.ts` asserts `isLocalComputeFallback` is treated as unpriced. Also asserted in `model-cost-seed.spec.ts` (no seeded model is in `LOCAL_COST_PROVIDERS`).                                                                                                                                                                                                                                                                                                                                          |
| 7 — append-only ledger                 | **Unit test** — the wallet-to-ledger reconciliation assertion after a concurrency run. **Repository review**: no `update`/`delete` on the ledger model.                                                                                                                                                                                                                                                                                                                                                                                            |
| 8 — no margin in errors                | **Unit test** on the 402 body shape. **Review checklist** for new error payloads.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 9 — classification in auth only        | **Architecture test** — `packages/shared-entitlements/src/__tests__/payg-meter-boundary.spec.ts` scans the package source and fails on `PAYG_DEFAULT_PROVIDERS`, any rate type or cost function, or any per-million/threshold constant. **Review checklist** for calling services.                                                                                                                                                                                                                                                                 |
| 10 — fail closed / open                | **Unit test** — auth unreachable refuses a metered reserve and returns `metered: false` for an exempt one.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 11 — bucket-correct idempotent release | **Unit test** — `credit-reservation.manager.spec.ts` covers per-bucket release and a double release as a no-op.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 12 — external money idempotent         | **Database** — `source_event_id` unique constraint. **Unit test** on replay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 13 — no price in a constant            | **Review checklist**, plus the header comment in `payg-credit.constants.ts`. Seeder tests assert prices come from rows.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 14 — attributed adjustments            | **Unit test** — an adjustment without actor or reason is refused; one above the cap is refused.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 15 — non-colliding `requestId`         | **Unit test** per fan-out surface asserting N distinct holds for N lanes/attempts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 16 — clamp is visible                  | **Unit test** asserting the clamp string is **rendered and visible**, not merely mounted (frontend).                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Plus the standing gates: **CI job** (lint → typecheck → test → build per touched
workspace) and **knowledge check** (`npm run knowledge:coverage`, which fails if
this rule is unreachable from an index).

## Related skills

- [meter-a-paid-provider-call](../skills/meter-a-paid-provider-call.md)
- [deploy-payg-credit](../skills/deploy-payg-credit.md)
- [reconcile-billing-state](../skills/reconcile-billing-state.md)
- [add-a-payment-gateway-flow](../skills/add-a-payment-gateway-flow.md)

## Related context

- [PAYG credit architecture](../docs/03-architecture/payg-credit.md)
- [PAYG credit product spec](../docs/02-business-product/payg-credit-spec.md)
- [Business layer](../docs/business/README.md)
- [PAYG credit runbook](../docs/11-runbooks/runbook-payg-credit.md)
- [ADR-078](../docs/13-adr/adr-078-payg-connector-credit.md) · [079](../docs/13-adr/adr-079-auth-model-price-cache.md) · [080](../docs/13-adr/adr-080-one-reservation-not-two.md) · [081](../docs/13-adr/adr-081-retire-routing-cost-budget.md) · [082](../docs/13-adr/adr-082-payg-classification-grain.md) · [083](../docs/13-adr/adr-083-credit-topup-checkout-purpose.md)
- [rule 28 — billing integrity](28-billing-integrity-and-api-contracts.md)
- [event flow map](../context/event-flow-map.md) · [permission map](../context/permission-map.md) · [database ownership map](../context/database-ownership-map.md)

## Definition of done

- [ ] Every new paid-provider call site reserves, finalizes and releases, and uses
      `hold.maxOutputTokens`.
- [ ] A `PaygSurface` member exists for it, in the same commit, with a test.
- [ ] All money is integer micro-USD; no float, no `Math.round`, no `parseFloat`.
- [ ] No log line pairs a user id with a balance; no error body carries a rate,
      ceiling or margin.
- [ ] Unpriced and local-fallback cases are proven blocked, not free.
- [ ] Ledger movements are append-only and the wallet reconciles to their sum.
- [ ] Release is bucket-correct and idempotent; `requestId` is unique per paid call.
- [ ] A clamped answer is proven visible to the user.
- [ ] The ADRs, the runbook and `docs/business/` are current with any change to the
      numbers or the policy.
