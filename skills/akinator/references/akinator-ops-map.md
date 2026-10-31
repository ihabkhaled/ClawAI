# Akinator Ops Map - operational consequence ships with the change

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: a change alters how the system is deployed, migrated, restarted, rebuilt, recovered or rolled back - schema changes, dependency changes, config changes, service topology changes. Writes the runbook with exact commands, explicit ordering, and what may run in parallel versus what must not.

The developer who makes a schema change knows that this one needs a container
rebuild rather than a restart. Nobody else does. Three weeks later someone
restarts the service, the stale image serves the old schema, and an hour is spent
debugging a problem that was solved and never written down.

**If a change alters how the system is operated, the procedure is written the
moment the change is made** - not when someone next needs it, because by then the
person who knew is gone or has forgotten.

## When to use

The change touches any of:

- Database schema, migrations, seed data.
- Dependencies - a new package, a version bump, a lockfile change.
- Build inputs - Dockerfile, base image, build args, compiled assets.
- Configuration or environment variables, especially ones read at boot.
- Service topology - a new service, a renamed one, a changed port or network.
- Anything with an ordering constraint between services.
- Anything whose failure needs a recovery or rollback path.

## When NOT to use

- Code-only changes to an already-running service where a restart (or hot reload)
  fully picks them up, and no existing runbook changes.
- Purely local developer preference with no shared consequence.

## Procedure

### 1. Classify the operational consequence

This classification is the single most valuable thing in the runbook, because it
is what people get wrong:

| Change type                                    | Correct action                                                                                 | Why                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Code only, interpreted or mounted              | **restart** the service                                                                        | The image is unchanged; a rebuild wastes minutes for nothing                 |
| Code only, compiled into the image             | **rebuild** that service                                                                       | The running image does not contain the change                                |
| Dependency change (lockfile, package manifest) | **rebuild** - full `stop`, `rm`, `rmi`, `build`                                                | Layer caches will otherwise serve the old dependency set                     |
| Schema or migration                            | **drop the container and rebuild the service**, then run the migration in the documented order | Stale containers hold connections and cached metadata against the old schema |
| Config or env read at boot                     | **restart** with the new value; **rebuild** if the value is baked at build time                | Depends on whether it is a build arg or a runtime env                        |
| Service added, renamed, or ports changed       | Rebuild the changed service, then dependents                                                   | Dependents resolve topology at connect time                                  |

Prefer `restart` over rebuild wherever it is genuinely sufficient. The full
`stop -> rm -> rmi -> build` cycle is expensive and is reserved for dependency
and schema changes.

### 2. Get the ordering and the parallelism right

State both, explicitly, for every multi-service procedure:

- **What is independent** - services with no dependency on each other rebuild
  **in parallel**. Saying so is what turns a twenty-minute procedure into a
  five-minute one.
- **What is dependent** - dependents go **after** the thing they depend on,
  sequentially. Name the dependency, not just the order, so the reader can adapt
  when the topology changes.
- **What must never be parallel** - migrations against the same database, anything
  contending for one exclusive resource, anything that would double-write.

A runbook that does not say which steps are parallel-safe will be executed
serially forever, and one that does not say which are not will eventually be
executed concurrently and corrupt something.

### 3. Write the runbook

Use the repo's runbook conventions, or Akinator's ops-runbook template. It
states:

- **Trigger** - "when X happens or changes". Written so someone can tell from the
  outside whether this runbook applies to their situation.
- **Preconditions** - what must be true before starting, and how to check each
  one. The step that fails is always the one whose precondition was assumed.
- **Procedure** - numbered, with the **exact commands**, not descriptions of
  commands. Parallel-versus-sequential called out per step.
- **Verification** - how to know it worked, per step and at the end. Observable
  facts, not "it should be up".
- **Rollback** - how to get back, and the point after which rollback is no longer
  possible. Name that point of no return explicitly; it is the most important
  sentence in a migration runbook.
- **Duration and blast radius** - roughly how long, and what is unavailable while
  it runs.

### 4. Skillify it

The runbook is the reference; a skill is what makes it fire when it is needed
(`akinator-skillify`). A runbook nobody remembers to look for is not much better
than no runbook.

### 5. Respect the machine

Operational procedures run on real machines, often a developer's. Before starting
anything heavy, check load. One long job at a time; never race a build against a
test suite. See `akinator-resource-guard`.

### 6. Index and sync

Reachable from the ops index and reflected in the routers.

## Failure modes and pitfalls

- **Rebuilding when a restart would do.** Minutes per occurrence, forever.
- **Restarting when a rebuild was needed.** Worse: the change appears not to have
  worked, and the next hour goes to debugging a phantom.
- **Not stating parallelism.** The default becomes serial, and nobody knows it
  was safe to parallelize.
- **Describing commands instead of writing them.** "Rebuild the service" is not
  a procedure. The command is.
- **No verification step.** The procedure completes and nobody knows whether it
  worked until a user reports it.
- **No point of no return.** Someone attempts a rollback after the migration
  dropped a column.
- **Writing the runbook later.** The ordering detail that matters is the one you
  currently hold in your head and will not tomorrow.

## Definition of done

- [ ] The operational consequence is classified: restart, rebuild, or full drop
      and rebuild - with the reason.
- [ ] Ordering is stated, with the dependency named, not just the sequence.
- [ ] Parallel-safe steps are marked parallel-safe; must-not-be-parallel steps
      are marked as such.
- [ ] The runbook has trigger, preconditions, exact commands, verification,
      rollback and point of no return.
- [ ] A skill exists so the runbook fires when the situation arises.
- [ ] The runbook is reachable from an index and reflected in the routers.
