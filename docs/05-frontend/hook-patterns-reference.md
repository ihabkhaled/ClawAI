# Hook Patterns Reference

> Complete inventory and patterns for all custom hooks in the ClawAI frontend.

---

## 1. Hook Architecture

Hooks are organized by domain under `src/hooks/<domain>/`:

```
hooks/
  auth/           # Authentication hooks
  chat/           # Chat thread and message hooks
  connectors/     # Connector management hooks
  context-packs/  # Context pack hooks
  dashboard/      # Dashboard data hooks
  files/          # File management hooks
  logs/           # Log viewer hooks
  memory/         # Memory CRUD hooks
  ollama/         # Local model management hooks
  routing/        # Routing policy hooks
  settings/       # User settings hooks
  admin/          # Admin page hooks
  audit/          # Audit log hooks
  common/         # Shared utility hooks (useDebounce, etc.)
  layout/         # Layout hooks
  observability/  # Health/observability hooks
  use-locale.ts   # Locale/language hook
  use-theme.ts    # Theme preference hook
```

---

## 2. Hook Categories

### Controller Hooks (Page-Level)

Controller hooks orchestrate multiple domain hooks for a specific page. Each page has exactly one controller hook.

| Hook                       | File                                        | Composes                                                     |
| -------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `useChatPage`              | `hooks/chat/use-chat-page.ts`               | useVirtualizedThreads, useCreateThread, usePinThread, useArchiveThread, useDebounce |
| `useThreadDetailPage`      | `hooks/chat/use-thread-detail-page.ts`      | useThreadDetail, useSendMessage, useChatStream, useVirtualizedMessages, useThreadSettings |
| `useConnectorsPage`        | `hooks/connectors/use-connectors-page.ts`   | useConnectors, useCreateConnector, useDeleteConnector, useConnectorFormState |
| `useConnectorDetailPage`   | `hooks/connectors/use-connector-detail-page.ts` | useConnectorDetail, useUpdateConnector, useSyncConnector, useTestConnector |
| `useLocalModelsPage`       | `hooks/ollama/use-local-models-page.ts`     | useLocalModels, usePullModel, useAssignRole |
| `useModelCatalogPage`      | `hooks/ollama/use-model-catalog-page.ts`    | useModelCatalog, usePullFromCatalog, usePullJobs |
| `useMemoryPage`            | `hooks/memory/use-memory-page.ts`           | useMemories, useCreateMemory, useUpdateMemory, useDeleteMemory, useToggleMemory |
| `useRoutingPage`           | `hooks/routing/use-routing-page.ts`         | useRoutingPolicies, useRoutingDecisions, useCreatePolicy, useUpdatePolicy, useDeletePolicy |
| `useFilesPage`             | `hooks/files/use-files-page.ts`             | useFiles, useUploadFile, useDeleteFile, useFileUploadZoneState |
| `useLogsPage`              | `hooks/logs/use-logs-page.ts`               | useClientLogs, useServerLogs |
| `useAuditsPage`            | `hooks/audit/use-audits-page.ts`            | useAuditLogs, useAuditStats, useUsage |
| `useDashboardPage`         | `hooks/dashboard/use-dashboard-page.ts`     | useDashboardData |
| `useSettingsPage`          | `hooks/settings/use-settings-page.ts`       | useChangePassword, useUpdatePreferences |
| `useAdminPage`             | `hooks/admin/use-admin-page.ts`             | useUserTableState |

---

### Query Hooks (GET Requests)

Each wraps a single `useQuery` call.

