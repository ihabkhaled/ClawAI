# Runbook: Failed Billing Sweep

Use this for grace-period expiry, scheduled downgrade, outbox drain, or invoice
delivery work that is not progressing. These paths are bounded scheduled jobs;
replay is expected and must be safe.

## Identify the stalled job

| Symptom                               | Durable evidence                        | Lock                                   |
| ------------------------------------- | --------------------------------------- | -------------------------------------- |
| Grace expiry or downgrade not applied | `subscriptions` + `reconciliation_runs` | `locks:payment:billing-reconciliation` |
| Billing event not delivered           | `outbox_events`                         | `locks:payment:outbox-drain`           |
| Invoice email not delivered           | `invoice_deliveries`                    | `payment:jobs:invoice-delivery`        |

Check rows before acting:

```sql
SELECT id, status, grace_period_ends_at, scheduled_effective_at, updated_at
FROM subscriptions
WHERE (grace_period_ends_at IS NOT NULL AND grace_period_ends_at <= now())
   OR (scheduled_effective_at IS NOT NULL AND scheduled_effective_at <= now());

SELECT id, pattern, status, attempts, last_error_code, available_at
FROM outbox_events
WHERE status <> 'PUBLISHED'
ORDER BY available_at;

SELECT invoice_id, status, attempts, last_error_code, available_at
FROM invoice_deliveries
WHERE status <> 'DELIVERED'
ORDER BY available_at;
```

## Recover

1. Restore the failing dependency: Redis for ownership, PostgreSQL for durable
   progress, RabbitMQ for outbox, SMTP for invoice delivery, or the gateway for
   reconciliation.
2. Inspect the applicable lock with `EXISTS` and `TTL`. Wait for a positive TTL
   or let the owner release it. Never issue an unconditional `DEL` while any
   payment-service replica is live.
3. For lifecycle work, call the admin reconciliation endpoint from
   [runbook-billing-reconciliation.md](runbook-billing-reconciliation.md).
4. Outbox and invoice delivery poll automatically after their dependency
   recovers. Do not create replacement rows: their stable ids and retry state
   are the idempotency boundary.
5. If a row reached its terminal attempt ceiling, diagnose `last_error_code`,
   correct the dependency/configuration, and use an approved operator repair
   that resets only retry status/availability. Never edit event payloads,
   invoice facts, or financial amounts.

## Verify

- Due lifecycle rows moved exactly once through the normal entitlement path.
- A scheduled downgrade preserved the purchased price version until its
  effective instant, then emitted one downgrade event.
- Outbox rows are `PUBLISHED` and auth/audit consumers applied the event once.
- Invoice delivery is `DELIVERED`, or the owned PDF remains downloadable while
  an acknowledged mail outage continues.
- No job reports an unprocessed remainder without a subsequent successful run.

## Prevent recurrence

Keep batch sizes within the documented lock budget, alert on terminal retry
states and nonzero reconciliation remainders, and never lengthen a lock TTL to
hide an unbounded batch.
