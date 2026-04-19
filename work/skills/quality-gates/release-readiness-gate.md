---
id: release-readiness-gate
title: Release readiness gate
category: quality-gates
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Release readiness gate

## Pass criteria

- All 18 DoD items from `foundations/definition-of-done.md` satisfied for every feature in the release
- `devops/release-checklist.md` walked and every box checked
- `quality-gates/code-quality-gate.md` passed
- `quality-gates/coverage-gate.md` passed
- `quality-gates/security-scanning-gate.md` passed
- `quality-gates/manual-api-evidence-gate.md` passed
- `quality-gates/manual-ui-evidence-gate.md` passed
- `quality-gates/documentation-gate.md` passed
- Rollback plan exists and has been reviewed
- All health endpoints green
- Docker logs clean across all services

## Fail criteria

- Any sub-gate failing
- Unresolved P1/P2 incidents in recent deploys
- Migration not tested against realistic data
- Rollback plan missing or untested

## Evidence required

- Green CI pipeline
- Sub-gate evidence links
- Release notes draft
- Rollback plan

## Blocker severity

**HARD BLOCKER.** No release unless every sub-gate is green.
