# ADR-002: Database Per Service

## Status

Accepted (2025-Q1)

## Context

With 13 microservices, the team needed to decide how to handle data persistence. The traditional approach of a shared database is simpler to set up but creates tight coupling between services. When service A reads service B's tables directly, schema changes in B require coordinated deployments of both services.

ClawAI's domains have different data characteristics:

- **Chat and routing**: Relational data with complex queries, needs pgvector for embeddings
- **Audit and logs**: Append-heavy, time-series-like data with TTL requirements
- **Memory**: Relational data with vector similarity search
- **Connectors**: Sensitive data (encrypted API keys) requiring strict access control

## Decision

Each service owns its own database instance. No service may read or write another service's database.

| Service    | Database          | Instance       | Rationale                          |
| ---------- | ----------------- | -------------- | ---------------------------------- |
| auth       | PostgreSQL        | claw_auth      | Relational users, sessions         |
| chat       | PostgreSQL        | claw_chat      | Threads, messages, attachments     |
| connector  | PostgreSQL        | claw_connectors| Encrypted configs, model registry  |
| routing    | PostgreSQL        | claw_routing   | Decisions, policies                |
| memory     | PostgreSQL+pgvector| claw_memory   | Memory records with embeddings     |
| file       | PostgreSQL        | claw_files     | File metadata, chunks              |
| ollama     | PostgreSQL        | claw_ollama    | Local models, pull jobs, catalog   |
| image      | PostgreSQL        | claw_images    | Image generation records           |
| file-gen   | PostgreSQL        | claw_file_gen  | File generation records            |
| audit      | MongoDB           | claw_audit     | Append-heavy audit logs, ledger    |
| client-logs| MongoDB           | claw_logs      | TTL 30d, unstructured frontend logs|
| server-logs| MongoDB           | claw_logs      | TTL 30d, structured backend logs   |

Cross-service data access is achieved through:

1. **RabbitMQ events**: Async, eventual consistency (e.g., `message.completed` triggers audit logging)
2. **HTTP internal endpoints**: Sync, for context assembly (e.g., chat-service fetches memories from memory-service)

## Consequences

### Positive

- **Schema independence**: Each service can evolve its schema without coordinating with others. Prisma migrations are service-scoped.
- **Technology fit**: Audit and logs use MongoDB (natural fit for append-heavy, TTL-indexed documents). Chat and memory use PostgreSQL with pgvector for vector similarity search.
- **Security isolation**: The connector service's encrypted API keys are not accessible to other services, even at the database level.
- **Independent backup and restore**: Each database can be backed up and restored independently.
- **No cross-service deadlocks**: Impossible to create a database-level deadlock across services.

### Negative

- **Data duplication**: Some data is denormalized across services (e.g., userId appears in every service's tables).
- **No cross-service joins**: Assembling a complete view (e.g., "show me all activity for user X") requires querying multiple services.
- **Eventual consistency**: After publishing an event, the consumer may not have processed it yet. The UI must handle this gracefully.
- **Operational overhead**: 9 PostgreSQL instances + 1 MongoDB instance to manage, back up, and monitor.
- **Development environment cost**: Docker Compose must spin up 10 database containers.

## Alternatives Considered

### Shared PostgreSQL with Schemas

One PostgreSQL instance with per-service schemas (e.g., `auth.users`, `chat.threads`). Simpler operations but allows cross-schema queries, breaking the ownership boundary. Rejected because it provides a false sense of isolation.

### Shared PostgreSQL with Row-Level Security

PostgreSQL RLS policies restricting each service's connection to specific tables. Provides real isolation but adds complexity to every migration and query. Rejected because it requires careful RLS policy management and does not support the MongoDB requirement for audit/logs.

### Event Sourcing with Shared Event Store

All services write events to a shared event store and derive their state from event projections. Provides strong consistency and audit trail but adds significant complexity. Rejected as overkill for the current scale and team size.
