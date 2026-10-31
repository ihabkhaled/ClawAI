# Akinator Gate Economy - gate once, gate late, gate narrow

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: before running any lint, typecheck, test or build, and before any commit or push during multi-step work. Enforces batch-first gate-last discipline - gates run once at the end, scoped to what was touched - and prevents paying twice for the same proof.

Running the full lint, typecheck, test and build loop after every change is the
most expensive habit in software. On a loaded machine it is worse than expensive:
it produces timeout flakiness that reads as real failure, and then time is spent
debugging the machine instead of the code.

Three rules: **batch first, gate last. Never pay for the same proof twice.
Respect the machine.**

## When to use

- Before running any gate command - lint, typecheck, test suite, build.
- Before any commit or push during multi-step work.
- When planning the verification step of a batch (`akinator-plan`).

## When NOT to use

- A single trivial change with an obvious, cheap check. Run it and move on.
- When the user explicitly asks for a gate right now. Their instruction wins.
- When you are debugging a specific failure - then the tight loop **is** the
  work, but scope it to the failing test, not the suite.

## Procedure

### 1. Batch first, gate last

- **No commits, no pushes mid-flagship.** Build the whole coherent batch - or,
  for large work, the whole coherent sub-batch - before landing anything.
- **Never run gates per edit or per commit.** The full loop after each change
  proves the same thing repeatedly while the tree keeps changing underneath it.
- **Gate once, at the end.**

### 2. Scope the gate to what was touched

Never all-workspace when two workspaces changed. Determine the touched set from
the actual diff, and run:

- The typecheck for those workspaces only.
- The tests covering those paths - the suite for that package, not the monorepo.
- The build only for what must be built.
- The linter on changed files where the tooling supports it.

An all-workspace gate on a two-file change is minutes of machine time for zero
additional information.

### 3. Fix red, re-run only what was red

When a gate fails, fix it and re-run **only the failed check, only in the failed
scope**. Re-running the whole gate to confirm one fix re-proves everything that
was already green.

### 4. Never pay for the same proof twice - the receipt

Once the scoped gates have proven the exact tree green, nothing may re-run them
over that same tree.

Record a **tree-bound gate receipt**:

- The hash of the proven tree (`git stash create` on a dirty tree, or the
  commit / `git write-tree` hash on a clean one).
- Which gates ran, with which scope, and their exit codes.
- The absolute timestamp.

Where the target repo has commit or push hooks, they honor the receipt **for that
exact tree only** and skip the duplicate pass. A single changed byte voids the
receipt - there is no partial credit.

Where the repo's policy permits skipping hooks outright, a just-proven-green tree
may be landed without re-triggering the hook stack - **only** in that exact
circumstance, never to hide a failure. Some repos detect and reject bypass
recommendations as a policy violation; detect that policy first and use the
receipt mechanism instead. **The receipt is always the preferred, auditable
form.**

Never skip hooks to get past a red gate. That is not economy, it is fraud.

### 5. Judge by exit codes

Background long-running jobs and judge them by **real exit codes**, never by a
notification summary or by the last lines of output. A summary that says
"completed" over a non-zero exit is how a red build gets reported as green.

### 6. Respect the machine

- One long job at a time. Never race parallel test suites, or a build against a
  suite, on a developer machine.
- Check pressure before starting anything heavy - see `akinator-resource-guard`.
- Prefer `restart` over rebuild for code-only changes; reserve the full
  stop-rm-rmi-build cycle for dependency and schema changes, with independent
  services in parallel and dependents after (`akinator-ops-map`).

### 7. Never weaken a check to make it pass

Deleting an assertion, skipping a test, loosening a type or suppressing a lint
rule to get green is prohibited. A red check is information. Fix the tree, or
change the check deliberately with an ADR recording why.

## Failure modes and pitfalls

- **The gate storm.** Full loop after every edit. Minutes each, dozens of times,
  and the flakiness it induces costs more than the time.
- **All-workspace by reflex** because the root script is easier to type than the
  scoped one.
- **Re-running everything after fixing one thing.**
- **Trusting a summary over an exit code.**
- **Committing mid-batch** "to be safe", which multiplies the hook runs by the
  number of commits.
- **Skipping hooks to avoid a red gate** rather than to avoid a duplicate proof.
- **Gating a tree you have since changed.** The receipt is bound to a tree hash
  for exactly this reason.

## Definition of done

- [ ] No gate ran mid-batch except a scoped one while debugging a specific
      failure.
- [ ] The gate ran once, at the end, scoped to the touched workspaces.
- [ ] Failures were fixed and only the failed scope was re-run.
- [ ] A tree-bound receipt records what was proven, over which tree hash, with
      exit codes.
- [ ] Nothing re-proved the same tree.
- [ ] No check was weakened, skipped or suppressed to obtain green.
- [ ] Results were judged by exit codes.
