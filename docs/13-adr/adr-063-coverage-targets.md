# ADR-063: Coverage targets

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

`CLAUDE.md` already declared a repo-wide 92% coverage threshold pattern
(`coverageThreshold: { global: { statements/branches/functions/lines: 92 } }`)
enforced per-workspace `jest.config.ts`/`vitest.config.ts`. The audit's
`coverageThresholds` extraction shows this is declared unevenly and is
explicitly tagged `unverified` in the inventory (declared threshold ≠ measured
executed coverage — the two were never reconciled in one report). The
initiative's brief asks for ≥95% statements/lines/functions, ≥90% branches,
with 100% branch coverage on pure critical logic (schemas, mappers, permission
decisions, event validators) — a real increase over the existing 92% floor.

## Decision

Adopt the higher bar as the **target**, ratcheted rather than dropped in:

- ≥95% statements / lines / functions, ≥90% branches — repository target.
- 100% branch coverage required on: Zod schemas, mappers, permission/ownership
  decision logic, query-key builders, event-contract validators, and other
  pure security-sensitive helpers (`testing/coverage-policy.md`).
- Workspaces currently below target are not retroactively broken by this ADR;
  `testing/coverage-policy.md` states the ratchet rule explicitly: a
  workspace's threshold is never lowered to land a change, and new/changed
  code in a below-target workspace must itself meet the target immediately.
- Coverage quality bar (also in the policy): no `.toBeDefined()`-only
  assertions, no `.skip()`/`xit`/`xdescribe` in CI, mocks at boundaries only,
  DTO fuzz tests for every Zod schema, every `catch` branch tested.

## Alternatives considered

- **Keep 92% as-is.** Rejected — the initiative explicitly calls for raising
  the bar, and 92% was itself declared-not-measured per the audit.
- **Jump straight to enforcing 95%/90% as a hard CI gate across all 24
  workspaces immediately.** Rejected for THIS slice — no workspace's actual
  executed coverage was measured as part of this audit (would require running
  the full test suite per service, out of scope for a documentation/tooling
  slice). Enforcement lands in `testing/coverage-policy.md` as the declared
  target with the ratchet rule; wiring per-workspace `coverageThreshold`
  bumps to 95/90 is a tracked follow-up once each workspace's baseline is
  actually measured (`npm run test:cov` per workspace).

## Consequences

- No workspace is silently broken by this ADR — it sets direction and a
  ratchet rule, not an immediate hard-fail on every existing workspace.
- `testing/coverage-policy.md` is now the canonical single source for the
  number; `CLAUDE.md`'s 92% reference should be read as the historical floor
  this ADR supersedes going forward.

## Migration

Per-workspace `coverageThreshold` bumps to 95/90, done workspace-by-workspace
as each is touched (natural ratchet via the "changed code meets target
immediately" rule), rather than one big-bang commit across 24 workspaces.

## Validation

`testing/coverage-policy.md` review; per-workspace `npm run test:cov` when
that workspace is next touched.

## Rollback

Revert `testing/coverage-policy.md` target back to 92%; no code impact either
way since this ADR did not modify any `jest.config.ts`/`vitest.config.ts`.
