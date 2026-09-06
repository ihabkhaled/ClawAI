# 28 — Billing Integrity and API Contracts

## Purpose

Money, entitlement, and frontend/backend request contracts must have one
authoritative meaning. A typecheck cannot prove that independently declared
client and server payloads agree, and a refund must not become an informal
operator decision about access.

## Applies to

`apps/claw-payment-service`, auth billing-entitlement consumers,
`apps/claw-frontend` billing/admin repositories, payment gateway adapters, and
tests for any frontend repository that calls a changed API.

## Mandatory rules

1. **Financial history is append-only.** Prices mint immutable versions,
   refunds create immutable ledger rows, and issued invoice facts/lines are not
   edited. Corrections are compensating records.
2. **Refund entitlement policy is fixed.** A partial refund preserves paid
   access. When cumulative successful refunds equal the captured amount, paid
   access is revoked immediately and the subscription becomes `REFUNDED`. A
   chargeback is distinct, terminal, and also revokes immediately.
3. **Refund capacity is concurrent-safe.** A committed `PENDING` refund reserves
   its amount; both the manager and PostgreSQL must reject an aggregate above
   the captured amount.
4. **Money uses integers.** Charges/refunds use minor units; provider cost and
   margin use micro-USD. Never mix currencies into one revenue or margin total.
5. **Internal billing APIs remain internal.** They require
   `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>` and are never routed by
   nginx. Admin billing endpoints require the exact server-side permission.
6. **Frontend repository request bodies have exact contract tests.** For every
   added or changed mutation, assert method, URL, headers when relevant, and the
   complete serialized body—not only that an HTTP helper was called.
7. **Cross-service responses are runtime-validated.** A compile-time interface
   on each side is insufficient; callers parse bounded Zod schemas and fail
   closed on mismatch.

8. **A shorter quota window may never allow more than a longer one.** Daily
   cannot exceed weekly, nor weekly monthly. A shorter cap above the longer one
   is not a stricter plan — the longer ceiling binds first, so the shorter
   figure is unreachable, and the shorter figure is what the pricing card leads
   with. `findQuotaWindowConflicts` (auth-service `modules/plans/utilities/`) is
   the single predicate, enforced on plan create and update with
   `PLAN_QUOTA_WINDOWS_INCOHERENT`. `null` is unlimited and `0` is disabled;
   neither participates in the comparison.

   This shipped live: the Free plan advertised 300,000 tokens a day against a
   20,000 weekly ceiling — fifteen times the allowance the account grants.

9. **A lifetime record may never be rendered as current state.**
   `PlanTrialRedemption` is written once per user and deliberately outlives the
   assignment that created it, so its `expiresAt` keeps counting down forever.
   Anything reporting "is this user on a trial" must ask whether the trial is
   still the grant in force — `AdminUserPlanService.toTrial` compares the
   redemption's `assignmentId` against the assignment actually in force — never
   `expiresAt` alone. Identity, not plan slug or grant type, so the check does
   not have to enumerate everything that may replace a trial.

   This shipped live: an account granted Pro for a year displayed "Free trial —
   23 days left". The countdown was arithmetically correct and described a trial
   that had been superseded a week earlier.

10. **"No subscription" is not "free account".** An admin grant, a promotional
    grant and a migration all produce entitlement with no subscription behind
    them, and none of them is a free account. A panel that infers one from the
    other tells an operator the opposite of what the account holds — the same
    account above was captioned "This is an ordinary free account. Nothing has
    been bought and nothing is owed." Derive the sentence from the grant
    (`resolveNoSubscriptionDescriptionKey`), not from the absence of a
    subscription. A `PAID_SUBSCRIPTION` grant with no subscription behind it is
    auth-service and payment-service disagreeing, and must never be captioned as
    a free account either — that is the one case worth surfacing.

The request-body test is required because the share feature once omitted
`acknowledgedPublicWarning`: frontend and backend both typechecked, but every
publication request returned 400. Exact serialization assertions catch that
class of split-contract failure.

## Prohibited patterns

- Editing an active/historical price or issued invoice row in place.
- Revoking entitlement for a partial refund or preserving it after a full
  economic reversal.
- Retrying an ambiguous provider refund as a fresh request.
- Floating-point arithmetic or cross-currency summation in billing.
- Exposing `/api/v1/internal/payments/*` through nginx.
- A frontend mutation test that asserts only `toHaveBeenCalled()`.
- A plan whose daily cap exceeds its weekly cap, or weekly its monthly.
- Reading `PlanTrialRedemption.expiresAt` on its own to decide whether a user is
  on a trial. It answers "when was the trial scheduled to end", never "is the
  trial still in force".
- Captioning an account as free because it has no subscription, without first
  looking at the grant that gave it its plan.

## Correct pattern

```ts
expect(api.post).toHaveBeenCalledWith('/admin/plans/plan-pro/price-versions', {
  billingInterval: BillingInterval.MONTHLY,
  currency: 'USD',
  amountMinor: 1999,
});
```

The authoritative decisions are
[ADR-064](../docs/13-adr/adr-064-refund-ledger-and-entitlement-policy.md) and
[ADR-065](../docs/13-adr/adr-065-immutable-invoice-documents-and-delivery.md).

## Enforcement

- **Database constraints/triggers** — price, invoice, and refund invariants.
- **Unit tests** — exact repository payload, integer arithmetic, entitlement
  outcomes, idempotent replay, and permission metadata.
- **Architecture test** — public nginx configs route customer/admin payment
  surfaces but never internal payment endpoints.
- **Review checklist** — provider ambiguity and compensating-record behavior.

## Related skills

- [reconcile-billing-state](../skills/reconcile-billing-state.md)
- [add-a-payment-gateway-flow](../skills/add-a-payment-gateway-flow.md)

## Related context

- [billing threat model](../docs/03-architecture/billing-threat-model.md)
- [payment service guide](../docs/04-backend/service-guide-payment.md)
- [permission map](../context/permission-map.md)

## Definition of done

- [ ] Financial mutations preserve append-only history and integer units.
- [ ] Partial/full refund and chargeback entitlement tests match this rule.
- [ ] Changed frontend mutations assert the exact serialized contract.
- [ ] Internal responses are runtime-validated and internal routes stay private.
- [ ] Relevant ADR, threat model, and operations runbook are current.
