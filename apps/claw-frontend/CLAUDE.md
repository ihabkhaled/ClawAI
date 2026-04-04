# Claw Frontend - Development Rules & Standards

## Architecture Pattern

```
View (TSX) -> Controller (Hook) -> Service -> Repository/API
```

- **View (.tsx):** Pure render composition. No logic, no hooks (except controller hook), no fetch calls.
- **Controller Hook (useX):** Orchestrates state, queries, mutations, and side effects for a view.
- **Service:** Business logic orchestration layer. Transforms data, validates, composes repository calls.
- **Repository/API:** Raw API call wrappers. One function per endpoint.

---

## Absolute Rules

1. **NEVER** use `any` — use `unknown`, generics, or proper types.
2. **NEVER** disable ESLint rules — no `eslint-disable`, `@ts-ignore`, or `@ts-expect-error`.
3. **NEVER** use `console.log` — only `console.warn` and `console.error` are permitted.
4. **NEVER** use `!` non-null assertion operator.
5. **NEVER** use `==` or `!=` — always use `===` and `!==`.
6. **NEVER** use `var` — prefer `const`, use `let` only when reassignment is required.
7. **NEVER** hardcode user-facing text — prepare for i18n by extracting strings to constants or translation files.
8. **NEVER** use raw HTML `<select>`, `<input>`, or `<textarea>` — use shadcn/ui components.
9. **NEVER** put `const`, `interface`, `enum`, or `type` declarations inside component, hook, service, or store files — extract to dedicated files.
10. **NEVER** put custom hooks inside component files — hooks go in `src/hooks/`.
11. **NEVER** put utility functions inside component files — move to `src/utilities/` or `src/lib/`.
12. **NEVER** call hooks directly in `.tsx` files except through a single controller hook (extracted to `src/hooks/`).
13. **NEVER** use string literal unions for domain values — use enums from `src/enums/`.
14. **NEVER** compare domain values with raw strings — use enum comparisons.
15. **NEVER** use `dangerouslySetInnerHTML`.
16. **NEVER** store secrets in `localStorage` or browser state.
17. **NEVER** inline `fetch` calls in TSX — use repository functions.
18. **TSX files = pure render composition ONLY.** No business logic.
19. All GET requests use TanStack Query `useQuery`.
20. All mutations use TanStack Query `useMutation`.
21. Query keys must be structured and reusable — use query key factories in `src/repositories/shared/query-keys.ts`.
22. All protected pages must use the auth guard.
23. Every page needs loading, empty, and error states handled.
24. No inline domain types, enums, or constants in TSX files.
25. Use `type` over `interface` unless declaration merging is needed.
26. All imports of types must use `import type { ... }` syntax.
27. Always handle API errors — never swallow errors silently.
28. Use `cn()` from `@/lib/utils` for conditional Tailwind classes.
29. No default exports except for Next.js pages/layouts.
30. No circular dependencies between modules.

---

## Library Wrapping Rule
Every third-party library MUST be wrapped in a dedicated module. Components, hooks, services, and repositories NEVER import third-party packages directly — they import the wrapper. If the library changes, only the wrapper file needs updating.

**Already wrapped:**
- `src/services/shared/api-client.ts` wraps `fetch`
- `src/lib/utils.ts` wraps `clsx` + `tailwind-merge`

**Pattern for new libraries:** Create a wrapper in `src/utilities/<name>.utility.ts` or `src/lib/<name>.ts`, then import from the wrapper everywhere.

## Extraction Table

| What               | Where                                        |
| ------------------ | -------------------------------------------- |
| Hooks              | `src/hooks/useX.ts`                          |
| Types              | `src/types/<domain>.types.ts`                |
| Enums              | `src/enums/<name>.enum.ts`                   |
| Constants          | `src/constants/<name>.constants.ts`          |
| Query keys         | `src/repositories/shared/query-keys.ts`      |
| Helpers / Utils    | `src/utilities/<name>.utility.ts`            |
| Schemas            | `src/lib/validation/<name>.schema.ts`        |
| Repositories       | `src/repositories/<domain>.repository.ts`    |
| Services           | `src/services/<domain>.service.ts`           |
| UI Primitives      | `src/components/ui/` (shadcn/ui generated)   |
| Common Components  | `src/components/common/`                     |
| Layout Components  | `src/components/layout/`                     |

