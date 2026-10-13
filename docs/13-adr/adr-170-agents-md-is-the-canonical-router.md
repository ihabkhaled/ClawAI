# ADR-170: AGENTS.md is the canonical router, gates are scoped and strict, docs move with code

**Status:** Accepted

**Date:** 2026-10-13

Supersedes the authority order of [ADR-055](adr-055-canonical-ai-authority-hierarchy.md);
extends [ADR-058](adr-058-compact-ai-routers-not-mirrors.md) and
[ADR-061](adr-061-git-hook-policy-no-bypass.md).

## Context

Measured on 2026-10-13 (`docs/qa-evidence/2026-10-13-gates-hooks-ci-docs-overhaul.md`):

- Gates could pass without checking anything: a comparison base that did not
  resolve reported "0 changed files" and exited 0; receipts were self-attested
  and checked HEAD's tree whatever ref was pushed; dependents were typechecked
  against a stale shared `dist`; a lockfile or ESLint-config change ran nothing
  locally; 26 of 27 workspaces passed an empty suite; CI never ran `--coverage`,
  so 17 of 27 suites sat below thresholds nobody enforced.
- Gates were slow where they did not need to be: a one-line shared-utilities
  change took 86.5s to commit and 395.8s to push; ESLint loaded every
  workspace program per file and needed an 8 GB heap.
- The instruction files disagreed with each other and with the hooks: seven
  near-identical per-model routers, a 50 kB `CLAUDE.md`, whole-workspace gate
  instructions in dozens of files, hand-written counts that contradicted each
  other, and dead references (`npx tsgo` appeared 96 times; the binary is not
  installed).

## Decision

1. **`AGENTS.md` is the canonical router** (≤ 6 kB) and sits with
   `rules/00-non-negotiable-rules.md` at the top of the authority order.
   `CODEX.md`, `GEMINI.md`, `DEEPSEEK.md`, `GLM.md`, `KIMI.md`, `MISTRAL.md` and
   `QWEN.md` are generated from it plus a short per-model emphasis
   (`tools/knowledge/render-model-routers.mjs`) and verified fresh in CI.
   `CLAUDE.md` keeps only Claude-specific notes; `cursor.md` and `.cursorrules`
   are pointers.
2. **One canonical home for how a change lands**: `rules/23` (landing loop, what
   each hook runs, the gate matrix by change type). Everything else links to it.
3. **Gates fail loudly and run only what the change needs** (rules/23, 34, 48):
   explicit base resolution; receipts written only by the affected runner after
   the gates pass, bound to tree, gate scope, lockfile, Node and tooling; every
   pushed ref's tree validated; shared packages rebuilt in dependency order;
   root-invariant checks; `vitest related` at pre-push; a bounded pool with a
   capped vitest worker budget.
4. **CI is one strict gate**: one setup job, a lint-warning ratchet, coverage
   floors that only rise toward the declared thresholds (rules/22), changed-lines
   coverage, gitleaks, CodeQL without upload (default setup keeps the
   dashboard), `npm audit`, Trivy for changed Dockerfiles, actionlint — all
   aggregated by `CI success`, which gates release and deploy. `ai-native-os` is
   called from CI so its gates block release too.
5. **Docs move with code** ([rules/63](../../rules/63-docs-move-with-code.md),
   non-negotiable): a `Docs:` trailer on every commit; `docs:impact`,
   `docs:refs`, a counts check and a duplication check, enforced by the hooks and
   CI. Repository totals in docs come from generated count fragments. Wiki pages
   that mirror a canonical file are generated from it.

## Consequences

- An agent runs nothing by hand for a normal change beyond `git commit` and
  `git push`; the gate matrix says what runs where.
- Touching a file means clearing its lint warnings (`--max-warnings 0` in
  lint-staged). CI only fails on warnings above the committed baseline.
- 17 workspaces enforce a measured coverage floor below their declared target
  until they close the gap on the dated path in rules/22.
- A commit without a valid `Docs:` trailer is rejected; commits made before this
  ADR are not judged retroactively.
- gitleaks is not an npm package: without it installed, pre-commit warns and CI
  is the enforcing scan.
- Follow-ups: eight pre-existing `eslint-disable` directives (rules/00 violation)
  to remove; the lint baseline and coverage floors to burn down; owner to confirm
  the coverage dates and enable "CI success" as a required check.
