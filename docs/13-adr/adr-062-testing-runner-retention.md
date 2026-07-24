# ADR-062: Testing-runner retention (Jest + Vitest + Playwright)

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

The initiative's source brief raised the question of standardizing test
runners across the monorepo. Today: backend services use Jest (`ts-jest`,
507 spec files across the fleet per the audit), the frontend uses Vitest
(matching its Vite/Next 16 toolchain), and Playwright is used for E2E. A
forced migration (e.g. all-Jest-to-Vitest) was explicitly named as a risk in
the initiative's own instructions: "do not force an unnecessary test-runner
rewrite... unless an ADR proves the migration reduces maintenance, preserves
capabilities, works with NestJS/Prisma/Mongoose, has a realistic plan, and
does not destabilize the repository."

## Decision

**Retain all three runners as-is**: Jest for NestJS services, Vitest for the
frontend, Playwright for browser E2E. No migration is undertaken in this or
any currently-planned slice. The AI-native OS standardizes **behaviour and
gates**, not runner identity: `testing/quality-gates.md` and
`testing/coverage-policy.md` apply uniformly regardless of which runner a
workspace uses, and `tools/affected/index.mjs` calls each workspace's own
`npm test` script — runner-agnostic by construction.

## Alternatives considered

- **Migrate backend to Vitest for consistency with the frontend.** Rejected —
  no concrete maintenance win was identified; NestJS's Jest integration
  (`ts-jest`, `@nestjs/testing`) is mature and 507 existing spec files would
  need re-validation with no functional benefit. This is exactly the
  "unnecessary rewrite" the brief warns against.
- **Migrate frontend to Jest for consistency with the backend.** Rejected —
  Vitest is the natural fit for the Vite-based Next.js 16 toolchain; forcing
  Jest here would fight the frontend's own build tooling.

## Consequences

- Contributors context-switch between two test APIs depending on which
  workspace they're in — an accepted, bounded cost, not a defect to fix later.
- `testing/*-standard.md` files describe behavioural requirements (what to
  test, how to structure it) in runner-neutral language, with Jest/Vitest
  syntax notes only where genuinely needed.
- Future migration remains possible but requires its own ADR with the four
  proof points named above — this ADR does not permanently forbid it, it just
  raises the bar to a deliberate decision.

## Migration

None — this ADR documents a decision NOT to migrate.

## Validation

N/A (no code change). Reviewable by inspecting `apps/*/package.json` test
scripts and `tools/lib/extractors.mjs::extractTests()`, which already
correctly reports Jest vs Vitest per workspace in `.ai/manifests/tests.json`.

## Rollback

N/A.
