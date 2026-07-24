# ADR-059: Split ESLint architecture + custom architecture plugin

**Status**: Accepted (plugin) / Proposed (full root-config split)
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

`eslint.config.mjs` is a single, working, finely-tuned 17 KB config gating all
24 workspaces (typescript-eslint strict, security, unicorn, import-x, plus
ClawAI's inline-declaration bans and dozens of per-file security overrides).
It has no architecture-layer enforcement (no cross-service import ban, no
controller-no-logic rule, no repository-no-throw rule, no config-boundary
rule) — those rules existed only as prose in `CLAUDE.md`.

## Decision

Two-part decision:

1. **Ship a real, tested custom plugin now** (`eslint/architecture-plugin/`):
   `no-cross-service-internal-imports`, `controller-no-logic`,
   `repository-no-throw`, `no-process-env-outside-config`. Each rule has
   RuleTester valid/invalid fixtures (`__tests__/rules.test.mjs`,
   `npm run architecture:check`). The plugin exports a `recommended` flat
   config scoped to `apps/claw-*-service/src/**/*.ts`, but is **not yet wired
   into the root `eslint.config.mjs`** — adoption is an explicit, ratcheted,
   per-service opt-in (documented in `eslint/README.md`), not a big-bang
   flip that could break 24 workspaces without a full lint run to verify.
2. **Document, but defer, the full root-config decomposition** into
   `eslint/{base,typescript,security,backend,frontend,react,tests,...}.config.mjs`
   composed by a thin root orchestrator. This is a mechanical, behaviour-
   preserving refactor that must be proven with a full 24-workspace lint run
   before landing — appropriate for a dedicated follow-up slice, not bundled
   into governance-doc authoring.

## Alternatives considered

- **Rewrite `eslint.config.mjs` now, in this slice.** Rejected — cannot be
  safely validated without running the full lint matrix across 24 workspaces,
  which risks silently changing behaviour for unrelated services. The
  per-folder-gates philosophy (this repo's own rule) argues against a
  blind full-repo rewrite.
- **Skip the custom plugin entirely, rely on prose rules only.** Rejected —
  this is exactly the "documented but unenforced" gap the audit flagged.

## Consequences

- The architecture rules exist, are tested, and are provably correct on
  fixtures — but are not yet gating real service lint runs. This is an
  explicit, documented state, not a silent gap (see `eslint/README.md`
  adoption ratchet).
- `architecture.config.mjs` is the single source of truth for layer
  definitions — future rules and any knowledge-tooling layer detection should
  read from it rather than redefine conventions.

## Migration

Adoption ratchet documented in `eslint/README.md`: import `recommended` scoped
to one service, run its lint, fix real violations, widen one service at a
time.

## Validation

`npm run architecture:check` — RuleTester unit tests, run in CI
(`.github/workflows/ai-native-os.yml`).

## Rollback

Delete `eslint/architecture-plugin/` and `eslint/architecture.config.mjs`; the
root `eslint.config.mjs` is untouched and unaffected either way.
