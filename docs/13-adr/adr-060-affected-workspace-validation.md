# ADR-060: Affected-workspace validation

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

Root scripts (`npm run lint/typecheck/test/build`) fan out to all 24
workspaces via `--workspaces --if-present`, and the existing pre-commit/
pre-push hooks call these directly. This is the "per-folder gates" rule's
opposite — expensive for a one-file change and prone to false-failing on
unrelated workspaces in a fresh worktree (missing generated Prisma clients,
etc.), a problem this repo's own `feedback_per_folder_gates_before_commit`
memory already names.

## Decision

Build `tools/affected/index.mjs`: reads `git diff` (staged + unstaged +
against a base branch), maps changed files to owning workspaces via the
generated dependency manifest, and expands to dependents when a shared
package changes. Root/infra/governance changes are flagged `rootInvariant` but
**stay local-scoped** by default — the full broad pass is reserved for CI and
`release:preflight` (`--all-on-root` forces it locally if truly needed).
`npm run affected:{list,lint,typecheck,test,build}` and `validate:affected`
wrap this.

## Alternatives considered

- **Always validate all 24 workspaces.** Rejected — this is the expensive,
  false-failing status quo the initiative exists to fix.
- **Trust the developer to manually scope `npm run lint --workspace=X`.**
  Rejected — error-prone, and gives no answer for "did my shared-package
  change affect anyone else?"

## Consequences

- Git hooks (ADR: see hook-policy ADR-061) now run in seconds for a typical
  one-service change instead of minutes across the fleet.
- A shared-package edit correctly fans out to every declared dependent via
  `internalDeps` in the workspace manifest — no manual dependency tracking.
- Release validation remains deliberately broad via `release:preflight`,
  which is the one place a full pass is the correct default.

## Migration

New tool this slice; hooks and CI updated to call it (see ADR-061).

## Validation

`npm run affected:list` tested manually against the working tree during this
slice (confirmed correct root-invariant detection and direct-edit reasons).

## Rollback

Revert hooks/CI to call `npm run lint/typecheck/test/build` directly; delete
`tools/affected/`.
