# System Architecture

## Overview

ClawAI is a local-first AI orchestration platform built as a distributed microservices system. It routes user prompts to the optimal AI provider (local Ollama or cloud) based on task type, privacy requirements, cost constraints, and latency targets. The system now comprises 15 NestJS backend services, a Next.js frontend, and supporting infrastructure including 11 PostgreSQL databases, MongoDB, Redis, RabbitMQ, Ollama, and ClamAV.

---

## System Context Diagram

```text
                                +---------------------+
                                |    Human Users      |
                                | (Admin / Operator / |
                                |      Viewer)        |
                                +---------+-----------+
                                          |
                                          | HTTPS
                                          v
                               +----------+----------+
                               |   Next.js Frontend  |
                               |   (Port 3000)       |
                               |   React 19 + SPA    |
                               +----------+----------+
                                          |
                                          | HTTP / SSE
                                          v
                               +----------+----------+
                               |   Nginx Reverse     |
                               |   Proxy (Port 4000) |
                               +----------+----------+
                                          |
          +-------------------------------+--------------------------------+
          |                |                |                |             |
          v                v                v                v             v
   +-------------+  +-------------+  +-------------+  +-------------+  +-------------+
   | Auth 4001   |  | Chat 4002   |  | Routing 4004|  | Memory 4005 |  | File 4006  |
   +-------------+  +-------------+  +-------------+  +-------------+  +-------------+
   | Connector   |  | Audit 4007  |  | Ollama 4008 |  | Health 4009 |  | Workspace   |
   | 4003        |  +-------------+  +-------------+  +-------------+  | 4014        |
   +-------------+  | Client Logs |  | Server Logs |  | Image 4012  |  +-------------+
                    | 4010        |  | 4011        |  +-------------+  | Agent 4015  |
                    +-------------+  +-------------+  | File Gen    |  +-------------+
                                                      | 4013        |
                                                      +-------------+
                                          |
                       +------------------+-------------------+
                       |                  |                   |
                       v                  v                   v
                 +-----------+      +-----------+      +-------------+
                 | 11x PG    |      | MongoDB   |      | Redis       |
                 | +pgvector |      | (3 DBs)   |      |             |
                 +-----------+      +-----------+      +-------------+
                       |
                       v
                 +-------------+      +-------------+      +-------------+
                 | RabbitMQ    |      | Ollama      |      | ClamAV      |
                 | Event Bus   |      | Port 11434  |      | Port 3310   |
                 +-------------+      +-------------+      +-------------+
```

---

## Container Diagram

### Service Inventory

| Service                 | Port | Database                      | Technology                  | Responsibility                                             |
| ----------------------- | ---- | ----------------------------- | --------------------------- | ---------------------------------------------------------- |
| auth-service            | 4001 | PG `claw_auth`                | NestJS, Prisma, argon2      | Authentication, authorization, user management, sessions   |
| chat-service            | 4002 | PG `claw_chat`                | NestJS, Prisma, SSE         | Threads, messages, context assembly, LLM execution         |
| connector-service       | 4003 | PG `claw_connectors`          | NestJS, Prisma, AES-256-GCM | Cloud provider management, health checks, model sync       |
| routing-service         | 4004 | PG `claw_routing`             | NestJS, Prisma              | Intelligent routing, 7 modes, policies, decision recording |
| memory-service          | 4005 | PG `claw_memory` (pgvector)   | NestJS, Prisma              | Memory extraction, CRUD, context packs                     |
| file-service            | 4006 | PG `claw_files`               | NestJS, Prisma              | File upload, chunking, ingestion, scanning                 |
| audit-service           | 4007 | MongoDB `claw_audit`          | NestJS, Mongoose            | Audit events, usage ledger                                 |
| ollama-service          | 4008 | PG `claw_ollama`              | NestJS, Prisma              | Local model management, roles, generation proxy            |
| health-service          | 4009 | None                          | NestJS                      | Aggregated health from downstream services                 |
| client-logs-service     | 4010 | MongoDB `claw_client_logs`    | NestJS, Mongoose            | Frontend log ingestion, TTL 30d                            |
| server-logs-service     | 4011 | MongoDB `claw_server_logs`    | NestJS, Mongoose            | Backend log aggregation, TTL 30d                           |
| image-service           | 4012 | PG `claw_images`              | NestJS, Prisma              | AI image generation                                        |
| file-generation-service | 4013 | PG `claw_file_generations`    | NestJS, Prisma              | AI file generation                                         |
| workspace-service       | 4014 | PG `claw_workspace`           | NestJS, Prisma              | External sync, search, object graph, action approval       |
| agent-service           | 4015 | PG `claw_agent`               | NestJS, Prisma              | Local agent sessions, commands, repos, file events         |

### Database Topology

