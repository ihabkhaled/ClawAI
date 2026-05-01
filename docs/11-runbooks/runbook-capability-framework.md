# Runbook — Desktop Agent Capability Framework (Streams 10–13)

This runbook covers operational triage for the capability framework: terminal commands, filesystem ops, process management, and recipe runs. Targets on-call engineers who need to debug a stuck approval, a failed run, or a misbehaving CLI provider.

## Quick reference

| Component | Service / Container | Port | Logs |
|---|---|---|---|
| Capability backend | `claw-agent-service` | 4015 | `docker compose logs -f agent-service` |
| Capability events consumer (audit) | `claw-audit-service` | 4007 | `docker compose logs -f audit-service` |
| Capability events consumer (recipes) | `claw-agent-service` (in-process) | 4015 | same as above; filter `RecipeEventConsumerManager` |
| CLI runner | user's machine — `agent-cli` | n/a | `~/.claw-agent/logs/runtime.log` |
| Capability storage | `claw-pg-agent` Postgres | 5451 | `docker exec claw-pg-agent psql ...` |
| Event bus | `claw-rabbitmq` | 5672 | `docker exec claw-rabbitmq rabbitmqctl list_bindings` |

## "A capability invocation is stuck in PENDING_APPROVAL"

1. Check the invocation row:
   ```bash
   docker exec claw-pg-agent psql -U claw -d claw_agent -tAc \
     "SELECT id, status, \"matchedPolicyName\", \"riskScore\", \"riskLabel\", \"expiresAt\" \
      FROM capability_invocations WHERE id = '<INVOCATION_ID>';"
   ```
   - If `expiresAt` is in the past, `CapabilityExpirySweeperManager` should auto-transition it to EXPIRED on its next 5-minute tick. If the sweeper is wedged, restart agent-service.
2. Verify a policy actually matched. If `matchedPolicyName` is null, no policy applied — the row is genuinely waiting on a human approval.
3. Verify the user has access to approve via the UI: the approver must be the same `userId` as the invocation owner.
4. Manually approve via API to unblock:
   ```bash
   curl -X POST $API/api/v1/agent/capabilities/<id>/approve -H "authorization: Bearer $JWT"
   ```

## "AUTO_APPROVE policy is not firing for a known-safe operation"

Most likely cause: a higher-priority `ALLOW` policy targets the same input. Per ADR-029, AUTO_APPROVE wins over ALLOW even when ALLOW has higher priority — but only if both target-match. To confirm:

1. Read the policies for the class:
   ```bash
   docker exec claw-pg-agent psql -U claw -d claw_agent -c \
     "SELECT name, kind, priority, \"riskScore\", \"capabilityOperation\", \"targetMatcherJson\" \
      FROM access_policies \
      WHERE \"capabilityClass\" = 'FILESYSTEM' AND \"isActive\" = true \
      ORDER BY priority DESC;"
   ```
2. Manually check whether the input matches the AUTO_APPROVE policy's `targetMatcherJson` glob/regex. Common gotcha: `pathGlob: ["**/Documents/**"]` doesn't match `/home/user/Documents/notes.txt` if the glob is missing the leading slash; verify with the `picomatch` package on the host.
3. Check the AUTO_APPROVE's `autoApproveMaxRiskScore`. If the computed `riskScore` exceeds it, the framework deliberately downgrades to PENDING_APPROVAL. Look for the warn line `Auto-approve policy "<name>" matched but riskScore=NN > cap=NN; downgrading to PENDING_APPROVAL` in agent-service logs.

## "A capability event was published but audit-service didn't ingest it"

1. Verify the binding exists in RabbitMQ:
   ```bash
   docker exec claw-rabbitmq rabbitmqctl list_bindings | grep "claw.audit-service.agent.capability"
   ```
   Expect 12 non-DLQ bindings (proposed/policy_matched/auto_approved/approved/rejected/executing/executed/failed/cancelled/expired/rolled_back/denied) plus 12 `.dlq` bindings.
2. Check the audit-service container is healthy:
   ```bash
   ./scripts/claw.sh ps audit-service
   ```
3. Check the DLQ for stuck messages:
   ```bash
   docker exec claw-rabbitmq rabbitmqctl list_queues name messages | grep capability.*\.dlq
   ```
4. Restart audit-service if subscriptions have drifted:
   ```bash
   ./scripts/claw.sh stop audit-service && \
   ./scripts/claw.sh rm -f audit-service && \
   docker rmi claw-audit-service && \
   ./scripts/claw.sh up -d --build audit-service
   ```

