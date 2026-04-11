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

All internal endpoints are prefixed with `/api/v1/internal/` and marked `@Public()` (no JWT required). They are NOT exposed through nginx — only accessible within the Docker network.

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
| `/internal/files/download/:id` | GET | image-service, file-gen | Download file without auth |
| `/internal/files/store-image` | POST | image-service | Store generated image as a file |

### Connector Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/connectors/config?provider=X` | GET | chat-service, routing-service | Get decrypted API key + base URL |

### Ollama Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/ollama/router-model` | GET | routing-service | Get current router model name |
| `/internal/ollama/installed-models` | GET | routing-service | Get installed models with categories |

### Image Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/images/generate` | POST | chat-service | Enqueue image generation |
| `/internal/images/:id` | GET | chat-service | Check generation status |
| `/internal/images/:id/retry` | POST | chat-service | Retry failed generation |
| `/internal/images/:id/retry-alternate` | POST | chat-service | Retry with different model |
| `/internal/images/:id/events` | SSE | chat-service | Stream generation progress |

### File Generation Service Internal API

| Endpoint | Method | Called By | Purpose |
|----------|--------|-----------|---------|
| `/internal/file-generations/generate` | POST | chat-service | Enqueue file generation |
| `/internal/file-generations/:id` | GET | chat-service | Check generation status |
| `/internal/file-generations/:id/retry` | POST | chat-service | Retry failed generation |
| `/internal/file-generations/:id/events` | SSE | chat-service | Stream generation progress |

---

## HTTP Call Pattern

Services use a shared HTTP utility (wrapped `fetch` or `axios`):

```typescript
// Fetching memories for context
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
  // Graceful degradation — continue without this data
  return null;
}
```

---

## Service Dependency Map

```
chat-service
  -> memory-service (HTTP: fetch memories, context packs)
  -> file-service (HTTP: fetch file chunks, content)
  -> connector-service (HTTP: fetch provider config)
  -> image-service (HTTP: enqueue image generation)
  -> file-generation-service (HTTP: enqueue file generation)

routing-service
  -> ollama-service (HTTP: get router model, installed models)
  -> connector-service (HTTP: get provider config)

image-service
  -> file-service (HTTP: store generated images)
  -> connector-service (HTTP: get provider config)

file-generation-service
  -> connector-service (HTTP: get provider config)
  -> ollama-service (HTTP: generate text)

memory-service
  -> ollama-service (HTTP: generate for extraction)

health-service
  -> all 12 services (HTTP: health check)
```

---

## RabbitMQ Event Flow

See `event-bus-reference.md` for the complete event reference. Key async flows:

### Message Processing Flow
```
chat -> message.created -> routing
routing -> message.routed -> chat
chat -> message.completed -> audit, memory
```

### Connector Lifecycle
```
connector -> connector.created -> audit
connector -> connector.synced -> audit, routing
connector -> connector.health_checked -> audit, routing
```

### Model Management
```
ollama -> model.pulled -> routing (invalidate cache)
ollama -> model.deleted -> routing (invalidate cache)
```

---

## Service Discovery

Services discover each other via environment variables (Docker hostnames):

```env
OLLAMA_SERVICE_URL=http://ollama-service:4008
CONNECTOR_SERVICE_URL=http://connector-service:4003
MEMORY_SERVICE_URL=http://memory-service:4005
FILE_SERVICE_URL=http://file-service:4006
IMAGE_SERVICE_URL=http://image-service:4012
FILE_GENERATION_SERVICE_URL=http://file-generation-service:4013
```

These are loaded via Zod-validated `AppConfig` (never `process.env` directly).

---

## Database Boundary Rule

Each service owns its data. Cross-database queries are forbidden:

```
auth-service     -> claw_auth (PostgreSQL)
chat-service     -> claw_chat (PostgreSQL)
connector-service -> claw_connectors (PostgreSQL)
routing-service  -> claw_routing (PostgreSQL)
memory-service   -> claw_memory (PostgreSQL + pgvector)
file-service     -> claw_files (PostgreSQL)
ollama-service   -> claw_ollama (PostgreSQL)
image-service    -> claw_images (PostgreSQL)
file-gen-service -> claw_file_generations (PostgreSQL)
audit-service    -> claw_audit (MongoDB)
client-logs      -> claw_client_logs (MongoDB)
server-logs      -> claw_server_logs (MongoDB)
```

If service A needs data from service B's database, it MUST call service B's internal HTTP API.

---

## Timeouts and Resilience

| Call Type | Timeout | Retry |
|-----------|---------|-------|
| Health check | 5000ms | None |
| Internal HTTP GET | 5000ms | None (graceful degradation) |
| Ollama router call | 10000ms (configurable) | Fallback to heuristic |
| Connector config fetch | 5000ms | None |
| AI provider call | 60000ms | Fallback chain |
| RabbitMQ publish | N/A | Auto-reconnect |
| RabbitMQ consume | N/A | 3 retries + DLQ |

---

## Request Correlation

Every request gets two tracking IDs propagated across services:

- `X-Request-ID`: Unique per HTTP request, generated by LoggingInterceptor if not provided
- `X-Trace-ID`: Unique per user action, spans multiple service calls

These are set in request/response headers and included in structured log events for end-to-end tracing.
