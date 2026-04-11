# Service Guide: claw-client-logs-service

## Overview

| Property       | Value                                |
| -------------- | ------------------------------------ |
| Port           | 4010                                 |
| Database       | MongoDB (`claw_client_logs`)         |
| ODM            | Mongoose 8.x via @nestjs/mongoose    |
| Env prefix     | `CLIENT_LOGS_`                       |
| Nginx route    | `/api/v1/client-logs`                |

The client logs service ingests, stores, and queries frontend application logs. It receives batched log entries from the Next.js frontend and stores them in MongoDB with a 30-day TTL for automatic cleanup.

## Data Model (MongoDB)

### ClientLog

| Field      | Type     | Notes                                |
| ---------- | -------- | ------------------------------------ |
| level      | String   | LogLevel enum (DEBUG, INFO, WARN, ERROR, FATAL) |
| message    | String   | Log message text                     |
| component  | String   | Frontend component name              |
| action     | String?  | User action that triggered the log   |
| userId     | String?  | Authenticated user ID                |
| route      | String?  | Current page route                   |
| userAgent  | String?  | Browser user agent                   |
| metadata   | Object?  | Additional context data              |
| timestamp  | Date     | When the log was generated           |
| createdAt  | Date     | When stored (TTL index anchor)       |

### TTL Configuration

A MongoDB TTL index on `createdAt` automatically deletes documents after 30 days:

```javascript
{ createdAt: 1 }, { expireAfterSeconds: 2592000 }
```

## API Endpoints

| Method | Path       | Auth          | Description                      |
| ------ | ---------- | ------------- | -------------------------------- |
| POST   | /          | Bearer        | Ingest log batch                 |
| GET    | /          | ADMIN/OPERATOR| Query logs (paginated, filterable)|
| GET    | /stats     | ADMIN         | Log level distribution stats     |

## Batch Ingestion

The frontend sends logs in batches to minimize network overhead:

1. Frontend logger utility buffers log entries in memory
2. When buffer reaches threshold (default: 10 entries) or timer fires (default: 5 seconds), the batch is sent
3. POST body contains an array of log entries
4. Each entry is validated with Zod before storage
5. Failed entries are silently dropped (logging service should not crash the app)

### Batch Request Format

```json
{
  "logs": [
    {
      "level": "ERROR",
      "message": "Failed to load thread messages",
      "component": "ChatPage",
      "action": "FETCH_MESSAGES",
      "route": "/chat/abc123",
      "metadata": { "threadId": "abc123", "errorCode": "NETWORK_ERROR" }
    }
  ]
}
```

## Query Filters

The GET endpoint supports these query parameters:

| Parameter  | Type     | Description                    |
| ---------- | -------- | ------------------------------ |
| level      | String   | Filter by log level            |
| component  | String   | Filter by component name       |
| userId     | String   | Filter by user                 |
| route      | String   | Filter by page route           |
| startDate  | DateTime | Logs after this date           |
| endDate    | DateTime | Logs before this date          |
| search     | String   | Full-text search in message    |
| page       | Number   | Pagination page                |
| pageSize   | Number   | Items per page (max 100)       |

## Frontend Logger Utility

The frontend uses a centralized logger at `src/utilities/logger.utility.ts` that:

- Wraps `console.warn` and `console.error` (never `console.log`)
- Adds component name and route context automatically
- Buffers entries for batch submission
- Falls back to local-only logging if the API is unreachable

## Why Separate from Server Logs

Client and server logs are separated because:

- Different schemas (component/route vs. serviceName/module)
- Different ingestion patterns (batched HTTP vs. RabbitMQ events)
- Different access patterns (debugging frontend issues vs. backend issues)
- Different retention policies may be needed
- Separate MongoDB collections allow independent indexing
