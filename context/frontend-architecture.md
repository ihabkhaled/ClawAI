# Frontend Architecture

`apps/claw-frontend` — Next.js 16.2, React 19.2, TanStack Query, Zustand,
Tailwind, shadcn/ui. **89 pages** (`.ai/manifests/frontend-routes.json`), **151
vitest test files** (`.ai/manifests/tests.json`). Full rules:
`rules/03-frontend-rules.md`.

## Layering

```
page.tsx (render only) → controller hook (useX) → query/mutation hooks
                                              → repository → /api/v1/*
```

- **Page** (`src/app/(portal)/<route>/page.tsx`) — pure render composition, **one
  controller hook**, explicit `React.ReactElement` return type. Must handle
  **loading / empty / error / success** states.
- **Controller hook** — orchestrates smaller hooks; contains no business logic
  itself.
- **Query/mutation hooks** (`src/hooks/<domain>/use-<name>.ts`) — one
  responsibility each, **≤50 lines**. All GETs via `useQuery` with query-key
  factories; all writes via `useMutation` with `onSuccess` invalidation + an
  `onError` surfacing path.
- **Repository** (`src/repositories/<domain>/`) — the only place `fetch`/API
  calls live.
- **Components** (`src/components/<feature>/`) — presentational, props-only, no
  internal data fetching.

## Hard rules (from `rules/03-frontend-rules.md`)

- **TSX files contain ONLY component definitions.** No hooks, no inline
  types/enums/consts, no utility functions, no inline sub-components, no raw
  third-party imports. Extract to `src/{types,enums,constants,hooks,utilities}/`.
- **Never call a React hook directly in a `.tsx` file** — only one controller
  hook per page/component.
- **shadcn/ui for all form controls** — no raw `<select>`/`<input>`/`<textarea>`.
- **No `dangerouslySetInnerHTML`**, no `any`, no `eslint-disable`, no
  `console.log` (only `warn`/`error`).
- All type imports use `import type`.

## State management

- **TanStack Query** — all server state (queries + mutations). Query keys in
  `src/repositories/shared/query-keys.ts`.
- **Zustand** — minimal client-only state (auth, sidebar, log filters).
- **React hooks** — component-level state. Derive rather than duplicate.
- Per-row mutation state via `pendingId`, not a single `isMutating` boolean.

## Styling

- CSS variables for theming (`--background`, `--primary`, …); semantic Tailwind
  classes (`text-muted-foreground`, `bg-card`). **No `dark:` prefixes** — CSS
  variables handle dark mode. `cn()` from `@/lib/utils` for conditional classes.
  Mobile-first breakpoints.

## i18n (9 locales)

- Locales: **en, ar, de, es, fr, hi, it, pt, ru** — Arabic is RTL.
- All user-facing text via `t('key')`; **never hardcode**.
- Files: `src/lib/i18n/locales/<locale>.ts`. Type schema:
  `src/types/i18n.types.ts`.
- **Atomic rule:** adding a key means updating **all 9 locale files AND
  `i18n.types.ts` in the same change**. Never copy English into non-English
  locales as a placeholder — write a real translation. `t()` is NOT type-safe
  against the dictionary, so spot-check a non-EN locale (de or ar) after adding
  keys. Audit: `node tools/audit-untranslated-i18n.cjs`.

## FE ⇄ BE contract discipline

- **FE type field names mirror BE DTO/Prisma names verbatim** — renaming
  `createdAt`→`receivedAt` silently breaks date rendering (typecheck won't catch
  it).
- When the BE Zod schema is `.strict()`, the FE filter type must be the **exact**
  accepted-key set, not a superset — a dead field 400s the whole request.
- BE contract changes → sync `src/types/`. See
  [declaration-ownership-map.md](declaration-ownership-map.md).

## Validation lane

```bash
cd apps/claw-frontend
npm run typecheck   # tsgo --noEmit
npm run lint
npm test            # vitest run
npm run build
npm run test:e2e    # playwright (when journeys change)
```

Pages must be visually spot-checked in a real browser (loading/empty/error/
success, dark mode, Arabic RTL, mobile 375×812). Real URL is
`https://claw.local`.
