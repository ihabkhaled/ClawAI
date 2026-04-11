# Service Guide: claw-server-logs-service

## Overview

| Property       | Value                                |
| -------------- | ------------------------------------ |
| Port           | 4011                                 |
| Database       | MongoDB (`claw_server_logs`)         |
| ODM            | Mongoose 8.x via @nestjs/mongoose    |
| Env prefix     | `SERVER_LOGS_`                       |
| Nginx route    | `/api/v1/server-logs`                |

The server logs service collects structured logs from all backend microservices via RabbitMQ events. It stores them in MongoDB with a 30-day TTL and provides a query API for the observability dashboard.

## Data Model (MongoDB)

### ServerLog

| Field       | Type     | Notes                                |
| ----------- | -------- | ------------------------------------ |
| level       | String   | LogLevel (DEBUG, INFO, WARN, ERROR, FATAL) |
| message     | String   | Log message                          |
| serviceName | String   | Source service name                  |
| module      | String?  | NestJS module name                   |
| action      | String?  | Action being performed               |
| requestId   | String?  | X-Request-ID for correlation         |
| traceId     | String?  | Distributed tracing ID              |
| userId      | String?  | User who triggered the action        |
| threadId    | String?  | Chat thread context                  |
| metadata    | Object?  | Additional structured data           |
| error       | Object?  | Error details (message, stack)       |
| timestamp   | Date     | When the log was generated           |
| createdAt   | Date     | When stored (TTL index anchor)       |

### TTL Configuration

```javascript
{ createdAt: 1 }, { expireAfterSeconds: 2592000 } // 30 days
```

## Ingestion via RabbitMQ

Unlike the client logs service (HTTP), server logs arrive via the RabbitMQ event bus:

1. Each backend service publishes `log.server` events using the `StructuredLogger` from `@claw/shared-rabbitmq`
2. The server-logs service subscribes to the `log.server` pattern
3. Events are validated and stored in MongoDB
4. DLQ (dead-letter queue) handles failed processing with 3 retries

### StructuredLogger

The shared `StructuredLogger` class provides a consistent logging interface:

```typescript
// In any backend service:
structuredLogger.info('User created', {
  action: 'CREATE_USER',
  userId: 'abc123',
  module: 'AuthService',
});
// This publishes a log.server event to RabbitMQ
```

## API Endpoints

| Method | Path        | Auth          | Description                      |
| ------ | ----------- | ------------- | -------------------------------- |
| GET    | /           | ADMIN/OPERATOR| Query logs (paginated, filterable)|
| GET    | /stats      | ADMIN         | Aggregated log statistics        |
| GET    | /services   | ADMIN         | List distinct service names      |

## Query Filters

| Parameter   | Type     | Description                     |
| ----------- | -------- | ------------------------------- |
| level       | String   | Filter by log level             |
| serviceName | String   | Filter by source service        |
| module      | String   | Filter by module name           |
| action      | String   | Filter by action type           |
| requestId   | String   | Correlate logs by request ID    |
| userId      | String   | Filter by user                  |
| threadId    | String   | Filter by chat thread           |
| startDate   | DateTime | Logs after this date            |
| endDate     | DateTime | Logs before this date           |
| search      | String   | Full-text search in message     |
| page        | Number   | Pagination page                 |
| pageSize    | Number   | Items per page (max 100)        |

## Elasticsearch-Ready Design

The schema is designed to be compatible with Elasticsearch/OpenSearch for future migration:

- Fields are typed consistently (no mixed types)
- `requestId` and `traceId` enable distributed tracing
- `serviceName` acts as a natural index/partition key
- Timestamps use ISO 8601 format
- Metadata is structured (not free-form strings)

When migrating to Elasticsearch, the MongoDB consumer would be replaced with a Logstash/Filebeat pipeline, or a dual-write consumer could be added.

## Request ID Correlation

The `X-Request-ID` header flows through the entire request lifecycle:

1. Frontend generates a UUID and sets `X-Request-ID` header
2. Nginx passes it through to the backend service
3. Each service includes it in all log events
4. Inter-service HTTP calls forward the header
5. The observability dashboard can filter all logs for a single request across services

## MongoDB Indexes

| Index                     | Purpose                          |
| ------------------------- | -------------------------------- |
| `{ createdAt: 1 }`       | TTL expiration (30 days)         |
| `{ serviceName: 1 }`     | Service-level filtering          |
| `{ level: 1 }`           | Level-based queries              |
| `{ requestId: 1 }`       | Request correlation              |
| `{ userId: 1 }`          | User activity tracking           |
| `{ timestamp: -1 }`      | Recent logs (descending)         |
