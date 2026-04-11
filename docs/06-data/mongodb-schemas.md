# MongoDB Schemas

MongoDB is used by 3 services: audit, client-logs, and server-logs. All share a single MongoDB instance with separate databases.

---

## Connection

```
MongoDB instance: mongodb:27017
Port: 27018 (host) / 27017 (container)
Auth: admin/claw:claw_secret

Databases:
  claw_audit       — AuditLog, UsageLedger (audit service)
  claw_client_logs — ClientLog (client-logs service)
  claw_server_logs — ServerLog (server-logs service)
```

---

## Audit Service — claw_audit

### audit_logs

Records security and business audit events.

| Field | Type | Required | Default | Indexed | Description |
|-------|------|----------|---------|---------|-------------|
| _id | ObjectId | YES | auto | PK | Document identifier |
| userId | String | YES | - | - | User who performed the action |
| action | String | YES | - | - | Action type (AuditAction enum) |
| entityType | String | NO | - | - | Type of entity affected |
| entityId | String | NO | - | - | ID of entity affected |
| severity | String | YES | "LOW" | - | Severity level (LOW, MEDIUM, HIGH, CRITICAL) |
| details | Object | NO | - | - | Additional action-specific data |
| ipAddress | String | NO | - | - | Client IP address |
| createdAt | Date | YES | Date.now | - | Event timestamp |
| updatedAt | Date | YES | auto | - | Mongoose timestamp |

**Actions tracked**: USER_LOGIN, USER_LOGOUT, MESSAGE_SENT, CONNECTOR_CREATED, CONNECTOR_UPDATED, CONNECTOR_DELETED, CONNECTOR_SYNCED, CONNECTOR_HEALTH_CHECKED, ROUTING_DECISION_MADE, MEMORY_EXTRACTED, IMAGE_GENERATED, IMAGE_FAILED, FILE_GENERATED, FILE_GENERATION_FAILED

### usage_ledger

Tracks resource usage for billing and analytics.

| Field | Type | Required | Default | Indexed | Description |
|-------|------|----------|---------|---------|-------------|
| _id | ObjectId | YES | auto | PK | Document identifier |
| userId | String | YES | - | - | User consuming the resource |
| resourceType | String | YES | - | - | Resource category (e.g., "tokens", "images") |
| action | String | YES | - | - | Usage action (e.g., "chat_completion") |
| quantity | Number | YES | 0 | - | Amount consumed |
| unit | String | NO | - | - | Unit of measurement (e.g., "tokens", "images") |
| metadata | Object | NO | - | - | Provider, model, cost details |
| createdAt | Date | YES | Date.now | - | Usage timestamp |
| updatedAt | Date | YES | auto | - | Mongoose timestamp |

**Metadata example**:
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "inputTokens": 1500,
  "outputTokens": 800,
  "estimatedCost": 0.0023,
  "threadId": "clxyz...",
  "messageId": "clxyz..."
}
```

---

## Client Logs Service — claw_client_logs

### client_logs

Stores frontend application logs. TTL: 30 days (auto-deleted).

| Field | Type | Required | Default | Indexed | Description |
|-------|------|----------|---------|---------|-------------|
| _id | ObjectId | YES | auto | PK | Document identifier |
| level | String | YES | - | YES | Log level (info, warn, error, debug) |
| message | String | YES | - | TEXT | Log message |
| component | String | NO | - | YES | Frontend component name |
| action | String | NO | - | YES | User action (e.g., "send_message") |
| route | String | NO | - | YES | Current page route |
| userId | String | NO | - | YES | Authenticated user ID |
| sessionId | String | NO | - | - | Browser session ID |
| threadId | String | NO | - | - | Current chat thread |
| connectorId | String | NO | - | - | Related connector |
| requestId | String | NO | - | - | X-Request-ID correlation |
| locale | String | NO | - | - | User's locale |
| appearance | String | NO | - | - | User's theme |
| userAgent | String | NO | - | - | Browser user agent |
| errorCode | String | NO | - | - | Error code |
| errorStack | String | NO | - | - | Error stack trace |
| metadata | Mixed | NO | - | - | Additional context |
| createdAt | Date | YES | Date.now | TTL(30d) | Log timestamp (expires after 30 days) |
| updatedAt | Date | YES | auto | - | Mongoose timestamp |

**Indexes**:
- `level` — filter by log level
- `component` — filter by component
- `action` — filter by action
- `userId` — logs for a user
- `route` — logs for a page
- `message` — text search index

**TTL**: Documents automatically deleted after 30 days via MongoDB TTL index on `createdAt`.

---

## Server Logs Service — claw_server_logs

### server_logs

Stores structured backend service logs. TTL: 30 days (auto-deleted).

| Field | Type | Required | Default | Indexed | Description |
|-------|------|----------|---------|---------|-------------|
| _id | ObjectId | YES | auto | PK | Document identifier |
| level | String | YES | - | YES | Log level |
| message | String | YES | - | TEXT | Log message |
| serviceName | String | YES | - | YES | Source service name |
| module | String | NO | - | - | NestJS module |
| controller | String | NO | - | - | Controller class |
| service | String | NO | - | - | Service class |
| manager | String | NO | - | - | Manager class |
| repository | String | NO | - | - | Repository class |
| action | String | NO | - | YES | Action being performed |
| route | String | NO | - | - | HTTP route |
| method | String | NO | - | - | HTTP method |
| statusCode | Number | NO | - | - | HTTP status code |
| requestId | String | NO | - | YES | X-Request-ID |
| traceId | String | NO | - | YES | X-Trace-ID |
| userId | String | NO | - | YES | Authenticated user |
| threadId | String | NO | - | YES | Chat thread ID |
| messageId | String | NO | - | - | Chat message ID |
| connectorId | String | NO | - | - | Related connector |
| provider | String | NO | - | - | AI provider |
| modelName | String | NO | - | - | AI model used |
| latencyMs | Number | NO | - | - | Operation duration |
| errorCode | String | NO | - | - | Error code |
| errorMessage | String | NO | - | - | Error message |
| errorStack | String | NO | - | - | Stack trace |
| metadata | Mixed | NO | - | - | Additional context |
| createdAt | Date | YES | Date.now | YES, TTL(30d) | Log timestamp |
| updatedAt | Date | YES | auto | - | Mongoose timestamp |

**Indexes**:
- `level` — filter by severity
- `serviceName` — filter by service
- `action` — filter by action
- `requestId` — correlate request across services
- `traceId` — trace user journey
- `userId` — logs for a user
- `threadId` — logs for a thread
- `createdAt` — time-based queries + TTL (30 days = 2,592,000 seconds)
- `message` — text search index

**TTL**: Documents automatically deleted after 30 days.

---

## Data Ingestion

### Audit logs
Ingested from RabbitMQ events. The audit service subscribes to events like `message.completed`, `connector.created`, etc., and creates audit + usage records.

### Client logs
Ingested via HTTP POST `/api/v1/client-logs` (public endpoint — no auth required). The frontend batches logs and sends them periodically.

### Server logs
Ingested two ways:
1. **RabbitMQ**: `log.server` events from StructuredLogger
2. **HTTP POST**: `/api/v1/server-logs` and `/api/v1/server-logs/batch` (public endpoints for services)

---

## Schema Notes

- MongoDB schemas are defined with Mongoose decorators (`@Schema`, `@Prop`), not Prisma
- No Prisma migrations for MongoDB — schemas are enforced at application level
- TTL indexes ensure automatic cleanup (no manual purge needed)
- Text indexes on `message` fields enable full-text search
