# Runbook — Recipe Engine (Stream 13 v1 + v2)

The recipe engine lives in `apps/claw-agent-service/src/modules/recipes/`. Comprises:

- **Recipe library**: CRUD over user-owned recipes (stable across runs)
- **RecipeRun**: one row per execution attempt
- **RecipeRunStep**: one row per DSL step per run
- **Runner manager**: event-driven DAG executor — triggered by capability lifecycle events
- **Event consumer**: subscribes to `agent.capability.executed/failed/denied` and advances runs
- **Timeout sweeper**: every 1 minute, fails any RUNNING run older than `RECIPE_RUN_HARD_WALL_CLOCK_MS_DEFAULT` (10 min)

## v2 features (released 2026-05-01)

| Feature | Behavior |
|---|---|
| **Parallel groups** | Steps with the same `parallel_group` (or whose dependency graph allows) propose concurrently |
| **Implicit-sequential fallback** | If a step has no explicit `on_success` and isn't the first, the runner adds the previous step as a predecessor — keeps recipes simple by default |
| **`when` expression** | If `when` evaluates falsy, step is marked SKIPPED and its successors fire normally |
| **`on_error: 'abort'`** | Default — failed step fails the whole run |
| **`on_error: 'continue'`** | Failed step marks FAILED; siblings continue; run still reaches SUCCEEDED if siblings succeed |
| **`on_error: { retry: { maxAttempts, backoffMs } }`** | Re-proposes the step after backoffMs (clamped 100ms–60s) up to maxAttempts |
| **`on_error: { fallback: 'stepId' }`** | On failure, force the named step into PENDING regardless of its prior state |
| **Cancel** | POST `/agent/recipe-runs/:id/cancel` — marks run CANCELLED, all PENDING steps SKIPPED, RUNNING steps continue |
| **Hard timeout** | Sweeper auto-fails RUNNING runs older than 10 minutes — propagates SKIPPED to PENDING steps |

## Common operational issues

### "Run stuck in RUNNING but I see no PENDING/RUNNING steps"

Look for a step with metadata.retryScheduledFor in the future:

```bash
docker exec claw-pg-agent psql -U claw -d claw_agent -c \
  "SELECT id, \"stepId\", status, metadata FROM recipe_run_steps \
   WHERE \"recipeRunId\" = '<RUN_ID>' AND metadata IS NOT NULL;"
```

If retryScheduledFor is in the past, the runner should have retried — check agent-service logs for `setTimeout` failures (rare).

### "Parallel group steps all fired but only one had its placeholders resolved"

Placeholders use the `$steps.<id>.output.<path>` syntax which requires the predecessor to be SUCCEEDED. If two steps in the same parallel group reference each other's outputs, you have a cycle — the dependency graph won't fire either. Use sequential dependencies via `on_success` to break the cycle.

### "Cancel returned 200 but the run shows RUNNING in the DB"

There's a race: the cancel handler sets status=CANCELLED and SKIPS all PENDING steps. But RUNNING capability invocations continue (they're managed by `CapabilityApprovalManager`). Their final terminal events fire after cancel — the runner will see the cancel happened, ignore the events, and not re-advance.

### "Recipe runs over 10 minutes get TIMED_OUT — how do I extend?"

Edit `RECIPE_RUN_HARD_WALL_CLOCK_MS_DEFAULT` in `apps/claw-agent-service/src/common/constants/recipe.constants.ts`. There is no per-recipe override yet (deferred to v3 once we see a real need).

## Health checks

```bash
# Recipe-runs distribution today
docker exec claw-pg-agent psql -U claw -d claw_agent -tAc \
  "SELECT status, COUNT(*) FROM recipe_runs WHERE \"createdAt\" > NOW() - INTERVAL '1 day' GROUP BY status ORDER BY status;"

# Stuck retries (rare)
docker exec claw-pg-agent psql -U claw -d claw_agent -c \
  "SELECT \"recipeRunId\", \"stepId\", metadata->>'attempt' AS attempt, metadata->>'retryScheduledFor' AS retry_at \
   FROM recipe_run_steps \
   WHERE status = 'PENDING' AND metadata IS NOT NULL ORDER BY \"createdAt\" DESC LIMIT 20;"
```

## Related documents

- [ADR-032 — Recipe Engine Architecture](../13-adr/ADR-032-recipe-engine-architecture.md)
- [ADR-033 — Recipe Runner Orchestration](../13-adr/ADR-033-recipe-runner-orchestration.md)
- [Capability Framework Runbook](runbook-capability-framework.md)
