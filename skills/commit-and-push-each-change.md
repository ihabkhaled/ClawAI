---
name: commit-and-push-each-change
summary: Land each change as one gated commit that is pushed before the next commit is started, so CI verifies every commit individually and no local stack accumulates.
task_keywords: [commit, push, git, land, ship, multi-commit, commit sequence, stack]
applies_to: [all-workspaces, monorepo-root]
required_rules: [07-commit-rules, 23-git-commits-hooks-and-release-gates]
required_context: [workspace-map, stack-and-toolchain]
affected_workspaces: [varies-with-change]
required_tests: [scoped-to-touched-workspaces]
required_docs: [none]
validation_lane: npm run affected:list
---

## When to use

Every time you commit. Especially when a task produces more than one commit —
that is exactly when the temptation to batch pushes appears, and exactly when
batching costs the most.

## When NOT to use

When the user has explicitly said not to push: a spike, an experiment, or a
"let me review it locally first". That instruction must come from the user. It is
never the default and never inferred from the shape of the work.

## Read first

- [`../rules/07-commit-rules.md`](../rules/07-commit-rules.md) — scoped gates and
  the push-per-commit rule
- [`inspect-affected-workspaces.md`](inspect-affected-workspaces.md) — which
  workspaces your change actually touches

## The rule

**One commit, one push.** After every `git commit` that passes its hook, the next
git command is `git push`. Do not stage the next change, and do not start the next
task, until the commit you just made is on the remote.

## Steps

1. Determine the touched workspaces (`npm run affected:list`).
2. Do **not** run typecheck, lint, test and build by hand. The hooks run the
   gates for the change type, scoped to what changed — see the
   [gate matrix in rules/23](../rules/23-git-commits-hooks-and-release-gates.md#gate-matrix-by-change-type).
3. Stage **explicit paths**. Never `git add -A` and never `git add .`: both sweep
   up unrelated work-in-progress from parallel tasks into a commit that claims to
   be about something else.
4. Commit with a conventional-commit subject and a `Docs:` trailer
   (`Docs: updated <what>` or `Docs: none — <reason>`, rules/63). Let the
   pre-commit and commit-msg hooks run; never `--no-verify`.
5. **Push immediately.**
6. Only now begin the next commit.

```bash
# commit 1
npm run affected:list
git add apps/claw-<service>/src/... apps/claw-<service>/src/.../__tests__/...
git commit -m "feat(<scope>): <subject>" -m "Docs: updated <what>"   # pre-commit + commit-msg gate it
git push origin <branch>          # ← before anything else; pre-push gates it

# commit 2 — only now
git add <explicit paths>
git commit -m "test(<scope>): <subject>" -m "Docs: none — <why no doc describes it>"
git push origin <branch>
```

## Why

- **CI only sees what is pushed.** A stack of five local commits is five
  unverified commits. The first one may already have broken the build, and you
  find out only when the whole stack lands — with a bisect surface five commits
  wide instead of one.
- **Unpushed work is unbacked-up work.** A local-only commit exists on exactly one
  disk.
- **A red push is cheap to fix in isolation.** Pushing commit N before writing
  N+1 means a failure is attributable to one change, and the fix is a follow-up
  commit rather than an interactive rebase through work already built on top of it.
- **Nobody else can see a local commit.** Long-lived local stacks are how two
  people silently diverge on the same files.

## Failure modes

- Committing four times and pushing once at the end. If CI is red, you now own
  four suspects and a rebase.
- A rejected push (`non-fast-forward`) followed by more local commits. Integrate
  and push first; never keep committing onto a branch you could not push.
- Treating "the task isn't finished" as a reason to hold commits back. A commit is
  a checkpoint, not a release — an incomplete-but-green commit is exactly what
  should be on the remote.
- Using `git add -A` to save time, and shipping an unrelated half-finished file
  with it.

## Green-before-push checklist (2026-10-14: nine red CI runs in one day)

Run it before EVERY commit and again before EVERY push. Each line was a real failure. It does not
contradict step 2 above: it is ONE late pass over the touched workspaces only (never all 17), covering
what the hooks do not run (full suites, QA record, message format), not a second copy of the hook gates.

1. **QA record in the push range.** A `feat`/`fix`/`perf` push needs a `docs/qa-evidence/<date>-<slug>.md`
   (`npm run qa:evidence:new`, then `npm run qa:evidence:check -- <file>`) added or edited in the same
   range, even for a one-line fix. Missing record = red "QA evidence" = red "CI success" = the Release
   is skipped and nothing deploys.
2. **Commit message.** Subject at most 100 characters (count it), lowercase after `type(scope):`,
   one `Docs:` line per file group, each at most 100 characters, as `Docs: updated <what>` or
   `Docs: none — <reason>` (shared-packages and contract changes need a doc line or a reason).
3. **Test every touched workspace, not just the new specs.** Full suite for each (swc-free config under
   Smart App Control, `--maxWorkers=3`), plus `tsc --noEmit` / the frontend typecheck (`npm run typecheck` in apps/claw-frontend)
   and eslint on the exact changed files with `--max-warnings 0`. A flaky file that fails under load must
   pass alone before you call it flaky.
4. **No date-dependent tests.** A fixture with a fixed instant plus a real clock (or `new Date()`
   compared with a literal date) fails the day the clock passes it (the consent-wait spec did on
   2026-10-15). Fix the clock with fake timers and `shouldAdvanceTime`.
5. **Lint traps that only fire on staged files.** A variable named `token`/`secret` compared with `===`
   trips `security/detect-possible-timing-attacks` (rename it); a rule can also warn only on a file the
   hook sees, so run `node node_modules/eslint/bin/eslint.js --max-warnings 0 --no-warn-ignored` on the
   staged files before committing.
6. **Docs and generated files.** Run `npm run knowledge:build` after anything that changes counts,
   routes, services or docs; `knowledge:verify` rejects hand-written counts, broken paths and a path in
   backticks that does not exist (write 'the tool-list call', not a made-up path).
7. **Deploy paths changed** (`scripts/deploy-prod.sh`, workflows, compose files): run
   `node --test tools/__tests__/deploy-prod.test.mjs` and the e2e rehearsal timing; the CI rehearsal has a
   hard cap, so never add sleeps per service.
8. **After any failed hook, check what landed.** `git show --stat HEAD` must list every file you meant
   to commit (lint-staged once committed 12 of 64 files); re-stage with `git add -A -- . ':!apps/claw-frontend/next-env.d.ts'`
   and commit again; never `--no-verify`.
9. **Receipt, push, then read CI.** `npm run gates:receipt` (needs a clean tree: revert EOL-only noise
   with `git diff --ignore-cr-at-eol --quiet && git checkout -- .`), push, confirm
   `git log origin/main..HEAD` is empty, then read the GitHub CI and Release runs until they finish.

## Validation commands

```
git status --short
git log --oneline origin/<branch>..HEAD    # must be EMPTY before the next commit
```

That second command is the check: anything it prints is an unpushed commit, and
the rule says there should be none when you start the next one.

## Documentation updates

None — this is workflow, not architecture.

## Definition of done

`git log --oneline origin/<branch>..HEAD` prints nothing, and every commit you
made is individually visible on the remote.
