# Runbook — Workspace Automation On-Call

**Audience:** SRE / on-call. Workspace automation owns the AI-action approval queue, webhook receiver, auto-suggest scheduler, suggestion factory, and the write-action adapters across all providers.

## Quick health

```bash
# 1. Service up?
./scripts/claw.sh ps workspace-service
curl -fsS http://localhost:4014/health

# 2. Critical errors in the last 1h?
./scripts/claw.sh logs workspace-service --since 1h \
  | grep -cE "UnhandledPromiseRejection|FATAL|Cannot read properties of undefined"
# Expect: 0
```

## Common incidents

### A. "Approval queue stuck at PENDING_APPROVAL"

**Symptom:** rows in `AiActionApprovalQueue` with `status=PENDING_APPROVAL` and `expiresAt < now()`.

**Diagnose:**
```sql
SELECT COUNT(*), MIN("createdAt"), MAX("expiresAt") FROM "AiActionApprovalQueue"
WHERE status='PENDING_APPROVAL' AND "expiresAt" < now();
```

**Cause:** the `AiActionQueueExpirySweeperManager` cron is wedged or its advisory lock leaked.

**Fix:**
1. Check cron config in `.env`: `AI_ACTION_QUEUE_EXPIRY_SWEEP_CRON` (default `0 */15 * * * *`).
2. Trigger manually via SQL: `UPDATE "AiActionApprovalQueue" SET status='EXPIRED' WHERE status='PENDING_APPROVAL' AND "expiresAt" < now();`
3. Restart workspace-service. The cron rebinds and resumes.

### B. "Webhook receiver returns 200 REJECTED for every delivery"

**Symptom:** `WebhookDelivery` rows all show `status='REJECTED'` with reason code `SIGNATURE_INVALID`.

**Diagnose:**
```sql
SELECT provider, "rejectionReason", COUNT(*) FROM "WebhookDelivery"
WHERE "createdAt" > now() - interval '1 hour' AND status='REJECTED'
GROUP BY provider, "rejectionReason";
```

**Cause:** wrong webhook secret in `.env`, or a `WORKSPACE_AUTOMATION_ENABLED=false` flag is false-blocking, or the provider rotated their secret.

**Fix:**
1. Compare provider config (e.g., GitHub repo settings → webhooks → secret) against `.env` value.
2. If mismatch, update `.env` and restart workspace-service. Existing deliveries cannot be retroactively accepted; the next delivery will be ACCEPTED.

### C. "Auto-suggest scheduler stopped firing"

**Symptom:** `SELECT MAX("startedAt") FROM "AutoSuggestRun" WHERE "jobType"='JIRA_SUMMARY_DAILY';` is far older than the cron interval.

**Diagnose:**
```bash
./scripts/claw.sh logs workspace-service --since 6h \
  | grep -E "AutoSuggestSchedulerManager|advisory.*lock"
```

**Cause:** advisory lock leaked (replica crash mid-tick), `AUTO_SUGGEST_ENABLED=false`, or cron expression invalid.

**Fix:**
1. Verify `.env`: `AUTO_SUGGEST_ENABLED=true`, `AUTO_SUGGEST_JIRA_CRON` (default `0 */4 * * *`).
2. Manually trigger:
   ```bash
   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:4000/api/v1/workspace/auto-suggest/jobs/JIRA_SUMMARY_DAILY/trigger-now
   ```
3. If `triggerNow` returns 200 STARTED but no run row appears, restart workspace-service to reset advisory locks.

### D. "Write actions all return success=false"

**Symptom:** `AiActionApprovalQueue` rows transitioning APPROVED → EXECUTED with `executionError` populated.

**Diagnose:**
```sql
SELECT provider, "executionError", COUNT(*) FROM "AiActionApprovalQueue"
WHERE status='FAILED' AND "executedAt" > now() - interval '1 hour'
GROUP BY provider, "executionError";
```

**Common causes:**
- Provider OAuth token expired → token-refresh manager failed silently. Check `WorkspaceConnector.lastTokenRefreshError`.
- Provider rate-limited (429). Wait the retry-after window or increase backoff.
- Microsoft Graph file >4 MiB → `FILE_TOO_LARGE_FOR_SIMPLE_UPLOAD`. Expected v1 behaviour; upload-session is tracked tech debt.

**Fix:** depends on cause; OAuth issue → re-auth in UI; rate limit → wait; size cap → reject suggestion.

### E. "Memory learning loop publishes nothing"

**Symptom:** `memory.preference.upserted` events absent in audit despite many `ai_action.edited` events.

**Diagnose:**
```bash
docker compose logs workspace-service --since 1h | grep "PreferenceClassifierManager\|AiActionDecisionConsumer"
```

**Likely cause:** the heuristic classifier is intentionally conservative — small edits and short rejection reasons emit nothing. This is expected. Verify with a synthetic large edit:
```bash
docker exec claw-pg-workspace psql -U claw -d claw_workspace -c "
SELECT \"queueId\", \"editDiff\" FROM \"AiActionApprovalQueue\"
WHERE \"editDiff\" IS NOT NULL ORDER BY \"updatedAt\" DESC LIMIT 5;"
```
If diffs exist but no events fired, check memory-service health (`http://localhost:4005/health`).

## Metrics to watch

| Metric | Healthy range | Where |
|---|---|---|
| Approval rate | ≥ 70% | `SELECT (COUNT(*) FILTER (WHERE status IN ('APPROVED','EXECUTED'))::float / COUNT(*)) FROM "AiActionApprovalQueue" WHERE "createdAt" > now() - interval '7 days';` |
| Median time-to-approval | < 2h | `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("approvedAt" - "createdAt"))/3600) FROM "AiActionApprovalQueue" WHERE "approvedAt" IS NOT NULL;` |
| Webhook delivery rate | varies; alert on 0 over 4h | `SELECT COUNT(*) FROM "WebhookDelivery" WHERE "createdAt" > now() - interval '4 hours';` |
| Auto-suggest run failure rate | < 5% | `SELECT COUNT(*) FILTER (WHERE status='FAILED') / COUNT(*)::float FROM "AutoSuggestRun" WHERE "startedAt" > now() - interval '24 hours';` |

## Emergency disable

Single env flag pause for the entire automation pipeline:

```bash
# In .env
AUTO_SUGGEST_ENABLED=false
# Restart workspace-service
./scripts/claw.sh restart workspace-service
```

This stops the scheduler from creating new candidates. Existing pending suggestions sit in the queue (users can still approve manually). Webhook receiver continues to record deliveries but the suggestion factory still produces suggestions for active trigger rules — to fully halt, also disable trigger rules:

```sql
UPDATE "SuggestionTriggerRule" SET "isActive"=false WHERE "isSystemDefault"=true;
```

## Related runbooks

- `runbook-service-crash.md` — generic service restart playbook
- `runbook-high-latency.md` — adjacent perf issues
- `troubleshooting.md` — broader symptom index

## Related ADRs

ADR-018 webhook receiver, ADR-019 scheduler, ADR-020 suggestion factory, ADR-021 write actions, ADR-026 user-pref intersection, ADR-027 memory learning loop.
