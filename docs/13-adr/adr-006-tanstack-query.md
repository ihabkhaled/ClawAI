# ADR-006: TanStack Query for Server State

## Status

Accepted (2025-Q1)

## Context

The Next.js frontend communicates with 13 backend services through an Nginx reverse proxy. Nearly every page fetches data from one or more services: threads, messages, connectors, models, memories, files, audit logs, and more.

Managing server state (fetched data, loading states, error states, cache invalidation, refetching) manually with `useState` + `useEffect` leads to:

- Duplicated loading/error boilerplate in every component
- No automatic cache invalidation when data changes
- No background refetching or stale-while-revalidate
- Race conditions with concurrent fetches
- Manual retry logic scattered across the codebase

## Decision

Use TanStack Query (React Query v5) for all server state management. Every API call goes through a repository function, wrapped in a custom hook that uses `useQuery` or `useMutation`.

### Architecture

```
Page → Controller Hook → useQuery/useMutation hooks → Repository → HTTP Client → Nginx → Service
```

### Key Patterns

- **Query key factories** in `src/repositories/shared/query-keys.ts` ensure consistent cache keys
- **Custom hooks** wrap every `useQuery`/`useMutation` call (e.g., `useThreadList()`, `useSendMessage()`)
- **Optimistic updates** for mutations that need instant UI feedback
- **Automatic invalidation** via `onSuccess` callbacks that invalidate related query keys
- **No direct useQuery in TSX**: All query hooks live in `src/hooks/<domain>/use-<name>.ts`

## Consequences

### Positive

- **Automatic caching**: Fetched data is cached by query key. Navigating back to a page shows cached data instantly while refetching in the background.
- **Stale-while-revalidate**: Users see data immediately, even if it might be slightly stale. Fresh data replaces it seamlessly.
- **Loading/error states for free**: Every `useQuery` returns `isLoading`, `isError`, `error`, and `data` without boilerplate.
- **Automatic retry**: Failed queries retry 3 times with exponential backoff by default.
- **Deduplication**: Multiple components requesting the same data produce a single network request.
- **DevTools**: TanStack Query DevTools provides visibility into cache state, active queries, and mutations during development.

### Negative

- **Learning curve**: Developers unfamiliar with TanStack Query need to understand query keys, stale time, cache time, and invalidation patterns.
- **Over-fetching risk**: If stale time is too short, the UI refetches data on every focus event. Mitigated by tuning `staleTime` per query.
- **Hook proliferation**: Each query/mutation gets its own hook file, leading to many small files. This is intentional (single responsibility) but adds file count.

## Alternatives Considered

### SWR

Vercel's data fetching library. Lighter than TanStack Query but lacks built-in mutation support, optimistic updates, and query key factories. Rejected for insufficient mutation handling.

### Redux Toolkit Query (RTK Query)

Integrated with Redux, provides auto-generated hooks from API definitions. Powerful but requires Redux as a dependency, which adds unnecessary complexity when we only need server state management. Rejected because we chose Zustand for client state (see ADR-007).

### Plain fetch + useState + useEffect

No library, just manual data fetching. Simplest to understand but requires duplicating loading/error/retry logic across every page. Rejected for excessive boilerplate and lack of caching.
