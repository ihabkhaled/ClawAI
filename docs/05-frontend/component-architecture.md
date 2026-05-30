# Component Architecture

> Complete guide to the ClawAI frontend component hierarchy, patterns, and data flow.

---

## 1. Architectural Pattern

Every page in ClawAI follows a strict four-layer architecture that separates rendering from logic, data fetching, and API communication:

```
Page (TSX)
  --> Controller Hook (useXxxPage)
        --> Domain Hooks (useCreateThread, useSendMessage, ...)
              --> Repository (HTTP calls via axios httpClient)
                    --> Backend API (via Nginx reverse proxy on port 4000)
```

### Layer Responsibilities

| Layer           | Responsibility                                     | May Import                        | May NOT Import            |
| --------------- | -------------------------------------------------- | --------------------------------- | ------------------------- |
| Page (TSX)      | Pure render composition, state display              | ONE controller hook, components   | Repositories, fetch, APIs |
| Controller Hook | Orchestrate multiple domain hooks, expose to page   | Domain hooks, shared hooks        | Repositories directly     |
| Domain Hook     | One responsibility (query, mutation, state)          | Repository functions, TanStack    | Other domain hooks        |
| Repository      | Raw HTTP calls, one function per endpoint            | httpClient (axios), types         | Hooks, components, state  |

---

## 2. Page Component Pattern

Pages live in `apps/claw-frontend/src/app/(portal)/<route>/page.tsx` and follow a strict template:

```tsx
// src/app/(portal)/chat/page.tsx
'use client';

import { useChatPage } from '@/hooks/chat/use-chat-page';

export default function ChatPage(): ReactElement {
  const controller = useChatPage();

  if (controller.isLoading) {
    return <ChatPageSkeleton />;
  }

  if (controller.error) {
    return <ErrorState message={controller.error.message} />;
  }

  if (controller.allThreads.length === 0) {
    return <EmptyState onAction={controller.handleNewChat} />;
  }

  return (
    <ChatLayout
      pinnedThreads={controller.pinnedThreads}
      unpinnedThreads={controller.unpinnedThreads}
      onNewChat={controller.handleNewChat}
      search={controller.search}
      onSearchChange={controller.setSearch}
    />
  );
}
```

### Page Rules

1. Pages contain ZERO business logic
2. Pages call exactly ONE controller hook
3. Pages must handle three states: loading, error, empty
4. No `useState`, `useEffect`, `useCallback`, `useMemo` in page files
5. No data fetching or API calls
6. Only default exports (required by Next.js App Router)

---

## 3. Controller Hook Pattern

Controller hooks orchestrate multiple domain hooks and expose a unified API to the page:

```typescript
// src/hooks/chat/use-chat-page.ts
export function useChatPage(): ChatPageReturn {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const virtualizedThreads = useVirtualizedThreads({ search: debouncedSearch });
  const { createThread, isPending: isCreating } = useCreateThread();
  const { pinThread, isPending: isPinPending } = usePinThread();
  const { archiveThread, isPending: isArchivePending } = useArchiveThread();

  return {
    pinnedThreads,
    unpinnedThreads,
    allThreads: filteredThreads,
    isLoading: virtualizedThreads.isLoading,
    search,
    setSearch,
    handleNewChat,
    isCreating,
    handlePin,
    handleArchive,
  };
}
```

### Controller Hook Rules

- Named `use-<page-name>-page.ts` (e.g., `use-chat-page.ts`)
- Composes smaller domain hooks -- never contains business logic itself
- Return type defined in `src/types/<domain>.types.ts`
- Max 80 lines (excluding imports and types)

---

## 4. Domain Hook Pattern

Each domain hook does exactly ONE thing:

```typescript
// src/hooks/chat/use-send-message.ts
export function useSendMessage(threadId: string, onMessageSent?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreateMessageRequest) =>
      chatRepository.createMessage(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messages(threadId),
      });
      onMessageSent?.();
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('chat.messageSendFailed'));
    },
  });

  return {
    sendMessage: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
```

### Domain Hook Rules

