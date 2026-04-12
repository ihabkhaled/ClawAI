# Routing and Pages

> Complete reference for all routes, pages, auth guards, and page state handling.

---

## 1. Route Structure

ClawAI uses Next.js 16 App Router with route groups for layout separation:

```
src/app/
  (auth)/              # Unauthenticated layout (minimal chrome)
    login/page.tsx     # Login page
  (portal)/            # Authenticated layout (sidebar + header shell)
    layout.tsx         # Shell layout with sidebar, header
    dashboard/page.tsx
    chat/page.tsx
    chat/[threadId]/page.tsx
    chat/compare/page.tsx
    connectors/page.tsx
    connectors/[connectorId]/page.tsx
    models/page.tsx
    models/local/page.tsx
    context/page.tsx
    routing/page.tsx
    routing/replay/page.tsx
    memory/page.tsx
    files/page.tsx
    observability/page.tsx
    audits/page.tsx
    logs/page.tsx
    admin/page.tsx
    settings/page.tsx
  layout.tsx           # Root layout (Providers wrapper)
  page.tsx             # Root redirect to /dashboard or /login
  providers.tsx        # QueryClient, ThemeProvider, LocaleProvider, Toaster
  globals.css          # Global styles and CSS variables
```

---

## 2. Page Inventory (20 Pages)

### Authentication

| Route    | Page    | Controller Hook | Purpose                       | Auth Required |
| -------- | ------- | --------------- | ----------------------------- | ------------- |
| `/`      | Root    | None            | Redirects to /dashboard or /login | No        |
| `/login` | Login   | `useLogin`      | Email/password authentication | No            |

### Portal (Authenticated)

| Route                        | Page             | Controller Hook          | Purpose                                     |
| ---------------------------- | ---------------- | ------------------------ | ------------------------------------------- |
| `/dashboard`                 | Dashboard        | `useDashboardPage`       | Overview stats, recent activity, health     |
| `/chat`                      | Chat             | `useChatPage`            | Thread list, create new thread, pin/archive |
| `/chat/[threadId]`           | Chat Thread      | `useThreadDetailPage`    | Conversation, composer, model selector      |
| `/chat/compare`              | Parallel Compare | `useParallelComparePage` | Multi-model side-by-side response comparison |
| `/connectors`                | Connectors       | `useConnectorsPage`      | Cloud provider connector list               |
| `/connectors/[connectorId]`  | Connector Detail | `useConnectorDetailPage` | Config, models, health events, sync runs    |
| `/models`                    | Models           | `useAllModels`           | All available models across connectors      |
| `/models/local`              | Local Models     | `useLocalModelsPage`     | Ollama model management, pull, roles        |
| `/routing`                   | Routing          | `useRoutingPage`         | Routing policies CRUD, recent decisions     |
| `/routing/replay`            | Replay Lab       | `useReplayLabPage`       | Replay historical routing decisions, compare old vs new |
| `/memory`                    | Memory           | `useMemoryPage`          | Memory records list, create, edit, toggle   |
| `/context`                   | Context Packs    | Context pack hooks       | Context packs management, items             |
| `/files`                     | Files            | `useFilesPage`           | File upload, list, ingestion status         |
| `/observability`             | Observability    | Health hooks             | Aggregated health dashboard                 |
| `/audits`                    | Audits           | `useAuditsPage`          | Audit log viewer with filters               |
| `/logs`                      | Logs             | `useLogsPage`            | Client and server log viewer                |
| `/admin`                     | Admin            | `useAdminPage`           | User management (ADMIN role only)           |
| `/settings`                  | Settings         | `useSettingsPage`        | Preferences, password, appearance, language |

---

## 3. Authentication Guard

### Middleware (`src/middleware.ts`)

The Next.js middleware provides a lightweight server-side check:

```typescript
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Client-side auth guard handles the actual redirect
  return NextResponse.next();
}
```

The middleware matches all request paths except API routes, static files, and assets.

### Client-Side Auth Guard (`src/hooks/auth/use-auth-guard.ts`)

The `useAuthGuard` hook performs the actual authentication check on the client:

