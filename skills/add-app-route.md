---
name: add-app-route
summary: Add a new page under app/(portal)/<route>/page.tsx with a single controller hook, all four states, sidebar + routes constants, and an explicit React.ReactElement return type.
task_keywords:
  [
    new page,
    app route,
    next route,
    portal page,
    sidebar entry,
    routes constants,
    loading empty error success,
  ]
applies_to: [claw-frontend]
required_rules: [03-frontend-rules, 04-testing-rules, 06-docs-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [claw-frontend]
required_tests: [vitest]
required_docs: [docs/05-frontend]
validation_lane: cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add an App Route (page)

Create a Next.js 16 App Router page in `apps/claw-frontend/src/app/(portal)/<route>/page.tsx`.
The page is pure render composition: ONE controller hook, four states, zero business logic.

## When to use

- Adding a new navigable screen to the portal that needs a URL, sidebar entry, and route constant.

## When NOT to use

- Only adding data/logic to an existing page → use `./create-view-model-hook.md` or `./create-query.md`.
- A full feature slice → use `./create-frontend-module.md`.

## Read first

- `./resolve-task-context.md` — rank the exact rules/skills for the task.
- `../rules/03-frontend-rules.md` — Page Rules (§ Page Rules: one controller hook, all 4 states, ReactElement).

## Repository discovery steps

1. `Glob` `src/app/(portal)/**/page.tsx` and open one (e.g. `memory`, `connectors`) as the template.
2. Read `src/constants/sidebar.constants.ts` and `src/constants/routes.constants.ts` for the entry shape.
3. Confirm whether a controller hook + repository already exist for this domain.

## Tests-first plan

- Vitest for the controller hook (loading/empty/error/success branches).
- If the page renders a form or dialog, add an accessibility assertion.

## Implementation steps

1. Create the route folder `src/app/(portal)/<route>/` and `page.tsx`.
2. Export exactly: `export default function <Name>Page(): React.ReactElement`.
3. Call ONE controller hook (`./create-view-model-hook.md`) — no `useState`/`useEffect`/`useQuery` in the `.tsx`.
4. Render all four states explicitly: loading spinner, empty state, error state, success content. Extract any sub-view to its own `.tsx` (no inline sub-components).
5. Style with semantic Tailwind classes + `cn()` from `@/lib/utils`; no `dark:` prefixes; mobile-first.
6. Add a route constant to `src/constants/routes.constants.ts` and a sidebar entry to `src/constants/sidebar.constants.ts`.
7. Add all visible text via `t('key')` and register keys in 9 locales + `i18n.types.ts` (`./add-i18n-key.md`).

## Security considerations

- Gate visibility by role/permission if the page is admin-only (mirror existing gated pages/sidebar entries).
- No secrets in query params or client-visible constants.

## Failure modes

- Missing empty or error state → blank screen on no-data/failed fetch. All four are mandatory.
- More than one controller hook call, or a hook called directly in the `.tsx` — both are lint errors.
- Inline sub-component defined in the page file → extract it.

## Validation commands

`cd apps/claw-frontend && npm run typecheck && npm run lint && npm test && npm run build`. Never `--no-verify`.

## Documentation updates

- Add the page to `CLAUDE.md` Pages list and the relevant `docs/05-frontend/*` doc.

## Definition of done

- Route resolves; sidebar + routes constants added; all 4 states render; ReactElement return type; i18n atomic; validation lane green.
