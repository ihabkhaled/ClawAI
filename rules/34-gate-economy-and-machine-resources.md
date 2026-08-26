# 34 — Gate Economy and Machine Resource Discipline

## Purpose

The gates in this repo are expensive by construction: 13 Prisma clients, 20
workspaces, thousands of tests. Running them carelessly does not just waste
time — it saturates the developer's machine, makes the editor unusable, and on a
constrained box it starves the very containers the change is supposed to be
tested against. Repeated full-suite runs also cause cascading flaky timeouts,
which then get misread as real failures and trigger another run.

The discipline is therefore: **gate once, gate late, gate narrow, and never pay
for the same proof twice.** A gate that has already proven a tree green is
evidence; re-running it over an unchanged tree is not diligence, it is waste.

Equally, an agent working on this repo is a guest on someone's machine. It must
leave the machine no busier than it found it: no orphaned containers, no
abandoned watchers, no background installs still burning cores after the task
that needed them is finished.

## Applies to

Every workspace, every agent, and every long-running command: `npm test`,
`npm run lint`, `npm run build`, `npx tsgo --noEmit`, Docker builds, Playwright
runs, and the git hooks in `.husky/`.

## Mandatory rules

1. **Gate at the end of a batch, not per file and not per commit.** While
   implementing a large feature or flagship, do not run the full lint/test/build
   loop after each edit. Implement the coherent batch, then gate it once.
2. **Gate only the workspaces you touched.** Use `npm run affected:list` and run
   `npx tsgo --noEmit && npm run lint && npm test && npm run build` inside those
   folders only. All-workspace runs are prohibitively expensive and false-fail on
   unchanged siblings.
3. **Never pay for the same proof twice.** If the scoped gates were just run
   green over exactly the tree being committed, the hooks must not re-run them.
   Record the proof with `npm run gates:receipt` and the hooks will honour it for
   that tree only (see _Correct pattern_).
4. **A receipt is bound to a tree, never to a session.** It records the hash of
   the staged content it proved. Any edit invalidates it and the hooks run in
   full again. There is no "trust me" mode.
5. **Do not bypass the hooks.** `--no-verify` is still prohibited by
   [ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md) and is detected
   by `knowledge:verify`. The receipt exists precisely so that skipping redundant
   work never requires disabling the safety net.
6. **One long job at a time.** Do not run test suites in several workspaces
   concurrently on a developer machine, and never in parallel with a Docker image
   build. Concurrency here does not shorten wall-clock time; it thrashes.
7. **Background anything slow, and announce it in one line.** A build, an install
   or an image rebuild runs in the background so the session stays responsive —
   but its completion must be checked by its **real exit code**, not by a summary.
8. **Clean up what you started.** Stop scratch containers, remove scratch
   volumes, and kill watchers and dev servers you spawned. Never stop or remove
   containers, volumes or processes you did not create — the developer's stack is
   not yours to tear down.
9. **Check pressure before starting something heavy.** If CPU or memory is
   already saturated, reduce your own load first — do not add a full test run on
   top of it and then blame flakiness.
10. **Prefer restart over rebuild.** A code-only change in a dev container takes
    `docker restart <container>`. Only a dependency or Prisma-schema change
    justifies the full stop → rm → rmi → build cycle. Rebuilding by reflex is the
    single most expensive habit in this repo.

## Prohibited patterns

- Running the full test suite after every edit, or "just to be sure" after a
  green run over the same tree.
- Running all-workspace gates when the change touches one service.
- Manually pre-running the gates and then letting the hooks run them again on the
  identical tree — pay once, with a receipt.
- `--no-verify` or any other hook bypass, in any form.
- Leaving scratch containers, volumes, watchers or installs running after the
  task that needed them finished.
- Stopping or removing containers, images or processes belonging to the
  developer's running stack.
- Launching a Docker build in parallel with a test suite on the same machine.
- Reading a background job's success from a notification summary instead of its
  real exit code.

## Correct pattern

```bash
# Implement the whole coherent batch first — no gates in between.

# Then gate ONCE, narrowly, in the folders the change actually touched.
npm run affected:list
cd apps/claw-chat-service
npx tsgo --noEmit && npm run lint && npm test && npm run build

# Record that proof against the staged tree, so the hooks do not repeat it.
git add <explicit paths>
npm run gates:receipt          # hashes the staged tree, writes .ai/local/gate-receipt.json

# Commit and push normally. The hooks see a receipt matching this exact tree and
# skip the work they would otherwise duplicate; any later edit voids it.
git commit -m "feat(chat): …"
git push origin <branch>
```

```bash
# Leave the machine as you found it.
docker ps --filter "label=claw.scratch=true" -q | xargs -r docker stop
```

## Enforcement

- **Hook script** — `.husky/pre-commit` and `.husky/pre-push` consult
  `.ai/local/gate-receipt.json` and re-run in full whenever the staged tree hash
  does not match, so the fast path is unreachable without genuine proof.
- **Knowledge check** — `npm run knowledge:verify` (`checkBypass`) fails if any
  canonical policy file recommends a hook bypass.
- **Unit test** — `tools/__tests__/gate-receipt.test.mjs` asserts that a receipt
  for a different tree is rejected.
- **Review checklist** — a reviewer rejects a change that added an
  all-workspace gate invocation to a hook or a script.

## Related skills

- [run-gates-once-and-land](../skills/run-gates-once-and-land.md) — the runbook for this rule.
- [inspect-affected-workspaces](../skills/inspect-affected-workspaces.md) — scoping the gate.
- [06-docker-toolkit](../skills/06-docker-toolkit.md) — restart vs rebuild, and parallelism.

## Related context

- [`23-git-commits-hooks-and-release-gates.md`](23-git-commits-hooks-and-release-gates.md) — what the hooks enforce.
- [`07-commit-rules.md`](07-commit-rules.md) — one commit, one push.
- [ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md) — why bypass is prohibited.

## Definition of done

- [ ] Gates ran once, at the end of the batch, scoped to the touched workspaces.
- [ ] No gate was run twice over an unchanged tree.
- [ ] No hook was bypassed.
- [ ] Every scratch container, volume, watcher and background job was cleaned up.
- [ ] Nothing belonging to the developer's stack was stopped or removed.