- One hook = one responsibility (query, mutation, or local state)
- Max 50 lines (excluding imports and type annotations)
- Named `use-<action>.ts` (e.g., `use-create-thread.ts`, `use-delete-file.ts`)
- No inline types, enums, or constants

---

## 5. Component Hierarchy by Feature

### Chat Feature

```
ChatPage
  --> useChatPage (controller)
        --> useVirtualizedThreads
        --> useCreateThread
        --> usePinThread
        --> useArchiveThread
        --> useDebounce

ChatThreadDetailPage
  --> useThreadDetailPage (controller)
        --> useThreadDetail
        --> useThreadSettings
        --> useSendMessage
        --> useChatStream
        --> useMessageComposerState
        --> useVirtualizedMessages
        --> useAvailableModels
        --> useFileAttachmentPickerState
        --> useRegenerateMessage
        --> useMessageFeedback
        --> useImageGenerationListener
        --> useFileGenerationListener
```

### Connectors Feature

```
ConnectorsPage
  --> useConnectorsPage (controller)
        --> useConnectors
        --> useCreateConnector
        --> useDeleteConnector
        --> useConnectorFormState

ConnectorDetailPage
  --> useConnectorDetailPage (controller)
        --> useConnectorDetail
        --> useUpdateConnector
        --> useSyncConnector
        --> useTestConnector
```

### Models Feature

```
ModelsPage (cloud)
  --> useAllModels

LocalModelsPage
  --> useLocalModelsPage (controller)
        --> useLocalModels
        --> usePullModel
        --> useAssignRole

ModelCatalogPage
  --> useModelCatalogPage (controller)
        --> useModelCatalog
        --> usePullFromCatalog
        --> usePullJobs
        --> useCancelPullJob
```

### Memory Feature

```
MemoryPage
  --> useMemoryPage (controller)
        --> useMemories
        --> useCreateMemory
        --> useUpdateMemory
        --> useDeleteMemory
        --> useToggleMemory
        --> useMemoryFormState
```

### Routing Feature

```
RoutingPage
  --> useRoutingPage (controller)
        --> useRoutingPolicies
        --> useRoutingDecisions
        --> useCreatePolicy
        --> useUpdatePolicy
        --> useDeletePolicy
        --> usePolicyFormState
```

### Files Feature

```
FilesPage
  --> useFilesPage (controller)
        --> useFiles
        --> useUploadFile
        --> useDeleteFile
        --> useFileUploadZoneState
```

### Admin / Settings / Logs / Audit

```
AdminPage --> useAdminPage --> useUserTableState
SettingsPage --> useSettingsPage --> useChangePassword, useUpdatePreferences
LogsPage --> useLogsPage --> useClientLogs, useServerLogs
AuditsPage --> useAuditsPage --> useAuditLogs, useAuditStats, useUsage
DashboardPage --> useDashboardPage --> useDashboardData
ObservabilityPage (health) --> health query hooks
```

---

## 6. Component Types

### UI Primitives (`src/components/ui/`)

Auto-generated by shadcn/ui. **Never edit these manually.** They include:

- `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Slider`
- `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`
- `Card`, `Table`, `Tabs`, `Badge`
- `Toast`, `Toaster`

### Common Components (`src/components/common/`)

Shared composed components used across features:

- `EmptyState` -- empty data placeholder with action button
- `LoadingSpinner` -- consistent loading indicator
- `PageHeader` -- page title and action buttons
- `StatusBadge` -- color-coded status display
- `DataTable` -- tabular data display with sorting/pagination
- `Skeleton` -- loading placeholders

### Layout Components (`src/components/layout/`)

Application shell components:

- `AppShell` -- main layout wrapper with sidebar and header
- `Sidebar` -- navigation sidebar (collapsible)
- `Header` -- top navigation bar

### Feature Components (`src/components/<feature>/`)

Domain-specific components:

- `src/components/chat/` -- MessageBubble, MessageComposer, ModelSelector, ThreadSettings, RoutingTransparency, ThinkingIndicator, **RichPromptTextarea**
- `src/components/connectors/` -- ConnectorCard, ConnectorForm
- `src/components/models/` -- ModelCard, ModelCatalog
- `src/components/memory/` -- MemoryForm, MemoryList
- `src/components/routing/` -- PolicyForm, DecisionTable
- `src/components/files/` -- FileUploadZone, FileList
- `src/components/audit/` -- AuditLogTable, UsageChart
- `src/components/logs/` -- LogViewer, LogFilters
- `src/components/admin/` -- UserTable

