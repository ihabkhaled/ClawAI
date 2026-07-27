# ADR-064: Refund ledger and entitlement policy

**Status**: Accepted
**Date**: 2026-07-27
**Deciders**: ClawAI core team
**Slice**: Subscription billing completion

## Context

A provider refund changes money, accounting records, and product access. Treating
those as separate operator steps creates three failure modes: returning more
than the captured amount, applying a provider webhook twice, or revoking access
for a customer who received only a partial adjustment.

PayPal accepts a request id for refund calls. Paymob does not document an
equivalent guarantee for its refund endpoint, so provider behavior alone cannot
be the idempotency boundary.

## Decision

- A refund is an immutable first-class ledger record. A `PENDING` reservation is
  committed before the gateway call.
- The application rejects an amount above the remaining captured balance. A
  PostgreSQL trigger locks the captured transaction and enforces the same
  aggregate invariant across concurrent `PENDING` and `SUCCEEDED` rows. A normal
  `CHECK` constraint cannot validate a cross-row sum.
- The operator idempotency key is unique per operator. A different payload may
  not reuse it. Each provider request also receives a stable provider key.
- A provider webhook and an operator request converge on the same transactional
  completion service. Completion writes a compensating negative transaction,
  marks the refund successful, and emits `billing.payment.refunded` once.
- A partial refund does **not** change entitlement. When cumulative successful
  refunds equal the captured amount, the subscription moves to `REFUNDED` and
  paid entitlement ends immediately.
- A chargeback remains distinct: it moves the subscription to the terminal
  `CHARGEBACK` state and revokes entitlement immediately.
- Paymob's undocumented handling of the idempotency header is not trusted as the
  safety boundary. The committed local reservation and no-replay behavior after
  an ambiguous provider response provide the merchant-side guarantee.

## Consequences

- Operators use the admin refund ledger instead of a gateway dashboard, so the
  local record and provider action cannot silently diverge.
- Pending refunds reduce the available balance immediately, preventing a second
  operator from racing an in-flight request.
- A lost provider response requires reconciliation or a verified webhook; the
  same request key does not issue another provider refund.
- Partial goodwill refunds preserve the purchased service. A full economic
  reversal removes paid access without waiting for period end.

## Alternatives considered

- **Revoke on every refund.** Rejected because a partial adjustment does not
  undo the subscription purchase.
- **Revoke at period end after a full refund.** Rejected because it grants paid
  service after all consideration was returned.
- **Rely only on provider idempotency.** Rejected because provider guarantees
  differ and Paymob does not document one for this endpoint.
- **Enforce only in the manager.** Rejected because concurrent requests can both
  pass an application pre-check.

## Validation

Unit tests cover partial arithmetic, over-refund rejection, replay mismatch,
provider routing, pending provider results, duplicate webhook completion, and
partial/full entitlement effects. The migration test verifies the locking
aggregate trigger.

## Rollback

Disable the admin refund route and stop new reservations. Do not delete existing
refund or compensating transaction rows. Any schema rollback must first prove
that all provider refunds remain represented in the immutable ledger.
