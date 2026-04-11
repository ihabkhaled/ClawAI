# API Reference — Health Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4009/api/v1` (direct)

---

## GET /health

Aggregated health check across all 12 services.

**Auth**: Public
**Response 200**:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-11T10:00:00.000Z",
  "services": [
    {
      "name": "auth-service",
      "status": "up",
      "responseTimeMs": 12,
      "error": null
    },
    {
      "name": "chat-service",
      "status": "up",
      "responseTimeMs": 15,
      "error": null
    },
    {
      "name": "connector-service",
      "status": "up",
      "responseTimeMs": 8,
      "error": null
    },
    {
      "name": "routing-service",
      "status": "up",
      "responseTimeMs": 10,
      "error": null
    },
    {
      "name": "memory-service",
      "status": "up",
      "responseTimeMs": 11,
      "error": null
    },
    {
      "name": "file-service",
      "status": "up",
      "responseTimeMs": 9,
      "error": null
    },
    {
      "name": "audit-service",
      "status": "up",
      "responseTimeMs": 14,
      "error": null
    },
    {
      "name": "ollama-service",
      "status": "up",
      "responseTimeMs": 20,
      "error": null
    },
    {
      "name": "client-logs-service",
      "status": "up",
      "responseTimeMs": 7,
      "error": null
    },
    {
      "name": "server-logs-service",
      "status": "up",
      "responseTimeMs": 8,
      "error": null
    },
    {
      "name": "image-service",
      "status": "up",
      "responseTimeMs": 12,
      "error": null
    },
    {
      "name": "file-generation-service",
      "status": "up",
      "responseTimeMs": 11,
      "error": null
    }
  ],
  "summary": {
    "total": 12,
    "up": 12,
    "down": 0
  }
}
```

**Degraded response** (some services down):
```json
{
  "status": "degraded",
  "services": [
    { "name": "auth-service", "status": "up", "responseTimeMs": 12, "error": null },
    { "name": "ollama-service", "status": "down", "responseTimeMs": null, "error": "Connection refused" }
  ],
  "summary": { "total": 12, "up": 11, "down": 1 }
}
```

**Unhealthy response** (all services down):
```json
{
  "status": "unhealthy",
  "summary": { "total": 12, "up": 0, "down": 12 }
}
```

---

## Status Values

| Overall Status | Condition |
|---------------|-----------|
| `healthy` | All services are up |
| `degraded` | Some services are up, some are down |
| `unhealthy` | All services are down |

| Service Status | Meaning |
|---------------|---------|
| `up` | Service responded within timeout |
| `down` | Service failed to respond or returned error |

---

## Health Check Configuration

- **Timeout**: 5000ms per service
- **Checked services**: All 12 services (auth through file-generation)
- **Endpoint hit**: `GET /api/v1/health` on each service
- **Parallel**: All checks run concurrently

---

## Per-Service Health Endpoints

Every service (except health-service) exposes its own health endpoint:

```
GET http://<service>:<port>/api/v1/health
```

These return `{ "status": "ok" }` and are used by the health service aggregator.

**curl**:
```bash
# Aggregated health
curl http://localhost:4000/api/v1/health

# Individual service health
curl http://localhost:4001/api/v1/health  # auth
curl http://localhost:4002/api/v1/health  # chat
curl http://localhost:4003/api/v1/health  # connector
curl http://localhost:4004/api/v1/health  # routing
curl http://localhost:4005/api/v1/health  # memory
curl http://localhost:4006/api/v1/health  # file
curl http://localhost:4007/api/v1/health  # audit
curl http://localhost:4008/api/v1/health  # ollama
curl http://localhost:4010/api/v1/health  # client-logs
curl http://localhost:4011/api/v1/health  # server-logs
curl http://localhost:4012/api/v1/health  # image
curl http://localhost:4013/api/v1/health  # file-generation
```
