# 01 — Task Intake and Planning

## Purpose

No line of code is written before the task is understood and its blast radius is
mapped. Planning is where cross-service work, missing infra edits, and i18n gaps
are caught cheaply — before they become half-finished features. This rule
operationalizes the Phase 0 planning gate for the AI-native workflow.

## Applies to

Every feature, bug fix, and refactor, in any workspace.

## Mandatory rules

1. **Load context first.** Run `npm run knowledge:context -- --task="<summary>"`
   and read `.ai/local/current-context.md`. It resolves the affected services,
   routes, events, and manifests for you — do not guess them.
2. **Write a 2-sentence brief:** what is being built/fixed, and the user/business
   problem it solves.
3. **Map the impacted area** explicitly: backend services (by name), frontend
   pages/components, Prisma/Mongo schemas, RabbitMQ events, API endpoints, shared
   packages, env vars, Docker compose files, nginx, CI, i18n locales, docs.
4. **State acceptance criteria** as numbered, testable statements, and **failure
   criteria** (what must NOT happen).
5. **Seed the test strategy** — which test types (unit, API, UI, integration,
   E2E, regression) apply and why.
6. For user-facing work, add the product framing: business driver, user problem,
   success metric, and the full set of visible states (loading/empty/error/success).

## Prohibited patterns

- Starting to edit files before the impacted-area map exists.
- "I'll figure out the other services as I go" — cross-service work is planned up front.
- Acceptance criteria written in vague language ("works well", "handles errors").

## Correct pattern

```bash
npm run knowledge:context -- --task="add allowCriticReview plan gate to compare lane"
# → reads .ai/local/current-context.md: chat-service, auth-service (Plan model),
#   frontend useFeatureGates, shared-entitlements, i18n keys, docs/03-architecture.
```

Plans for multi-step features are saved under `.claude/Integrations/<feature>__PLAN.md`.

## Enforcement

- **Knowledge check** — `npm run knowledge:context` must have been run; the
  affected-set it produces drives the per-folder gates.
- **Review checklist** — the impacted-area map and acceptance criteria are
  verified at review; there is no compiler for planning quality.

## Related skills

- [01-codebase-navigation](../skills/01-codebase-navigation.md)
- [03-feature-scaffold](../skills/03-feature-scaffold.md)

## Related context

- Root `CLAUDE.md` — "Phase 0: Pre-Coding Planning Gate" and "Phase 0g".
- `.ai/manifests/services.json`, `.ai/manifests/api-endpoints.json`.

## Definition of done

- [ ] Brief, impacted-area map, acceptance + failure criteria written.
- [ ] `knowledge:context` output reviewed; affected set matches the plan.
- [ ] Test strategy named for each layer that changes.
