---
id: release-checklist
title: Release checklist
category: devops
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Release checklist

## Purpose

Before a release candidate ships, walk this list. Skipping items is how hot-fix weekends happen.

## Checklist

- [ ] All PRs in the release have green CI
- [ ] All 18 DoD items satisfied per feature (see `foundations/definition-of-done.md`)
- [ ] Prisma migrations applied against a staging DB that has realistic data
- [ ] Compose files consistent across all 7 variants
- [ ] Nginx config applied and nginx restarted
- [ ] `shared-*` packages built and dependent services rebuilt
- [ ] i18n locale files complete in all 8 locales
- [ ] Docker images rebuilt (not just restarted) for services whose code changed
- [ ] Health endpoints return green from all services
- [ ] Docker logs clean (no FATAL, no UnhandledPromiseRejection)
- [ ] QA scripts for every feature pass
- [ ] Release notes drafted
- [ ] Rollback plan reviewed
- [ ] Observability dashboards checked

## Strict rules

- **MUST** walk every item before declaring RC ready. **BLOCKER** if any unchecked.
- **MUST NOT** skip migration verification because "it worked in dev".

## Quality gate

| Check             | Blocker? | Evidence    |
| ----------------- | -------- | ----------- |
| All items checked | yes      | Release doc |

## Definition of done

1. Every item checked.
2. Release doc saved.

## References

- `quality-gates/release-readiness-gate.md`
