# Architecture Decision Records

This document records the key architectural decisions made for the ClawAI platform, their context, rationale, and consequences. Each ADR follows the format: Context, Decision, Consequences, Status.

See also: `docs/adrs/` for earlier ADRs written during initial development.

---

## ADR-001: Microservices Over Monolith

**Date**: 2025-Q1
**Status**: Accepted

### Context

ClawAI integrates with multiple AI providers, manages user auth, stores conversation history, handles file processing, logs audit events, and runs local AI models. These domains have different scaling profiles, different data stores, and different failure modes. A monolithic NestJS application would become a maintenance burden as features grow.

### Decision

Split the backend into 13 independently deployable NestJS microservices, each owning a single bounded context:

1. **auth** -- Authentication, authorization, user management
2. **chat** -- Conversation threads, messages, context assembly, AI execution
3. **connector** -- Cloud provider configuration, health, model sync
4. **routing** -- Routing decisions, policies, Ollama-assisted routing
5. **memory** -- Memory records, extraction, context packs
6. **file** -- File upload, storage, chunking
7. **audit** -- Audit events, usage tracking
8. **ollama** -- Local model management, generation
9. **health** -- Aggregated health monitoring
10. **client-logs** -- Frontend log collection
11. **server-logs** -- Backend log aggregation
12. **image** -- Image generation
13. **file-generation** -- AI-driven document generation

### Consequences

- **Positive**: Independent deployability; each service can be updated, scaled, or restarted without affecting others. Clear ownership boundaries. Different databases per service prevent coupling. Failure isolation -- a crash in the audit service does not affect chat.
- **Positive**: Teams can work on different services in parallel without merge conflicts.
- **Negative**: Operational complexity -- 13 services to monitor, deploy, and debug. Distributed tracing needed (X-Request-ID implemented).
- **Negative**: Network overhead for inter-service communication. Context assembly requires HTTP calls to memory and file services.
- **Negative**: Development environment requires Docker Compose with 22+ containers.

---

## ADR-002: PostgreSQL Per Service (Data Isolation)

**Date**: 2025-Q1
**Status**: Accepted

### Context

Microservices that share a database are coupled at the data layer -- schema changes in one service can break another. We need strong data isolation between services while supporting relational queries, ACID transactions, and vector similarity search (for memory/embeddings).

### Decision

Each service that needs relational storage gets its own PostgreSQL database instance:

- `claw_auth`, `claw_chat`, `claw_connectors`, `claw_routing`, `claw_memory` (with pgvector), `claw_files`, `claw_ollama`, `claw_image`, `claw_filegen`

MongoDB is used for services with document-oriented workloads:

- `claw_audit` (audit logs, usage ledger), `claw_client_logs`, `claw_server_logs`

### Consequences

- **Positive**: Complete schema independence. Each service evolves its schema via Prisma migrations without affecting others.
- **Positive**: pgvector extension available per-database for services that need vector similarity (memory service).
- **Positive**: MongoDB TTL indexes handle automatic log cleanup without affecting relational databases.
- **Negative**: 8 PostgreSQL + 3 MongoDB instances consume significant resources (~2GB RAM minimum for databases alone).
- **Negative**: No cross-database joins. Data that spans services requires HTTP or RabbitMQ communication.
- **Negative**: Backup and monitoring complexity scales linearly with database count.

---

## ADR-003: RabbitMQ Over HTTP for Async Communication

**Date**: 2025-Q1
**Status**: Accepted

### Context

Services need to communicate for workflows like: chat publishes a message, routing processes it, chat receives the decision and executes. Some communication must be synchronous (context assembly fetches from memory service), but most event flows are inherently async and benefit from decoupling, retry logic, and failure isolation.

### Decision

Use RabbitMQ with a topic exchange (`claw.events`, durable) for all asynchronous inter-service communication. Use HTTP for synchronous data fetching where a response is needed immediately.

- **RabbitMQ**: `message.created`, `message.routed`, `message.completed`, `connector.synced`, `user.login`, etc.
- **HTTP**: Chat service fetching memories, file chunks, and context packs during context assembly.

Implement DLQ (Dead Letter Queue) with 3 retries and exponential backoff for all consumers.

### Consequences

- **Positive**: Temporal decoupling -- publisher and consumer do not need to be available simultaneously.
- **Positive**: Retry with DLQ handles transient failures without losing messages.
- **Positive**: Topic routing allows flexible event subscription (e.g., audit service subscribes to multiple event types).
- **Positive**: Load leveling -- consumers process at their own pace.
- **Negative**: Eventual consistency -- routing decisions are not instant (typically <100ms, but can be up to 10s with Ollama router).
- **Negative**: Debugging distributed event flows is harder than tracing a single HTTP call. Requires correlation IDs and structured logging.
- **Negative**: RabbitMQ is another infrastructure dependency to operate and monitor.

---

## ADR-004: Ollama for Local AI Runtime

**Date**: 2025-Q1
**Status**: Accepted

