# System Architecture

## Overview

ClawAI is a local-first AI orchestration platform built as a distributed microservices system. It routes user prompts to the optimal AI provider (local Ollama or cloud) based on task type, privacy requirements, cost constraints, and latency targets. The system comprises 13 NestJS backend services, a Next.js frontend, and supporting infrastructure including 7 PostgreSQL databases, MongoDB, Redis, RabbitMQ, and Ollama.

---

## System Context Diagram

```
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
                     +--------------------+--------------------+
                     |                    |                    |
                     v                    v                    v
            +--------+------+   +--------+------+   +--------+------+
            | Auth Service  |   | Chat Service  |   | Routing Svc   |
            | (4001)        |   | (4002)        |   | (4004)        |
            +---------------+   +---------------+   +---------------+
            | Connector Svc |   | Memory Svc    |   | File Svc      |
            | (4003)        |   | (4005)        |   | (4006)        |
            +---------------+   +---------------+   +---------------+
            | Audit Svc     |   | Ollama Svc    |   | Health Svc    |
            | (4007)        |   | (4008)        |   | (4009)        |
            +---------------+   +---------------+   +---------------+
            | Client Logs   |   | Server Logs   |   | Image Svc     |
            | (4010)        |   | (4011)        |   | (4012)        |
            +---------------+   +---------------+   +---------------+
            | File Gen Svc  |
            | (4013)        |
            +---------------+
                     |
        +------------+------------+------------------+
        |            |            |                   |
        v            v            v                   v
  +-----------+ +---------+ +---------+      +---------------+
  | 7x PG    | | MongoDB | | Redis   |      | Ollama        |
  | (pgvector)| | (3 DBs) | |         |      | (Port 11434)  |
  +-----------+ +---------+ +---------+      | Local LLMs    |
                                             +---------------+
                     |
                     v
              +-------------+
              | RabbitMQ    |
              | (AMQP)      |
              | Event Bus   |
              +-------------+
```

---

## Container Diagram

### Service Inventory

| Service                 | Port | Database                    | Technology                  | Responsibility                                             |
| ----------------------- | ---- | --------------------------- | --------------------------- | ---------------------------------------------------------- |
| auth-service            | 4001 | PG `claw_auth`              | NestJS, Prisma, argon2      | Authentication, authorization, user management, sessions   |
| chat-service            | 4002 | PG `claw_chat`              | NestJS, Prisma, SSE         | Threads, messages, context assembly, LLM execution         |
| connector-service       | 4003 | PG `claw_connectors`        | NestJS, Prisma, AES-256-GCM | Cloud provider management, health checks, model sync       |
| routing-service         | 4004 | PG `claw_routing`           | NestJS, Prisma              | Intelligent routing, 7 modes, policies, decision recording |
| memory-service          | 4005 | PG `claw_memory` (pgvector) | NestJS, Prisma              | Memory extraction, CRUD, context packs                     |
| file-service            | 4006 | PG `claw_files`             | NestJS, Prisma              | File upload, chunking, ingestion                           |
| audit-service           | 4007 | MongoDB `claw_audit`        | NestJS, Mongoose            | Audit events, usage ledger                                 |
| ollama-service          | 4008 | PG `claw_ollama`            | NestJS, Prisma              | Local model management, roles, generation proxy            |
| health-service          | 4009 | None                        | NestJS                      | Aggregated health from all services                        |
| client-logs-service     | 4010 | MongoDB `claw_client_logs`  | NestJS, Mongoose            | Frontend log ingestion, TTL 30d                            |
| server-logs-service     | 4011 | MongoDB `claw_server_logs`  | NestJS, Mongoose            | Backend log aggregation, TTL 30d                           |
| image-service           | 4012 | PG `claw_images`            | NestJS, Prisma              | AI image generation                                        |
| file-generation-service | 4013 | PG `claw_file_gen`          | NestJS, Prisma              | AI file generation                                         |

### Database Topology

```
PostgreSQL Instances (7):
  claw_auth        <- auth-service
  claw_chat        <- chat-service
  claw_connectors  <- connector-service
  claw_routing     <- routing-service
  claw_memory      <- memory-service (pgvector extension)
  claw_files       <- file-service
  claw_ollama      <- ollama-service
  claw_images      <- image-service
  claw_file_gen    <- file-generation-service

MongoDB Databases (3):
  claw_audit       <- audit-service
  claw_client_logs <- client-logs-service (TTL 30 days)
  claw_server_logs <- server-logs-service (TTL 30 days)

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

- Chat owns message lifecycle
- Routing owns provider selection
- Memory owns knowledge extraction and retrieval
- Connectors own provider configuration and health

### 4. Event-Driven Decoupling

Services communicate asynchronously through RabbitMQ for operations that do not require immediate responses. This decouples the message processing pipeline: chat does not need to wait for memory extraction or audit logging to complete before responding to the user.

### 5. Defense in Depth

Security is layered: JWT authentication, RBAC authorization, input validation (Zod), rate limiting, encrypted secrets storage (AES-256-GCM), security headers (Helmet), and log redaction. No single layer is the sole line of defense.

### 6. Fail-Safe with Fallbacks

The routing engine implements a fallback chain. If the primary provider fails, the system automatically tries alternative providers. If the Ollama router times out (10s), the system falls back to heuristic routing. The user always gets a response.

---

## Service Communication Patterns

### Synchronous HTTP (Request-Response)

Used when the caller needs an immediate response to proceed.

```
chat-service --HTTP GET--> memory-service    (fetch memories for context)
chat-service --HTTP GET--> file-service      (fetch file chunks for context)
chat-service --HTTP POST-> ollama-service    (generate completion)
chat-service --HTTP POST-> connector-service (cloud provider API call)
routing-service --HTTP POST-> ollama-service (router model inference)
health-service --HTTP GET--> all services    (health aggregation)
```

### Asynchronous RabbitMQ (Fire-and-Forget with Guarantees)

Used for operations that should not block the request path.

```
chat-service --publishes--> message.created  --consumed by--> routing-service
routing-service --publishes--> message.routed --consumed by--> chat-service
chat-service --publishes--> message.completed --consumed by--> memory-service, audit-service
auth-service --publishes--> user.login/logout --consumed by--> audit-service
all services --publishes--> log.server --consumed by--> server-logs-service
```

### Server-Sent Events (SSE)

Used for real-time streaming of AI responses to the frontend.

```
Frontend <--SSE-- Nginx (buffering off) <--SSE-- chat-service
```

The chat service maintains SSE connections per thread. When an AI response is ready, it streams token-by-token or sends a completion event. Nginx is configured with `proxy_buffering off`, `X-Accel-Buffering: no`, and a 24-hour timeout for SSE endpoints.

---

## Data Ownership Boundaries

```
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
|  ollama-service  |     |  audit-service   |     |  image-service   |
|  Owns:           |     |  Owns:           |     |  Owns:           |
|  - LocalModels   |     |  - AuditLogs     |     |  - ImageJobs     |
|  - RoleAssignments|    |  - UsageLedger   |     |  - GeneratedImages|
|  - PullJobs      |     +------------------+     +------------------+
|  - RuntimeConfig |
+------------------+     +------------------+
                         | file-gen-service |
                         |  Owns:           |
                         |  - GenJobs       |
                         |  - GeneratedFiles|
                         +------------------+