| Hook                   | Domain       | Query Key                        | Purpose                    |
| ---------------------- | ------------ | -------------------------------- | -------------------------- |
| `useThreads`           | chat         | `queryKeys.threads.list()`       | List chat threads          |
| `useThreadDetail`      | chat         | `queryKeys.threads.detail(id)`   | Single thread details      |
| `useVirtualizedThreads`| chat         | `queryKeys.threads.listInfinite()` | Infinite scroll threads  |
| `useVirtualizedMessages`| chat        | `queryKeys.threads.messagesInfinite()` | Infinite scroll messages |
| `useAvailableModels`   | chat         | `queryKeys.models.all`           | Available models for chat  |
| `useConnectors`        | connectors   | `queryKeys.connectors.list()`    | List connectors            |
| `useConnectorDetail`   | connectors   | `queryKeys.connectors.detail(id)`| Single connector           |
| `useAllModels`         | connectors   | `queryKeys.models.all`           | All cloud models           |
| `useLocalModels`       | ollama       | `queryKeys.localModels.lists()`  | Local Ollama models        |
| `useModelCatalog`      | ollama       | `queryKeys.catalog.list()`       | Model catalog entries      |
| `usePullJobs`          | ollama       | `queryKeys.pullJobs.all`         | Active download jobs       |
| `useMemories`          | memory       | `queryKeys.memory.list()`        | Memory records             |
| `useRoutingPolicies`   | routing      | `queryKeys.routing.policies.list()` | Routing policies        |
| `useRoutingDecisions`  | routing      | `queryKeys.routing.decisions.byThread()` | Routing decisions   |
| `useFiles`             | files        | `queryKeys.files.list()`         | Uploaded files             |
| `useClientLogs`        | logs         | `queryKeys.clientLogs.list()`    | Frontend logs              |
| `useServerLogs`        | logs         | `queryKeys.serverLogs.list()`    | Backend logs               |
| `useAuditLogs`         | audit        | `queryKeys.audits.list()`        | Audit log entries          |
| `useAuditStats`        | audit        | `queryKeys.audits.stats`         | Audit statistics           |
| `useUsage`             | audit        | `queryKeys.usage.list()`         | Usage data                 |
| `useDashboardData`     | dashboard    | `queryKeys.dashboard.stats`      | Dashboard statistics       |
| `useCurrentUser`       | auth         | `queryKeys.auth.me`              | Current user profile       |

---

### Mutation Hooks (POST/PUT/DELETE)

Each wraps a single `useMutation` call with `onSuccess` cache invalidation.

| Hook                   | Domain       | Invalidates                      | Purpose                    |
| ---------------------- | ------------ | -------------------------------- | -------------------------- |
| `useCreateThread`      | chat         | `threads.lists()`                | Create new chat thread     |
| `useDeleteThread`      | chat         | `threads.lists()`                | Delete a thread            |
| `useUpdateThread`      | chat         | `threads.detail(id)`             | Update thread settings     |
| `useSendMessage`       | chat         | `threads.messages(id)`           | Send a message             |
| `useRegenerateMessage` | chat         | `threads.messages(id)`           | Regenerate AI response     |
| `useMessageFeedback`   | chat         | `threads.messages(id)`           | Submit feedback (up/down)  |
| `usePinThread`         | chat         | `threads.lists()`                | Pin/unpin a thread         |
| `useArchiveThread`     | chat         | `threads.lists()`                | Archive/unarchive thread   |
| `useCreateConnector`   | connectors   | `connectors.all`                 | Create connector           |
| `useUpdateConnector`   | connectors   | `connectors.detail(id)`          | Update connector config    |
| `useDeleteConnector`   | connectors   | `connectors.all`                 | Delete connector           |
| `useSyncConnector`     | connectors   | `connectors.detail(id)`          | Trigger model sync         |
| `useTestConnector`     | connectors   | None                             | Test connector health      |
| `usePullModel`         | ollama       | `localModels.lists()`            | Pull model from Ollama     |
| `usePullFromCatalog`   | ollama       | `pullJobs.all`                   | Pull model from catalog    |
| `useCancelPullJob`     | ollama       | `pullJobs.all`                   | Cancel download            |
| `useAssignRole`        | ollama       | `localModels.lists()`            | Assign model role          |
| `useCreateMemory`      | memory       | `memory.all`                     | Create memory record       |
| `useUpdateMemory`      | memory       | `memory.all`                     | Update memory record       |
| `useDeleteMemory`      | memory       | `memory.all`                     | Delete memory record       |
| `useToggleMemory`      | memory       | `memory.all`                     | Enable/disable memory      |
| `useCreatePolicy`      | routing      | `routing.policies.all`           | Create routing policy      |
| `useUpdatePolicy`      | routing      | `routing.policies.all`           | Update routing policy      |
| `useDeletePolicy`      | routing      | `routing.policies.all`           | Delete routing policy      |
| `useUploadFile`        | files        | `files.all`                      | Upload file                |
| `useDeleteFile`        | files        | `files.all`                      | Delete file                |
| `useChangePassword`    | settings     | None                             | Change user password       |
| `useUpdatePreferences` | settings     | `auth.me`                        | Update user preferences    |
| `useLogin`             | auth         | None                             | Authenticate user          |
| `useLogout`            | auth         | None                             | End session                |