## "A recipe run is stuck — step 1 succeeded but step 2 was never proposed"

The runner is event-driven (per ADR-033). If step 2 wasn't proposed:

1. Verify step 1's invocation actually published the EXECUTED event:
   ```bash
   docker exec claw-pg-agent psql -U claw -d claw_agent -tAc \
     "SELECT id, status, \"completedAt\", \"executionResult\" \
      FROM capability_invocations WHERE id = '<STEP1_INVOCATION_ID>';"
   ```
   If status is EXECUTED, the event should have fired. Check agent-service logs for the WARN/ERROR line from `RecipeEventConsumerManager.handleTerminal`.
2. Verify the consumer is subscribed:
   ```bash
   docker compose logs agent-service --tail=200 | grep "Subscribed to capability terminal events"
   ```
   This line is emitted on startup. If absent, the recipes module didn't init — restart agent-service.
3. Check whether step 2's placeholder resolution failed. The runner logs `proposeStep: failed to propose stepId=<id>: <message>` on resolution / propose errors.
4. If step 1 failed (status=FAILED, not EXECUTED), the runner correctly aborts the run per the v1 abort-on-fail policy. Confirm with:
   ```bash
   docker exec claw-pg-agent psql -U claw -d claw_agent -tAc \
     "SELECT status, \"errorMessage\" FROM recipe_runs WHERE id = '<RUN_ID>';"
   ```

## "The CLI capability-runner is not picking up pending invocations"

CLI-side (the user's machine):

1. Verify the runner is running: it polls `/agent/cli-capabilities/pending` every 3 seconds. Check `~/.claw-agent/logs/runtime.log`.
2. Verify the device token has the right scopes (`shell:exec` for TERMINAL, additional scopes for FS / PROCESS).
3. If the runner reports `provider not registered for class X`, the CLI install is from before that stream landed — re-install or wire the missing provider into `agent-cli/src/capability-providers/index.js`.

## "An irreversible operation needs to be undone — what are my options?"

Per the framework rules (CLAUDE.md hard rule #10), every IRREVERSIBLE capability records `metadata.noUndoReason`. The framework will refuse to roll back. Recovery options in order of preference:

1. **Restore from backup** — the user's own backup is the only recovery for a deleted file > FS_UNDO_CAPTURE_MAX_BYTES (5 MB) or for any IRREVERSIBLE op (process kill, signal sent, network packet sent).
2. **Replay-and-recreate** — for some categories (e.g., a bad WRITE), the user can re-run a recipe that recreates the desired end-state. The audit log captures enough provenance to know what the state was supposed to be.
3. **Accept the loss + harden** — add a DENY policy targeting the operation pattern that caused it, so the same accident can't happen again.

## Health checks

```bash
# All capability-related queues, sizes, and consumers
docker exec claw-rabbitmq rabbitmqctl list_queues name messages consumers \
  | grep -iE "capability|recipe"

# Today's invocation distribution
docker exec claw-pg-agent psql -U claw -d claw_agent -tAc \
  "SELECT status, COUNT(*) FROM capability_invocations \
   WHERE \"createdAt\" > NOW() - INTERVAL '1 day' GROUP BY status ORDER BY status;"

# Today's runs with their final status
docker exec claw-pg-agent psql -U claw -d claw_agent -c \
  "SELECT status, COUNT(*) FROM recipe_runs \
   WHERE \"createdAt\" > NOW() - INTERVAL '1 day' GROUP BY status ORDER BY status;"
```

## Related documents

- [ADR-029 — Capability framework + policy generalisation](../13-adr/ADR-029-capability-framework-and-policy-generalisation.md)
- [ADR-030 — Filesystem capability](../13-adr/ADR-030-filesystem-capability.md)
- [ADR-031 — Process capability](../13-adr/ADR-031-process-capability.md)
- [ADR-032 — Recipe engine architecture](../13-adr/ADR-032-recipe-engine-architecture.md)
- [ADR-033 — Recipe runner orchestration](../13-adr/ADR-033-recipe-runner-orchestration.md)
- [Implementation progress](../15-ai-context/desktop-agent-flagship-implementation-progress.md)
- [QA — Stream 10 capability framework](../../qa/test-stream-10-capability-framework.sh)
- [QA — Stream 13 recipe CRUD](../../qa/test-stream-13-recipes-crud.sh)
- [QA — Stream 13 runner live](../../qa/test-stream-13-runner-live.sh)
