# ADR-007: Zustand for Client State

## Status

Accepted (2025-Q1)

## Context

With TanStack Query handling all server state (fetched data, cache, mutations), the frontend still needs a solution for client-only state that does not come from the server:

- **Auth state**: Current user, JWT token, login status
- **UI state**: Sidebar collapsed/expanded, active tab, modal open/closed
- **Log filters**: Selected severity levels, date ranges, search terms in the observability pages

This state is small in volume, rarely changes, and does not need persistence beyond the browser session. The team needed a state management library that is minimal, TypeScript-friendly, and does not impose boilerplate.

## Decision

Use Zustand for all client-only state. Each state domain gets its own store file in `src/stores/<name>.store.ts`.

### Current Stores

| Store          | State                                           |
| -------------- | ----------------------------------------------- |
| `auth.store`   | User object, access token, login/logout actions |
| `sidebar.store`| Collapsed state, active section                 |
| `log.store`    | Severity filter, date range, search query       |

### Key Patterns

- **Minimal stores**: Each store holds 3-10 state values. No mega-stores.
- **Actions alongside state**: Zustand stores define actions (functions) alongside state values in the same `create()` call.
- **No computed state in stores**: Derived values are computed in hooks or components, not stored.
- **Selectors**: Components select only the state they need to minimize re-renders.

## Consequences

### Positive

- **Minimal boilerplate**: A Zustand store is a single function call. No providers, reducers, action creators, or slices.
- **TypeScript-first**: Full type inference with no extra type definitions needed.
- **No provider wrapping**: Unlike Redux or React Context, Zustand stores work without wrapping the component tree in a provider.
- **Selective re-renders**: Components subscribe to specific state slices, re-rendering only when their slice changes.
- **Small bundle**: Zustand is approximately 1 KB gzipped.

### Negative

- **No middleware ecosystem**: Redux has a vast middleware ecosystem (logging, persistence, dev tools). Zustand has basic middleware but less variety.
- **No time-travel debugging**: Redux DevTools supports time-travel. Zustand has a devtools middleware but it is less polished.
- **Split brain risk**: If server state accidentally leaks into Zustand stores (instead of TanStack Query), it creates two sources of truth. Mitigated by strict code review: only true client state belongs in Zustand.

## Alternatives Considered

### Redux Toolkit

The standard for large-scale React state management. Provides slices, thunks, RTK Query, and excellent DevTools. However, Redux adds significant boilerplate (even with RTK) and is overkill when TanStack Query already handles server state. Rejected for excessive complexity given the small amount of client state.

### React Context + useReducer

Built-in React primitives. No extra dependency. However, Context causes re-renders for all consumers when any value changes (no selective subscriptions). For frequently changing state (e.g., sidebar toggle), this causes unnecessary re-renders. Rejected for performance concerns.

### Jotai

Atomic state management. Each piece of state is an independent atom. Good for fine-grained reactivity but the mental model (atoms, derived atoms, atom families) is more complex than Zustand's store-based approach. Rejected for higher cognitive overhead with no practical benefit at this scale.

### Valtio

Proxy-based state management. Mutate state directly and it reacts. Simple API but proxy-based reactivity can cause unexpected behavior with complex objects. Rejected for less predictable behavior compared to Zustand's explicit selectors.
