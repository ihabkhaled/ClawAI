# Frontend Coding Standards

> Enforced rules for the ClawAI Next.js frontend. All rules are mandatory unless explicitly stated otherwise.

---

## 1. Absolute Rules

These rules apply to ALL frontend code without exception:

| #   | Rule                                                                                           | Rationale                                                    |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | NEVER use `any` -- use `unknown`, generics, or proper types                                    | Type safety across the entire codebase                       |
| 2   | NEVER disable ESLint rules (`eslint-disable`) -- fix the underlying issue                      | Prevents rule erosion                                        |
| 3   | NEVER use string literal unions (`'a' \| 'b'`) -- use enums from `src/enums/`                  | Single source of truth for domain values                     |
| 4   | NEVER compare domain values with raw strings -- use enum comparisons                           | Refactoring safety                                           |
| 5   | NEVER log secrets, tokens, API keys, passwords                                                 | Security requirement                                         |
| 6   | NEVER expose secrets to the frontend                                                           | Only `NEXT_PUBLIC_*` vars are allowed client-side            |
| 7   | NEVER allow missing explicit return types                                                      | Prevents accidental type widening                            |
| 8   | NEVER build god-files -- keep modules focused and small                                        | Maintainability                                              |
| 9   | NEVER define types/interfaces/enums/constants inline -- extract to dedicated files             | Consistent extraction pattern                                |
| 10  | NEVER put business logic in page components                                                    | Pages are pure render composition                            |
| 11  | NEVER use `process.env` directly in components -- use constants or config                      | Centralized configuration                                    |
| 12  | NEVER use `console.log` -- use `console.warn`, `console.error`, or logger utility              | No debug noise in production                                 |
| 13  | NEVER use `!` non-null assertion -- handle nullability explicitly                              | Runtime safety                                               |
| 14  | NEVER use `==` or `!=` -- always use `===` and `!==`                                           | No type coercion bugs                                        |
| 15  | NEVER use `var` -- use `const`, or `let` only when reassignment is required                    | Block scoping                                                |
| 16  | NEVER add features without tests -- every new function needs a test                            | Quality gate                                                 |
| 17  | NEVER add user-facing text without i18n -- extract to translation files                        | All 8 locales must stay in sync                              |
| 18  | NEVER import 3rd-party libraries directly -- wrap in `src/utilities/<name>.utility.ts`         | If the library changes, only the wrapper file needs updating |
| 19  | NEVER use `dangerouslySetInnerHTML`                                                            | XSS prevention                                               |
| 20  | NEVER use raw HTML form elements (`<select>`, `<input>`, `<textarea>`) -- use shadcn/ui        | Consistent UI, accessible by default                         |
| 21  | NEVER use `dark:` Tailwind prefixes -- CSS variables handle dark mode                          | Single theming mechanism                                     |
| 22  | NEVER use raw color classes (`text-blue-500`) for semantic meaning -- use CSS variable classes | Theme compatibility                                          |
| 23  | NEVER use default exports except for Next.js pages/layouts                                     | Consistent named imports                                     |
| 24  | NEVER call `useQuery`/`useMutation` directly in TSX files -- wrap in custom hooks              | Separation of concerns                                       |
| 25  | NEVER fetch data inside components -- components receive data via props                        | Unidirectional data flow                                     |
| 26  | NEVER use inline styles -- use Tailwind classes via `cn()`                                     | Consistent styling                                           |
| 27  | NEVER skip loading, empty, and error states on pages                                           | Complete UX                                                  |
| 28  | NEVER prop-drill beyond 2 levels -- use composition or context                                 | Maintainability                                              |
| 29  | All type imports must use `import type { ... }` syntax                                         | Tree-shaking, clarity                                        |
| 30  | Use `type` over `interface` unless declaration merging is needed                               | Consistency                                                  |

---

## 2. Component Rules

### Structure

- Each component does **ONE thing**. If it does two things, split it.
- Props-only data flow. Components NEVER fetch data internally.
- Every component that needs logic gets its own hook.

### Required States

Every page must handle three states:

```tsx
function DashboardPage(): ReactElement {
  const { data, isLoading, error } = useDashboardPage();

  if (isLoading) {
    return <DashboardSkeleton />;
  }
  if (error) {
    return <ErrorState message={error.message} />;
  }
  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return <DashboardContent data={data} />;
}
```

### shadcn/ui

- All form inputs MUST use shadcn/ui components (`Input`, `Select`, `Textarea`, `Checkbox`, etc.).
- shadcn/ui files in `src/components/ui/` are auto-generated. **Do not edit them manually.**
- Custom components compose shadcn/ui primitives, they do not replace them.

### JSX Rules (ESLint enforced)