### Context

ClawAI's core value proposition is intelligent routing with privacy guarantees. Some data must never leave the user's machine. Additionally, the routing engine needs a fast, local AI model to classify messages and select providers in AUTO mode. Using a cloud API for routing would add latency, cost, and a privacy paradox (sending data to the cloud to decide if it's safe to send to the cloud).

### Decision

Run Ollama locally as the AI runtime for:

1. **Routing**: `gemma3:4b` classifies messages and selects optimal provider (temp=0, Zod-validated output).
2. **Memory extraction**: `gemma3:4b` extracts facts, preferences, instructions, and summaries from completed messages.
3. **Fallback chat**: Local models serve as the ultimate fallback when cloud providers are unavailable.
4. **Privacy-sensitive requests**: LOCAL_ONLY and PRIVACY_FIRST modes route exclusively through Ollama.

Auto-pull 5 models on startup: `gemma3:4b`, `llama3.2:3b`, `phi3:mini`, `gemma2:2b`, `tinyllama`.

### Consequences

- **Positive**: Zero data leaves the machine for local-only operations. True privacy guarantee.
- **Positive**: No API cost for local operations. Routing decisions are free.
- **Positive**: No internet dependency for core routing logic.
- **Positive**: Configurable model roles allow swapping models without code changes.
- **Negative**: Requires significant local resources (~10GB disk for models, 4-8GB RAM during inference).
- **Negative**: Local model quality is lower than cloud models (4B params vs 100B+).
- **Negative**: Cold start latency (10-30s to load a model into memory).
- **Negative**: No GPU acceleration in Docker by default (requires nvidia-docker).

---

## ADR-005: Zod Over class-validator for Validation

**Date**: 2025-Q1
**Status**: Accepted

### Context

NestJS traditionally uses `class-validator` with decorators for DTO validation. However, `class-validator` has limitations: no runtime type inference, verbose decorator syntax, no composability, and the validated output type must be manually synchronized with the class definition.

### Decision

Use Zod for all input validation across all services. Define schemas as `z.object()` declarations, infer TypeScript types from schemas using `z.infer<>`. Use a custom `ZodValidationPipe` in NestJS to integrate with the standard validation pipeline.

```typescript
// DTO pattern
export const CreateThreadSchema = z.object({
  title: z.string().min(1).max(200),
  routingMode: z.nativeEnum(RoutingMode),
});
export type CreateThreadDto = z.infer<typeof CreateThreadSchema>;
```

### Consequences

- **Positive**: Single source of truth -- schema defines both validation rules and TypeScript type.
- **Positive**: Runtime validation matches compile-time types automatically.
- **Positive**: Composable -- schemas can extend, merge, and pick from each other.
- **Positive**: Used in both frontend (form validation) and backend (DTO validation) for consistency.
- **Positive**: Better error messages out of the box.
- **Negative**: Not the NestJS default -- requires custom pipe integration.
- **Negative**: Team members familiar with class-validator need to learn Zod patterns.
- **Negative**: Some NestJS Swagger/OpenAPI generators expect class-validator decorators.

---

## ADR-006: Event-Driven Routing (Decoupled, Async)

**Date**: 2025-Q1
**Status**: Accepted

### Context

The message flow requires the chat service to send a message to the routing service for provider selection, then receive the result to execute the AI call. Two approaches were considered: (1) synchronous HTTP call from chat to routing, or (2) event-driven via RabbitMQ.

### Decision

Use event-driven routing:

1. Chat publishes `message.created` event.
2. Routing consumes event, makes decision, publishes `message.routed` event.
3. Chat consumes `message.routed`, proceeds with execution.

### Consequences

- **Positive**: Chat and routing services are fully decoupled. Either can be restarted independently.
- **Positive**: Routing decisions are recorded as events, creating an audit trail.
- **Positive**: Multiple consumers can react to `message.created` (e.g., future analytics service).
- **Positive**: Routing service can be replaced or upgraded without touching chat service.
- **Negative**: Additional latency (RabbitMQ publish + consume + publish + consume adds ~10-50ms).
- **Negative**: More complex error handling -- what if routing never responds? (Handled by timeout + heuristic fallback.)
- **Negative**: Debugging requires following events across services via correlation IDs.

---

## ADR-007: SSE Over WebSocket for Streaming

**Date**: 2025-Q1
**Status**: Accepted

### Context

AI model responses should stream to the frontend token-by-token for a responsive UX. Two options: WebSocket (bidirectional, persistent connection) or Server-Sent Events (unidirectional, HTTP-based).

### Decision

Use Server-Sent Events (SSE) for streaming AI responses from the chat service to the frontend.

### Consequences

- **Positive**: SSE works over standard HTTP -- compatible with Nginx reverse proxy without special configuration (beyond buffering disabled).
- **Positive**: Automatic reconnection built into the SSE protocol.
- **Positive**: Simpler server implementation (no WebSocket upgrade, no connection state management).
- **Positive**: Works with standard HTTP authentication and CORS.
- **Negative**: Unidirectional only (server to client). Client-to-server communication still uses HTTP POST.
- **Negative**: HTTP/1.1 has a 6-connection-per-domain limit in browsers (not an issue with HTTP/2).
- **Negative**: Less efficient than WebSocket for very high-frequency bidirectional messaging (not our use case).

---

## ADR-008: Nginx Reverse Proxy (Single Entry Point)

**Date**: 2025-Q1
**Status**: Accepted

### Context

With 13 backend services on different ports, the frontend cannot manage connections to each individually. We need a single entry point that routes requests to the correct service based on URL path.

### Decision

Use Nginx as a reverse proxy on port 4000. All API requests go through Nginx, which routes based on URL prefix:

- `/api/v1/auth/*` -> auth-service:4001
- `/api/v1/chat-threads/*` -> chat-service:4002
- `/api/v1/connectors/*` -> connector-service:4003
- (20+ route mappings total)

Configure Nginx with SSE support (proxy_buffering off, chunked transfer encoding).

### Consequences

- **Positive**: Frontend connects to a single URL (port 4000) for all API calls.
- **Positive**: Nginx handles SSL termination, request buffering, and static file serving.
- **Positive**: SSE support with proper buffering configuration.
- **Positive**: Easy to add rate limiting, IP allowlisting, or caching at the proxy layer.
- **Negative**: Nginx is an additional component to configure and maintain.
- **Negative**: Route configuration is in nginx.conf, separate from application code -- must be updated when adding new endpoints.
- **Negative**: Nginx becomes a single point of failure (mitigated by its high reliability and simple configuration).

---

## ADR-009: Monorepo with npm Workspaces

**Date**: 2025-Q1
**Status**: Accepted

### Context

ClawAI has 13 backend services, 1 frontend, and 4 shared packages that all need to share enums, types, and utilities. Options: polyrepo (each service in its own repository), monorepo with Turborepo/Nx, or monorepo with npm workspaces.

### Decision

Use a monorepo with npm workspaces. All 18 packages live in a single repository under `apps/` and `packages/`.

### Consequences

- **Positive**: Single `npm install` installs all dependencies across all packages.
- **Positive**: Shared packages (`shared-types`, `shared-constants`, `shared-rabbitmq`, `shared-auth`) are workspace dependencies -- changes are immediately available to all consumers.
- **Positive**: Atomic commits -- a change to a shared type and all its consumers can be in one commit.
- **Positive**: Unified CI/CD pipeline (lint, typecheck, test, build all at once).
- **Positive**: No need for package publishing or version management for internal packages.
- **Negative**: Large repository size; `npm install` is slower than single-package install.
- **Negative**: CI runs all checks even when only one service changed (no incremental builds without Turborepo).
- **Negative**: All developers need the full repo; cannot clone just one service.

---

## ADR-010: fetch-Based SSE Over EventSource API

**Date**: 2025-Q1
**Status**: Accepted

### Context

The browser `EventSource` API is the standard way to consume SSE streams. However, `EventSource` has a critical limitation: it does not support custom HTTP headers. ClawAI requires the `Authorization: Bearer <token>` header on all API requests, including SSE connections.

### Decision

Use the `fetch` API with `ReadableStream` to consume SSE streams instead of the native `EventSource` API. Implement a custom SSE parser that reads the stream, splits on `\n\n` delimiters, and extracts `data:` fields.

### Consequences

- **Positive**: Full control over request headers -- `Authorization` header is sent with SSE requests.
- **Positive**: Can include any custom headers (e.g., `X-Request-ID` for correlation).
- **Positive**: Works identically across all modern browsers.
- **Positive**: Can implement custom retry logic and connection management.
- **Negative**: No automatic reconnection (must implement manually).
- **Negative**: More code than `new EventSource(url)` -- requires stream reading, parsing, and error handling.
- **Negative**: Must handle edge cases: partial chunks, multi-line data fields, keep-alive comments.

---

## ADR Summary Table

| ID  | Decision                    | Status   | Key Driver                                |
| --- | --------------------------- | -------- | ----------------------------------------- |
| 001 | Microservices (13 services) | Accepted | Failure isolation, independent deployment |
| 002 | PostgreSQL per service      | Accepted | Data isolation, independent schemas       |
| 003 | RabbitMQ for async          | Accepted | Reliability, retry/DLQ, decoupling        |
| 004 | Ollama local AI             | Accepted | Privacy, cost, routing independence       |
| 005 | Zod over class-validator    | Accepted | Type inference, composability             |
| 006 | Event-driven routing        | Accepted | Decoupling, auditability                  |
| 007 | SSE over WebSocket          | Accepted | Simplicity, HTTP compatibility            |
| 008 | Nginx reverse proxy         | Accepted | Single entry point, SSE support           |
| 009 | npm workspaces monorepo     | Accepted | Shared code, atomic changes               |
| 010 | fetch-based SSE             | Accepted | Auth header support                       |
