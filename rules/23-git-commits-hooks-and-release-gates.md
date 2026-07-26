# 23 — Git Commits, Hooks, and Release Gates

## Purpose

Quality gates run where they are cheap and correct: in the folder you touched.
The all-workspace gate is expensive and false-fails in fresh worktrees, so it is
never the routine bar. Commits are conventional, hooks are respected, and the full
gate is reserved for release preflight.

## Applies to

Every commit and push in the repo; the git hooks; `.github/workflows/ci.yml`.

## Mandatory rules

1. **Per-folder gates before commit.** Identify the workspace(s) you edited, then
   run the four gates **inside those folders only**: `npx tsgo --noEmit`
   (frontend: `npm run typecheck`), `npm run lint`, `npm test`, `npm run build`.
   Never run the all-workspace gate for a scoped change.
2. **Green then commit.** When touched-folder gates pass, commit and let the
   hook run. The pre-commit hook is now scoped + fast (lint-staged + knowledge
   freshness + `affected typecheck --staged`), so there is no reason to bypass it.
   **`--no-verify` is banned** ([ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md));
   a hook failure is a real problem in something you staged — fix it, never skip it.
3. **Non-workspace files** (`scripts/**`, `infra/**`, plain `*.mjs`) → cheapest
   equivalent check (`node --check`, JSON/schema validate). Do not escalate to the
   full gate "to be safe."
4. **Conventional commits** — `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`,
   subject ≤ 100 chars, no sentence/start/pascal/upper case.
5. **Explicit paths when splitting commits** — `git add <path> …`, never
   `git add -A`/`.` (contaminates the commit with parallel WIP).
6. **Push each commit before starting the next one.** One commit, one push: after
   a commit passes its hook, the next git command is `git push`. CI only sees what
   is pushed, so N local commits are N unverified commits with an N-wide bisect
   surface, and unpushed work exists on one disk. `git log --oneline
origin/<branch>..HEAD` must be empty before you stage the next change. The only
   exception is an explicit user instruction not to push.
7. **Prefer reversible git actions** — new commit over amend; confirm before
   force-push / `reset --hard`.
8. **`npm run release:preflight` runs the full gate** — that is the place the
   all-workspace checks belong, not the per-change loop.
9. **Docs-only changes** (`docs/**`, `CLAUDE.md`, `rules/**`, locale files paired
   with `i18n.types.ts`) skip the code gates but stay conventional-format.

## Prohibited patterns

- `--no-verify` (or any hook bypass) on commit or push — banned outright.
- Running lint/typecheck/test/build across all 17 services for a one-service change.
- `git add -A` / `git add .` when splitting a commit.
- Building a local stack: committing again while an earlier commit is unpushed.
- A non-conventional commit subject.

## Correct pattern

```bash
cd apps/claw-chat-service
npx tsgo --noEmit && npm run lint && npm test && npm run build   # touched folder only
git add apps/claw-chat-service/src/modules/chat/…                # explicit paths
git commit -m "feat(chat): add criticModel to compare DTO"       # hook runs (scoped + fast)
git push origin <branch>
```

## Enforcement

- **Git hook** — pre-commit/pre-push; per-folder gate is the real bar.
- **CI job** — `.github/workflows/ci.yml` runs lint → typecheck → test → build
  (build depends on all three) per-workspace matrix.
- **Knowledge check** — `npm run affected:*` computes the touched set.

## Related skills

- [commit-and-push-each-change](../skills/commit-and-push-each-change.md)
- [09-refactor-toolkit](../skills/09-refactor-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Scoped Quality Gates Before Commit", "Quality Gates".

## Definition of done

- [ ] Touched-folder gates green; full gate not run for a scoped change.
- [ ] Conventional commit; explicit paths; reversible actions.
- [ ] `--no-verify` not used at all (banned by ADR-061).
- [ ] Every commit pushed before the next was started; `git log --oneline
    origin/<branch>..HEAD` is empty.

## Generated artifacts are a HARD GATE (never optional)

`.ai/**`, every workspace `AGENTS.md`, and
`docs/features/ai-native-engineering-os/inventory.snapshot.json` are
**generated from the tree**. CI verifies them on every push:

| CI job              | Command                    | Fails when                                                           |
| ------------------- | -------------------------- | -------------------------------------------------------------------- |
| Knowledge freshness | `npm run knowledge:check`  | a generated file's hash no longer matches the tree                   |
| Knowledge integrity | `npm run knowledge:verify` | stale file, broken link, orphan reviewer, hook-bypass, contradiction |
| Inventory audit     | `npm run audit:check`      | the inventory snapshot hash has drifted                              |

**A stale artifact turns the build red on every subsequent push**, for everyone,
until someone regenerates it. It is not a warning and it is not deferrable.

### The rule

Any commit that touches `packages/**`, `apps/**`, `infra/**`, `docker/**`,
`docs/**`, `scripts/**`, `rules/**`, `skills/**`, `tools/**` or `.env.example`
MUST regenerate and stage:

```bash
npm run knowledge:build      # rewrites .ai/** + workspace AGENTS.md
npm run audit                # rewrites the inventory snapshot
git add .ai docs/features/ai-native-engineering-os/inventory.snapshot.json
git add apps/*/AGENTS.md packages/*/AGENTS.md 2>/dev/null
npm run knowledge:verify     # what CI runs
npm run audit:check          # what CI runs
```

The pre-commit hook now does all of this **automatically**, so in normal use
there is nothing to remember. The rule is written down because the hook can be
skipped (it must not be) and because a red CI needs a documented fix.

### Order matters — regenerate AFTER formatting, never before

This is the mistake that actually caused a red build:

1. `npm run knowledge:build` — hashes the current bytes
2. `git add` / commit — **lint-staged reformats the staged files**
3. the reformatted bytes no longer match the hashes recorded in step 1
4. `knowledge:check` passes locally (it ran before the reformat) but
   `knowledge:verify` fails in CI

Generators must run **after** prettier and `eslint --fix` have settled. The
pre-commit hook is ordered that way deliberately: lint-staged is step 1,
regeneration is step 2.

### Never hand-edit a generated artifact

If a generated file is wrong, fix the **generator or its input**, then
regenerate. Editing `.ai/manifests/*.json` or a workspace `AGENTS.md` by hand is
overwritten on the next build and hides the real problem.
