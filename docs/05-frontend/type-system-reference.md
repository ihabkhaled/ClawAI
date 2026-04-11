# Type System Reference

> All type files, where each type lives, import type syntax, and enum inventory.

---

## 1. Type File Inventory

All types live in `src/types/` and are re-exported from `src/types/index.ts`:

| File                          | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| `api.types.ts`                | API response wrappers, pagination, error types       |
| `audit.types.ts`              | Audit log and usage record types                     |
| `auth.types.ts`               | User, session, login/register payloads               |
| `catalog.types.ts`            | Model catalog entries, download job types             |
| `chat.types.ts`               | Thread, message, attachment, stream event types       |
| `component.types.ts`          | Shared component prop types                          |
| `connector.types.ts`          | Connector, connector model types                     |
| `context-pack.types.ts`       | Context pack, context pack item types                |
| `dashboard.types.ts`          | Dashboard statistics types                           |
| `file.types.ts`               | File, file chunk types                               |
| `file-generation.types.ts`    | File generation request/response types               |
| `health.types.ts`             | Health check, service status types                   |
| `hook.types.ts`               | Hook return types (controller hooks)                 |
| `i18n.types.ts`               | Translation dictionary structure                     |
| `image-generation.types.ts`   | Image generation request/response types              |
| `log.types.ts`                | Client/server log types                              |
| `markdown.types.ts`           | Markdown rendering types                             |
| `memory.types.ts`             | Memory record, memory filter types                   |
| `preference.types.ts`         | User preference types                                |
| `routing.types.ts`            | Routing decision, policy, mode types                 |
| `store.types.ts`              | Zustand store state and action types                 |
| `user.types.ts`               | User profile, role types                             |
| `index.ts`                    | Re-exports all types from all files                  |

---

## 2. Enum Inventory

All enums live in `src/enums/` and are re-exported from `src/enums/index.ts`:

| File                              | Enum Name                   | Values                                |
| --------------------------------- | --------------------------- | ------------------------------------- |
| `audit-action.enum.ts`            | `AuditAction`               | LOGIN, LOGOUT, CREATE, UPDATE, etc.   |
| `audit-severity.enum.ts`          | `AuditSeverity`             | LOW, MEDIUM, HIGH, CRITICAL          |
| `badge-variant.enum.ts`           | `BadgeVariant`              | DEFAULT, SUCCESS, WARNING, ERROR     |
| `component-size.enum.ts`          | `ComponentSize`             | SM, MD, LG                           |
| `connector-auth-type.enum.ts`     | `ConnectorAuthType`         | API_KEY, OAUTH                       |
| `connector-provider.enum.ts`      | `ConnectorProvider`         | OPENAI, ANTHROPIC, GOOGLE, etc.      |
| `connector-status.enum.ts`        | `ConnectorStatus`           | ACTIVE, INACTIVE, ERROR              |
| `context-pack-item-type.enum.ts`  | `ContextPackItemType`       | TEXT, FILE                           |
| `direction.enum.ts`               | `Direction`                 | LTR, RTL                            |
| `file-generation-status.enum.ts`  | `FileGenerationStatus`      | PENDING, PROCESSING, COMPLETED, FAILED |
| `file-ingestion-status.enum.ts`   | `FileIngestionStatus`       | PENDING, PROCESSING, COMPLETED, FAILED |
| `health-status.enum.ts`           | `HealthStatus`              | HEALTHY, DEGRADED, UNHEALTHY         |
| `http-method.enum.ts`             | `HttpMethod`                | GET, POST, PUT, PATCH, DELETE        |
| `image-generation-status.enum.ts` | `ImageGenerationStatus`     | PENDING, PROCESSING, COMPLETED, FAILED |
| `locale.enum.ts`                  | `Locale`                    | EN, AR, DE, ES, FR, IT, PT, RU       |
| `log-level.enum.ts`               | `LogLevel`                  | DEBUG, INFO, WARN, ERROR             |
| `logs-tab.enum.ts`                | `LogsTab`                   | CLIENT, SERVER                       |
| `memory-filter-value.enum.ts`     | `MemoryFilterValue`         | ALL, ENABLED, DISABLED               |
| `memory-type.enum.ts`             | `MemoryType`                | FACT, PREFERENCE, INSTRUCTION, SUMMARY |
| `message-feedback.enum.ts`        | `MessageFeedback`           | THUMBS_UP, THUMBS_DOWN              |
| `message-role.enum.ts`            | `MessageRole`               | USER, ASSISTANT, SYSTEM              |
| `model-lifecycle.enum.ts`         | `ModelLifecycle`            | ACTIVE, DEPRECATED, PREVIEW          |
| `routing-mode.enum.ts`            | `RoutingMode`               | AUTO, MANUAL_MODEL, LOCAL_ONLY, etc.  |
| `service-status.enum.ts`          | `ServiceStatus`             | UP, DOWN, DEGRADED                   |
| `stream-event-type.enum.ts`       | `StreamEventType`           | FALLBACK_ATTEMPT, ERROR, COMPLETION  |
| `theme.enum.ts`                   | `Theme`                     | LIGHT, DARK, SYSTEM                  |
| `user-appearance-preference.enum.ts` | `UserAppearancePreference` | LIGHT, DARK, SYSTEM               |
| `user-language-preference.enum.ts`| `UserLanguagePreference`    | EN, AR, DE, ES, FR, IT, PT, RU       |
| `user-role.enum.ts`               | `UserRole`                  | ADMIN, OPERATOR, VIEWER              |
| `user-status.enum.ts`             | `UserStatus`                | ACTIVE, INACTIVE, SUSPENDED          |

