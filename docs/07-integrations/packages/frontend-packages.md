# ClawAI — Frontend NPM Packages Reference

> Key third-party packages in `apps/claw-frontend`. Each entry covers purpose, how we use it, and gotchas.

---

## Framework

### `next` (16.2.x) + `react` (19.2.x) + `react-dom`

**Purpose**: App Router, SSR, RSC, image optimization.  
**App Router**: All pages in `src/app/(portal)/` use the Next.js App Router with layout.tsx.  
**Auth pattern**: Middleware redirects unauthenticated users from `(portal)` routes to `/login`.  
**Gotcha**: Pages that use client hooks must be `'use client'` components. Server Components cannot use React state.

---

## Server State (Data Fetching)

### `@tanstack/react-query` (v5)

**Purpose**: All server state — fetching, caching, mutations, invalidation, infinite scroll.  
**Never call**: `useQuery` / `useMutation` directly in `.tsx` files — always wrap in custom hooks.  
**Query keys**: All keys defined in `src/repositories/shared/query-keys.ts`.  
**Mutation pattern**:

```typescript
const mutation = useMutation({
  mutationFn: repository.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.lists() }),
});
```

**Polling**: Use `refetchInterval` for polling. Stop condition: check `meta?.error === true` in response data.  
**Gotcha**: `isLoading` is only true on first load. Use `isFetching` for DataTable loading indicators.

---

## Client State

### `zustand` (v4)

**Purpose**: Minimal client-only state not appropriate for server state.  
**Stores**:

- `src/stores/auth.store.ts` — current user, JWT tokens, auth status
- `src/stores/sidebar.store.ts` — sidebar open/closed state
- `src/stores/log-filters.store.ts` — observability page filter state
  **Rule**: DO NOT put server data in Zustand. If it comes from an API, use TanStack Query.

---

## UI Components

### `@radix-ui/*`

**Purpose**: Unstyled, accessible primitives underlying all shadcn/ui components.  
**Packages used**: avatar, checkbox, dialog, dropdown-menu, label, popover, progress, scroll-area, select, separator, slider, switch, tabs, toast, toggle  
**Gotcha**: Never import from `@radix-ui` directly in components — use the shadcn wrapper in `src/components/ui/`.

### `class-variance-authority` (CVA)

**Purpose**: Type-safe variant system for components.  
**Usage**: Used inside shadcn/ui component definitions. Rarely used directly in feature code.

### `clsx` + `tailwind-merge`

**Purpose**: Merges class names intelligently (resolves Tailwind conflicts).  
**Wrapper**: `src/lib/utils.ts` exports `cn()` — always use `cn()`, never `clsx` or `tailwind-merge` directly.

### `tailwindcss` + `tailwindcss-animate`

**Purpose**: Utility-first CSS. All styling uses Tailwind classes.  
**Theme**: CSS variables only — no `dark:` prefix classes. Variables defined in `src/app/globals.css`.

### `lucide-react`

**Purpose**: Icon library. All icons imported directly:

```typescript
import { Settings, Trash2, ArrowLeft } from 'lucide-react';
```

---

## Forms and Validation

### `zod` (v3)

**Purpose**: Frontend form validation schemas.  
**Location**: `src/lib/validation/<name>.schema.ts`  
**Pattern**: Schema + inferred type, used with react-hook-form or manual `.parse()`.

### `@hookform/resolvers` + `react-hook-form`

**Purpose**: Form state management with Zod schema integration.  
**Usage**: Used for complex forms (connector creation, thread settings). Simpler forms use controlled inputs directly.

---

## Content Rendering

### `react-markdown`

**Purpose**: Renders AI message content (markdown → HTML).

### `remark-gfm`

**Purpose**: GitHub Flavored Markdown support (tables, strikethrough, task lists).

### `rehype-highlight`

**Purpose**: Syntax highlighting in code blocks within markdown responses.

---

## Virtualization

### `react-virtuoso`

**Purpose**: Virtualized list for chat message history. Renders only visible messages.  
**Used in**: `VirtualizedMessages` component  
**Gotcha**: Virtuoso must know the scroll direction. `firstItemIndex` management is critical for loading previous pages (prepending messages).

---

## Theme

### `next-themes`

**Purpose**: System-aware dark/light mode with `localStorage` persistence.  
**Integration**: Reads CSS variables — the actual dark mode is implemented via CSS variable swapping, not Tailwind `dark:` classes.

---

## Testing

### `vitest` + `@vitest/ui`

**Purpose**: Unit/component test runner for frontend.  
**Config**: `vitest.config.ts` — uses `@vitejs/plugin-react` transformer.  
**Gotcha**: May fail with Node.js v24+ due to rollup native binary issues. Run inside Docker or use process cache if issues arise.

### `@testing-library/react` + `@testing-library/jest-dom`

**Purpose**: React component testing utilities.

### `@playwright/test`

**Purpose**: E2E browser testing.  
**Specs location**: `tests/e2e/` or `src/**/*.e2e.ts`
