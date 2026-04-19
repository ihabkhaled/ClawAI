---
id: definition-of-done
title: Definition of done
category: foundations
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Definition of done

## Purpose

"Done" is a strict contract, not a vibe. This skill is the baseline DoD every feature must satisfy. Quality gates (`quality-gates/*.md`) enforce it per-dimension; this skill is the union.

## When to use

- Before claiming any feature is done.
- Before opening a PR for review.
- Before a release candidate ships.

## Inputs required

- The feature's plan document
- All relevant skill files

## The 18-item baseline DoD

Every feature is done only when ALL of these are true:

1. **Plan** — `.claude/Integrations/<feature>__PLAN.md` exists with Phase 0 framing
2. **Lint** — `npm run lint` → 0 errors
3. **Typecheck** — `npm run typecheck` → 0 errors
4. **Tests** — `npm run test` → all pass
5. **Build** — `npm run build` → production build succeeds
6. **QA script** — `qa/test-<feature>.sh` exists and passes 0 failures
7. **DB verification** — QA script queries verify every write operation
8. **Docker logs** — 0 `UnhandledPromiseRejection` / `FATAL` / `ERR_MODULE_NOT_FOUND`
9. **Auth enforcement** — QA asserts 401 unauthenticated + 403 wrong role (where applicable)
10. **i18n** — all new user-facing text in all 8 locales
11. **Loading/empty/error states** — every new page/screen has all four
12. **Docs updated** — `docs/` delta present per `documentation-baseline.md`
13. **CLAUDE.md updated** — if architecture/env/pattern changed
14. **Infra wired** — all 7 compose files, nginx, health service, shared packages, CI
15. **Migration safe** — if Prisma changed, migration is additive and reversible
16. **Observability** — structured logs, audit events where required
17. **Security review** — `security-baseline.md` checklist satisfied
18. **Commit messages** — conventional commits with meaningful bodies

## Strict rules

- **MUST** verify every item before saying "done". **BLOCKER** if any unchecked.
- **MUST NOT** claim done with known failures.
- **MUST NOT** bypass pre-commit hooks (`--no-verify` forbidden).
- **MUST** provide evidence for each item — output, artifact, or reviewer sign-off.

## Anti-patterns

- "Done" with lint errors suppressed.
- "Done" with no QA script.
- "Done" with i18n only in English.
- "Done" because the local dev server rendered the page.
- "Mostly done" — there's no such status.

## Validation checklist

Walk every one of the 18 items. Literally. Check the box or fix.

- [ ] 1. Plan
- [ ] 2. Lint
- [ ] 3. Typecheck
- [ ] 4. Tests
- [ ] 5. Build
- [ ] 6. QA script
- [ ] 7. DB verification
- [ ] 8. Docker logs clean
- [ ] 9. Auth enforcement
- [ ] 10. i18n in 8 locales
- [ ] 11. L/E/E/S states
- [ ] 12. Docs updated
- [ ] 13. CLAUDE.md updated (if applicable)
- [ ] 14. Infra wired
- [ ] 15. Migration safe
- [ ] 16. Observability
- [ ] 17. Security review
- [ ] 18. Commit messages

## Quality gate

Every unchecked item is a blocker.

| Check                | Blocker? | Evidence                |
| -------------------- | -------- | ----------------------- |
| All 18 items checked | yes      | Reviewer walks the list |

## Test requirements

See `testing/` and `e2e-manual-testing/` for per-type requirements.

## Definition of done (meta)

This skill is "done" when you can name every one of the 18 items from memory.

## Examples

- Agent service delivery (commits `8ff618e` through `a54efb6`) — all 18 items satisfied.
- Ollama discovery delivery (commits `5b38dd5` through `9ae0e25`) — all 18 items satisfied.

## References

- `CLAUDE.md` — MANDATORY Change Checklist, Mandatory Post-Implementation Checklist
- `quality-gates/` — per-dimension gates