```text
PostgreSQL Instances (11):
  claw_auth              <- auth-service
  claw_chat              <- chat-service
  claw_connectors        <- connector-service
  claw_routing           <- routing-service
  claw_memory            <- memory-service (pgvector extension)
  claw_files             <- file-service
  claw_ollama            <- ollama-service
  claw_images            <- image-service
  claw_file_generations  <- file-generation-service
  claw_workspace         <- workspace-service
  claw_agent             <- agent-service

MongoDB Databases (3):
  claw_audit             <- audit-service
  claw_client_logs       <- client-logs-service (TTL 30 days)
  claw_server_logs       <- server-logs-service (TTL 30 days)

Redis:
  Session cache, rate limiting, ephemeral state

RabbitMQ:
  Topic exchange "claw.events" with DLQ and 3 retries
```

---

## Architecture Principles

### 1. Local-First AI

Local Ollama models handle routing decisions, memory extraction, and simple queries without any data leaving the user's machine. Cloud providers are used only when the task requires capabilities beyond local models or when the user explicitly opts in.

### 2. Service Autonomy

Each service owns its database exclusively. No service reads from or writes to another service's database. Cross-service data access happens through HTTP calls or RabbitMQ events. This ensures services can be developed, deployed, and scaled independently.

### 3. Single Responsibility

Each service has a clear, bounded domain:

- Chat owns message lifecycle and orchestration workflows
- Routing owns provider selection
- Memory owns knowledge extraction and retrieval
- Connectors own provider configuration and health
- Workspace owns external knowledge sync and action approvals
- Agent owns desktop session and command execution state

### 4. Event-Driven Decoupling

Services communicate asynchronously through RabbitMQ for operations that do not require immediate responses. This decouples the message processing pipeline: chat does not need to wait for memory extraction or audit logging to complete before responding to the user.

### 5. Defense in Depth

Security is layered: JWT authentication, RBAC authorization, input validation (Zod), rate limiting, encrypted secrets storage (AES-256-GCM), security headers (Helmet), log redaction, and ClamAV-backed file scanning. No single layer is the sole line of defense.

### 6. Fail-Safe with Fallbacks

The routing engine implements a fallback chain. If the primary provider fails, the system automatically tries alternative providers. If the Ollama router times out, the system falls back to heuristic routing. The user always gets a response.

---

## Service Communication Patterns

### Synchronous HTTP (Request-Response)

Used when the caller needs an immediate response to proceed.

```text
chat-service --HTTP GET--> memory-service     (fetch memories for context)
chat-service --HTTP GET--> file-service       (fetch file chunks for context)
chat-service --HTTP POST-> workspace-service  (search synced workspace objects)
chat-service --HTTP GET--> connector-service  (provider config)
chat-service --HTTP GET--> ollama-service     (local generation and model helpers)
routing-service --HTTP POST-> ollama-service  (router model inference)
health-service --HTTP GET--> all downstream services (health aggregation)
```

### Asynchronous RabbitMQ (Fire-and-Forget with Guarantees)

Used for operations that should not block the request path.

```text
chat-service --publishes--> message.created   --consumed by--> routing-service
routing-service --publishes--> message.routed --consumed by--> chat-service
chat-service --publishes--> message.completed --consumed by--> memory-service, audit-service
auth-service --publishes--> user.login/logout --consumed by--> audit-service
agent-service --publishes--> agent.session.connected / disconnected
all services --publishes--> log.server --consumed by--> server-logs-service
```

### Server-Sent Events (SSE)

Used for real-time streaming of AI responses and long-running generation jobs to the frontend.

```text
Frontend <--SSE-- Nginx (buffering off) <--SSE-- chat-service
Frontend <--SSE-- Nginx (buffering off) <--SSE-- image-service
Frontend <--SSE-- Nginx (buffering off) <--SSE-- file-generation-service
```

---

## Data Ownership Boundaries

```text
+------------------+     +------------------+     +------------------+
|  auth-service    |     |  chat-service    |     | connector-svc    |
|  Owns:           |     |  Owns:           |     |  Owns:           |
|  - Users         |     |  - ChatThreads   |     |  - Connectors    |
|  - Sessions      |     |  - ChatMessages  |     |  - ConnectorModels|
|  - SystemSettings|     |  - Attachments   |     |  - HealthEvents  |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
| routing-service  |     |  memory-service  |     |  file-service    |
|  Owns:           |     |  Owns:           |     |  Owns:           |
|  - RoutingDecisions|   |  - MemoryRecords |     |  - Files         |
|  - RoutingPolicies |   |  - ContextPacks  |     |  - FileChunks    |
+------------------+     |  - ContextPackItems|   +------------------+
                         +------------------+

+------------------+     +------------------+     +------------------+
|  workspace-svc   |     |  agent-service   |     |  ollama-service  |
|  Owns:           |     |  Owns:           |     |  Owns:           |
|  - Connectors    |     |  - AgentSessions |     |  - LocalModels   |
|  - SyncRuns      |     |  - Commands      |     |  - RoleAssignments|
|  - Objects       |     |  - LocalRepos    |     |  - PullJobs      |
|  - Actions       |     |  - FileEvents    |     |  - RuntimeConfig |
+------------------+     +------------------+     +------------------+
```