1. Reads `isAuthenticated` from `useAuthStore`
2. If not authenticated, redirects to `/login`
3. If authenticated, returns the current user

This hook is called by the portal layout (`src/app/(portal)/layout.tsx`) to protect all authenticated routes.

### Login Flow

1. User submits credentials on `/login`
2. `useLogin` hook calls `authRepository.login()`
3. Backend returns `{ accessToken, refreshToken, user }`
4. `useAuthStore.setAuth()` persists to localStorage
5. Redirect to `/dashboard`

### Token Refresh

The HTTP client (`src/lib/http-client.ts`) handles token refresh automatically:

1. Request interceptor attaches `Authorization: Bearer <token>` to all requests
2. Response interceptor catches 401 responses
3. Attempts refresh via `POST /auth/refresh` with the refresh token
4. On success: updates tokens, retries failed request
5. On failure: clears auth store, redirects to `/login`
6. Queues concurrent requests during refresh to avoid duplicate refresh calls

---

## 4. Route Constants

Navigation routes are defined in `src/constants/routes.constants.ts` for type-safe routing.

Sidebar navigation items are defined in `src/constants/sidebar.constants.ts`, mapping each route to its icon, label (i18n key), and required role.

---

## 5. Page State Handling

Every page must handle three states: loading, error, and empty.

### Loading State

Use skeleton components that match the page layout:

```tsx
if (isLoading) {
  return <DashboardSkeleton />;
}
```

### Error State

Display a meaningful error message with retry option:

```tsx
if (error) {
  return <ErrorState message={error.message} onRetry={refetch} />;
}
```

### Empty State

Show an empty state with guidance and primary action:

```tsx
if (!data || data.length === 0) {
  return (
    <EmptyState
      title={t('connectors.noConnectors')}
      description={t('connectors.noConnectorsDescription')}
      action={{ label: t('connectors.create'), onClick: openCreateDialog }}
    />
  );
}
```

### Complete Page Template

```tsx
'use client';

import { useFeaturePage } from '@/hooks/feature/use-feature-page';

export default function FeaturePage(): ReactElement {
  const {
    data,
    isLoading,
    error,
    // ... other controller hook values
  } = useFeaturePage();

  if (isLoading) {
    return <FeatureSkeleton />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return <FeatureContent data={data} />;
}
```

---

## 6. Dynamic Routes

### Thread Detail (`/chat/[threadId]`)

Uses Next.js dynamic segment. The `threadId` parameter is extracted via `useParams()` inside the controller hook:

```typescript
// src/hooks/chat/use-thread-detail-page.ts
export function useThreadDetailPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId;
  // ... compose hooks using threadId
}
```

### Connector Detail (`/connectors/[connectorId]`)

Same pattern with `connectorId` parameter.

### Routing Replay Lab (`/routing/replay`)

Static route (no dynamic segments). The `useReplayLabPage` controller hook manages:

- **Filters**: date range picker, routing mode dropdown, provider dropdown, limit input
- **Summary card**: shows totalReplayed, changedCount, improvedCount, regressedCount, avgConfidenceDelta
- **Results table**: paginated list of replay results with old vs new provider/model, confidence delta, and changed indicator
- Calls `POST /routing/replay` via the routing repository

### Parallel Compare (`/chat/compare`)

Static route. The `useParallelComparePage` controller hook manages:

- **Model picker**: multi-select dropdown allowing 2-5 provider/model pairs
- **Prompt input**: shared textarea for the prompt sent to all selected models
- **Response grid**: side-by-side cards showing each model's response, token counts, and latency
- **Summary bar**: total latency, success/failure count, token usage comparison
- Calls `POST /chat-messages/parallel` via the chat repository

---

## 7. RBAC-Protected Pages

Some pages require specific user roles:

| Page   | Required Role | Behavior if Unauthorized         |
| ------ | ------------- | -------------------------------- |
| Admin  | ADMIN         | Shows access denied message      |
| Others | Any role      | Accessible to all authenticated users |

The sidebar conditionally shows navigation items based on the user's role, and the page itself checks the role in its controller hook.
