# Development Workflow

## Task start

```bash
npm run knowledge:context -- --task="<task>"
npm run affected:list
```

Read the generated task context, then the cited rules, skills, reviewers, affected workspaces, tests and known pitfalls.

## Implement

- respect service/database boundaries;
- follow frontend/backend layering rules;
- use shared packages for shared contracts, not cross-service internal imports;
- add/adjust tests with the implementation;
- update the knowledge layer when architecture/behavior changes.

## Land the change

Do not run typecheck, lint, tests and build by hand. The git hooks gate the change for its type:

```bash
git add <explicit paths>                 # never -A, never .
git commit -m "<conventional subject>" -m "Docs: updated <what>"   # pre-commit + commit-msg gate it
git push origin <branch>                 # pre-push gates the pushed tree; then CI
```

Which gate runs for which change type: the gate matrix in `rules/23-git-commits-hooks-and-release-gates.md`. Every feature or fix also needs its QA evidence record (`npm run qa:evidence:new`, rules/60). Before release: `npm run release:preflight`.

## Root command catalog

Every root `npm run` script is listed once, in [[Tooling and Automation|Tooling-and-Automation]].