```

Cross-service data access is strictly forbidden at the database level. When chat-service needs memories, it calls memory-service over HTTP. When audit-service needs to log a message completion, it receives the data through a RabbitMQ event payload.

---

## Request Lifecycle

### Authenticated API Request

```
1. Browser sends request to Nginx (port 4000)
2. Nginx routes to correct backend service based on URL prefix
3. NestJS middleware adds X-Request-ID if not present
4. AuthGuard extracts JWT from Authorization header
5. AuthGuard validates token signature and expiry
6. RolesGuard checks user role against @Roles() decorator
7. ValidationPipe runs Zod schema on request body/params
8. Controller extracts params, delegates to service (3-line rule)
9. Service executes business logic via repository + manager
10. Response returned through the same path
11. GlobalExceptionFilter catches any unhandled errors
12. Pino logger records request with redacted sensitive fields
```

### Chat Message Lifecycle

See [Message Flow](./message-flow.md) for the complete end-to-end sequence.

---

## Security Architecture

See [Security Architecture](./security-architecture.md) for the full security documentation.

Summary of layers:

- **Authentication**: JWT access tokens (short-lived) + refresh token rotation
- **Authorization**: Role-based access control (ADMIN, OPERATOR, VIEWER)
- **Encryption**: AES-256-GCM for connector API keys at rest
- **Validation**: Zod schemas on all inputs with length/size limits
- **Rate Limiting**: @nestjs/throttler (100 req/min default)
- **Headers**: Helmet for security headers (CSP, HSTS, etc.)
- **Logging**: Pino with automatic redaction of secrets
- **Transport**: HTTPS in production, CORS restricted to allowed origins

---

## Scalability Considerations

### Horizontal Scaling

Each service is stateless (except SSE connections in chat-service) and can be scaled horizontally behind a load balancer. Database connections are pooled via Prisma.

```
                    +-- chat-service (instance 1)
Load Balancer ---+-- chat-service (instance 2)
                    +-- chat-service (instance 3)
```

For SSE, sticky sessions or a shared event bus (Redis Pub/Sub) would be needed when scaling chat-service horizontally.

### Database Scaling

- **PostgreSQL**: Read replicas for read-heavy services (chat, memory). Connection pooling via PgBouncer.
- **MongoDB**: Replica sets for audit and log services. Sharding by userId for high-volume deployments.
- **Redis**: Redis Cluster for high availability.

### Event Bus Scaling

RabbitMQ supports clustering and federation. Consumer groups allow multiple instances of a service to process events in parallel without duplication.

### Bottleneck Analysis

| Component         | Bottleneck Risk               | Mitigation                                                 |
| ----------------- | ----------------------------- | ---------------------------------------------------------- |
| Ollama            | GPU memory, single instance   | Queue requests, model unloading, multiple Ollama instances |
| Chat SSE          | Connection count per instance | Sticky sessions, Redis Pub/Sub for cross-instance events   |
| Memory extraction | Ollama inference latency      | Async via RabbitMQ, batch processing                       |
| File chunking     | CPU-bound for large files     | Async processing, file size limits                         |
| RabbitMQ          | Message throughput            | Clustering, prefetch tuning, consumer scaling              |

### Deployment Topology

**Development**: All services in Docker Compose on a single machine (~22 containers).

**Production**: Services deployed as individual containers (or Kubernetes pods) with:

- Nginx or cloud load balancer as ingress
- Managed PostgreSQL (or self-hosted with replication)
- Managed MongoDB Atlas (or replica set)
- Managed Redis (or Redis Sentinel/Cluster)
- RabbitMQ cluster (3+ nodes)
- Ollama on GPU-equipped nodes

---

## Technology Stack Summary

| Layer              | Technology                                                   | Version                   |
| ------------------ | ------------------------------------------------------------ | ------------------------- |
| Frontend           | Next.js, React, TanStack Query, Zustand, Tailwind, shadcn/ui | 16, 19, 5, 4, 3.4, latest |
| Backend Framework  | NestJS                                                       | 10.4                      |
| Language           | TypeScript                                                   | 5.6+                      |
| ORM (SQL)          | Prisma                                                       | 5.22                      |
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
