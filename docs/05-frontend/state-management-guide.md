# State Management Guide

> How ClawAI manages server state, client state, and component state.

---

## 1. State Management Strategy

ClawAI uses three distinct state management approaches, each for a specific category of state:

| Category         | Tool            | Purpose                               | Persistence        |
| ---------------- | --------------- | ------------------------------------- | ------------------- |
| Server State     | TanStack Query  | Data from the backend API             | Cache with TTL      |
| Client State     | Zustand         | App-level client-only state           | localStorage        |
| Component State  | React Hooks     | Ephemeral UI state (forms, toggles)   | None (in-memory)    |

**Decision rule:** If the data comes from the backend, use TanStack Query. If it is app-wide client state, use Zustand. If it is local to a single component, use React hooks.

---

## 2. Server State -- TanStack Query

### Configuration

TanStack Query is configured in `src/app/providers.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000,           // Data considered fresh for 5 seconds
      refetchInterval: 10 * 1000,     // Refetch every 10 seconds
      refetchOnWindowFocus: true,     // Refetch when user returns to tab
      refetchOnReconnect: true,       // Refetch when network reconnects
      retry: 1,                       // Retry failed requests once
    },
  },
});
```

The provider hierarchy is:

```
LocaleProvider > ThemeProvider > QueryClientProvider > children + Toaster
```

### Query Key Factory

All query keys are centralized in `src/repositories/shared/query-keys.ts`:

```typescript
export const queryKeys = {
  auth:         { me: ['auth', 'me'] },
  threads:      { all, lists, list, detail, messages, messagesInfinite, listInfinite },
  connectors:   { all, lists, list, detail, models },
  models:       { all },
  routing:      { config, policies: { all, lists, list }, decisions: { all, byThread } },
  localModels:  { all, lists },
  runtimes:     { all },
  clientLogs:   { all, lists, list, stats },
  serverLogs:   { all, lists, list, stats },
  audits:       { all, lists, list, stats },
  usage:        { all, lists, list, summary, cost, latency },
  admin:        { users },
  memory:       { all, lists, list, detail },
  contextPacks: { all, lists, detail },
  files:        { all, lists, list, detail, chunks },
  health:       { all, aggregated },
  dashboard:    { all, stats },
  catalog:      { all, lists, list, detail },
  pullJobs:     { all },
};
```

### Query Key Design Principles

- **Hierarchical**: `queryKeys.threads.all` invalidates everything thread-related
- **Granular**: `queryKeys.threads.detail(id)` invalidates only one thread
- **Filters as keys**: `queryKeys.threads.list(filters)` -- different filters = different cache entries
- **Infinite queries**: Separate keys for paginated vs infinite scroll variants

### useQuery Pattern (GET Requests)

All GET requests are wrapped in custom hooks:

```typescript
// src/hooks/chat/use-threads.ts
export function useThreads(filters: ThreadFilters) {
  return useQuery({
    queryKey: queryKeys.threads.list(filters),
    queryFn: () => chatRepository.listThreads(filters),
  });
}
```

**Rules:**
- Never call `useQuery` directly in a TSX file
- Always wrap in a custom hook in `src/hooks/<domain>/`
- Always use the query key factory

### useMutation Pattern (POST/PUT/DELETE)

All mutations invalidate relevant caches on success:

```typescript
// src/hooks/chat/use-create-thread.ts
export function useCreateThread() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateThreadPayload) =>
      chatRepository.createThread(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('chat.createFailed'));
    },
  });

  return { createThread: mutation.mutate, isPending: mutation.isPending };
}
```

**Rules:**
- Always invalidate affected queries in `onSuccess`
- Use `void` prefix when calling `invalidateQueries` (it returns a Promise)
- Show user feedback via `showToast` in `onError`
- Prefer `invalidateQueries` over manual `refetch`

### Infinite Queries

For virtualized scrolling (thread list, message list):

```typescript
export function useVirtualizedThreads(filters: ThreadFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.threads.listInfinite(filters),
    queryFn: ({ pageParam }) =>
      chatRepository.listThreads({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
  });
}
```

### Polling with refetchInterval

For real-time data updates (e.g., waiting for AI responses):

```typescript
useQuery({
  queryKey: queryKeys.threads.messages(threadId),
  queryFn: () => chatRepository.listMessages(threadId),
  refetchInterval: isWaitingForResponse ? 1000 : 10000, // Poll every 1s while waiting
});
```

---

## 3. Client State -- Zustand

Zustand is used for minimal client-only state. Three stores exist:

### Auth Store (`src/stores/auth.store.ts`)

Stores authentication tokens and user profile. Persisted to localStorage under `claw-auth-storage`.

```typescript
export const useAuthStore = create<AuthStoreState & AuthStoreActions>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      clearAuth: () => set(AUTH_INITIAL_STATE),
    }),
    {
      name: 'claw-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
```

**Usage:**
```typescript
const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
const clearAuth = useAuthStore((state) => state.clearAuth);
```

### Sidebar Store (`src/stores/sidebar.store.ts`)

Stores sidebar expanded/collapsed state. Persisted to localStorage.

### Log Store (`src/stores/log.store.ts`)

Stores log page filter state (level, service, date range). Not persisted.

### Zustand Rules

1. **Minimal usage** -- only for true client-only state
2. **No server data** -- never cache API responses in Zustand
3. **Types in `src/types/store.types.ts`** -- not inline
4. **Initial state in `src/constants/`** -- not inline
5. **Selectors** -- always use selector pattern to avoid unnecessary re-renders:
   ```typescript
   // CORRECT -- only re-renders when user changes
   const user = useAuthStore((state) => state.user);

   // WRONG -- re-renders on any store change
   const { user } = useAuthStore();
   ```

---

## 4. Component State -- React Hooks

Used for ephemeral UI state that does not need to survive page navigation:

```typescript
// Form state
const [search, setSearch] = useState('');
const [isModalOpen, setIsModalOpen] = useState(false);

// Derived/computed state
const filteredItems = useMemo(
  () => items.filter((item) => item.name.includes(search)),
  [items, search],
);

// Callbacks
const handleSubmit = useCallback(() => {
  createItem(formState);
  setIsModalOpen(false);
}, [createItem, formState]);
```

**Rules:**
- All React hooks must be inside controller hooks in `src/hooks/`, never in TSX files
- No prop drilling beyond 2 levels
- Use `useMemo` for expensive computations
- Use `useCallback` for callbacks passed to child components

---

## 5. State Decision Matrix

| Question                                      | Answer       | Use              |
| --------------------------------------------- | ------------ | ---------------- |
| Does it come from the backend API?            | Yes          | TanStack Query   |
| Does it need to survive page navigation?      | Yes          | Zustand          |
| Is it shared across multiple components?      | Yes          | Zustand or Context |
| Is it local to one component tree?            | Yes          | React hooks      |
| Is it a form value?                           | Yes          | React hooks      |
| Is it derived from other state?               | Yes          | `useMemo`        |
| Does it need to persist across sessions?      | Yes          | Zustand + persist |

---

## 6. Data Flow Diagram

```
Browser localStorage
    |
    v
Zustand (auth tokens, preferences)
    |
    v
HTTP Client (axios) <-- attaches Bearer token from Zustand
    |
    v
TanStack Query Cache <-- manages cache, refetch, invalidation
    |
    v
Controller Hook <-- composes query hooks + mutation hooks + local state
    |
    v
Page Component <-- receives all data via controller hook return value
    |
    v
Child Components <-- receive data via props only
```
