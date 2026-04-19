# Example: Adding a new Next.js page

Reference case: `/models/discovery` (shipped 2026-04-19, commit `05fa888`).

## Skills fired

| Step                         | Skill                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| 1. Types / enums / constants | `coding-quality/file-organization`, `coding-quality/typescript-strictness`              |
| 2. Repository                | `frontend/data-fetching`                                                                |
| 3. Query keys                | `frontend/data-fetching`                                                                |
| 4. Hooks                     | `frontend/page-planning`, `frontend/data-fetching`                                      |
| 5. Components                | `frontend/form-design`, `frontend/loading-empty-error-states`, `frontend/accessibility` |
| 6. Page                      | `frontend/page-planning`                                                                |
| 7. i18n                      | `frontend/i18n` (8 locales)                                                             |
| 8. Nav                       | `frontend/page-planning` (sidebar + routes)                                             |
| 9. Types                     | update `i18n.types.ts`                                                                  |
| 10. Lint/typecheck           | `coding-quality/eslint-compliance`, `coding-quality/typescript-strictness`              |
| 11. Manual UI                | `e2e-manual-testing/manual-ui-exploratory`                                              |

## Critical lessons

1. **Nested i18n keys** — the translations resolver was 2-levels only; nested keys like `discovery.candidates.empty.title` silently failed. Fixed in `translations.ts` to walk arbitrary depth.
2. **Extract types aggressively** — `no-restricted-syntax` ESLint rule bans inline types in hook/component files. Prop types, query-result types, mutation-result types all live in `types/discovery.types.ts`.
3. **One controller hook per page** — `useDiscoveryPage()` wraps 9 sub-hooks. Page is pure render.
4. **shadcn/ui only** — raw `<select>` / `<input>` are lint-banned.
5. **Enum for filter values** — `CandidateStatusFilter` enum covers the "ALL" option rather than a string union.

## Gates satisfied

- Code quality: 0 lint / 0 typecheck
- Manual UI: all 4 states verified (loading, empty, error, success)
- i18n: 8 locales updated + i18n.types.ts
- Docs: sidebar nav updated; routes constant updated
- DoD: 18 items walked

## Related example

- For the backing backend, see [new-backend-service.md](new-backend-service.md).
