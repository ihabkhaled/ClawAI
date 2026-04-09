# Frontend Architecture

> ClawAI Frontend -- Next.js 16 (App Router), React 19, TypeScript 5.6+

---

## 1. Architecture Pattern

Every page follows a strict layered pattern that separates rendering from logic:

```
Page (TSX)
  --> Controller Hook (useXxxPage)
        --> Domain Hooks (useCreateThread, useSendMessage, ...)
              --> Repository (HTTP calls via axios)
                    --> Backend API (via Nginx reverse proxy)
```

**Rules:**

- **Page** -- pure render composition. One controller hook maximum, no business logic.
- **Controller Hook** -- orchestrates multiple domain hooks. Contains no business logic itself.
- **Domain Hook** -- does ONE thing (e.g., `useSendMessage`, `useDeleteThread`). Wraps TanStack Query.
- **Repository** -- pure HTTP calls. Maps to backend REST endpoints. No state, no side effects.

---

## 2. Folder Structure

```
apps/claw-frontend/src/
  app/                        # Next.js App Router pages and layouts
    (auth)/                   # Auth route group (login page, unauthenticated)
      login/page.tsx
    (portal)/                 # Protected route group (all authenticated pages)
      dashboard/page.tsx
      chat/page.tsx
      chat/[threadId]/page.tsx
      connectors/page.tsx
      connectors/[connectorId]/page.tsx
      models/page.tsx
      models/local/page.tsx
      routing/page.tsx
      memory/page.tsx
      context/page.tsx
      files/page.tsx
      observability/page.tsx
      audits/page.tsx
      logs/page.tsx
      admin/page.tsx
      settings/page.tsx
    layout.tsx                # Root layout
    page.tsx                  # Root redirect
  components/                 # Reusable UI components
    ui/                       # shadcn/ui primitives (auto-generated, do not edit)
    chat/                     # Chat domain components
    connectors/               # Connector domain components
    layout/                   # Shell, sidebar, header components
    ...                       # Other domain-specific component folders
  hooks/                      # Custom hooks organized by domain
    auth/                     # use-login, use-logout, use-current-user, use-auth-guard
    chat/                     # use-threads, use-send-message, use-chat-stream, ...
    connectors/               # use-connectors, use-create-connector, ...
    context-packs/            # use-context-packs, use-create-context-pack, ...
    dashboard/                # use-dashboard-page, use-dashboard-data
    files/                    # use-files, use-upload-file, use-delete-file
    logs/                     # use-client-logs, use-server-logs, use-logs-page
    memory/                   # use-memories, use-create-memory, ...
    ollama/                   # use-local-models, use-pull-model, use-assign-role
    routing/                  # use-routing-policies, use-routing-decisions, ...
    settings/                 # use-settings-page, use-change-password, ...
    common/                   # use-debounce, shared utility hooks
    use-locale.ts             # Locale/i18n hook
    use-theme.ts              # Theme preference hook
  repositories/               # API layer (HTTP calls)
    auth/auth.repository.ts
    chat/chat.repository.ts
    connectors/connector.repository.ts
    context-packs/context-packs.repository.ts
    files/files.repository.ts
    health/health.repository.ts
    image-generation/image-generation.repository.ts
    logs/client-logs.repository.ts
    logs/server-logs.repository.ts
    memory/memory.repository.ts
    ollama/ollama.repository.ts
    audit/audit.repository.ts
    preferences/preferences.repository.ts
    routing/routing.repository.ts
    shared/query-keys.ts      # TanStack Query key factory
  services/                   # Business logic wrappers (if needed beyond hooks)
  stores/                     # Zustand stores (client-only state)
    auth.store.ts             # Tokens, user, isAuthenticated
    sidebar.store.ts          # Sidebar open/collapsed state
    log.store.ts              # Log filter state
  types/                      # TypeScript type definitions
  enums/                      # Enum definitions
  constants/                  # Application constants
  utilities/                  # Utility functions (wrappers around 3rd-party libs)
  lib/                        # Library configuration
    i18n/                     # Internationalization
      locales/                # en.ts, ar.ts, de.ts, es.ts, fr.ts, it.ts, pt.ts, ru.ts
    utils.ts                  # cn() utility for Tailwind class merging
    validation/               # Zod schemas for frontend validation
  middleware.ts               # Next.js middleware (auth redirects)
```

