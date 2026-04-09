# Codebase Navigation Guide

How to find anything in the ClawAI monorepo. Use this as a map when exploring the codebase.

---

## Monorepo Root Structure

```
d:/Freelance/Claw/
  apps/                     # All deployable applications (13 backend + 1 frontend)
  packages/                 # Shared npm workspace packages
    shared-types/           # 18+ enums, event payloads, auth types
    shared-constants/       # Exchange name, ports, API prefix, pagination defaults
    shared-rabbitmq/        # RabbitMQModule, RabbitMQService (retry+DLQ), StructuredLogger
    shared-auth/            # AuthGuard, RolesGuard, @Public, @Roles, @CurrentUser decorators
  infra/
    nginx/                  # nginx.conf with 20+ route mappings (port 4000 -> services)
  scripts/
    install.sh              # Automated setup for Linux/macOS
    install.ps1             # Automated setup for Windows
    claw.sh                 # Service management (up/down/status/logs)
  docs/                     # 15 documentation sections
  .env.example              # All environment variables with descriptions
  .env                      # Local environment values (not committed)
  docker-compose.dev.yml    # Full dev environment (~22 containers)
  docker-compose.yml        # Production compose
  package.json              # Root workspace config
  CLAUDE.md                 # Mandatory project rules for AI agents and developers
```

---

## Backend Service Internal Structure

Every NestJS service follows this identical layout:

```
apps/claw-<service>/
  prisma/                           # Prisma schema and migrations (PG services only)
    schema.prisma
    migrations/
  src/
    main.ts                         # Bootstrap, port binding, Swagger, global pipes/filters
    app/                            # Global NestJS infrastructure
      app.module.ts                 # Root module, imports all feature modules
      decorators/                   # Custom decorators (e.g., @CurrentUser)
      filters/                      # GlobalExceptionFilter, BusinessExceptionFilter
      guards/                       # AuthGuard, RolesGuard
      interceptors/                 # Logging, timing, correlation ID interceptors
      pipes/                        # ZodValidationPipe, custom pipes
    common/                         # Shared within this service
      constants/                    # Service-specific constants
      enums/                        # Service-specific enums
      errors/                       # BusinessException, EntityNotFoundException
      utilities/                    # Wrapped third-party libraries, helper functions
    modules/                        # Feature modules (one per domain entity group)
      <domain>/
        <domain>.module.ts          # NestJS module declaration
        <domain>.controller.ts      # HTTP endpoints (3-line methods)
        <domain>.service.ts         # Business logic (max 30 lines/method)
        <domain>.repository.ts      # Data access (Prisma/Mongoose, no throws)
        <domain>.manager.ts         # Complex orchestration (if needed, max 80 lines/method)
        dto/                        # Zod schemas + inferred types for request validation
        types/                      # TypeScript types/interfaces for this domain
        constants/                  # Domain-specific constants
      health/                       # Health check endpoint (every service has one)
    infrastructure/                 # External integrations config
      prisma/                       # PrismaModule, PrismaService
      rabbitmq/                     # RabbitMQ consumer setup, event handlers
      mongoose/                     # Mongoose schemas (MongoDB services only)
    generated/                      # Prisma client output (auto-generated, do not edit)
    __tests__/                      # Test files
      <domain>/
        <name>.spec.ts
  package.json
  tsconfig.json
  tsconfig.build.json
  nest-cli.json
  eslint.config.mjs
```

### Service-Specific Variations

| Service     | Notable Extras                                                             |
| ----------- | -------------------------------------------------------------------------- |
| chat        | `chat-messages/managers/` (ChatExecutionManager, ContextAssemblyManager)   |
| connector   | `common/utilities/` (AES-256-GCM encryption utility)                       |
| routing     | `routing/managers/` (routing decision engine, Ollama router integration)   |
| memory      | `memory/managers/` (extraction manager, pgvector queries)                  |
| ollama      | `ollama/managers/` (model pull manager, generation manager)                |
| audit       | `infrastructure/mongoose/` (Mongoose schemas for audit logs, usage ledger) |
| client-logs | `infrastructure/mongoose/` (Mongoose schemas for client logs)              |
| server-logs | `infrastructure/mongoose/` (Mongoose schemas for server logs)              |

