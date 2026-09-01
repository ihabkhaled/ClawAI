---
name: finish-worktree-branch-with-pr
summary: When the agent created a dedicated git worktree and branch for a task, the task is not finished until a PR is opened with release notes — not just pushed commits.
task_keywords: [worktree, new branch, pull request, PR, release notes, finish branch, hand off]
applies_to: [all-workspaces, monorepo-root]
required_rules: [39-worktree-branch-completion-pr-and-release-notes, 07-commit-rules]
required_context: [workspace-map]
affected_workspaces: [varies-with-change]
required_tests: [none]
required_docs: [none]
validation_lane: gh pr view
---

## When to use

Every time you (the agent) ran `git worktree add -b <branch>` (or the
equivalent EnterWorktree flow) to carry out a task, and the implementation is
now complete, gated, and pushed.

## When NOT to use

- The user is working on their own existing branch/worktree and didn't ask
  for isolation — creating a PR unprompted there is a separate, larger
  decision than this skill covers.
- The user explicitly said not to push or not to open a PR (a spike, a
  local-only experiment).

## Read first

- [`../rules/39-worktree-branch-completion-pr-and-release-notes.md`](../rules/39-worktree-branch-completion-pr-and-release-notes.md)
- [`commit-and-push-each-change.md`](commit-and-push-each-change.md) — get to
  "every commit pushed" first; this skill starts after that is true

## Steps

1. Confirm nothing is unpushed: `git log --oneline origin/<branch>..HEAD`
   must print nothing.
2. Confirm the scoped gates for every touched workspace are green (this
   should already be true from landing each commit).
3. Draft the PR body around **release notes**, not just a diff summary —
   write it for someone who will not read the code:
   - `## Summary` — 2-4 bullets, what changed
   - `## Release notes` — user-facing framing: what a user/operator actually
     gets, in plain language
   - `## Remaining work` — name anything intentionally deferred; write
     "None" if there is nothing
   - `## Test plan` — the gates/checks that were actually run, as a checklist
4. Open it:
   ```bash
   gh pr create --title "<type>(<scope>): <subject>" --body "$(cat <<'EOF'
   ...
   EOF
   )"
   ```
5. Report the PR URL back to the user. Do not report the task as fully done
   without it.

## Why

A pushed branch with no PR is invisible to anyone not already watching the
branch list. The PR is the durable artifact that carries review, CI status,
and a human-readable account of the change — the commit log alone assumes the
reader will reconstruct intent from diffs, which is exactly the kind of
knowledge loss the rest of this repo's knowledge-compounding rules exist to
prevent (`33-knowledge-compounding-and-context-velocity.md`).

## Failure modes

- Reporting "done, pushed to `fix/x`" and stopping — the user then has to
  remember to ask for a PR separately.
- A PR body that is just the branch name or a copy of the commit subject line
  — it answers "what files changed" and not "what does this mean."
- Opening the PR before the last commit for the unit of work is pushed, so
  the PR understates the change and needs a second look later.

## Validation commands

```bash
git log --oneline origin/<branch>..HEAD   # must be empty
gh pr view --json url,title,body
```

## Documentation updates

None beyond the PR body itself — this is a workflow step, not an architecture
change.

## Definition of done

A PR exists on the remote for the branch, its body has a release-notes
section, and the user has been given the PR URL.