---

## 3. State Management

### 3.1 Server State -- TanStack Query

All data fetched from the backend is managed by TanStack Query (`@tanstack/react-query`).

**Query Key Factory** (`src/repositories/shared/query-keys.ts`):

Every domain has a hierarchical key structure for precise cache invalidation:

```typescript
queryKeys.threads.all; // ["threads"]
queryKeys.threads.lists(); // ["threads", "list"]
queryKeys.threads.list(filters); // ["threads", "list", { ...filters }]
queryKeys.threads.detail(id); // ["threads", "detail", "abc123"]
queryKeys.threads.messages(id); // ["threads", "messages", "abc123"]
```

Domains with key factories: `auth`, `threads`, `connectors`, `models`, `routing`, `localModels`, `runtimes`, `clientLogs`, `serverLogs`, `audits`, `usage`, `admin`, `memory`, `contextPacks`, `files`, `health`, `dashboard`.

**Patterns:**

- All `GET` requests use `useQuery` wrapped in a custom hook.
- All `POST/PUT/PATCH/DELETE` requests use `useMutation` with `onSuccess` cache invalidation.
- Hooks NEVER call `useQuery`/`useMutation` directly in TSX files.

### 3.2 Client State -- Zustand

Minimal client-only state is stored in Zustand stores with `persist` middleware for localStorage:

| Store              | Purpose                                                          | Persisted                 |
| ------------------ | ---------------------------------------------------------------- | ------------------------- |
| `auth.store.ts`    | Access token, refresh token, user object, `isAuthenticated` flag | Yes (`claw-auth-storage`) |
| `sidebar.store.ts` | Sidebar expanded/collapsed state                                 | Yes                       |
| `log.store.ts`     | Log page filter state (level, service, date range)               | No                        |

### 3.3 Component State -- React Hooks

Ephemeral UI state (form values, modal open/close, local toggles) uses `useState` and `useReducer`.

**Rule:** No prop drilling beyond 2 levels. If data needs to pass through more than 2 components, use composition or context.

---

## 4. Routing

### Next.js App Router

The application uses Next.js 16 App Router with route groups for layout separation:

```
(auth)/    -- Unauthenticated layout (login page, minimal chrome)
(portal)/  -- Authenticated layout (sidebar, header, full application shell)
```

**Middleware** (`src/middleware.ts`):

- Checks for auth tokens on every request.
- Redirects unauthenticated users to `/login`.
- Redirects authenticated users away from `/login` to `/dashboard`.
- Protects all `(portal)` routes.

### Page Inventory (18 pages)

| Page             | Route                       | Purpose                                                  |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| Root             | `/`                         | Redirects to `/dashboard` or `/login`                    |
| Login            | `/login`                    | Email/password authentication                            |
| Dashboard        | `/dashboard`                | Overview stats, recent activity, health status           |
| Chat             | `/chat`                     | Thread list, create new thread                           |
| Chat Thread      | `/chat/[threadId]`          | Message conversation, composer, model selector, settings |
| Connectors       | `/connectors`               | Cloud provider connector list, status, actions           |
| Connector Detail | `/connectors/[connectorId]` | Connector config, models, health events, sync runs       |
| Models           | `/models`                   | All available models across connectors (cloud)           |
| Local Models     | `/models/local`             | Ollama local model management, pull, role assignment     |
| Routing          | `/routing`                  | Routing policies CRUD, recent decisions                  |
| Memory           | `/memory`                   | Memory records list, create, edit, toggle                |
| Context          | `/context`                  | Context packs management, items                          |
| Files            | `/files`                    | File upload, list, ingestion status                      |
| Observability    | `/observability`            | Aggregated health dashboard across all services          |
| Audits           | `/audits`                   | Audit log viewer with filters                            |
| Logs             | `/logs`                     | Client and server log viewer with filters                |
| Admin            | `/admin`                    | User management (ADMIN role only)                        |
| Settings         | `/settings`                 | User preferences, password change, appearance, language  |

