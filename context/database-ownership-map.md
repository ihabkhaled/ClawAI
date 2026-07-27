# Database Ownership Map

**Each service owns its database. No service ever reads or writes another
service's DB.** Cross-service data flows only via HTTP (`/internal/*`) or
RabbitMQ. Ground truth: `.ai/manifests/services.json`
(`database`/`prismaModels`/`mongooseModels`), `docker-services.json` (the `pg-*`
and `mongodb` containers).

## Store types

- **14 PostgreSQL instances** (one per Postgres-backed service, pgvector-capable)
  via **Prisma 7.8**.
- **1 MongoDB** serving 3 services (audit, client-logs, server-logs) via
  **Mongoose**.
- **Redis** (caching) and **RabbitMQ** (bus) are shared infrastructure, not
  owned application data.
- `health-service` has **no database**.

Compose containers: `pg-auth`, `pg-chat`, `pg-connector`, `pg-routing`,
`pg-memory`, `pg-files`, `pg-ollama`, `pg-images`, `pg-file-generations`,
`pg-workspace`, `pg-agent`, `pg-research`, `pg-llamacpp`, plus `mongodb`,
`pg-payments`, `redis`, `rabbitmq`, `clamav` (databases compose files).

## Ownership table

| Service               | DB                  | Key models (see services.json for full list)                                                                                                                                                                     |
| --------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth :4001            | Postgres            | User, Session, Role, RolePermission, Plan, PlanModelAccess, UserPlanAssignment, TokenUsageLedger, SystemSetting                                                                                                  |
| chat :4002            | Postgres            | ChatThread, ChatMessage, ChatMessageContextReceipt, MessageAttachment, FileDeliveryRecord                                                                                                                        |
| connector :4003       | Postgres            | Connector, ConnectorModel, ConnectorHealthEvent, ModelSyncRun                                                                                                                                                    |
| routing :4004         | Postgres            | RoutingDecision, RoutingPolicy, RouterModelRegistry/Profile/Topic, RouterLearnedScore, RouterCircuitBreaker, ReplayRun/Case, RoutingFeedback/Outcome, TaxonomyRole (14 models)                                   |
| memory :4005          | Postgres (pgvector) | MemoryRecord, MemorySuggestion, MemoryUsage, MemoryAuditLog, MemoryPreference, ContextPack(+Item/Version/Usage/Attachment/Template), WorkspaceObjectEmbedding                                                    |
| file :4006            | Postgres            | File, FileChunk                                                                                                                                                                                                  |
| audit :4007           | Mongo               | AuditLog, UsageLedger                                                                                                                                                                                            |
| ollama :4008          | Postgres            | LocalModel, LocalModelRoleAssignment, ModelCatalogEntry, ModelDiscovery(Run/Candidate/Source), PullJob, RuntimeConfig                                                                                            |
| health :4009          | none                | —                                                                                                                                                                                                                |
| client-logs :4010     | Mongo               | ClientLog (TTL 30d)                                                                                                                                                                                              |
| server-logs :4011     | Mongo               | ServerLog (TTL 30d)                                                                                                                                                                                              |
| image :4012           | Postgres            | ImageGeneration, ImageGenerationAsset, ImageGenerationEvent                                                                                                                                                      |
| file-generation :4013 | Postgres            | FileGeneration, FileGenerationAsset, FileGenerationEvent                                                                                                                                                         |
| workspace :4014       | Postgres            | WorkspaceConnector(+Grant), WorkspaceObject(+Link), WorkspaceSyncRun, WorkspaceChain(+Run/Step), AiActionPolicy/ApprovalQueue, WebhookDelivery, and more (25 models)                                             |
| agent :4015           | Postgres            | AgentSession, Device, PairingRequest, RefreshToken, TerminalCommand, CapabilityInvocation, AccessPolicy, Recipe(+Run/Step), ActivityMemoryEntry, Organization(+Member), Marketplace(Listing/Install) (20 models) |
| research :4016        | Postgres            | SearchProvider, SearchRun, ResearchRun, FetchJob, PageCache                                                                                                                                                      |
| llamacpp :4017        | Postgres            | FrontierCatalogEntry, BinaryRelease, PullJob, HardwareSnapshot, ModelLoadEvent, PreflightOverrideAudit, RuntimeConfig                                                                                            |
| payment :4018         | Postgres            | BillingCustomer, Subscription, CheckoutSession, PaymentTransaction, Invoice(+Line/Delivery), Refund, PaymentMethod, ProrationQuote, FxQuote, WebhookEvent, OutboxEvent, ReconciliationRun/Finding                |

## Migrations (Prisma services)

Run inside the owning service directory:

```bash
npm run migrate:dev      # prisma migrate dev --name <name>  (authoring)
npm run migrate          # prisma migrate deploy             (entrypoint)
npm run prisma:generate  # prisma generate
```

A schema change requires a **container rebuild** — the migration runs in the
service entrypoint (`~30s` downtime per the hot-reload matrix). See
[stack-and-toolchain.md](stack-and-toolchain.md).

## Rules

- Never write a query against another service's DB. Need its data? Call its
  `/internal/*` endpoint or subscribe to its events.
- All DB access lives in **repositories** (Prisma/Mongoose only, no raw SQL).
- Repositories never throw — they return data or null.
- Two services needing "the same" data means the boundary is wrong or one should
  own it and expose it. Do not duplicate a table across DBs.
