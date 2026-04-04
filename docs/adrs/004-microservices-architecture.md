# ADR-004: Microservices Architecture

## Status
Accepted

## Context
The initial monolith backend worked for Phase 1, but for production resilience, fault isolation, and independent scaling, a microservices architecture is needed.

## Decision
Split the backend into 9 independent NestJS microservices:

| Service | Port | Database | Purpose |
|---------|------|----------|---------|
| Auth | 4001 | PostgreSQL (claw_auth) | Users, sessions, JWT, roles |
| Chat | 4002 | PostgreSQL (claw_chat) | Threads, messages, streaming |
| Connector | 4003 | PostgreSQL (claw_connectors) | Provider configs, model catalogs |
| Routing | 4004 | PostgreSQL (claw_routing) | Routing decisions, policies |
| Memory | 4005 | PostgreSQL (claw_memory) | Memory, context packs, embeddings |
| File | 4006 | PostgreSQL (claw_files) | File upload, chunking |
| Audit | 4007 | MongoDB (claw_audit) | Audit logs, usage ledger |
| Ollama | 4008 | None (Redis only) | Local model proxy |
| Health | 4009 | None (stateless) | Aggregates health from all services |

## Communication
- RabbitMQ for async events (topic exchange `claw.events`)
- Direct HTTP for sync inter-service calls
- Nginx as stateless reverse proxy for frontend access

## Database Isolation
Each service has its own PostgreSQL instance (separate Docker container). If one database crashes, other services continue operating.

## Shared Code
4 workspace packages under `packages/`:
- `@claw/shared-types` — enums, types, event contracts
- `@claw/shared-constants` — ports, names, exchange config
- `@claw/shared-rabbitmq` — NestJS RabbitMQ module
- `@claw/shared-auth` — JWT guard and decorators

## Consequences
- True fault isolation between services
- Independent deployment and scaling
- Higher operational complexity (11 infrastructure containers)
- All inter-service data access via RabbitMQ or HTTP (no shared databases)