---

## 5. Styling

### CSS Variables

Theming is driven entirely by CSS custom properties. Dark mode is handled automatically -- no `dark:` Tailwind prefixes.

```css
--background, --foreground, --primary, --primary-foreground,
--secondary, --secondary-foreground, --muted, --muted-foreground,
--accent, --accent-foreground, --destructive, --destructive-foreground,
--card, --card-foreground, --popover, --popover-foreground,
--border, --input, --ring, --radius
```

Theme detection: system preference via `prefers-color-scheme`, user override stored in auth preferences.

### Tailwind CSS

- **Semantic classes only:** `text-muted-foreground`, `bg-card`, `border-border`.
- **No raw color classes** (`text-blue-500`) for semantic meaning.
- **Mobile-first** responsive design: `sm:`, `md:`, `lg:` breakpoints.
- **Class merging** via `cn()` utility from `src/lib/utils.ts` (wraps `clsx` + `tailwind-merge`).

### shadcn/ui

All form controls use shadcn/ui components (built on Radix UI primitives):

- `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Slider`
- `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`
- `Button`, `Badge`, `Card`, `Table`, `Tabs`
- `Toast` for notifications

**Rule:** No raw HTML `<select>`, `<input>`, `<textarea>` elements. Always use shadcn/ui.

shadcn/ui files in `src/components/ui/` are auto-generated and must not be manually edited.

### Icons

Lucide React icons are used exclusively. No other icon libraries.

---

## 6. Internationalization (i18n)

### Languages

| Code | Language   | Direction |
| ---- | ---------- | --------- |
| `EN` | English    | LTR       |
| `AR` | Arabic     | RTL       |
| `DE` | German     | LTR       |
| `ES` | Spanish    | LTR       |
| `FR` | French     | LTR       |
| `IT` | Italian    | LTR       |
| `PT` | Portuguese | LTR       |
| `RU` | Russian    | LTR       |

### Implementation

- Locale files: `src/lib/i18n/locales/{en,ar,de,es,fr,it,pt,ru}.ts`
- Type-safe keys defined in `src/types/i18n.types.ts`
- All user-facing text uses `t('key')` from `useTranslation()` hook
- **No hardcoded text** in any component
- Language preference persisted in user profile (`UserLanguagePreference` enum)
- Arabic layout applies `dir="rtl"` globally

### Adding New Text

When adding any user-facing string:

1. Add the key and English text to `en.ts`
2. Add translations to ALL 7 remaining locale files
3. Add the key to the TypeScript type definition in `i18n.types.ts`
4. Use `t('newKey')` in the component

---

## 7. Authentication Flow

### Login

1. User submits email/password on `/login`.
2. `useLogin` hook calls `authRepository.login()`.
3. Backend returns `{ accessToken, refreshToken, user }`.
4. `useAuthStore.setAuth()` persists tokens and user to localStorage.
5. Redirect to `/dashboard`.

### Authenticated Requests

All API calls go through a shared axios instance with interceptors:

1. **Request interceptor:** Attaches `Authorization: Bearer <accessToken>` header.
2. **Response interceptor (401 handling):**
   - On 401 response, attempts token refresh via `POST /auth/refresh` with the `refreshToken`.
   - If refresh succeeds, updates tokens in store and retries the original request.
   - If refresh fails, clears auth store and redirects to `/login`.

### Token Rotation

- Access tokens are short-lived (`JWT_ACCESS_EXPIRY`, default 15m).
- Refresh tokens are rotated on every refresh call (old token invalidated, new one issued).
- Refresh tokens stored in `sessions` table with `expiresAt` (default 7d).

