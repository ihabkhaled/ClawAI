---
name: reconcile-billing-state
summary: Run, interpret, and safely recover ClawAI billing reconciliation without guessing money outcomes.
task_keywords:
  [
    billing reconciliation,
    entitlement drift,
    payment mismatch,
    stuck reconciliation,
    gateway divergence,
    reconciliation run,
  ]
applies_to: [apps/claw-payment-service, apps/claw-auth-service, operations]
required_rules: [17-rabbitmq-events-and-jobs, 28-billing-integrity-and-api-contracts]
required_context: [service-catalog, event-flow-map, database-ownership-map]
affected_workspaces: [apps/claw-payment-service, apps/claw-auth-service]
required_tests: [reconciliation unit tests, cross-service entitlement contract tests]
required_docs: [docs/11-runbooks/runbook-billing-reconciliation.md]
validation_lane: cd apps/claw-payment-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Reconcile Billing State

## When to use

Use for paid-without-access, access-without-subscription, missed gateway
callbacks, ambiguous nonterminal transactions, quarantined divergences, or a
reconciliation run with an unprocessed remainder.

## When NOT to use

Do not use it to alter a valid price, issue a refund, or override an ambiguous
provider result. Those require their dedicated workflow and evidence.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md)
- [`../rules/28-billing-integrity-and-api-contracts.md`](../rules/28-billing-integrity-and-api-contracts.md)
- [`../docs/11-runbooks/runbook-billing-reconciliation.md`](../docs/11-runbooks/runbook-billing-reconciliation.md)

## Repository discovery steps

1. Trace `ReconciliationManager` through its four reconciliation services.
2. Inspect `ReconciliationRun` and `ReconciliationDivergence` in payment Prisma.
3. Trace any emitted event through the payment outbox and auth entitlement
   inbox before deciding the user is still inconsistent.

## Tests-first plan

Reproduce the classification with a mocked adapter response. Assert repair only
for verified safe classifications, quarantine for ambiguity, bounded remainder
counts, and idempotent replay.

## Implementation steps

1. Diagnose dependencies and durable run/finding rows.
2. Inspect the owner lock by existence/TTL only.
3. Restore the failed dependency.
4. Trigger `POST /api/v1/admin/billing/reconciliation` with an administrator
   holding `ADMIN_PLANS_MANAGE`.
5. Repeat bounded runs until the remainder is zero; resolve quarantined findings
   from verified provider evidence.
6. Verify outbox, inbox, subscription, and dashboard state agree.

## Security considerations

Never log provider bodies, payer data, gateway ids in plaintext, or lock owner
tokens. The manual endpoint is server-permission guarded.

## Failure modes

- Deleting a live lock can create concurrent owners.
- Treating timeout as payment failure can charge or revoke incorrectly.
- Editing financial rows bypasses idempotency and audit history.
- Looking only at payment DB misses a failed auth inbox application.

## Validation commands

```bash
cd apps/claw-payment-service
npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

Update the payment service guide, threat model, and reconciliation runbook when
classifications, repair policy, or operator controls change.

## Definition of done

- The run completed with zero silent remainder.
- Every repair has a classified durable finding.
- Ambiguous cases remain quarantined.
- Payment, outbox, auth inbox, entitlement, and dashboard agree.
