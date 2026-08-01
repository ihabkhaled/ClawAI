# Runbook: Stuck Billing Reconciliation

Use this when a reconciliation run remains `RUNNING`, repeatedly returns no
result, accumulates quarantined findings, or leaves `unprocessed_count` above
zero.

## Safety boundary

Reconciliation may repair a verified provider/local mismatch, but an operator
must never guess a payment outcome or edit financial rows directly. Do not
delete the Redis lock while payment-service replicas are running. Do not paste
provider payloads, payer details, or lock owner tokens into logs or tickets.

## Diagnose

1. Check payment-service health, Redis, PostgreSQL, RabbitMQ, and gateway
   reachability.
2. Inspect recent durable runs:

   ```sql
   SELECT id, status, scanned_count, repaired_count, quarantined_count,
          unprocessed_count, error_code, started_at, completed_at
   FROM reconciliation_runs
   ORDER BY started_at DESC
   LIMIT 20;
   ```

3. Inspect a run's classified findings:

   ```sql
   SELECT entity_type, entity_id, gateway, classification, local_status,
          provider_status, resolution, repaired_at, created_at
   FROM reconciliation_divergences
   WHERE run_id = $1
   ORDER BY created_at;
   ```

4. Check lock existence and TTL without reading its owner value:

   ```bash
   docker exec claw-redis redis-cli EXISTS locks:payment:billing-reconciliation
   docker exec claw-redis redis-cli TTL locks:payment:billing-reconciliation
   ```

   `-2` means no lock. A positive value means another replica owns the bounded
   run. `-1` is invalid because the lock must always expire.

## Recover

1. Fix the dependency named by the machine error/classification first.
2. If the lock has a positive TTL, let it expire or let its owner release it.
   A five-minute lease is intentional.
3. If TTL is `-1`, stop every payment-service replica, remove only
   `locks:payment:billing-reconciliation`, then restart. Never delete a live
   owner-token lock.
4. Trigger one immediate owner-safe run as an administrator:

   ```bash
   curl -fsS -X POST \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://claw.local/api/v1/admin/billing/reconciliation
   ```

   The endpoint requires `ADMIN_PLANS_MANAGE` and uses the same lock and manager
   as cron. A null response means contention or a sanitized failure; return to
   the service logs and durable run row.

5. Re-run until `unprocessed_count = 0`. Quarantined findings require human
   verification; they are not safe automatic repairs.

## Verify

- The newest run is `SUCCEEDED` with `completed_at` set.
- Every `REPAIRED` finding has `repaired_at`.
- No duplicate transaction, invoice, refund, or entitlement event was created.
- The outbox has no related exhausted event.
- The billing dashboard and the affected user's subscription agree with the
  verified gateway state.

### Retired-plan migrations

The owner-locked reconciliation run also polls at most 50 pending retirement
migrations from auth-service through the service-authenticated internal API.
Payment verifies the subscription id, user id, and source plan before freezing
the replacement plan's active price for the subscription's current interval.
The replacement becomes effective at `current_period_end`; no charge or credit
is created during the paid period.

A pre-existing scheduled plan choice is a user override and is never replaced:
the migration is reported `SUPERSEDED`. A compatible optimistic update is
reported `BILLING_SCHEDULED`; a validated scheduling failure is reported with
the sanitized `PLAN_RETIREMENT_SCHEDULE_FAILED` code. Outcome writes in auth
are pending-only compare-and-set operations, so replay is idempotent.

## Escalate

Escalate when the provider result is ambiguous, a full refund/chargeback and
entitlement disagree, or a run repeatedly quarantines the same entity. Preserve
the immutable ledger and record the provider evidence outside application logs.