---

## Frontend Internal Structure

```
apps/claw-frontend/
  src/
    app/                            # Next.js App Router pages and layouts
      (authenticated)/              # Protected routes (require JWT)
        chat/
          page.tsx                  # Chat list page
          [threadId]/
            page.tsx                # Individual chat thread page
        connectors/
        models/
        routing/
        memory/
        context/
        files/
        observability/
        audits/
        logs/
        admin/
        settings/
        dashboard/
          page.tsx
      (public)/                     # Public routes
        login/
          page.tsx
      layout.tsx                    # Root layout (providers, theme, i18n)
      globals.css                   # CSS variables, Tailwind base styles
    components/                     # Reusable UI components
      ui/                           # shadcn/ui primitives (auto-generated, do NOT edit)
      layout/                       # Sidebar, header, navigation
      chat/                         # Chat-specific components (MessageBubble, Composer, etc.)
      connectors/                   # Connector management components
      shared/                       # Cross-cutting components (loading, error, empty states)
    hooks/                          # Custom React hooks (one file per hook)
      chat/                         # use-send-message.ts, use-thread-detail.ts, etc.
      auth/                         # use-auth.ts, use-login.ts
      connectors/                   # use-connectors.ts, use-connector-detail.ts
      <domain>/                     # Grouped by domain
    repositories/                   # API layer (HTTP calls)
      chat/
        chat.repository.ts          # Chat API methods (fetch threads, send message, etc.)
      auth/
        auth.repository.ts
      shared/
        query-keys.ts               # TanStack Query key factories
      <domain>/
        <domain>.repository.ts
    services/                       # Business logic that doesn't fit hooks or repositories
    types/                          # TypeScript type definitions
      chat.types.ts                 # Chat domain types
      auth.types.ts                 # Auth domain types
      component.types.ts            # Shared component prop types
      i18n.types.ts                 # Type-safe i18n keys
      <domain>.types.ts
    enums/                          # Frontend enums
      <name>.enum.ts
    constants/                      # Frontend constants
      <name>.constants.ts
    utilities/                      # Utility functions
      <name>.utility.ts
    stores/                         # Zustand stores (minimal client-only state)
      auth.store.ts                 # Auth state (token, user)
      sidebar.store.ts              # Sidebar open/closed
      <name>.store.ts
    lib/                            # Third-party library configuration
      i18n/
        locales/                    # 8 locale files
          en.ts                     # English (source of truth)
          ar.ts                     # Arabic (RTL)
          de.ts                     # German
          es.ts                     # Spanish
          fr.ts                     # French
          it.ts                     # Italian
          pt.ts                     # Portuguese
          ru.ts                     # Russian
        index.ts                    # i18n setup and hook export
      validation/                   # Zod schemas for frontend forms
        <name>.schema.ts
      utils.ts                      # cn() utility for Tailwind class merging
    middleware.ts                    # Next.js middleware (auth redirect, locale detection)
  public/                           # Static assets
  package.json
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  eslint.config.mjs
  vitest.config.ts
```

---

## Where to Find Things

### Backend