Cross-service data access is strictly forbidden at the database level. When chat-service needs workspace results, it calls workspace-service over HTTP. When audit-service needs to log a message completion, it receives the data through a RabbitMQ event payload.

---

## Request Lifecycle

### Authenticated API Request

```text
1. Browser sends request to Nginx (port 4000)
2. Nginx routes to the correct backend service based on URL prefix
3. NestJS middleware adds X-Request-ID if not present
4. AuthGuard extracts JWT from Authorization header
5. AuthGuard validates token signature and expiry
6. RolesGuard checks user role against @Roles() decorator
7. ValidationPipe runs Zod schema on request body/params
8. Controller delegates to service
9. Service executes business logic via repository + manager
10. Response returned through the same path
11. GlobalExceptionFilter catches any unhandled errors
12. Structured logs are emitted with redacted sensitive fields
```

### Chat Message Lifecycle

See [Message Flow](./message-flow.md) for the complete end-to-end sequence.

---

## Security Architecture

See [Security Architecture](./security-architecture.md) for the full security documentation.

Summary of layers:

- **Authentication**: JWT access tokens (short-lived) + refresh token rotation
- **Authorization**: Role-based access control (ADMIN, OPERATOR, VIEWER)
- **Encryption**: AES-256-GCM for connector and workspace secrets at rest
- **Validation**: Zod schemas on all inputs with length/size limits
- **Rate Limiting**: `@nestjs/throttler`
- **Headers**: Helmet for security headers
- **Logging**: Pino with automatic redaction of secrets
- **File safety**: ClamAV scanning path for uploaded content
- **Transport**: HTTPS in production, CORS restricted to allowed origins

---

## Scalability Considerations

### Horizontal Scaling

Each service is stateless (except SSE connection state in streaming services) and can be scaled horizontally behind a load balancer. Database connections are pooled via Prisma.

```text
                    +-- chat-service (instance 1)
Load Balancer ---+-- chat-service (instance 2)
                    +-- chat-service (instance 3)
```

For SSE-heavy services, sticky sessions or a shared event layer would be needed when scaling horizontally.

### Database Scaling

- **PostgreSQL**: Read replicas for read-heavy services (chat, memory, workspace). Connection pooling via PgBouncer.
- **MongoDB**: Replica sets for audit and log services.
- **Redis**: Redis Cluster for high availability.

### Event Bus Scaling

RabbitMQ supports clustering and federation. Consumer groups allow multiple instances of a service to process events in parallel without duplication.

### Bottleneck Analysis

| Component         | Bottleneck Risk               | Mitigation                                                 |
| ----------------- | ----------------------------- | ---------------------------------------------------------- |
| Ollama            | GPU memory, single instance   | Queue requests, model unloading, multiple Ollama instances |
| Chat SSE          | Connection count per instance | Sticky sessions, shared event transport                    |
| Memory extraction | Ollama inference latency      | Async via RabbitMQ, batch processing                       |
| Workspace sync    | Provider API quotas           | Delta sync, backoff, connector health gating               |
| Agent polling     | Command fan-out               | Session scoping, lightweight polling, status cleanup       |
| RabbitMQ          | Message throughput            | Clustering, prefetch tuning, consumer scaling              |

### Deployment Topology

**Development**: All services in Docker Compose on a single machine (33 containers).

**Production**: Services deployed as individual containers or pods with:

- Nginx or cloud load balancer as ingress
- Managed PostgreSQL (or self-hosted with replication)
- Managed MongoDB (or replica set)
- Managed Redis
- RabbitMQ cluster
- Ollama on GPU-equipped nodes
- ClamAV or equivalent scanning service in the file ingestion path

---

## Technology Stack Summary

| Layer              | Technology                                                   | Version                   |
| ------------------ | ------------------------------------------------------------ | ------------------------- |
| Frontend           | Next.js, React, TanStack Query, Zustand, Tailwind, shadcn/ui | 16, 19, 5, 4, 3.4, latest |
| Backend Framework  | NestJS                                                       | 11.x                      |
| Language           | TypeScript                                                   | 5.6+                      |
| ORM (SQL)          | Prisma                                                       | 5.22+                     |
| ODM (Mongo)        | Mongoose                                                     | latest                    |
| Validation         | Zod                                                          | 3.24                      |
| Message Broker     | RabbitMQ                                                     | 3.13+                     |
| SQL Database       | PostgreSQL + pgvector                                        | 16+                       |
| Document Database  | MongoDB                                                      | 7+                        |
| Cache              | Redis                                                        | 7+                        |
| Local AI Runtime   | Ollama                                                       | latest                    |
| Reverse Proxy      | Nginx                                                        | 1.25+                     |
| Containerization   | Docker, Docker Compose                                       | 24+, 2.24+                |
| Package Management | npm workspaces                                               | 10+                       |
| Testing            | Jest (backend), Vitest (frontend), Playwright (E2E)          | latest                    |
| Linting            | ESLint 9 (flat config), Prettier                             | 9, 3.8                    |
