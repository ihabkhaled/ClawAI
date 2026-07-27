# Billing Operations Runbook

Procedures for the situations that actually occur. Each one states what to check
_before_ acting, because most billing incidents are made worse by a fast fix.

---

## Refund

**Before refunding, confirm the charge is real.** A duplicate _record_ is not a
duplicate _charge_ — the outbox can retry a publish, and reconciliation can
create a second row for one capture.

```sql
SELECT id, gateway, provider_transaction_id, amount_minor, status, idempotency_key
FROM payment_transactions
WHERE user_id = $1
ORDER BY created_at DESC;
```

Two rows with the **same** `provider_transaction_id` are one charge. Two rows
with different ones are two charges.

1. Open **Admin → Refunds**, locate the captured transaction, and issue the
   refund there (never in the gateway dashboard alone — the local ledger would
   not learn about it).
2. A full refund revokes entitlement immediately; a partial refund does not.
3. Confirm a `billing.payment.refunded` row reached the outbox.
4. For a full refund, confirm auth applied it: paid entitlement must be gone.
   For a partial refund, confirm the existing entitlement remains active.

Refunds are **idempotent by key**. Re-running a refund does not return the money
twice. A `PENDING` refund already reserves its amount, so another operator
cannot exceed the captured total while the provider result is in flight.

---

## Chargeback

A chargeback is not a refund: the money is being taken back _against_ your will,
and the card network has already decided.

1. Subscription moves to `CHARGEBACK` — a **terminal** state. It never returns
   to `ACTIVE`; a returning customer starts a new subscription.
2. Entitlement is revoked immediately.
3. The disputed transaction is blocked from further use.
4. Gather evidence for the representment from the gateway dashboard.

**Do not delete the user's data.** A chargeback is a payment dispute, not a
deletion request, and destroying data mid-dispute removes your own evidence.

---

## Failed renewal

1. Subscription → `PAST_DUE`, grace period starts (`BILLING_GRACE_PERIOD_MS`).
2. The user keeps access during grace — this is deliberate. Cutting access on
   the first failed retry punishes an expired card, which is the most common
   and least culpable cause.
3. Retries follow the **gateway's** schedule, not ours. Retrying independently
   risks double-charging.
4. At grace expiry: downgrade to `free`.

---

## Entitlement drift

Symptom: a user has paid but has no access, or has access with no subscription.

```sql
-- payment side
SELECT id, user_id, plan_id, status, entitlement_valid_until FROM subscriptions
WHERE user_id = $1;

-- outbox: did the event ever publish?
SELECT pattern, status, attempts, last_error_code FROM outbox_events
WHERE aggregate_id = $1 ORDER BY created_at DESC;
```

```sql
-- auth side: did the event arrive, and was it applied?
SELECT event_id, event_type, status, attempts, last_error FROM entitlement_inbox_events
WHERE user_id = $1 ORDER BY created_at DESC;
```

| Finding                         | Meaning               | Action                                             |
| ------------------------------- | --------------------- | -------------------------------------------------- |
| Outbox `PENDING`, high attempts | Broker unreachable    | Fix the broker; the publisher drains automatically |
| Outbox `DEAD_LETTERED`          | Retries exhausted     | Investigate `last_error_code`, then requeue        |
| Inbox row missing               | Event never delivered | Requeue from the outbox                            |
| Inbox `FAILED`                  | Apply threw           | Read `last_error`, fix, replay                     |
| Inbox `SKIPPED`                 | Stale event           | Correct — newer state already applied              |

Replay is **always safe**. The inbox de-duplicates on `eventId` and skips stale
events by `effectiveAt`.

---

## Key rotation

`PAYMENT_TOKEN_ENCRYPTION_KEY` protects vaulted gateway tokens.

1. Generate a new 64-hex key.
2. Increment `PAYMENT_TOKEN_KEY_VERSION`.
3. Re-encrypt existing tokens, or revoke them at the gateway and require
   re-entry.
4. Verify no plaintext token appears in any log.

**Rotating orphans every vaulted token** — that is the point of a rotation, not
a side effect. Both installers preserve this key across runs precisely so it is
never rotated by accident.

It is deliberately **separate** from `ENCRYPTION_KEY` (connector API keys) so
that compromising one does not expose the other, and so the two can rotate on
different schedules.

---

## Price change

Never edit a price. Publish a new version:

```
POST /api/v1/admin/plans/:planId/prices   { billingInterval, amountMinor, currency }
```

This retires the current version and inserts the next in one transaction.
Existing subscriptions keep charging the version they purchased, and historical
invoices keep reconciling. Editing the old row instead would silently reprice
history and make every past invoice wrong.

---

## Reconciliation

Runs on `BILLING_RECONCILIATION_CRON`. It compares:

- pending checkout sessions against the gateway (a payment may have succeeded
  while our callback was lost — **always read the gateway, never assume
  failure**);
- payment transactions with no entitlement event;
- entitlements with no active subscription;
- Redis quota counters against the durable ledger.

Discrepancies are surfaced, never auto-corrected. An automatic correction to a
financial record is how one bug becomes a thousand wrong invoices.

---

## Enabling a gateway in production

A gateway is enabled only when its **whole** credential set is present. A
partial set does not half-enable it: a checkout that reaches PayPal without a
webhook id can be paid but never verified — worse than the gateway being off.

1. Complete merchant onboarding and approval.
2. Set the complete credential set.
3. `PAYPAL_ENV=live` (production **fails fast** on configured-but-sandbox).
4. Register the webhook and verify a real round-trip reaches the service.
5. Run one real low-value transaction end to end, then refund it.
6. Only then enable it for users.
