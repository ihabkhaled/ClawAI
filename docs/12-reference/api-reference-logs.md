# API Reference — Logs Services

Two separate services handle logging: client-logs (port 4010) for frontend logs and server-logs (port 4011) for backend logs.

---

## Client Logs Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4010/api/v1` (direct)

### POST /client-logs

Create a client log entry. Used by the frontend to send application logs.

**Auth**: Public (no auth required — frontend sends logs before/without authentication)
**Request Body**:
```json
{
  "level": "error",
  "message": "Failed to load thread messages",
  "component": "ChatMessages",
  "action": "load_messages",
  "route": "/chat/clthread123",
  "userId": "cluser...",
  "sessionId": "sess_abc...",
  "threadId": "clthread...",
  "requestId": "req_xyz...",
  "locale": "en",
  "appearance": "dark",
  "userAgent": "Mozilla/5.0...",
  "errorCode": "NETWORK_ERROR",
  "errorStack": "Error: Network request failed\n  at fetch...",
  "metadata": { "retryCount": 3 }
}
```

Only `level` and `message` are required.

**Response 201**:
```json
{
  "id": "66abc...",
  "status": "created"
}
```

**curl**:
```bash
curl -X POST http://localhost:4000/api/v1/client-logs \
  -H "Content-Type: application/json" \
  -d '{"level":"error","message":"Something failed","component":"App"}'
```

---

### GET /client-logs

Search client logs with filtering.

**Auth**: Bearer token (ADMIN or OPERATOR role required)
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `level` (string) — info, warn, error, debug
- `component` (string) — frontend component name
- `action` (string) — user action
- `userId` (string) — filter by user
- `route` (string) — filter by page route
- `search` (string) — full-text search in message

**Response 200**:
```json
{
  "data": [
    {
      "_id": "66abc...",
      "level": "error",
      "message": "Failed to load thread messages",
      "component": "ChatMessages",
      "action": "load_messages",
      "route": "/chat/clthread123",
      "userId": "cluser...",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-04-11T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

---

### GET /client-logs/stats

Get client log statistics.

**Auth**: Bearer token (ADMIN or OPERATOR role required)
**Response 200**:
```json
{
  "totalLogs": 5000,
  "byLevel": {
    "info": 3000,
    "warn": 1500,
    "error": 450,
    "debug": 50
  },
  "byComponent": {
    "ChatMessages": 800,
    "ModelSelector": 600,
    "ThreadList": 400
  },
  "topErrors": [
    { "message": "Network request failed", "count": 120 },
    { "message": "Token expired", "count": 85 }
  ]
}
```

---

## Server Logs Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4011/api/v1` (direct)

### POST /server-logs

Create a single server log entry.

**Auth**: Public (services send logs without auth)
**Request Body**:
```json
{
  "level": "error",
  "message": "Failed to call Ollama",
  "serviceName": "routing-service",
  "module": "RoutingModule",
  "controller": "RoutingController",
  "service": "RoutingService",
  "manager": "RoutingManager",
  "action": "evaluate_route",
  "route": "POST /api/v1/routing/evaluate",
  "method": "POST",
  "statusCode": 500,
  "requestId": "req_xyz...",
  "traceId": "trace_abc...",
  "userId": "cluser...",
  "threadId": "clthread...",
  "messageId": "clmsg...",
  "provider": "local-ollama",
  "model": "gemma3:4b",
  "latencyMs": 10500,
  "errorCode": "OLLAMA_TIMEOUT",
  "errorMessage": "Request timed out after 10000ms",
  "metadata": { "retryCount": 3 }
}
```

Only `level`, `message`, and `serviceName` are required.

**Response 201**:
```json
{
  "id": "66abc...",
  "status": "created"
}
```

---

### POST /server-logs/batch

Create multiple server log entries at once.

**Auth**: Public
**Request Body**:
```json
{
  "entries": [
    { "level": "info", "message": "Request completed", "serviceName": "chat-service", "latencyMs": 45 },
    { "level": "warn", "message": "Slow query", "serviceName": "chat-service", "latencyMs": 2500 }
  ]
}
```

**Response 201**:
```json
{
  "count": 2,
  "status": "created"
}
```

---

### GET /server-logs

List server logs with comprehensive filtering.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `level` (string) — info, warn, error, debug
- `serviceName` (string) — filter by service
- `module` (string) — filter by NestJS module
- `controller` (string) — filter by controller
- `action` (string) — filter by action
- `requestId` (string) — find all logs for a request
- `traceId` (string) — find all logs for a trace
- `userId` (string) — filter by user
- `threadId` (string) — filter by thread
- `provider` (string) — filter by AI provider
- `search` (string) — full-text search in message
- `startDate` (ISO 8601 string) — from date
- `endDate` (ISO 8601 string) — to date

**Response 200**: `PaginatedResult<ServerLog>`

**curl**:
```bash
# Find all errors in routing-service
curl "http://localhost:4000/api/v1/server-logs?level=error&serviceName=routing-service" \
  -H "Authorization: Bearer $TOKEN"

# Trace a request across services
curl "http://localhost:4000/api/v1/server-logs?requestId=req_xyz..." \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /server-logs/stats

Get server log statistics.

**Auth**: Bearer token
**Response 200**:
```json
{
  "totalLogs": 50000,
  "byLevel": {
    "info": 35000,
    "warn": 10000,
    "error": 4500,
    "debug": 500
  },
  "byService": {
    "chat-service": 15000,
    "routing-service": 10000,
    "connector-service": 8000,
    "ollama-service": 7000
  },
  "errorRate": 0.09
}
```

---

## Log Retention

Both client and server logs have a **30-day TTL**. MongoDB automatically deletes documents older than 30 days via TTL indexes on the `createdAt` field.

---

## Log Ingestion Sources

### Client Logs
- Frontend sends via HTTP POST `/api/v1/client-logs`
- Batched by the frontend logger utility

### Server Logs
- **Primary**: RabbitMQ `log.server` events from `StructuredLogger`
- **Secondary**: HTTP POST `/api/v1/server-logs` (direct from services)
- **Batch**: HTTP POST `/api/v1/server-logs/batch` (multiple entries)
