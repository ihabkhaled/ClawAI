# 23 — Git Commits, Hooks, and Release Gates

## Purpose

Quality gates run where they are cheap and correct. The hooks prove the change
itself, fast; CI proves it against the whole repository; release runs only on a
green CI. This rule is the **single canonical home** for how a change lands and
what each gate runs. Every other file links here instead of restating it.

## Applies to

Every commit and push in the repo; `.husky/*`; `tools/gates/*`; `tools/affected/*`;
`.github/workflows/*`.

## Landing a change

```bash
npm run affected:list              # which workspaces your change touches, and why
git add <explicit paths>           # never -A, never .
git commit                         # the hook gates the staged change (see the matrix)
git push origin <branch>           # the hook gates every pushed ref's tree; then CI
```

That is the whole loop. An agent runs **nothing else by hand** for a normal
change: the hooks run the right gates for the change type, scoped to what
changed, and CI runs the rest. Optional, when you want one proof up front
instead of two hook runs: `npm run gates:receipt` after staging — it runs the
hook gates over the staged tree once and records what passed, so the hooks skip
exactly those gates for exactly that tree
([rules/34](34-gate-economy-and-machine-resources.md) rule 4).

Before release: `npm run release:preflight` runs the all-workspace gate.

## What the hooks run

**pre-commit** (staged changes only):

1. `lint-staged` — `eslint --fix --max-warnings 0` (content cache) and
   `prettier --write` on the staged files. Touching a file means leaving it with
   zero warnings.
2. Secret scan — `gitleaks git --staged` with `.gitleaks.toml`. Without gitleaks
   installed it warns loudly and continues; CI scans every commit.
3. Knowledge layer — regenerate `.ai/**`, workspace `AGENTS.md` and the
   inventory snapshot, stage them, verify links, docs and contradictions
   ([rules/24](24-generated-files-and-knowledge-freshness.md)); records a
   `knowledge` receipt for the staged tree.
4. Root checks + typecheck — a lockfile change runs `npm ci --dry-run`; an ESLint
   config change runs `architecture:check` and lints real files; a root tsconfig
   change typechecks the workspaces extending it. Then every workspace the staged
   change affects is typechecked, after any stale shared package is rebuilt in
   dependency order.

**commit-msg** — commitlint (conventional subject, body lines ≤ 200).

**pre-push** (`tools/gates/pre-push.mjs`, every pushed ref read from stdin; base
resolved as `origin/HEAD` → `origin/main` → `main`, fetched if missing, never
guessed):

1. `knowledge:verify` + `audit:check` — skipped when pre-commit's receipt covers
   the tree.
2. Root checks again, plus `npm run knowledge:test:fast` when `tools/`,
   `scripts/`, `eslint/` or `.husky/` changed, and `architecture:check` when
   `eslint/` changed.
3. Typecheck of the workspaces that depend on a changed shared package.
4. Tests of the directly changed workspaces — `vitest related` when only source
   under `src/` changed, the whole suite otherwise.
5. Build of the directly changed workspaces.

A pushed ref whose tree is not checked out passes only when receipts cover all
five gates for its tree. Workspaces run in a bounded pool (`CLAW_GATE_JOBS`).

## Gate matrix by change type

