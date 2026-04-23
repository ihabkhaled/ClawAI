# Skill: Codebase Navigation

> Use this skill to quickly understand any part of the codebase, trace a feature end-to-end, or find where specific code lives.

---

## Architecture Mental Model

```
User action (frontend)
  → HTTP POST to nginx:4000
    → nginx proxies to backend service (4001-4016)
      → NestJS controller (extracts params, calls service)
        → Service (business logic, validation, event publishing)
          → Repository (Prisma/Mongoose DB access)
          → Manager (complex orchestration if needed)
            → RabbitMQ event published
              → Consumer service receives event
                → Same service/repo pattern on consumer side
```

---

## Where Things Live

### Backend Service Structure

```
apps/claw-<name>-service/
  src/
    app/
      app.module.ts          — root module, imports all feature modules
      config/app.config.ts   — Zod-validated environment config
      filters/               — GlobalExceptionFilter
      guards/                — AuthGuard, RolesGuard
      interceptors/          — LoggingInterceptor, RequestIdInterceptor
    common/
      enums/                 — All enums for this service
      constants/             — Service-wide constants
      errors/                — BusinessException, EntityNotFoundException
      utilities/             — Third-party library wrappers
    modules/
      <domain>/
        controllers/         — HTTP layer (3-line methods)
        services/            — Business logic
        repositories/        — DB access (Prisma/Mongoose)
        managers/            — Complex orchestration
          adapters/          — Provider-specific adapters (factory pattern)
        dto/                 — Zod schemas + inferred types
        types/               — TypeScript types for this domain
        constants/           — Domain-specific constants
        <domain>.module.ts   — Feature module (registers providers)
    generated/
      prisma/                — Auto-generated Prisma client
  prisma/
    schema.prisma            — Database schema
    migrations/              — Migration history
    seed*.ts                 — Seed scripts
```

### Frontend Structure

```
apps/claw-frontend/src/
  app/
    (auth)/                  — Login, register pages (public)
    (portal)/                — Protected pages (require auth)
      chat/
        page.tsx             — Threads list page
        [threadId]/
          page.tsx           — Thread detail page
      connectors/            — Connector management pages
      models/                — Model catalog pages
      routing/               — Routing policy + replay pages
      ...
    layout.tsx               — Root layout
    globals.css              — CSS variables (theme tokens)
  components/
    ui/                      — shadcn/ui primitives (DO NOT EDIT)
    common/                  — Shared components (LoadingSpinner, etc.)
    layout/                  — Sidebar, header, nav
    chat/                    — Chat-specific components
    connectors/              — Connector-specific components
    ...
  hooks/
    chat/                    — Chat hooks (useThreadDetailPage, etc.)
    connectors/              — Connector hooks
    common/                  — Shared hooks (useToggle, useDebounce)
    ...
  repositories/
    chat/chat.repository.ts
    connectors/connector.repository.ts
    shared/
      query-keys.ts          — All TanStack Query key factories
      api-client.ts          — Fetch wrapper
  types/
    chat.types.ts
    hook.types.ts
    component.types.ts
    i18n.types.ts
    ...
  enums/                     — Frontend enums
  constants/                 — App constants, routes, sidebar items
  stores/                    — Zustand stores (auth, sidebar, logs)
  lib/
    i18n/                    — Translation functions + locale files
    validation/              — Zod schemas
    utils.ts                 — cn() utility
  utilities/                 — Utility functions (sse, format, etc.)
```

---

## Tracing a Feature End-to-End

### Example: Trace how "send message" works

1. **Frontend entry point**: `apps/claw-frontend/src/hooks/chat/use-thread-detail-page.ts` → `handleSend()`
2. **Repository call**: `apps/claw-frontend/src/repositories/chat/chat.repository.ts` → `sendMessage()`
3. **HTTP to nginx**: `POST /api/v1/chat-messages`
4. **Nginx → chat service**: `apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts`
5. **Controller → service**: `ChatMessagesService.create()`
6. **Service → repo**: `ChatMessagesRepository.create()` stores USER message
7. **Service publishes event**: `message.created` to RabbitMQ
8. **Routing service consumes**: `RoutingService.handleMessageCreated()` → evaluates routing
9. **Routing publishes back**: `message.routed` with selectedProvider/Model
10. **Chat service consumes**: `ChatMessagesService.handleMessageRouted()`
11. **ContextAssemblyManager**: fetches memories, context packs, file chunks
12. **ChatExecutionManager**: calls selected LLM provider
13. **Provider responds**: stored as ASSISTANT message
14. **SSE event emitted**: `emitCompletion()` → frontend receives via SSE
15. **Frontend updates**: TanStack Query invalidation + SSE handler updates UI

---

## Finding Where a Provider Routes

```bash
# Find the routing logic
grep -r "callProvider\|callOllama\|callOpenAI\|callAnthropic" \
  apps/claw-chat-service/src --include="*.ts" -l

# Find which providers are registered
grep -r "PROVIDER_BASE_URLS\|providerMap" \
  apps/claw-chat-service/src --include="*.ts"

# Find where provider string comes from
grep -r "selectedProvider\|executingModel" \
  apps/claw-chat-service/src --include="*.ts" -l
```

---

## Finding Where an Enum Is Used

```bash
# Find all usages of an enum
grep -r "ConnectorStatus\." apps/ --include="*.ts" | head -30

# Find where an enum is defined
grep -r "enum ConnectorStatus" apps/ packages/ --include="*.ts"
```

---

## Finding All Endpoints for a Service

```bash
# All route decorators in a service
grep -r "@Get\|@Post\|@Put\|@Patch\|@Delete" \
  apps/claw-connector-service/src --include="*.controller.ts"
```

---

## Finding Event Publishers and Consumers

```bash
# Find all publishers
grep -r "publishEvent\|rabbitMQService.publish" apps/ --include="*.ts" -l

# Find all consumers
grep -r "@MessagePattern\|@EventPattern" apps/ --include="*.ts" -l

# Find specific event
grep -r "message.created\|MESSAGE_CREATED" apps/ packages/ --include="*.ts"
```

---

## Understanding a RabbitMQ Flow

1. Find the event pattern in `packages/shared-types/src/events.ts`
2. Find the publisher: `grep -r "eventPattern" apps/ --include="*.service.ts"`
3. Find the consumer: `grep -r "eventPattern" apps/ --include="*.controller.ts"`
4. Read the publisher's payload shape
5. Read the consumer's handler method

---

## Finding Model Catalog and Routing Logic

```bash
# Routing capability classes and keywords
cat apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts | head -100

# Provider routing decision
grep -r "selectProvider\|routingDecision" \
  apps/claw-routing-service/src --include="*.ts" -l

# PromptBuilderManager for dynamic routing
find apps/claw-routing-service/src -name "prompt-builder*"
```

---

## Key Files to Know

| File                                                                                     | Why It Matters                                           |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts`    | How LLM calls are made, provider routing, fallback chain |
| `apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts`           | 1650+ routing keywords, 33 capability classes            |
| `apps/claw-connector-service/src/modules/connectors/managers/adapters/ollama.adapter.ts` | Ollama cloud sync + health check                         |
| `apps/claw-frontend/src/hooks/chat/use-thread-detail-page.ts`                            | Main chat page controller hook                           |
| `apps/claw-frontend/src/repositories/shared/query-keys.ts`                               | All TanStack Query key factories                         |
| `infra/nginx/nginx.conf`                                                                 | All service routes + SSE config                          |
| `packages/shared-types/src/events.ts`                                                    | All RabbitMQ event patterns                              |
| `packages/shared-constants/src/index.ts`                                                 | All service ports + names                                |
