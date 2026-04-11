# Service Guide: claw-health-service

## Overview

| Property       | Value                          |
| -------------- | ------------------------------ |
| Port           | 4009                           |
| Database       | None                           |
| Env prefix     | N/A                            |
| Nginx route    | `/api/v1/health`               |

The health service is a lightweight aggregator that checks the health of all other microservices and infrastructure components. It has no database of its own and no shared packages dependency -- it only needs HTTP access to other services.

## Architecture

This service is intentionally minimal. It makes HTTP GET requests to each service's `/api/v1/health` endpoint and aggregates the results into a single response. It also checks infrastructure dependencies (PostgreSQL, MongoDB, Redis, RabbitMQ, Ollama).

## Dependencies

Notably lighter than other services:

- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` -- NestJS framework
- `axios` -- HTTP client for health check requests
- `helmet` -- security headers
- `nestjs-pino`, `pino`, `pino-http`, `pino-pretty` -- structured logging
- `@nestjs/throttler` -- rate limiting
- `zod` -- response validation

No Prisma, no RabbitMQ, no Redis, no shared packages.

## API Endpoint

| Method | Path           | Auth   | Description                        |
| ------ | -------------- | ------ | ---------------------------------- |
| GET    | /              | Public | Aggregated health status           |

## Response Format

```json
{
  "status": "healthy",
  "timestamp": "2026-04-11T10:00:00.000Z",
  "services": {
    "auth-service": {
      "status": "healthy",
      "responseTimeMs": 12,
      "url": "http://auth-service:4001"
    },
    "chat-service": {
      "status": "healthy",
      "responseTimeMs": 8,
      "url": "http://chat-service:4002"
    },
    "ollama": {
      "status": "healthy",
      "responseTimeMs": 45,
      "url": "http://ollama:11434"
    }
  },
  "infrastructure": {
    "rabbitmq": { "status": "healthy" },
    "redis": { "status": "healthy" }
  }
}
```

## Overall Status Logic

The aggregated `status` field follows these rules:

| Condition                         | Overall Status |
| --------------------------------- | -------------- |
| All services healthy              | healthy        |
| Some services down, core healthy  | degraded       |
| Core services down (auth, chat)   | unhealthy      |
| Health service itself failing     | N/A (502)      |

## Service URLs

The health service is configured with URLs for all other services, typically via environment variables or service discovery in Docker Compose:

| Service           | Default URL                        |
| ----------------- | ---------------------------------- |
| auth-service      | http://auth-service:4001           |
| chat-service      | http://chat-service:4002           |
| connector-service | http://connector-service:4003      |
| routing-service   | http://routing-service:4004        |
| memory-service    | http://memory-service:4005         |
| file-service      | http://file-service:4006           |
| audit-service     | http://audit-service:4007          |
| ollama-service    | http://ollama-service:4008         |
| client-logs       | http://client-logs-service:4010    |
| server-logs       | http://server-logs-service:4011    |
| image-service     | http://image-service:4012          |
| file-gen-service  | http://file-generation-service:4013|
| ollama runtime    | http://ollama:11434                |

## Timeout and Retry

- Each health check has a 5-second timeout
- Failed checks are marked as `DOWN` with the error message
- Response times are measured for performance monitoring
- No retries -- a single failure marks the service as unhealthy for that check cycle

## Use Cases

- **Dashboard widget** -- frontend polls this endpoint to show system status
- **Docker healthcheck** -- used as the health check command for the service container
- **Alerting** -- external monitoring tools can poll this endpoint
- **Load balancer** -- nginx can use this for upstream health checks