---

## 3. Import Type Syntax

All type imports MUST use the `import type` syntax:

```typescript
// CORRECT
import type { ChatThread, ChatMessage } from '@/types';
import type { RoutingMode } from '@/enums';
import type { ReactElement } from 'react';

// WRONG
import { ChatThread, ChatMessage } from '@/types';
```

This is enforced by ESLint (`consistent-type-imports` rule) and ensures types are tree-shaken from production bundles.

### When to Use `import type` vs `import`

```typescript
// Values (enums, functions, classes) -- regular import
import { ConnectorProvider, MessageRole } from '@/enums';
import { queryKeys } from '@/repositories/shared/query-keys';
import { cn } from '@/lib/utils';

// Types only -- import type
import type { ChatThread } from '@/types';
import type { ReactElement } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
```

**Rule**: If you only use the import for type annotations (function parameter types, return types, generic arguments), use `import type`. If you use it at runtime (comparisons, function calls, switch cases), use regular `import`.

Enums are a special case -- they are both types and values. Import them as regular imports since you use them for comparisons at runtime:

```typescript
// Enums used in comparisons -- regular import
import { MessageRole } from '@/enums';

if (message.role === MessageRole.ASSISTANT) { ... }
```

---

## 4. Type Definition Patterns

### API Response Types

```typescript
// src/types/api.types.ts
type ApiResponse<T> = {
  data: T;
  meta?: PaginationMeta;
};

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ApiError = {
  statusCode: number;
  message: string;
  code?: string;
};
```

### Domain Entity Types

```typescript
// src/types/chat.types.ts
type ChatThread = {
  id: string;
  userId: string;
  title: string;
  routingMode: RoutingMode;
  preferredProvider: string | null;
  preferredModel: string | null;
  systemPrompt: string | null;
  temperature: number;
  maxTokens: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  feedback: MessageFeedback | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};
```

### Request/Payload Types

```typescript
// src/types/chat.types.ts
type CreateMessageRequest = {
  threadId: string;
  content: string;
  fileIds?: string[];
  provider?: string;
  model?: string;
};
```

### Hook Return Types

```typescript
// src/types/hook.types.ts
type ChatPageReturn = {
  pinnedThreads: ChatThread[];
  unpinnedThreads: ChatThread[];
  allThreads: ChatThread[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  handleNewChat: () => void;
  isCreating: boolean;
  // ...
};
```

### Component Prop Types

```typescript
// src/types/component.types.ts
type MessageBubbleProps = {
  message: ChatMessage;
  onFeedback: (feedback: MessageFeedback) => void;
  onRegenerate: () => void;
};

type ProvidersProps = {
  children: ReactNode;
};
```

---

## 5. Type Rules Summary

1. **Use `type` over `interface`** unless declaration merging is needed
2. **All types in `src/types/`** -- never inline in components, hooks, or services
3. **All enums in `src/enums/`** -- never inline anywhere
4. **Re-export from index files** -- `src/types/index.ts` and `src/enums/index.ts`
5. **Import type syntax** for all type-only imports
6. **No `any`** -- use `unknown`, generics, or proper types
7. **No `!` non-null assertion** -- handle nullability explicitly
8. **No string literal unions** -- use enums
9. **No raw string comparisons** for domain values -- compare against enum values
10. **Zod inferred types** -- use `z.infer<typeof schema>` for form value types
