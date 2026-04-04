# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js :3000)                       │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼───────────────────────────────────────┐
│                  Nginx Reverse Proxy (:80)                        │
│  /api/v1/auth/*    → Auth Service :4001                          │
│  /api/v1/chat/*    → Chat Service :4002                          │
│  /api/v1/connectors/* → Connector Service :4003                  │
│  /api/v1/routing/* → Routing Service :4004                       │
│  /api/v1/memory/*  → Memory Service :4005                        │
│  /api/v1/files/*   → File Service :4006                          │
│  /api/v1/audits/*  → Audit Service :4007                         │
│  /api/v1/ollama/*  → Ollama Service :4008                        │
│  /api/v1/health    → Health Service :4009                        │
└──────────────────────────────────────────────────────────────────┘

┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌───────┐
│PG Auth  │ │PG Chat  │ │PG Connect│ │PG Route │ │PG Mem  │ │PG File│
│ :5441   │ │ :5442   │ │  :5443   │ │ :5444   │ │ :5445  │ │ :5446 │
└─────────┘ └─────────┘ └──────────┘ └─────────┘ └────────┘ └───────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ MongoDB  │ │  Redis   │ │ RabbitMQ │ │  Ollama  │
│  :27017  │ │  :6379   │ │  :5672   │ │  :11434  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Microservices

| Service | Port | Database | Owns |
|---------|------|----------|------|
| Auth | 4001 | PostgreSQL `claw_auth` | users, sessions, system_settings |
| Chat | 4002 | PostgreSQL `claw_chat` | chat_threads, chat_messages, message_attachments |
| Connector | 4003 | PostgreSQL `claw_connectors` | connectors, connector_models, health_events, sync_runs |
| Routing | 4004 | PostgreSQL `claw_routing` | routing_decisions, routing_policies |
| Memory | 4005 | PostgreSQL `claw_memory` | memory_records, context_packs, context_pack_items |
| File | 4006 | PostgreSQL `claw_files` | files, file_chunks |
| Audit | 4007 | MongoDB `claw_audit` | audit_logs, usage_ledger |
| Ollama | 4008 | None (Redis) | Local model proxy, installed models |
| Health | 4009 | None (stateless) | Aggregates health from all services |

## Communication Patterns

### Frontend → Services
Frontend calls Nginx (:80), which routes to the correct service by URL path.

### Service → Service (Async)
RabbitMQ topic exchange `claw.events`. Services publish events and subscribe to patterns.

Key events: `message.created`, `message.routed`, `message.completed`, `connector.synced`, `file.uploaded`, `audit.event`

### Service → Service (Sync)
Direct HTTP calls when immediate response is needed (e.g., Chat calls Auth to validate user).

## Backend Service Architecture

Each service follows: **Controller → Service → Manager → Repository**

- **Controllers**: HTTP transport only, call ONE service method
- **Services**: Thin orchestrators, max 30 lines per method
- **Managers**: Complex process logic (routing, prompt assembly, fallback)
- **Repositories**: Pure data access (Prisma or Mongoose)

## Frontend Architecture

**View (TSX) → Controller (Hook) → Service → Repository/API**

- TanStack Query for server state
- Zustand for client state
- shadcn/ui for components

## Database Isolation

Each service has its own PostgreSQL container. If one crashes, others continue. No shared databases. Inter-service data access via RabbitMQ events or HTTP calls.

## Shared Packages

| Package | Purpose |
|---------|---------|
| `@claw/shared-types` | Enums, types, event contracts |
| `@claw/shared-constants` | Service ports, names, exchange config |
| `@claw/shared-rabbitmq` | NestJS RabbitMQ module |
| `@claw/shared-auth` | JWT guard and decorators |