### `RichPromptTextarea` (2026-05-30)

Use it on every rich prompt-entry surface — the main chat `MessageComposer`,
the in-thread compare panel, and any future authoring surface that needs
multiline prompt input. It wraps shadcn `<Textarea>` with: autosize from
`minRows` to `maxRows` (then internal scroll), Enter-to-submit (Shift+Enter
inserts a newline), IME-safe composition tracking (never submits while a
CJK/IME composition is in flight), and `ref` forwarding via
`useImperativeHandle` so parents can imperatively focus. The component is
pure render composition; all imperative DOM work (autosize math, key
handling, composition events) lives in `use-rich-prompt-textarea` per the
"TSX = render only" + "no inline sub-components" rules. It was authored fresh
rather than retrofitted onto `MessageComposer` because the in-thread compare
panel needs the same behaviour and the old single-line `<Input>` couldn't be
incrementally widened. Props contract: `{ value, onChange, onSubmit,
placeholder?, disabled?, minRows, maxRows, ariaLabel?, className? }`.

### `use-sticky-bottom-scroll` (2026-05-30)

A hook that keeps a scroll container pinned to its bottom sentinel while
content streams in, with three UX guarantees: (1) **pin if at-bottom** — when
the user is within `threshold` px of the bottom and `contentSignal` changes,
the container auto-scrolls to the sentinel; (2) **pause if scrolled-up** —
when the user scrolls up beyond the threshold, auto-scroll stops until they
return; (3) **jump-to-latest button** — derived from the returned
`isAtBottom: false`, the page renders a small button that calls
`scrollToBottom()`. Wiring: attach `scrollRef` to the `overflow-y: auto`
container, render `<div ref={sentinelRef} />` as the LAST child, and pass a
`contentSignal` that changes when content grows (typically
`messages.length + streamingText.length`). Internally combines
`IntersectionObserver` on the sentinel (primary), a scroll listener (for the
within-threshold band), a `ResizeObserver` on the sentinel's parent (catches
fast streaming token growth), and `requestAnimationFrame` to batch the
`scrollIntoView` write so React renders flush before scrollTop mutates — this
is what eliminates the visible "jumping" you get from synchronous writes.
Default threshold is `STICKY_BOTTOM_THRESHOLD_PX` from `src/constants`.

---

## 7. Props-Only Data Flow

Components never fetch data. They receive everything via props:

```tsx
// CORRECT
function ThreadList({ threads, onSelect, onDelete }: ThreadListProps): ReactElement {
  return (
    <ul>
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

// WRONG -- component fetches its own data
function ThreadList(): ReactElement {
  const { data: threads } = useQuery({ ... }); // NEVER do this
  // ...
}
```

---

## 8. File Organization Reference

```
src/
  app/(auth)/login/page.tsx         # Login page (unauthenticated)
  app/(portal)/dashboard/page.tsx   # Dashboard (authenticated)
  app/(portal)/chat/page.tsx        # Chat thread list
  app/(portal)/chat/[threadId]/     # Chat conversation
  components/ui/                    # shadcn/ui (do not edit)
  components/common/                # Shared components
  components/layout/                # Shell layout
  components/<feature>/             # Feature components
  hooks/<domain>/use-<name>.ts      # Hooks by domain
  hooks/common/use-<name>.ts        # Shared utility hooks
  repositories/<domain>/            # API call wrappers
  repositories/shared/query-keys.ts # Query key factory
  types/<domain>.types.ts           # Type definitions
  enums/<name>.enum.ts              # Enum definitions
  constants/<name>.constants.ts     # Constants
  utilities/<name>.utility.ts       # Utility functions
  stores/<name>.store.ts            # Zustand stores
  lib/validation/<name>.schema.ts   # Zod schemas
  lib/i18n/locales/                 # Translation files
  lib/http-client.ts                # Axios wrapper with interceptors
```
