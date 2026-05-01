# ADR-033 — Recipe Runner Orchestration

**Status**: Accepted (v1 implementation landed 2026-05-01)
**Stream**: 13 (Recipe Engine)
**Depends on**: ADR-029 (Capability Framework), ADR-032 (Recipe Engine Architecture)

## Context

Stream 13 ships a recipe engine that lets users compose multi-step automations from capability primitives. The "library half" (CRUD over `Recipe` rows + DSL validation via Zod) is straightforward — it's the **orchestration half** that needs careful design:

- A recipe is a DAG of capability invocations. Each invocation goes through the full approval / risk / audit pipeline, which is asynchronous (steps may sit in PENDING_APPROVAL for hours waiting on a human).
- Step N's input may reference Step N-1's output (`$steps.s1.output.contentBase64`). The runner must defer placeholder resolution until the predecessor terminates.
- Failure propagation: if Step 2 fails, Step 3 should NOT auto-execute. The run must mark itself terminal.
- Recipe runs are durable: a runner crash mid-run must resume cleanly when the service restarts.

## Decision

**Event-driven runner that orchestrates by reacting to capability lifecycle events**, not by polling.

### Architecture

```
POST /agent/recipes/:id/runs
  ↓
RecipeRunnerManager.start
  ↓
  1. validateParams against DSL
  2. createRun (status=RUNNING, params persisted)
  3. createSteps (one row per DSL step, status=PENDING)
  4. proposeNextStep — proposes step 1 via CapabilityApprovalManager
  5. step row updated: invocationId + status=RUNNING
                                          
                                          AGENT_CAPABILITY_EXECUTED ─┐
                                          AGENT_CAPABILITY_FAILED   ─┼─► RabbitMQ
                                          AGENT_CAPABILITY_DENIED   ─┘
                                                                      ↓
                                          RecipeEventConsumerManager
                                                                      ↓
                                          RecipeRunnerManager.onStepInvocationTerminated
                                                                      ↓
                                          1. Mark step SUCCEEDED / FAILED
                                          2. If failed → fail run (abort-on-fail)
                                          3. If succeeded → advance(runId)
                                          4. advance: find next PENDING step
                                          5. Resolve placeholders against accumulated outputs
                                          6. Propose it
                                          7. (recurse via the same event flow)
```

### Why event-driven, not polling

- **Latency**: a polling runner adds 1-N seconds per step transition. With ≥100 step recipes, that's minutes of wasted wall-clock.
- **Idle cost**: a polling runner runs queries every N seconds even when nothing happens. Event-driven is silent at idle.
- **Crash safety**: the events are durable (RabbitMQ + DLQ + retries). On restart, the runner picks up by listening to the same exchange.

### Why abort-on-fail (v1)

The DSL declares `on_error: abort | continue | retry | fallback`. v1 implements `abort` only because:

- It's the safe default. No user surprise: if a step fails, the recipe stops.
- `continue` requires re-evaluating which steps are still reachable in the DAG — that's a non-trivial fixed-point computation.
- `retry` requires a backoff scheduler with persistent state.
- `fallback` requires a second propose path with the same event-handling infrastructure.

Streams 13 v2 will add the other three.

### Why sequential (v1)

The DSL declares `parallel_group: <name>` for steps that can fire concurrently. v1 ignores `parallel_group` because:

- Sequential gives deterministic placeholder resolution (every prior step is terminal before the next reads its output).
- Parallel requires a "ready set" computation: at any tick, which PENDING steps have all their predecessors terminal AND all referenced step outputs available. That's a separate work item.

## Schema

Three new models in `apps/claw-agent-service/prisma/schema.prisma`:

- **Recipe** — user-owned, named, versioned (version int bumps on DSL change), `dsl: Json` payload validated against `recipeDslSchema` at write time.
- **RecipeRun** — one row per `start()` call. Carries `userId`, `deviceId`, `params: Json`, `status: RecipeRunStatus`, `startedAt`, `completedAt`, `errorMessage`.
- **RecipeRunStep** — one row per DSL step per run. Indexed by `(recipeRunId, stepIndex)`. Carries `stepId`, `invocationId` (back-link to `CapabilityInvocation`), `status: RecipeRunStepStatus`, `output: Json`, `errorMessage`.

`CapabilityInvocation.recipeRunId` (added in stream 10's migration) is the forward-link from invocation → run, so the event consumer can find the right step in O(1).

### Why a separate RecipeRunStep table

Could have stored steps inline as `RecipeRun.steps: Json[]`. Rejected because:

- We need to query "all PENDING steps for run X" without parsing JSON.
- We need to update individual step rows transactionally without rewriting the whole `steps` array.
- Indexed access (`recipeRunId, stepIndex`) is cheaper at scale.

## Consequences

### Good

- A 50-step recipe progresses end-to-end with zero polling. The runner is silent when nothing is happening.
- Each step's lifecycle is fully audited via the existing capability event stream — no new audit work.
- The frontend recipe-run-detail page can show real-time progress by polling just the run row + steps (separate from capability events).
- Crash safety: RabbitMQ DLQ + retry policy applies to recipe events for free.

### Bad / accepted trade-offs

- v1 is sequential — power users with parallelisable DAGs will wait longer than necessary until v2.
- v1 only honours `on_error: abort` — the other policies are silently ignored at runtime (DSL still validates them at create time so we don't have to migrate later).
- The runner is a singleton per `claw-agent-service` instance. Horizontal scaling requires sticky-routing capability events to the instance owning the run — punted to ADR-034 if/when needed.

### What v2 must add

1. Parallel group execution (compute ready set, propose all ready steps simultaneously).
2. `on_error: continue / retry / fallback`.
3. `when` expression evaluation (skip a step entirely if its `when` evaluates falsy).
4. Per-run wall-clock timeout (RECIPE_RUN_HARD_WALL_CLOCK_MS_DEFAULT — 10 min).
5. Run cancellation endpoint (POST /agent/recipe-runs/:id/cancel).

## Verification

Live QA: `qa/test-stream-13-runner-live.sh` — 10/10 cases passing on the dev stack:

- Run creation seeds steps + proposes step 1
- Step 1 records its invocationId
- CapabilityInvocation back-links to recipeRunId
- DTO rejects missing required parameters
- Auth: unauthenticated reads → 401
- Docker logs: zero `UnhandledPromiseRejection` / `FATAL`

Unit tests: `apps/claw-agent-service/src/modules/recipes/managers/__tests__/recipe-runner.manager.spec.ts` — 5 cases covering start happy path, EXECUTED → advance with $steps placeholder substitution, FAILED → run failure, orphan invocation passthrough, missing recipe → 404.