| Looking for...        | Location                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| HTTP endpoints        | `apps/claw-<service>/src/modules/<domain>/<domain>.controller.ts`                |
| Business logic        | `apps/claw-<service>/src/modules/<domain>/<domain>.service.ts`                   |
| Complex orchestration | `apps/claw-<service>/src/modules/<domain>/<domain>.manager.ts` or `managers/`    |
| Database queries      | `apps/claw-<service>/src/modules/<domain>/<domain>.repository.ts`                |
| Request validation    | `apps/claw-<service>/src/modules/<domain>/dto/<name>.dto.ts`                     |
| Domain types          | `apps/claw-<service>/src/modules/<domain>/types/<name>.types.ts`                 |
| Service enums         | `apps/claw-<service>/src/common/enums/<name>.enum.ts`                            |
| Service constants     | `apps/claw-<service>/src/common/constants/<name>.constants.ts`                   |
| Error classes         | `apps/claw-<service>/src/common/errors/`                                         |
| Utility wrappers      | `apps/claw-<service>/src/common/utilities/<name>.utility.ts`                     |
| Database schema       | `apps/claw-<service>/prisma/schema.prisma`                                       |
| RabbitMQ consumers    | `apps/claw-<service>/src/infrastructure/rabbitmq/`                               |
| Tests                 | `apps/claw-<service>/src/__tests__/<domain>/`                                    |
| Global filters/guards | `apps/claw-<service>/src/app/filters/` and `apps/claw-<service>/src/app/guards/` |
| Service bootstrap     | `apps/claw-<service>/src/main.ts`                                                |
| Module registration   | `apps/claw-<service>/src/app/app.module.ts`                                      |

### Frontend

| Looking for...       | Location                                                              |
| -------------------- | --------------------------------------------------------------------- |
| Page components      | `apps/claw-frontend/src/app/(authenticated)/<route>/page.tsx`         |
| UI components        | `apps/claw-frontend/src/components/<domain>/`                         |
| shadcn/ui primitives | `apps/claw-frontend/src/components/ui/` (do not edit)                 |
| Custom hooks         | `apps/claw-frontend/src/hooks/<domain>/use-<name>.ts`                 |
| API calls            | `apps/claw-frontend/src/repositories/<domain>/<domain>.repository.ts` |
| Query keys           | `apps/claw-frontend/src/repositories/shared/query-keys.ts`            |
| Type definitions     | `apps/claw-frontend/src/types/<domain>.types.ts`                      |
| Enums                | `apps/claw-frontend/src/enums/<name>.enum.ts`                         |
| Constants            | `apps/claw-frontend/src/constants/<name>.constants.ts`                |
| Utilities            | `apps/claw-frontend/src/utilities/<name>.utility.ts`                  |
| Zustand stores       | `apps/claw-frontend/src/stores/<name>.store.ts`                       |
| i18n translations    | `apps/claw-frontend/src/lib/i18n/locales/<lang>.ts`                   |
| Form validation      | `apps/claw-frontend/src/lib/validation/<name>.schema.ts`              |
| Tailwind config      | `apps/claw-frontend/tailwind.config.ts`                               |
| CSS variables/theme  | `apps/claw-frontend/src/app/globals.css`                              |

### Shared Packages

| Looking for...        | Location                                            |
| --------------------- | --------------------------------------------------- |
| Shared enums          | `packages/shared-types/src/enums/`                  |
| Event payloads        | `packages/shared-types/src/events/`                 |
| Auth types            | `packages/shared-types/src/auth/`                   |
| Port/prefix constants | `packages/shared-constants/src/`                    |
| RabbitMQ module       | `packages/shared-rabbitmq/src/rabbitmq.module.ts`   |
| RabbitMQ service      | `packages/shared-rabbitmq/src/rabbitmq.service.ts`  |
| Structured logger     | `packages/shared-rabbitmq/src/structured-logger.ts` |
| Auth guards           | `packages/shared-auth/src/guards/`                  |
| Auth decorators       | `packages/shared-auth/src/decorators/`              |

### Infrastructure

| Looking for...        | Location                                    |
| --------------------- | ------------------------------------------- |
| Nginx route mappings  | `infra/nginx/nginx.conf`                    |
| Docker services       | `docker-compose.dev.yml` (root)             |
| Environment variables | `.env.example` (root)                       |
| Setup scripts         | `scripts/install.sh`, `scripts/install.ps1` |
| Management script     | `scripts/claw.sh`                           |

