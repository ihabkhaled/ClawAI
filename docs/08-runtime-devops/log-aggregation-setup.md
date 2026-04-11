# Log Aggregation Setup

> Pino logging, MongoDB log storage, client/server log services, and log management.

---

## 1. Logging Architecture

```
Frontend (browser)
  --> logger.utility.ts (structured logs)
    --> POST /api/v1/client-logs (batched)
      --> client-logs-service (port 4010)
        --> MongoDB (claw_client_logs, TTL 30d)

Backend Services
  --> Pino logger (structured JSON)
    --> RabbitMQ (log.server event)
      --> server-logs-service (port 4011)
        --> MongoDB (claw_server_logs, TTL 30d)
    --> stdout (Docker logs)
```

---

## 2. Backend Logging (Pino)

All NestJS services use Pino for structured JSON logging via the `shared-rabbitmq` package's `StructuredLogger`.

### Log Format

```json
{
  "level": "info",
  "time": 1712851200000,
  "msg": "Message created successfully",
  "serviceName": "chat-service",
  "module": "ChatService",
  "action": "createMessage",
  "requestId": "req-abc-123",
  "traceId": "trace-xyz-789",
  "userId": "user-123",
  "threadId": "thread-456",
  "context": { "messageId": "msg-789" }
}
```

### Log Levels

| Level   | Usage                                          | Production |
| ------- | ---------------------------------------------- | ---------- |
| `debug` | Detailed diagnostic info                       | Disabled   |
| `info`  | Normal operations (request received, etc.)     | Enabled    |
| `warn`  | Unexpected but recoverable situations          | Enabled    |
| `error` | Failures requiring attention                   | Enabled    |

### NestJS Logger Usage

```typescript
// Every service class has a logger instance
private readonly logger = new Logger(ClassName.name);

// Usage
this.logger.log('Thread created', { threadId, userId });
this.logger.warn('Slow query detected', { duration: 5000 });
this.logger.error('Database connection failed', error.stack);
```

### Sensitive Data Redaction

Pino is configured to redact sensitive fields:

```typescript
redact: ['authorization', 'password', 'refreshToken', 'apiKey', 'token', 'secret']
```

These fields are replaced with `[REDACTED]` in all log output.

### pino-http Auto-Logging

HTTP requests and responses are automatically logged with:
- Method, URL, status code, response time
- Request ID correlation
- Excluded paths: SSE endpoints (to prevent "headers already sent" errors)

```typescript
autoLogging: {
  ignore: (req) => req.url?.includes('/stream/') ?? false,
}
```

---

## 3. Frontend Logging

### Logger Utility (`src/utilities/logger.utility.ts`)

The frontend uses a structured logger that batches and sends logs to the backend:

```typescript
logger.debug({ component: 'chat', action: 'sse-connect', message: 'Connecting', details: { threadId } });
logger.info({ component: 'chat', action: 'send-message', message: 'Message sent' });
logger.warn({ component: 'chat', action: 'fallback', message: 'Provider failed' });
logger.error({ component: 'chat', action: 'error', message: error.message });
```

### Log Structure

```json
{
  "level": "info",
  "message": "Message sent",
  "component": "chat",
  "action": "send-message",
  "userId": "user-123",
  "route": "/chat/thread-456",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-04-11T10:30:00.000Z"
}
```

### Rules

- **No `console.log`** -- only `console.warn` and `console.error` are allowed (ESLint enforced)
- Use the `logger` utility for all frontend logging
- Logs are batched and sent via `POST /api/v1/client-logs`

---

## 4. Client Logs Service (Port 4010)

### Purpose

Receives batched logs from the frontend browser and stores them in MongoDB.

### Database

- **MongoDB database**: `claw_client_logs`
- **TTL**: 30 days (automatic expiration via MongoDB TTL index)
- **Collection**: `clientlogs`

### Schema

```typescript
{
  level: string;       // debug, info, warn, error
  message: string;     // Log message
  component: string;   // Frontend component (chat, connectors, etc.)
  action: string;      // Action identifier
  userId?: string;     // Authenticated user
  route?: string;      // Current page route
  userAgent?: string;  // Browser user agent
  details?: object;    // Additional context
  createdAt: Date;     // Timestamp (TTL index field)
}
```

---

## 5. Server Logs Service (Port 4011)

### Purpose

Receives log events from all backend services via RabbitMQ and stores them in MongoDB.

### Event Pattern

Services publish `log.server` events to RabbitMQ. The server-logs-service subscribes and persists them.

### Database

- **MongoDB database**: `claw_server_logs`
- **TTL**: 30 days
- **Collection**: `serverlogs`

### Schema

```typescript
{
  level: string;        // debug, info, warn, error
  serviceName: string;  // Which backend service
  module: string;       // NestJS module/class name
  action: string;       // Action identifier
  message: string;      // Log message
  requestId?: string;   // X-Request-ID correlation
  traceId?: string;     // Distributed trace ID
  userId?: string;      // Authenticated user
  threadId?: string;    // Chat thread (if applicable)
  context?: object;     // Additional context
  createdAt: Date;      // Timestamp (TTL index field)
}
```

---

## 6. Log Viewer (Frontend)

The `/logs` page provides a log viewing interface:

### Features

- **Tab switching**: Client logs vs Server logs
- **Level filtering**: DEBUG, INFO, WARN, ERROR
- **Service filtering** (server logs): Filter by service name
- **Date range**: Filter by time period
- **Search**: Full-text search in log messages
- **Auto-refresh**: Polls for new logs via TanStack Query

### State Management

Log filter state is managed by the `log.store.ts` Zustand store (not persisted):

```typescript
// src/stores/log.store.ts
{
  activeTab: LogsTab.CLIENT,
  level: undefined,
  service: undefined,
  dateRange: undefined,
  search: '',
}
```

---

## 7. Request ID Correlation

Requests are traced across the entire stack using `X-Request-ID`:

1. **Frontend**: The HTTP client generates a UUID for each request:
   ```typescript
   config.headers['X-Request-ID'] = crypto.randomUUID();
   ```

2. **Nginx**: Passes the header through to backend services

3. **Backend**: Logs include the `requestId` field, allowing correlation between frontend requests and backend processing

4. **Server logs**: The `requestId` is stored in MongoDB, enabling cross-service trace queries

---

## 8. Viewing Docker Logs

For real-time debugging, Docker container logs are available:

```bash
# Follow logs for a service
docker compose -f docker-compose.dev.yml logs -f chat-service

# Last 100 lines
docker compose logs --tail=100 routing-service

# Multiple services
docker compose logs -f auth-service chat-service routing-service

# All services (verbose)
docker compose logs -f

# Infrastructure
docker compose logs -f rabbitmq mongodb redis
```

### Log Rotation

Docker container logs can grow large. Configure log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

---

## 9. Elasticsearch Integration (Future)

The server-logs-service is designed to be Elasticsearch-ready. The MongoDB schema maps directly to Elasticsearch document structure. To enable:

1. Add Elasticsearch container to Docker Compose
2. Configure the server-logs-service to dual-write to MongoDB and Elasticsearch
3. Use Kibana for advanced log analysis and dashboards