---

## TanStack Query Patterns

### Query Key Factories

```typescript
// src/repositories/shared/query-keys.ts
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: AgentFilters) => [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
};
```

### Rules

- `useQuery` for all reads — never raw fetch in components.
- `useMutation` for all writes — with `onSuccess` invalidation.
- Use `placeholderData: keepPreviousData` for paginated queries.
- Use `isFetching` (not `isLoading`) for DataTable loading prop.
- Prefer `invalidateQueries` over manual `refetch`.
- Wrap query/mutation hooks in controller hooks — never call `useQuery`/`useMutation` directly in TSX.

---

## Styling Rules

- Use CSS variables for theming (`--background`, `--foreground`, `--primary`, etc.).
- Use semantic Tailwind classes (`text-muted-foreground`, `bg-card`, `border-border`, etc.).
- **No** `dark:` prefixes — CSS variables handle dark mode automatically.
- **No** raw color classes (`text-blue-500`) for semantic meaning — use design tokens.
- Use `cn()` for combining conditional classes.
- Responsive design: mobile-first with `sm:`, `md:`, `lg:` breakpoints.

---

## Component Rules

- **shadcn/ui** for all form inputs (Input, Select, Textarea, Checkbox, etc.).
- **DataTable** for all tabular data display.
- **PageHeader** for consistent page headers.
- **EmptyState** for empty data states.
- **StatusBadge** for status display with color coding.
- **Skeleton** components for loading states.
- All components receive data via props — no internal data fetching.

---

## File Organization

```
src/
  app/                    # Next.js App Router pages and layouts
  components/
    ui/                   # shadcn/ui primitives (auto-generated, do not manually edit)
    common/               # Shared composed components
    layout/               # Shell layout components
    <feature>/            # Feature-specific composed components
  hooks/                  # Controller hooks and shared hooks
  services/               # Business logic orchestration
  repositories/           # API call wrappers
    shared/               # Shared query keys, API client
  types/                  # TypeScript type definitions
  enums/                  # TypeScript enum definitions
  constants/              # Application constants
  utilities/              # Helper/utility functions
  lib/                    # Framework utilities (cn, validation schemas)
    validation/           # Zod schemas
  stores/                 # Zustand stores (minimal client-only state)
```

---

## Commands

| Command              | Description                                    |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Development server on port 3000                |
| `npm run build`      | Production build                               |
| `npm run lint`       | ESLint check                                   |
| `npm run lint:strict`| ESLint check with zero warnings                |
| `npm run lint:fix`   | ESLint auto-fix                                |
| `npm run format`     | Prettier format all source files               |
| `npm run format:check`| Check formatting without writing              |
| `npm run typecheck`  | TypeScript type checking                       |
| `npm run validate`   | Full validation (typecheck + lint + format)     |
| `npm run test`       | Run unit tests                                 |
| `npm run test:watch` | Run tests in watch mode                        |
| `npm run test:cov`   | Run tests with coverage                        |
| `npm run test:e2e`   | Run Playwright end-to-end tests                |

---

## Code Quality Checklist

Before every commit, verify:

- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint:strict` passes with zero warnings
- [ ] `npm run format:check` passes
- [ ] No `any` types anywhere
- [ ] No `eslint-disable` comments
- [ ] No `console.log` statements
- [ ] All new pages have loading, empty, and error states
- [ ] All new API calls go through repositories
- [ ] All new queries use TanStack Query with proper key factories
- [ ] All types extracted to `src/types/`
- [ ] All enums extracted to `src/enums/`
- [ ] All constants extracted to `src/constants/`
- [ ] TSX files contain only render composition

---

## Security Rules

1. Never store API keys, tokens, or secrets in client-side code or browser storage.
2. All sensitive configuration goes through environment variables (`NEXT_PUBLIC_` prefix for client-accessible only).
3. Validate all user input with Zod schemas before processing.
4. Sanitize any data rendered from external sources.
5. Use HTTPS for all API calls.
6. Implement proper CSRF protection for mutations.
7. Never expose internal error details to users — show user-friendly messages.
8. Auth tokens must be stored securely (httpOnly cookies preferred over localStorage).
