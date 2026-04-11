# ADR-001: Microservices Architecture

## Status

Accepted (2025-Q1)

## Context

ClawAI orchestrates multiple AI providers (OpenAI, Anthropic, Gemini, DeepSeek, Ollama), manages user authentication, stores conversation history, handles file processing, logs audit events, runs local AI models, generates images, and exports documents. These domains have fundamentally different scaling profiles, data store requirements, and failure modes.

A monolithic NestJS application would couple all these concerns into a single deployable unit. A crash in image generation would take down chat. A slow model pull would block file uploads. Database migrations in one domain would require redeploying everything. As the feature set grows, a monolith becomes increasingly difficult to maintain, test, and reason about.

The team needed an architecture that allows independent development, deployment, and scaling of each domain while maintaining strong data ownership boundaries.

## Decision

Split the backend into 13 independently deployable NestJS microservices, each owning a single bounded context:

| Service              | Port | Bounded Context                        |
| -------------------- | ---- | -------------------------------------- |
| auth-service         | 4001 | Users, sessions, JWT, RBAC             |
| chat-service         | 4002 | Threads, messages, context, execution  |
| connector-service    | 4003 | Cloud providers, health, model sync    |
| routing-service      | 4004 | Routing decisions, policies, AUTO mode |
| memory-service       | 4005 | Memory records, extraction, packs      |
| file-service         | 4006 | File upload, storage, chunking         |
| audit-service        | 4007 | Audit events, usage ledger             |
| ollama-service       | 4008 | Local model management, generation     |
| health-service       | 4009 | Aggregated health monitoring           |
| client-logs-service  | 4010 | Frontend log collection                |
| server-logs-service  | 4011 | Backend log aggregation                |
| image-service        | 4012 | Image generation (DALL-E, SD, Gemini)  |
| file-gen-service     | 4013 | Document export (PDF, DOCX, CSV, etc.) |

All services share a common NestJS boilerplate (guards, filters, interceptors, pipes) and communicate via RabbitMQ events or HTTP internal endpoints. An Nginx reverse proxy (port 4000) routes frontend requests to the correct service.

## Consequences

### Positive

- **Failure isolation**: A crash in the audit service does not affect chat. A stuck model pull does not block file uploads.
- **Independent deployability**: Each service can be updated, restarted, or rolled back without touching others.
- **Data ownership**: Each service owns its database. No cross-service SQL joins, no schema coupling.
- **Scaling flexibility**: The chat service can be scaled independently from the file service.
- **Team parallelism**: Multiple developers can work on different services without merge conflicts.
- **Technology fit**: Audit and logs use MongoDB (document-oriented), while chat and routing use PostgreSQL (relational + pgvector).

### Negative

- **Operational complexity**: 13 services + databases + message broker + reverse proxy = 22+ Docker containers in development.
- **Network overhead**: Context assembly requires HTTP calls to memory-service and file-service during every message execution.
- **Distributed debugging**: Tracing a request across services requires X-Request-ID correlation and checking multiple log streams.
- **Shared package management**: Changes to `shared-types` or `shared-rabbitmq` require rebuilding and restarting all dependent services.
- **Local development cost**: Requires 16+ GB RAM to run the full stack locally.

## Alternatives Considered

### Monolith with Modules

A single NestJS application with NestJS modules for each domain. Simpler to deploy and debug, but couples all failure modes and scaling profiles. Rejected because the AI provider domain (with long-running HTTP calls to LLMs) would block the event loop for simpler CRUD operations.

### Modular Monolith with Outbox

A monolith that uses the transactional outbox pattern for eventual consistency. Provides domain isolation at the code level but shares a single database and deployment unit. Rejected because different domains genuinely need different database technologies (PostgreSQL vs MongoDB) and different scaling profiles.

### Kubernetes-Native Microservices

Full Kubernetes with service mesh (Istio), distributed tracing (Jaeger), and centralized config (Consul). Would provide better observability and traffic management but was rejected as premature for a team of 1-3 developers. Docker Compose provides sufficient orchestration for the current scale.
