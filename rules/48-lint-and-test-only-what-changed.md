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
npx vitest run path/to/changed.spec.ts        # or: npx jest <path> pre-migration

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
