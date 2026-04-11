# ADR-013: Hook Extraction Pattern

## Status

Accepted (2025-Q1)

## Context

In the early frontend development, React components mixed rendering logic with data fetching, state management, and side effects. A typical page component would contain:

- Multiple `useQuery` and `useMutation` calls
- `useState` for form state and UI toggles
- `useEffect` for side effects (scroll position, focus management)
- Event handlers with business logic (validation, transformation)
- Conditional rendering logic based on query states

This pattern created components that were 200-400 lines long, difficult to test (rendering + logic intertwined), and impossible to reuse the logic without copy-pasting.

## Decision

Extract all React hooks from TSX files into dedicated hook files. Each page or complex component gets a single "controller hook" that orchestrates smaller, single-purpose hooks.

### Architecture

```
Page.tsx
  → usePageController()          // One controller hook per page
    → useThreadList()            // Fetches thread list
    → useCreateThread()          // Mutation: create thread
    → useDeleteThread()          // Mutation: delete thread
    → useThreadFilters()         // Local state: search, sort
    → Returns: { threads, isLoading, createThread, deleteThread, filters, ... }
```

### Rules

1. **TSX files contain ZERO hooks** except the single controller hook call
2. **Controller hooks orchestrate** smaller hooks but contain no business logic themselves
3. **Each hook does ONE thing**: fetch data, mutate data, manage local state, or handle a side effect
4. **Max 50 lines per hook** (excluding imports and types)
5. **Hooks live in** `src/hooks/<domain>/use-<name>.ts`
6. **No inline hooks** in component files -- every `useX` must be importable

### Example

```typescript
// src/hooks/chat/use-thread-list-page.ts (controller hook)
export function useThreadListPage() {
  const threads = useThreadList();
  const createThread = useCreateThread();
  const deleteThread = useDeleteThread();
  const filters = useThreadFilters();
  
  return { ...threads, createThread, deleteThread, filters };
}

// src/app/(portal)/chat/page.tsx (page component)
export default function ChatPage() {
  const { threads, isLoading, error, createThread } = useThreadListPage();
  
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!threads.length) return <EmptyState onCreate={createThread} />;
  
  return <ThreadList threads={threads} />;
}
```

## Consequences

### Positive

- **Testable logic**: Hooks can be tested independently with `renderHook()` without rendering any UI.
- **Pure render components**: TSX files are pure functions of props. Easy to review for layout and accessibility.
- **Reusable logic**: A `useCreateThread()` hook can be used from any page that needs to create threads.
- **Separation of concerns**: Data fetching, state management, and rendering are in separate files with separate responsibilities.
- **Smaller files**: Instead of one 300-line component, you get a 30-line page + a 40-line controller + several 20-line hooks.

### Negative

- **File proliferation**: A single page might require 5-8 hook files. The `src/hooks/` directory grows quickly.
- **Indirection**: Reading a page requires jumping to the controller hook, then to individual hooks, to understand the full data flow.
- **Boilerplate for simple pages**: A page that only fetches one list still needs a controller hook wrapper. This is intentional (consistency) but feels heavy for simple cases.
- **Prop drilling from controller**: The controller hook returns a large object that must be destructured and passed to child components.

## Alternatives Considered

### Hooks Directly in TSX Files

Define hooks in the same file as the component. Simpler for small components but leads to the file bloat and testing problems described in the Context section. Rejected as the source of the problem.

### Custom Hook Per Component (No Controller)

Each component defines its own hooks without a controller layer. This works for leaf components but fails for pages that need to coordinate multiple queries and mutations. Rejected because coordination logic would end up in the TSX file.

### Higher-Order Components (HOCs)

Wrap components with data-fetching HOCs (e.g., `withThreadList(ThreadPage)`). This is the pre-hooks React pattern. Rejected because HOCs are harder to type, harder to compose, and harder to debug than hooks.

### Render Props

Pass data as render prop children (e.g., `<ThreadProvider>{(threads) => ...}</ThreadProvider>`). Functional but creates deeply nested JSX and is less ergonomic than hooks. Rejected for inferior developer experience.
