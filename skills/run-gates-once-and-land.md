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

Run the gates **only** in those folders. All-workspace runs are prohibitively
expensive and false-fail on unchanged siblings.

```bash
cd apps/<touched-workspace>
npx tsgo --noEmit && npm run lint && npm test && npm run build
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
