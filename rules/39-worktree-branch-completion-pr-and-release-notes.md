# 39 — Worktree/Branch Completion: PR and Release Notes

## Purpose

A task done in a dedicated `git worktree` on a new branch is explicitly scoped
work the user expects to land as a reviewable unit. Leaving it as pushed
commits with no PR is an incomplete handoff: nobody is notified there is
something to review, and the record of _why_ the change was made (beyond the
commit log) does not exist anywhere durable. This rule closes that gap.

## Applies to

Any task where the agent itself created the worktree and branch (via
`git worktree add -b <branch>` or equivalent) to carry out the work. Does not
apply when the user is already working on an existing branch/worktree they
set up themselves and did not ask for a PR.

## Mandatory rules

1. **Every worktree + branch the agent creates for a task ends with a pull
   request**, opened with `gh pr create`, once the branch's commits are
   pushed and its scoped gates are green (rules 07/23/34).
2. **The PR body includes release notes** — a short, user-facing summary of
   what changed and why, not just a diff description. Follow the existing
   `gh pr create --body` heredoc convention from root `CLAUDE.md` → "Creating
   pull requests."
3. **Do this at the end of the batch of work**, not per-commit. If the work
   is split into multiple pushed commits on the branch (rule 07's "one commit,
   one push"), the PR is opened once, after the last commit in that unit of
   work is pushed — not once per commit.
4. **State what remains, if anything.** If the task is intentionally partial
   (a P0 slice of a larger prompt pack, for example), say so explicitly in the
   PR body rather than implying full completion.

## Prohibited patterns

- Pushing commits to a dedicated task branch and reporting the task done
  without opening a PR.
- A PR body that is empty, or that only restates the branch name.
- Opening the PR before the final commit for the unit of work is pushed.
- Silently skipping this rule because the user only asked to "implement X" —
  creating the worktree/branch is what triggers it, not a separate request.

## Correct pattern

```bash
git worktree add .worktrees/<slug> -b <type>/<slug>
# ... implement, gate, commit, push (rule 07) ...
gh pr create --title "<type>(<scope>): <subject>" --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Release notes
<user-facing summary of the change>

## Remaining work
<anything intentionally deferred, or "None">

## Test plan
- [ ] <gate 1>
- [ ] <gate 2>
EOF
)"
```

## Enforcement

- **Review checklist** — no automated check observes "was a PR opened"; this
  is a self-enforced step at the end of the twelve-station Akinator loop
  (DOCUMENT/INDEX+SYNC stations) and at `finishing-a-development-branch`.

## Related skills

- [`finish-worktree-branch-with-pr.md`](../skills/finish-worktree-branch-with-pr.md) — the runbook
- [`commit-and-push-each-change.md`](../skills/commit-and-push-each-change.md)

## Related context

- Root `CLAUDE.md` → "Creating pull requests"
- [`07-commit-rules.md`](07-commit-rules.md), [`23-git-commits-hooks-and-release-gates.md`](23-git-commits-hooks-and-release-gates.md)

## Definition of done

- [ ] The branch's final commit for the unit of work is pushed.
- [ ] A PR exists for the branch, opened via `gh pr create`.
- [ ] The PR body contains a release-notes section a non-engineer could read.
- [ ] Any intentionally deferred scope is named in the PR body.