---

### State Hooks (Local UI State)

| Hook                         | Domain     | Purpose                                      |
| ---------------------------- | ---------- | -------------------------------------------- |
| `useConnectorFormState`      | connectors | Form field values and validation for create/edit |
| `useMemoryFormState`         | memory     | Memory form fields and validation             |
| `usePolicyFormState`         | routing    | Policy form fields and validation             |
| `useMessageComposerState`   | chat       | Message input text and attachments            |
| `useFileAttachmentPickerState` | chat     | File picker open/close and selection          |
| `useFileUploadZoneState`     | files      | Drag-and-drop upload zone state               |
| `useEditableTitle`           | chat       | Inline title editing state                    |
| `useResizableComposer`       | chat       | Textarea auto-resize logic                    |
| `useUserTableState`         | admin      | User table filters and selection              |
| `useImageErrorState`        | chat       | Image loading error handling                  |
| `useImageGenerationBubbleState` | chat    | Image generation progress in message bubble   |

---

### Real-Time / SSE Hooks

| Hook                          | Domain | Purpose                                         |
| ----------------------------- | ------ | ----------------------------------------------- |
| `useChatStream`               | chat   | SSE connection for fallback attempts and errors  |
| `useImageGenerationListener`  | chat   | SSE listener for image generation progress       |
| `useFileGenerationListener`   | chat   | SSE listener for file generation progress        |

---

### Shared Utility Hooks

| Hook                      | File                          | Purpose                            |
| ------------------------- | ----------------------------- | ---------------------------------- |
| `useDebounce`             | `hooks/common/use-debounce.ts`| Debounce a value by delay          |
| `useAuthGuard`            | `hooks/auth/use-auth-guard.ts`| Redirect unauthenticated users     |
| `useLocale`               | `hooks/use-locale.ts`         | Get/set current locale             |
| `useTheme`                | `hooks/use-theme.ts`          | Get/set theme preference           |
| `useGlobalThreadSearch`   | `hooks/chat/use-global-thread-search.ts` | Global search across threads |
| `usePreferenceBootstrap`  | `hooks/settings/use-preference-bootstrap.ts` | Apply saved preferences on load |
| `useAuthenticatedImage`   | `hooks/chat/use-authenticated-image.ts` | Load images with auth token |

---

## 3. Hook Implementation Patterns

### Query Hook Pattern

```typescript
// src/hooks/memory/use-memories.ts
export function useMemories(filters: MemoryFilters): UseQueryResult<MemoryListResponse> {
  return useQuery({
    queryKey: queryKeys.memory.list(filters),
    queryFn: () => memoryRepository.list(filters),
  });
}
```

### Mutation Hook Pattern

```typescript
// src/hooks/memory/use-create-memory.ts
export function useCreateMemory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (payload: CreateMemoryPayload) => memoryRepository.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      showToast.success(t('memory.created'));
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('memory.createFailed'));
    },
  });

  return {
    createMemory: mutation.mutate,
    isPending: mutation.isPending,
  };
}
```

### Controller Hook Pattern

```typescript
// src/hooks/files/use-files-page.ts
export function useFilesPage(): FilesPageReturn {
  const files = useFiles(filters);
  const { uploadFile, isPending: isUploading } = useUploadFile();
  const { deleteFile, isPending: isDeleting } = useDeleteFile();
  const uploadZone = useFileUploadZoneState();

  return {
    files: files.data,
    isLoading: files.isLoading,
    error: files.error,
    uploadFile,
    isUploading,
    deleteFile,
    isDeleting,
    ...uploadZone,
  };
}
```

---

## 4. Rules Summary

1. **Max 50 lines per hook** (excluding imports and types)
2. **One hook = one responsibility** -- if it does two things, split it
3. **Controller hooks compose** -- they never contain business logic
4. **No inline types, enums, or constants** in hook files
5. **Hooks must be in `src/hooks/`** -- never inside component files
6. **Each hook file exports ONE hook**
7. **Return type defined in `src/types/`** -- not inline
8. **Query hooks use query key factory** from `src/repositories/shared/query-keys.ts`
9. **Mutation hooks invalidate caches** via `queryClient.invalidateQueries()`
10. **Error handling uses `showToast.apiError()`** for user-visible errors
