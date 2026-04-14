# Inter-Service Communication Reference

ClawAI uses two communication patterns: synchronous HTTP for request/response and asynchronous RabbitMQ events for fire-and-forget workflows.

---

## When to Use HTTP vs Events

| Use HTTP When | Use Events When |
|---------------|-----------------|
| You need a response (data fetch) | Fire-and-forget (audit, logging) |
| Synchronous flow | Async processing (routing, memory extraction) |
| Service needs data to continue | Side effects (notifications, stats) |
| Internal API (service-to-service) | Decoupled consumers |

---

## HTTP Internal Endpoints

All internal endpoints are prefixed with `/api/v1/internal/` and marked `@Public()` (no JWT required). They are not exposed through Nginx for external use.

### Memory Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/memories/for-context?userId=X&limit=N` | GET | chat-service | Fetch user memories for context assembly |
| `/internal/context-packs/:id/items` | GET | chat-service | Fetch context pack items for context assembly |

### File Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/files/:id/chunks` | GET | chat-service | Fetch file chunks for context assembly |
| `/internal/files/:id/content` | GET | chat-service | Fetch raw file content |
| `/internal/files/download/:id` | GET | image-service, file-generation-service | Download file without auth |
| `/internal/files/store-image` | POST | image-service | Store generated image as a file |

### Connector Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/connectors/config?provider=X` | GET | chat-service, routing-service | Get decrypted API key + base URL |

### Ollama Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/ollama/router-model` | GET | chat-service, routing-service | Get current router model name |

### Workspace Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/workspace/search` | POST | chat-service | Search synced external objects for context grounding |

### Image Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/images/generate` | POST | chat-service | Enqueue image generation |
| `/internal/images/:generationId` | GET | chat-service | Check generation status |
| `/internal/images/:generationId/retry` | POST | chat-service | Retry failed generation |
| `/internal/images/:generationId/retry-alternate` | POST | chat-service | Retry with different model |
| `/internal/images/:generationId/events` | SSE | chat-service | Stream generation progress |

### File Generation Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/file-generations/generate` | POST | chat-service | Enqueue file generation |
| `/internal/file-generations/:generationId` | GET | chat-service | Check generation status |
| `/internal/file-generations/:generationId/retry` | POST | chat-service | Retry failed generation |
| `/internal/file-generations/:generationId/events` | SSE | chat-service | Stream generation progress |

---

## HTTP Call Pattern

Services use a shared HTTP utility:

```typescript
const memories = await httpGet<MemoryRecord[]>(
  `${this.config.memoryServiceUrl}/api/v1/internal/memories/for-context`,
  {
    params: { userId, limit: '20' },
    timeout: 5000,
  },
);
```

### Error Handling for HTTP Calls

```typescript
try {
  const config = await httpGet<ConnectorConfigResult>(
    `${this.connectorServiceUrl}/api/v1/internal/connectors/config`,
    { params: { provider } },
  );
  return config;
} catch (error: unknown) {
  this.logger.warn(`Failed to fetch connector config for ${provider}`);
  return null;
}
```

---

## Service Dependency Map

```text
chat-service
  -> memory-service (HTTP: fetch memories, context packs)
  -> workspace-service (HTTP: search synced objects for grounding)
  -> file-service (HTTP: fetch file chunks, content)
  -> connector-service (HTTP: fetch provider config)
  -> image-service (HTTP: enqueue image generation)
  -> file-generation-service (HTTP: enqueue file generation)

routing-service
  -> ollama-service (HTTP: get router model / local inference helpers)
  -> connector-service (HTTP: get provider config)

image-service
  -> file-service (HTTP: store generated images)
  -> connector-service (HTTP: get provider config)

file-generation-service
  -> file-service (HTTP: store generated files)

memory-service
  -> ollama-service (HTTP: generate for extraction)

health-service
  -> all 14 downstream services (HTTP: health check)
```

---

## RabbitMQ Event Flow

See `event-bus-reference.md` and `03-architecture/event-bus.md` for the complete event reference. Key async flows:

### Message Processing Flow

```text
chat -> message.created -> routing
routing -> message.routed -> chat
chat -> message.completed -> audit, memory
```

### Connector Lifecycle

```text
connector -> connector.created -> audit
connector -> connector.synced -> audit, routing
connector -> connector.health_checked -> audit, routing
```

### Agent Lifecycle

```text
agent -> agent.session.connected -> consumers
agent -> agent.session.disconnected -> consumers
```

### Logging

```text
all services -> log.server -> server-logs-service
```

---

## Service Discovery

Services discover each other via environment variables (Docker hostnames):

```env
OLLAMA_SERVICE_URL=http://ollama-service:4008
CONNECTOR_SERVICE_URL=http://connector-service:4003
AUTH_SERVICE_URL=http://auth-service:4001
CHAT_SERVICE_URL=http://chat-service:4002
ROUTING_SERVICE_URL=http://routing-service:4004
MEMORY_SERVICE_URL=http://memory-service:4005
FILE_SERVICE_URL=http://file-service:4006
AUDIT_SERVICE_URL=http://audit-service:4007
CLIENT_LOGS_SERVICE_URL=http://client-logs-service:4010
SERVER_LOGS_SERVICE_URL=http://server-logs-service:4011
IMAGE_SERVICE_URL=http://image-service:4012
FILE_GENERATION_SERVICE_URL=http://file-generation-service:4013
WORKSPACE_SERVICE_URL=http://workspace-service:4014
AGENT_SERVICE_URL=http://agent-service:4015
```

These are loaded via Zod-validated `AppConfig` (never `process.env` directly).

---

## Database Boundary Rule

Each service owns its data. Cross-database queries are forbidden:

```text
auth-service             -> claw_auth (PostgreSQL)
chat-service             -> claw_chat (PostgreSQL)
connector-service        -> claw_connectors (PostgreSQL)
routing-service          -> claw_routing (PostgreSQL)
memory-service           -> claw_memory (PostgreSQL + pgvector)
file-service             -> claw_files (PostgreSQL)
ollama-service           -> claw_ollama (PostgreSQL)
image-service            -> claw_images (PostgreSQL)
file-generation-service  -> claw_file_generations (PostgreSQL)
workspace-service        -> claw_workspace (PostgreSQL)
agent-service            -> claw_agent (PostgreSQL)
audit-service            -> claw_audit (MongoDB)
client-logs-service      -> claw_client_logs (MongoDB)
server-logs-service      -> claw_server_logs (MongoDB)
```

If service A needs data from service B's database, it must call service B's internal HTTP API.

---

## Timeouts and Resilience

| Call Type | Timeout | Retry |
|-----------|---------|-------|
| Health check | 5000ms | None |
| Internal HTTP GET/POST | 5000ms | None (graceful degradation) |
| Ollama router call | 10000ms (configurable) | Fallback to heuristic |
| Connector config fetch | 5000ms | None |
| AI provider call | 60000ms | Fallback chain |
| RabbitMQ publish | N/A | Auto-reconnect |
| RabbitMQ consume | N/A | 3 retries + DLQ |

---

## Request Correlation

Every request gets two tracking IDs propagated across services:

- `X-Request-ID`: Unique per HTTP request, generated by logging middleware if not provided
- `X-Trace-ID`: Unique per user action, spans multiple service calls

These are included in structured log events for end-to-end tracing.
