# ADR-061: Git-hook policy — scoped hooks, no `--no-verify`

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

The audit's bypass scan found `--no-verify` **affirmatively recommended in
three canonical files** (`CLAUDE.md`, `CODEX.md`, `cursor.md` — 18 total
mentions across all three, most in an explicit "why `--no-verify`" section)
justified as "the pre-commit hook runs the expensive all-workspace gate, so
skip it." This is a direct contradiction: the same documents also say "never
bypass hooks." The root cause was that hooks WERE genuinely too expensive
(all-workspace), so bypass became normalized policy.

## Decision

Fix the root cause instead of the symptom: hooks now call the **affected**
lane (ADR-060), so they validate only what the diff touches and run in
seconds, not minutes. With hooks fast and correctly scoped, there is no
legitimate reason to bypass them locally. `--no-verify` recommendations were
removed from `CLAUDE.md`, `CODEX.md`, `cursor.md`; the prohibition ("NEVER use
`--no-verify`") was kept and strengthened. `tools/lib/analyzers.mjs`'s
`findBypassRecommendations()` distinguishes affirmative recommendations from
negated prohibitions (a line containing "NEVER `--no-verify`" is correctly
NOT flagged), so the scanner enforces the right thing:
`npm run knowledge:verify` fails on any future affirmative recommendation.
The one legitimate exception — a documented incident procedure with explicit
authorization — is routed through `docs/exceptions/README.md`, never treated
as a normal development step.

## Alternatives considered

- **Keep `--no-verify` as documented normal practice.** Rejected — this is the
  exact contradiction found; "never bypass hooks, except like this" is not a
  rule, it's a loophole.
- **Make hooks even more minimal (lint-staged only, no typecheck/test).**
  Rejected — that would under-protect; the affected-scoped approach gets both
  speed AND real coverage of what changed.

## Consequences

- `.husky/pre-commit`: lint-staged → knowledge freshness (only if
  generated-source changed) → affected typecheck.
- `.husky/pre-push`: knowledge:verify → knowledge/architecture tooling tests →
  affected test → affected build.
- Both hooks are fast for typical single-service changes and scale with the
  actual diff, not the repo size.

## Migration

`.husky/pre-commit` and `.husky/pre-push` rewritten this slice.
`CLAUDE.md`/`CODEX.md`/`cursor.md` corrected in place (see ADR-055's note on
these files' interim state).

## Validation

`npm run knowledge:verify` — the bypass scan is a permanent regression gate,
run in CI (`.github/workflows/ai-native-os.yml`) and in `pre-push`.

## Rollback

Revert `.husky/*` to call full-workspace scripts directly; this reintroduces
the original expensive/false-failing behaviour, so rollback is not
recommended without also reverting the bypass-scan removal.
