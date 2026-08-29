---
name: create-frontend-module
summary: Build a complete frontend feature slice in apps/claw-frontend (types→enums→constants→repository→query-keys→hooks→components→page→i18n→nav) following the layered architecture.
task_keywords:
  [
    frontend module,
    feature slice,
    frontend feature,
    new page feature,
    tanstack query,
    controller hook,
    repository,
    i18n,
    sidebar,
  ]
applies_to: [claw-frontend]
required_rules: [03-frontend-rules, 04-testing-rules, 06-docs-rules, 07-commit-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [claw-frontend]
required_tests: [vitest, accessibility]
required_docs: [docs/05-frontend]
validation_lane: cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Frontend Module (feature slice)

Full-stack-frontend runbook for a user-facing feature in `apps/claw-frontend`. Extends
the frontend half of `./03-feature-scaffold.md` with the strict extraction, mutation, and
i18n contracts. Backend must already expose the endpoints (behind nginx `/api/v1/...`).

## When to use

- Adding a brand-new user-facing area (list + detail + create/edit) that spans a page, hooks, repository, and i18n.
- The BE contract exists; you are wiring the FE end-to-end.

## When NOT to use

- Single isolated piece: use `./add-app-route.md`, `./create-view-model-hook.md`, `./create-query.md`, `./create-mutation.md`, or `./create-presentational-component.md` instead.
- Backend work — that is `./03-feature-scaffold.md` (backend half).

## Read first

- `./resolve-task-context.md` — run the resolver to rank the exact rules/skills for your task.
- `../rules/03-frontend-rules.md` — architecture, no-inline rule, i18n, styling.
- `./03-feature-scaffold.md` — the canonical file-order table this skill follows.

## Repository discovery steps

1. `Grep` an existing domain (e.g. `memory`, `connectors`) across `src/repositories/`, `src/hooks/`, `src/app/(portal)/` to copy the established shape.
2. Confirm FE type field names against the BE DTO/Prisma model — they MUST match verbatim (mismatched `createdAt` silently breaks date rendering).
3. Check `src/repositories/shared/query-keys.ts` and `src/types/index.ts` for existing factories/exports to extend, not duplicate.

## Tests-first plan

- Vitest `*.test.ts` for every utility, hook, and component (happy + empty + error + boundary).
- Mutation hooks: assert `onSuccess` invalidation and `onError` toast path.
- Accessibility check for any dialog/form (see `./add-accessible-dialog.md`).

## Implementation steps (strict order — skipping causes forward-reference errors)

1. **Types** → `src/types/<domain>.types.ts`; re-export from `src/types/index.ts`. Mirror BE field names.
2. **Enums** → `src/enums/<name>.enum.ts`; re-export from `src/enums/index.ts`. No string-literal unions.
3. **Constants** → `src/constants/<domain>.constants.ts`; re-export from `src/constants/index.ts`.
4. **Zod schemas** (if forms) → `src/lib/validation/<domain>.schema.ts`.
5. **Repository** → `src/repositories/<domain>/<domain>.repository.ts` (one function per endpoint via `apiClient`).
6. **Query keys** → add a factory to `src/repositories/shared/query-keys.ts`.
7. **Hooks** → `src/hooks/<domain>/use-<name>.ts`, one responsibility, ≤50 lines. Query hooks (`./create-query.md`) + mutation hooks (`./create-mutation.md`) + the controller hook (`./create-view-model-hook.md`).
8. **Components** → `src/components/<domain>/*.tsx`, props-only render (`./create-presentational-component.md`). No inline sub-components.
9. **Page** → `src/app/(portal)/<route>/page.tsx`, ONE controller hook, loading/empty/error/success, `React.ReactElement` return (`./add-app-route.md`).
10. **i18n** → all 13 locales + `src/types/i18n.types.ts`, atomically (`./add-i18n-key.md`).
11. **Navigation** → `src/constants/sidebar.constants.ts` + `src/constants/routes.constants.ts`.

## Security considerations

- Never expose secrets/tokens in FE types or logs; the BE strips them — don't re-introduce.
- All state changes go repository → hook → component; components never fetch.

## Failure modes

- FE type renamed a BE field → runtime "Invalid Date"/undefined, typecheck stays green. Mirror names.
- English leaked into non-EN locales (see `./add-i18n-key.md`).
- `useQuery`/`useMutation` called in a `.tsx` — always wrap in a hook.

## Validation commands

`cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build`
Then `npx vitest run src/lib/i18n` from `apps/claw-frontend`. Never `--no-verify`.

## Documentation updates

- Update the relevant `docs/05-frontend/*` doc and `CLAUDE.md` Pages list if a new page was added.

## Definition of done

- All 4 states render; per-row pending state on mutations; 13 locales + i18n.types.ts atomic; nav entries added; validation lane green; audit script clean.