| Rule                                | Setting                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `jsx-no-target-blank`               | Error                                                          |
| `jsx-boolean-value`                 | Never (use `<Comp disabled />` not `<Comp disabled={true} />`) |
| `jsx-curly-brace-presence`          | Never for string literals                                      |
| `self-closing-comp`                 | Error (use `<Comp />` not `<Comp></Comp>`)                     |
| `no-danger`                         | Error                                                          |
| `no-unstable-nested-components`     | Error                                                          |
| `jsx-no-useless-fragment`           | Error                                                          |
| `jsx-no-constructed-context-values` | Error                                                          |

### Accessibility (JSX-a11y)

| Rule                             | Level   |
| -------------------------------- | ------- |
| `alt-text` (images)              | Error   |
| `anchor-is-valid`                | Error   |
| `click-events-have-key-events`   | Warning |
| `no-static-element-interactions` | Warning |
| `label-has-associated-control`   | Warning |

---

## 3. Hook Rules

### Organization

Hooks are organized by domain under `src/hooks/<domain>/`:

```
hooks/
  auth/use-login.ts
  auth/use-logout.ts
  auth/use-current-user.ts
  auth/use-auth-guard.ts
  chat/use-threads.ts
  chat/use-send-message.ts
  chat/use-chat-stream.ts
  chat/use-thread-detail.ts
  chat/use-thread-settings.ts
  chat/use-create-thread.ts
  chat/use-delete-thread.ts
  ...
```

### One Hook, One Responsibility

**Wrong:**

```typescript
// Giant hook that does everything
function useChat() {
  // 200 lines of mixed concerns
}
```

**Right:**

```typescript
// Controller hook orchestrates focused hooks
function useChatPage() {
  const threads = useThreads();
  const createThread = useCreateThread();
  const sendMessage = useSendMessage();
  return { threads, createThread, sendMessage };
}
```

### Hook File Rules

- Hooks MUST be in `src/hooks/<domain>/use-<name>.ts` -- NEVER inside component files.
- Each hook file exports ONE hook.
- Controller hooks (page-level) are named `use-<page>-page.ts`.
- No inline types/enums/constants in hook files.

---

## 4. Query Patterns

### useQuery (GET requests)

```typescript
export function useMemories(filters: MemoryFilters): UseQueryResult<MemoryListResponse> {
  return useQuery({
    queryKey: queryKeys.memory.list(filters),
    queryFn: () => memoryRepository.list(filters),
  });
}
```

### useMutation (POST/PUT/DELETE)

```typescript
export function useCreateMemory(): UseMutationResult<MemoryRecord, Error, CreateMemoryPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMemoryPayload) => memoryRepository.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
  });
}
```

### Query Key Factory

All query keys are defined in `src/repositories/shared/query-keys.ts`:

```typescript
export const queryKeys = {
  threads: {
    all: ['threads'] as const,
    lists: () => [...queryKeys.threads.all, 'list'] as const,
    list: (filters) => [...queryKeys.threads.lists(), filters] as const,
    detail: (id) => [...queryKeys.threads.all, 'detail', id] as const,
    messages: (threadId, page?) => [...queryKeys.threads.all, 'messages', threadId, page] as const,
  },
  // ... other domains
} as const;
```

**Key design principles:**

- Hierarchical keys enable granular or broad invalidation.
- `queryKeys.threads.all` invalidates everything thread-related.
- `queryKeys.threads.detail(id)` invalidates only one thread.
- All filters/params are part of the key for automatic refetching.

---

## 5. Styling Rules

### CSS Variables (mandatory)

All colors must reference CSS custom properties. Themes switch by changing variable values:

```tsx
// CORRECT
<div className="bg-background text-foreground border-border" />
<p className="text-muted-foreground" />
<button className="bg-primary text-primary-foreground" />

// WRONG
<div className="bg-white dark:bg-gray-900 text-black dark:text-white" />
<button className="bg-blue-600 text-white" />
```

### cn() Utility

Always use `cn()` for conditional classes (wraps `clsx` + `tailwind-merge`):

```tsx
import { cn } from '@/lib/utils';

<div
  className={cn(
    'flex items-center gap-2 rounded-md p-3',
    isActive && 'bg-accent text-accent-foreground',
    isDisabled && 'opacity-50 pointer-events-none',
  )}
/>;
```

### Responsive Design

Mobile-first approach with Tailwind breakpoints:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" />
```

### No Inline Styles

```tsx
// WRONG
<div style={{ marginTop: '16px', color: 'red' }} />

