# 48 — Lint and test only what changed

**Status:** active · **Owner:** tooling · **Introduced:** 2026-09-17

The repo is 24 workspaces and ~792 spec files. A gate that scales with the repo
instead of with the change is a gate people start bypassing.

## The rules

1. **Lint FILES, not workspaces.** `npx eslint <the files you changed> --fix`.
   Never `npm run lint` to check your own edit — that lints every file in the
   workspace to tell you about three.
2. **Test the workspace you touched, and prefer the file.**
   `npx vitest run <spec>` while iterating; the workspace suite once, at the end.
   Never all workspaces.
3. **Typecheck the workspace you touched.** `npm run typecheck` is per-workspace
   already; run it in that folder, not at the root.
4. **Do not re-prove what the hooks are about to prove.** `lint-staged` already
   runs eslint --fix and prettier on staged files; pre-push already runs the
   affected workspaces' tests and builds. Running the same gates by hand first
   pays for them twice.
5. **`--no-verify` still needs a reason and an instruction.** Scoped gates make
   the hooks cheap enough that skipping them is rarely worth it —
   [ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md) stands. When the
   user explicitly asks for it, say so in the commit body so the next reader
   knows the tree was not gated.

## What this costs when ignored

A one-file change ran the full ESLint pass for a workspace (tens of seconds to
minutes), then the full test suite, then the hooks ran their own scoped versions
of both — three times the work for one edit, most of it on files nobody touched.

## The commands

```bash
# after editing
npx eslint path/to/changed.ts path/to/other.ts --fix
npx vitest run path/to/changed.spec.ts

# once, before committing, in the touched workspace only
npm run typecheck && npx vitest run

# then
git add <explicit paths> && git commit && git push
```

## TypeScript runs side by side, deliberately

`typescript` is pinned to **6.0.3** and `typescript7` is an alias for
**7.0.2**. That is not drift — it is the arrangement Microsoft documents for
running the new compiler alongside tooling that has not caught up.

- **Build and typecheck use 7.0.2**, through `tools/typescript/run-ts7.mjs`,
  which resolves the `typescript7` alias. This is what `npm run build` and
  `npm run typecheck` actually execute.
- **ESLint uses the 6.x API.** `typescript-eslint` does not support TS 7.0
  (typescript-eslint#10940). Bumping the plain `typescript` dependency to 7.0.2
  breaks `npx eslint` **repo-wide** with "typescript-eslint does not support TS
  7.0" — including the `lint-staged` step in pre-commit, so nobody can commit.

If you need to raise the compiler, raise the `typescript7` alias. Leave
`typescript` on 6.x until typescript-eslint ships TS 7 support.

Related: [`rules/34-gate-economy-and-machine-resources.md`](34-gate-economy-and-machine-resources.md)

## Lessons from the 2026-10-03 landing (a 14-item batch, red CI, high agent spend)

6. **Test the change, not the suite.** `npx vitest related <changed files>` runs only the
   specs that import what you touched; `git diff --name-only HEAD` feeds it. One workspace
   suite at the end, and only when `related` is not enough. Never `npm test` at the root.
7. **A CI job that runs only when one workspace changed must build the shared packages.**
   `runtime-v2-coverage` and `runtime-v2-redis` were skipped for weeks, then a chat change
   woke them and they failed with "Failed to resolve entry for @claw/shared-utilities" (no
   `dist`). Any new `needs.changes`-gated job copies the "Build shared packages" step.
8. **After `git pull`, rebuild before you trust a gate.** Upstream moved `shared-types`,
   `shared-utilities` and the Prisma schemas; the stale local `dist` and Prisma clients made
   pre-commit typecheck fail in services nobody touched. Run
   `npm run build --workspace=@claw/shared-types` (then constants, utilities) and
   `npx prisma generate` in the services that fail, then retry once.
9. **Change a seed value, grep for the old number.** Free allowance 2 -> 10 left one spec
   asserting the catalog still said 2 and turned CI red. `rg` the old value across specs,
   docs and ADRs in the same change.
10. **Agents are not free.** Delegate only work that is large and independent; at most two
    agents at once, foreground, each with a stated scope and a "report in 15 lines" cap;
    follow up any agent that has run past ~10 minutes. A 3-command job is done by hand.
    Several agents editing one tree also contaminates each other's gates.
11. **Prefer the cheap proof.** A headless probe that prints a time series (scrollTop vs
    height every 500 ms) found the streaming-scroll bug faster than four full e2e rounds.
    A live-model e2e asserts relative properties (moved up at least 40 px), not absolute
    ones that depend on how long the model happens to answer.
12. **A headed browser cannot open in the agent session.** Run Playwright headless, keep
    screenshots, and tell the user to run `npx playwright test --headed` themselves.
13. **Commit subjects stay under 100 characters** (commitlint) and end with the attribution
    line. A too-long subject fails after the 4-minute hook run, so check length first.
14. **`--no-verify` follows rule 5.** When the user explicitly asks for it, regenerate the
    knowledge layer first (`npm run knowledge:build`, stage the generated files), say so in
    the commit body, and still read CI. The hooks are scoped and normally pass in minutes,
    so do not reach for the bypass just to save time.
