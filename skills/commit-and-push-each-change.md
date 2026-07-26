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
2. Run the four gates inside each touched folder only — never all-workspace.
3. Stage **explicit paths**. Never `git add -A` and never `git add .`: both sweep
   up unrelated work-in-progress from parallel tasks into a commit that claims to
   be about something else.
4. Commit with a conventional-commit subject. Let the hook run; never
   `--no-verify`.
5. **Push immediately.**
6. Only now begin the next commit.

```bash
# commit 1
npm run affected:list
cd apps/claw-<service> && npx tsgo --noEmit && npm run lint && npm test && npm run build
cd -
git add apps/claw-<service>/src/... apps/claw-<service>/src/.../__tests__/...
git commit -m "feat(<scope>): <subject>"
git push origin <branch>          # ← before anything else

# commit 2 — only now
git add <explicit paths>
git commit -m "test(<scope>): <subject>"
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