---

## Naming Conventions

### Files

| Type       | Pattern                              | Example                        |
| ---------- | ------------------------------------ | ------------------------------ |
| Controller | `<domain>.controller.ts`             | `chat-threads.controller.ts`   |
| Service    | `<domain>.service.ts`                | `chat-threads.service.ts`      |
| Repository | `<domain>.repository.ts`             | `chat-threads.repository.ts`   |
| Manager    | `<domain>.manager.ts`                | `chat-execution.manager.ts`    |
| DTO        | `<action>-<domain>.dto.ts`           | `create-thread.dto.ts`         |
| Types      | `<domain>.types.ts`                  | `chat-thread.types.ts`         |
| Enum       | `<name>.enum.ts`                     | `routing-mode.enum.ts`         |
| Constants  | `<name>.constants.ts`                | `token-limits.constants.ts`    |
| Utility    | `<name>.utility.ts`                  | `encryption.utility.ts`        |
| Hook       | `use-<name>.ts`                      | `use-send-message.ts`          |
| Store      | `<name>.store.ts`                    | `auth.store.ts`                |
| Test       | `<name>.spec.ts`                     | `chat-threads.service.spec.ts` |
| Component  | `PascalCase.tsx` or `kebab-case.tsx` | `MessageBubble.tsx`            |

### Classes and Functions

| Type             | Convention                  | Example                                       |
| ---------------- | --------------------------- | --------------------------------------------- |
| NestJS class     | PascalCase + suffix         | `ChatThreadsService`, `ChatThreadsController` |
| Manager class    | PascalCase + Manager        | `ChatExecutionManager`                        |
| Repository class | PascalCase + Repository     | `ChatThreadsRepository`                       |
| React component  | PascalCase                  | `MessageBubble`, `ThreadSettings`             |
| Hook             | camelCase with `use` prefix | `useSendMessage`, `useThreadDetail`           |
| Utility function | camelCase                   | `encryptValue`, `formatTokenCount`            |
| Constants        | SCREAMING_SNAKE_CASE        | `MAX_TOKEN_LIMIT`, `DEFAULT_TEMPERATURE`      |
| Enums            | PascalCase (name + values)  | `RoutingMode.AUTO`, `UserRole.ADMIN`          |

### Directories

- Backend modules: `kebab-case` (e.g., `chat-messages`, `chat-threads`)
- Frontend folders: `kebab-case` (e.g., `hooks/chat/`, `repositories/auth/`)
- Next.js routes: `kebab-case` (e.g., `(authenticated)/chat/[threadId]/`)

---

## Import Patterns

### Backend Imports

```typescript
// 1. Node built-ins (with node: protocol)
import { randomBytes } from 'node:crypto';

// 2. NestJS/third-party frameworks
import { Injectable, Logger } from '@nestjs/common';

// 3. Shared packages (workspace imports)
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { UserRole } from '@claw/shared-types';

// 4. Local imports (relative paths)
import { ChatThreadsRepository } from './chat-threads.repository';
import type { CreateThreadInput } from './dto/create-thread.dto';
import type { ThreadWithMessages } from './types/chat-thread.types';
```

### Frontend Imports

```typescript
// 1. React/Next.js
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { useQuery, useMutation } from '@tanstack/react-query';

// 3. Internal aliases (@/ maps to src/)
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { ChatThread } from '@/types/chat.types';
import { RoutingMode } from '@/enums/routing-mode.enum';
import { MAX_MESSAGE_LENGTH } from '@/constants/chat.constants';
```

### Key Rules

- Always use `import type { ... }` for type-only imports
- Group imports: built-in > external > internal > relative
- Alphabetize within groups
- Never import third-party libraries directly in services/components -- use utility wrappers
- Backend shared packages use `@claw/` scope
- Frontend uses `@/` alias for `src/`
