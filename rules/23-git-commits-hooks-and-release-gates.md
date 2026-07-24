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
2. **Green then commit.** When touched-folder gates pass, commit and push and let the
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
6. **Prefer reversible git actions** — new commit over amend; confirm before
   force-push / `reset --hard`.
7. **`npm run release:preflight` runs the full gate** — that is the place the
   all-workspace checks belong, not the per-change loop.
8. **Docs-only changes** (`docs/**`, `CLAUDE.md`, `rules/**`, locale files paired
   with `i18n.types.ts`) skip the code gates but stay conventional-format.

## Prohibited patterns

- `--no-verify` (or any hook bypass) on commit or push — banned outright.
- Running lint/typecheck/test/build across all 17 services for a one-service change.
- `git add -A` / `git add .` when splitting a commit.
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

- [09-refactor-toolkit](../skills/09-refactor-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Scoped Quality Gates Before Commit", "Quality Gates".

## Definition of done

- [ ] Touched-folder gates green; full gate not run for a scoped change.
- [ ] Conventional commit; explicit paths; reversible actions.
- [ ] `--no-verify` used only to skip the redundant hook, never a real failure.
