# Contribution and Gates

Contribution is governed by explicit repository gates rather than convention alone.

## Gate layers

- Husky pre-commit and pre-push hooks.
- Commitlint / conventional commit rules.
- Strict ESLint + TypeScript.
- Unit/integration/E2E testing standards.
- Affected-workspace validation.
- Generated knowledge freshness checks.
- Architecture lint checks.
- QA-team evidence rules.
- Release preflight.
- Release notes/versioning workflow.

## Landing a change

`git add <explicit paths>` → `git commit` (conventional subject plus a `Docs:` trailer) → `git push`. The hooks run the gates the change type needs, scoped to what changed, and CI runs the rest — a normal change runs no lint, typecheck, test or build by hand. Which gate runs for which change: the gate matrix in [rules/23](https://github.com/ihabkhaled/ClawAI/blob/main/rules/23-git-commits-hooks-and-release-gates.md#gate-matrix-by-change-type). Every feature or fix also carries its QA evidence record (`npm run qa:evidence:new`).

Sources:

- [.github/CONTRIBUTING.md](https://github.com/ihabkhaled/ClawAI/blob/main/.github/CONTRIBUTING.md)
- [.github/pull_request_template.md](https://github.com/ihabkhaled/ClawAI/blob/main/.github/pull_request_template.md)
- [rules/23-git-commits-hooks-and-release-gates.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/23-git-commits-hooks-and-release-gates.md)
- [rules/34-gate-economy-and-machine-resources.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/34-gate-economy-and-machine-resources.md)
- [rules/39-worktree-branch-completion-pr-and-release-notes.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/39-worktree-branch-completion-pr-and-release-notes.md)