| Change type                                                 | pre-commit                                                                  | pre-push                                                                    | CI (`ci.yml` + `ai-native-os`)                                                                         | By hand                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Docs only** (`*.md` anywhere)                             | prettier, secret scan, knowledge + link checks. No code gate.               | knowledge (skipped via receipt). No code gate.                              | knowledge freshness + integrity (docs checks), format ratchet, secrets, CodeQL, QA evidence            | nothing                                                                  |
| **Single-workspace source**                                 | eslint `--max-warnings 0` + prettier, secret scan, knowledge, typecheck     | `vitest related`, build                                                     | setup, static (lint ratchet + typecheck), test + coverage floor, changed-lines coverage, build, policy | nothing                                                                  |
| **Shared package** (`packages/*`)                           | + stale shared `dist` rebuilt in order; typecheck package + all dependents  | related tests of the package, typecheck of dependents, build of the package | the full matrix of every dependent                                                                     | nothing                                                                  |
| **Prisma schema**                                           | typecheck of the service (against its current client)                       | related tests / suite, build                                                | setup regenerates every client; static, test, build of the service                                     | `npm run prisma:generate --workspace=<svc>` and the migration (rules/52) |
| **Frontend** (`apps/claw-frontend`)                         | frontend eslint `--max-warnings 0` + prettier, knowledge, typecheck         | `vitest related`, `next build`                                              | as single-workspace, frontend suite sharded + merged coverage; `lighthouse.yml`                        | the browser lanes of rules/60 (Playwright, device matrix)                |
| **Root config or lockfile**                                 | root checks (`npm ci --dry-run` / ESLint config loads / tsconfig typecheck) | root checks                                                                 | every workspace (root invariant), `npm audit`                                                          | nothing                                                                  |
| **CI or workflow** (`.github/**`)                           | prettier, secret scan, knowledge                                            | tooling tests (workflow shape tests)                                        | every workspace, actionlint + shellcheck, the new or changed jobs themselves                           | optional: actionlint locally                                             |
| **Hooks or tools** (`.husky`, `tools`, `scripts`, `eslint`) | prettier, secret scan, knowledge                                            | tooling tests (`knowledge:test:fast`), `architecture:check` for `eslint/`   | every workspace, tooling tests, deploy rehearsal when deploy paths changed                             | nothing                                                                  |

CI job by job, and how a red job blocks release:
[`docs/08-runtime-devops/ci-cd-pipeline.md`](../docs/08-runtime-devops/ci-cd-pipeline.md).

## Mandatory rules

1. **Let the hooks gate the change.** Commit, let pre-commit run; push, let
   pre-push run. Do not pre-run the same gates by hand "to be safe" — that pays
   twice ([rules/34](34-gate-economy-and-machine-resources.md)). A hook failure is
   a real problem in what you staged: fix it.
2. **`--no-verify` is banned** ([ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md)),
   as is any other hook bypass. A receipt skips only gates it ran.
3. **Conventional commits** — `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`,
   subject ≤ 100 chars, no sentence/start/pascal/upper case, body lines ≤ 200
   chars.
4. **Explicit paths when staging** — `git add <path> …`, never `git add -A`/`.`
   (it sweeps in parallel work).
5. **Push each commit before starting the next one.** CI only sees what is pushed;
   `git log --oneline origin/<branch>..HEAD` must be empty before you stage the
   next change. The only exception is an explicit user instruction not to push.
6. **Prefer reversible git actions** — a new commit over an amend; confirm before
   force-push or `reset --hard`.
7. **A flaky test is quarantined, not retried** — per
   [`testing/flaky-test-policy.md`](../testing/flaky-test-policy.md). The hooks
   never re-run a failing suite.

## Prohibited patterns

- `--no-verify` (or any hook bypass) on commit or push.
- Running lint/typecheck/test/build across every workspace for a scoped change.
- Re-running by hand the gates the hooks are about to run on the same tree.
- `git add -A` / `git add .` when staging.
- Committing again while an earlier commit is unpushed.
- A non-conventional commit subject.

## Enforcement

- **Hooks** — `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`,
  delegating to `tools/gates/*` and `tools/affected/index.mjs`.
- **CI** — `.github/workflows/ci.yml`; `CI success` gates `release.yml`.
- **Tests** — `tools/__tests__/gate-correctness.test.mjs`,
  `tools/__tests__/gate-receipt.test.mjs`, `tools/__tests__/affected-ci.test.mjs`,
  `tools/__tests__/ai-native-workflow.test.mjs`, `tools/__tests__/ci-gates.test.mjs`.
- **Generated files** — [rules/24](24-generated-files-and-knowledge-freshness.md#generated-artifacts-are-a-hard-gate-never-optional).

## Related

- [rules/34](34-gate-economy-and-machine-resources.md) — receipts, concurrency, machine resources.
- [rules/48](48-lint-and-test-only-what-changed.md) — testing and linting only what changed.
- [skills/commit-and-push-each-change](../skills/commit-and-push-each-change.md) ·
  [skills/run-gates-once-and-land](../skills/run-gates-once-and-land.md).

## Definition of done

- [ ] Committed and pushed through the hooks; no bypass.
- [ ] Conventional subject, explicit paths.
- [ ] `git log --oneline origin/<branch>..HEAD` is empty.
- [ ] CI green, including `CI success`.