### Security Note

Tokens are stored in localStorage (not httpOnly cookies). This is a deliberate trade-off for SPA simplicity. Mitigations include short-lived access tokens, refresh rotation, security headers, and Pino log redaction of sensitive fields.

---

## 8. SSE Streaming

Chat responses use Server-Sent Events for real-time streaming:

- **Implementation:** `fetch`-based streaming (not `EventSource`), via `use-chat-stream.ts`.
- **Flow:** POST to chat endpoint with `Accept: text/event-stream`, read the response body as a `ReadableStream`.
- **Events:** Streamed tokens are appended to the message in real-time.
- **Fallback:** If SSE fails, the system falls back to polling for the completed message.
- **Routing Transparency:** Real-time display of routing decisions, fallback indicators, and provider/model badges.

---

## 9. Coding Standards

### Absolute Rules

1. **No `any`** -- use `unknown`, generics, or proper types.
2. **No `eslint-disable`** -- fix the underlying issue.
3. **No `console.log`** -- only `console.warn` and `console.error` (or use logger utility).
4. **No string literal unions** -- use enums from `src/enums/`.
5. **No raw string comparisons** for domain values -- use enum comparisons.
6. **No `!` non-null assertion** -- handle nullability explicitly.
7. **No `==` or `!=`** -- always `===` and `!==`.
8. **No `var`** -- use `const`, or `let` only when reassignment is required.
9. **No inline types/interfaces/enums** -- extract to `src/types/`, `src/enums/`.
10. **No default exports** except Next.js pages/layouts.
11. **No `dangerouslySetInnerHTML`**.
12. **No direct 3rd-party imports** in components/hooks -- wrap in `src/utilities/`.
13. **All imports of types** use `import type { ... }` syntax.
14. **Explicit return types** on all functions.

### Component Rules

- Each component does ONE thing.
- Props-only data flow. Components NEVER fetch data.
- Must handle: loading state, empty state, error state.
- No inline styles. Use Tailwind via `cn()`.

### Hook Rules

- Each hook does ONE thing.
- Controller hooks orchestrate domain hooks.
- All GET requests via `useQuery`.
- All mutations via `useMutation`.
- Never call `useQuery`/`useMutation` directly in TSX files.

### File Naming

- Components: `PascalCase.tsx` or `kebab-case.tsx`
- Hooks: `use-kebab-case.ts`
- Types: `kebab-case.types.ts`
- Constants: `kebab-case.constants.ts`
- Utilities: `kebab-case.utility.ts`
- Enums: `kebab-case.enum.ts`

---

## 10. Key Chat Components

| Component              | Purpose                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `ModelSelector`        | Grouped dropdown: Auto mode + provider groups with model lists                        |
| `FileAttachmentPicker` | Paperclip button with file checkbox popover                                           |
| `ContextPackSelector`  | Checkbox list in thread settings panel                                                |
| `RoutingTransparency`  | Expandable routing decision details (confidence, reasons, cost/privacy class)         |
| `MessageBubble`        | Message display with provider/model badge, feedback buttons, regenerate, token counts |
| `MessageComposer`      | Textarea + model selector + file picker + send button                                 |
| `ThreadSettings`       | Side panel: system prompt, temperature, max tokens, model override, context packs     |
| `ThinkingIndicator`    | Animated indicator shown while waiting for AI response                                |

---

## 11. Build and Quality

### Pre-Commit (all must pass)

1. Prettier formatting
2. ESLint (0 errors)
3. TypeScript strict type checking (0 errors)
4. Production build
5. All tests pass

### Testing

- **Unit tests:** Vitest for hooks, utilities, and components
- **E2E tests:** Playwright for critical user flows
- Test files: `*.test.ts` / `*.test.tsx` (all ESLint restrictions OFF in test files)

### Commands

```bash
npm run lint          # Lint all workspaces including frontend
npm run typecheck     # TypeScript strict check
npm run build         # Production build (Next.js)
npm run test          # Run all tests
```
