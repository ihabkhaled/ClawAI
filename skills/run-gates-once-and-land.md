# Skill: Run the Gates Once and Land the Change

The runbook for [rule 34](../rules/34-gate-economy-and-machine-resources.md).
The gates here are expensive by construction — 13 Prisma clients, 20 workspaces,
thousands of tests. This is how to prove a change green **once**, land it, and
leave the developer's machine no busier than you found it.

## When to use

- You are working on anything larger than a one-file fix.
- You are about to commit and are tempted to "just re-run the tests to be sure."
- The machine has become sluggish while you were working.

## The shape of it

**Implement the whole coherent batch first. Do not gate in between.** Running
lint/test/build after each edit is the single most expensive habit available,
and on a loaded machine it also causes timeout flakiness that reads as real
failure and provokes another run.

## Step 1 — scope the gate to what you touched

```bash
npm run affected:list
```

Run lint on changed files and run the matching spec for each changed TypeScript
implementation or spec. Do not run a whole workspace test suite for a scoped
change. All-workspace runs are prohibitively expensive and false-fail on
unchanged siblings.

```bash
npx eslint <changed files>
npx vitest run <matching spec>
# Typecheck/build only the affected workspace when its validation lane requires it.
npm run typecheck
```

One workspace at a time. Concurrency does not shorten wall-clock time here; it
thrashes the disk and the CPU and makes everything slower.

## Step 2 — record the proof so nothing repeats it

```bash
git add <explicit paths>        # never -A, never .
npm run gates:receipt           # hashes the staged tree into .ai/local/gate-receipt.json
```

The receipt names the exact tree it proved. `pre-push` sees it and skips the
affected test/build pass for that tree only — the cheap integrity checks still
run. Change a single byte and the receipt is void and the full pass returns.

**This is the sanctioned way to avoid duplicate work.** Do not reach for
`--no-verify`: it is prohibited by
[ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md), it is detected by
`knowledge:verify`, and it would also skip the cheap checks that catch stale
manifests — which is exactly the failure it feels like it is avoiding.

## Step 3 — land it

```bash
git commit -m "<conventional commit>"
git push origin <branch>
```

One commit, one push. `git log --oneline origin/<branch>..HEAD` must be empty
before the next commit starts.

Check the **real exit code** of a backgrounded push, not a notification summary:

```bash
git push origin <branch> > /tmp/push.log 2>&1; echo "REAL_EXIT=$?" >> /tmp/push.log
grep -aE "REAL_EXIT=|pre-push OK|-> " /tmp/push.log
```

A long `pre-push` can also outlive the SSH connection git opened before running
it, which kills the push with a silent exit 141 _after_ printing `pre-push OK`.
If that happens, keep the connection warm:

```bash
GIT_SSH_COMMAND="ssh -o ServerAliveInterval=20 -o ServerAliveCountMax=600" git push origin <branch>
```

## Step 4 — give the machine back

```bash
# Check what you are costing before and after anything heavy.
docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' | head
```

Stop the scratch containers, volumes, watchers and dev servers **you** started.
Never stop or remove anything belonging to the developer's running stack — if
you did not create it, leave it alone.

Prefer `docker restart <container>` for a code-only change. Only a dependency or
Prisma-schema change earns the full stop → rm → rmi → build cycle.

## Definition of done

- [ ] Gates ran once, at the end, scoped to the touched workspaces.
- [ ] No gate ran twice over an unchanged tree.
- [ ] No hook was bypassed.
- [ ] The push's real exit code was checked, and nothing is left unpushed.
- [ ] Every scratch container, volume and background job you started is gone.

## Landing a big batch cheaply (added 2026-10-03)

1. `git pull --rebase --autostash`, then rebuild shared `dist` and run `prisma generate`
   in any service that fails typecheck ([rules/48](../rules/48-lint-and-test-only-what-changed.md) item 8).
2. `git diff --name-only HEAD` -> `npx eslint <changed files>` and `npx vitest run <matching spec>`;
   `npm run typecheck` only in touched workspaces. No root-level gates.
3. `npm run knowledge:build`, then stage the generated `.ai/**` and workspace `AGENTS.md`.
4. Commit in 2-4 coherent batches with explicit paths, subjects under 100 characters.
5. Push once. Read `gh run list --branch main`; on red, `gh run view <id> --log-failed`
   and fix the cause (a stale seed value in a spec, a CI job missing the shared build).
6. A coding-agent change ships through its own repo's `npm run ship` (its CI bumps the
   version); the ClawAI repo then takes one pointer commit for `apps/claw-coding-agent`.