// CORRECT
<div className="mt-4 text-destructive" />
```

---

## 6. Extraction Rules

Every piece of code has a designated location. Nothing lives inline.

| What                 | Where                                              | Example                                    |
| -------------------- | -------------------------------------------------- | ------------------------------------------ |
| Types                | `src/types/<domain>.types.ts`                      | `src/types/chat.types.ts`                  |
| Component prop types | `src/types/component.types.ts`                     | `ChatMessageProps`, `ThreadListProps`      |
| Enums                | `src/enums/<name>.enum.ts`                         | `src/enums/routing-mode.enum.ts`           |
| Constants            | `src/constants/<name>.constants.ts`                | `src/constants/api.constants.ts`           |
| Hooks                | `src/hooks/<domain>/use-<name>.ts`                 | `src/hooks/chat/use-send-message.ts`       |
| Utilities            | `src/utilities/<name>.utility.ts`                  | `src/utilities/date.utility.ts`            |
| Repositories         | `src/repositories/<domain>/<domain>.repository.ts` | `src/repositories/chat/chat.repository.ts` |
| Query keys           | `src/repositories/shared/query-keys.ts`            | Single file, all domains                   |
| Zod schemas          | `src/lib/validation/<name>.schema.ts`              | `src/lib/validation/login.schema.ts`       |
| Stores               | `src/stores/<name>.store.ts`                       | `src/stores/auth.store.ts`                 |
| i18n types           | `src/types/i18n.types.ts`                          | Translation key definitions                |

---

## 7. File-Specific ESLint Restrictions

### TSX Component Files

| Restriction                                                    | Details                            |
| -------------------------------------------------------------- | ---------------------------------- |
| No inline `TSInterfaceDeclaration`                             | Extract to `src/types/`            |
| No inline `TSTypeAliasDeclaration`                             | Extract to `src/types/`            |
| No inline `TSEnumDeclaration`                                  | Extract to `src/enums/`            |
| No inline hooks (`useX`)                                       | Extract to `src/hooks/`            |
| No `SCREAMING_CASE` constants                                  | Extract to `src/constants/`        |
| No utility functions (`format*`, `parse*`, `transform*`, etc.) | Extract to `src/utilities/`        |
| No module-level `const` (except component definitions)         | Extract to `src/constants/`        |
| No non-PascalCase function declarations                        | Only component definitions allowed |

### Hook and Store Files

| Restriction                                | Details                     |
| ------------------------------------------ | --------------------------- |
| No inline types/enums                      | Extract to dedicated files  |
| No inline constants (except objects/calls) | Extract to `src/constants/` |

### Service Files

| Restriction           | Details                     |
| --------------------- | --------------------------- |
| No inline types/enums | Extract to dedicated files  |
| No inline constants   | Extract to `src/constants/` |

### Exemptions

| File Type                      | Restrictions                          |
| ------------------------------ | ------------------------------------- |
| `src/components/ui/*` (shadcn) | All restrictions OFF (auto-generated) |
| `*.test.ts` / `*.test.tsx`     | All restrictions OFF, `any` allowed   |

---

## 8. ESLint Plugin Summary

### Plugins Active

| Plugin                       | Purpose                         |
| ---------------------------- | ------------------------------- |
| `typescript-eslint` (strict) | TypeScript-specific rules       |
| `eslint-plugin-security`     | Security anti-patterns          |
| `eslint-plugin-unicorn`      | Modern JS patterns              |
| `eslint-plugin-import-x`     | Import organization             |
| `eslint-plugin-react`        | React-specific rules            |
| `eslint-plugin-react-hooks`  | Rules of hooks, exhaustive deps |
| `eslint-plugin-jsx-a11y`     | Accessibility                   |

### Import Order (enforced)

```typescript
// 1. Builtin (node:*)
import { readFile } from 'node:fs';

// 2. External
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal (@/*)
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatThread } from '@/types/chat.types';

// 4. Parent
import { SharedComponent } from '../shared';

// 5. Sibling
import { helper } from './helper';

// 6. Index
import { config } from './';
```

Groups are separated by blank lines. Alphabetized within groups. `@/**` paths treated as internal.

---

## 9. Code Quality Checklist

Before submitting any frontend change, verify:

- [ ] No `any` types anywhere in the change
- [ ] No `eslint-disable` comments
- [ ] No `console.log` statements
- [ ] All type imports use `import type` syntax
- [ ] All new user-facing text added to ALL 8 locale files
- [ ] All new API calls go through repositories
- [ ] All new hooks extracted to `src/hooks/<domain>/`
- [ ] All new types extracted to `src/types/`
- [ ] All new constants extracted to `src/constants/`
- [ ] All new pages handle loading, empty, and error states
- [ ] No raw HTML form elements (using shadcn/ui)
- [ ] No inline styles (using Tailwind via `cn()`)
- [ ] No `dark:` prefixes (using CSS variables)
- [ ] Tests written for new hooks and utilities
- [ ] TypeScript strict mode passes with 0 errors
- [ ] ESLint passes with 0 errors
- [ ] Prettier formatting applied

---

## 10. Commit Standards

Conventional commits are enforced by commitlint:

```
feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert
```

**Subject constraints:**

- Maximum 100 characters
- No sentence-case, start-case, pascal-case, or upper-case
- Lowercase only

**Examples:**

```
feat: add context pack selector to thread settings
fix: resolve token refresh race condition in axios interceptor
refactor: extract message formatting to utility
```
