# Log Redaction Reference

## Overview

All 13 ClawAI backend services use Pino logger with automatic field redaction to prevent secrets from appearing in logs. Redaction is configured at the application level and applies to all log output including request/response logging, error logging, and event payload logging.

---

## Redacted Fields

| Field Path | What It Contains | Why Redacted |
| --- | --- | --- |
| `authorization` | JWT tokens in HTTP headers | Token theft enables impersonation |
| `password` | User passwords | Plaintext passwords must never be logged |
| `refreshToken` | Refresh tokens | Token theft enables session hijacking |
| `apiKey` | Cloud provider API keys | Key theft enables unauthorized API usage |
| `token` | Generic token fields | Catch-all for any token-like data |
| `secret` | Generic secret fields | Catch-all for sensitive configuration |
| `encryptedConfig` | Encrypted connector configs | Even encrypted data should not be in logs |

### Redaction Behavior

Pino's `redact` option replaces matching field values with `[REDACTED]` before the log entry is serialized to JSON. This happens in-process before the log line is written to stdout.

```
Input:  { authorization: "Bearer eyJ...", userId: "abc-123" }
Output: { authorization: "[REDACTED]", userId: "abc-123" }
```

### Redaction Scope

Redaction applies to:
- Request headers logged by pino-http autoLogging
- Response data logged by interceptors
- Error context objects passed to `logger.error()`
- Event payloads logged during RabbitMQ publishing/consuming
- Any object passed to `logger.info()`, `logger.warn()`, `logger.error()`

---

## What Is NOT Logged (By Design)

Beyond redaction, certain data is architecturally excluded from logging:

| Data | Approach |
| --- | --- |
| Plaintext API keys | Only the encrypted form exists; decrypted keys are held in memory briefly during API calls and never passed to logger |
| Full request bodies for auth endpoints | Authentication endpoints do not log request bodies |
| User passwords at any point | Passwords are hashed immediately on receipt; raw password never assigned to a loggable variable |
| File contents | Only file metadata (name, size, type) is logged, never the actual content |
| Message content (full) | Long message content is truncated in logs to prevent sensitive data exposure |

---

## What IS Logged

| Data | Log Level | Purpose |
| --- | --- | --- |
| Request URL and method | info | Request tracking |
| Response status code | info | Success/failure tracking |
| X-Request-ID | info | Cross-service correlation |
| User ID (from JWT) | info | User attribution |
| Thread ID | info | Conversation tracking |
| Service name | info | Service identification |
| Module name | info | Component identification |
| Error messages | error | Debugging |
| Error stack traces | error | Debugging (in development) |
| Event routing keys | info | Event flow tracking |
| Routing decisions (provider, model, confidence) | info | Routing transparency |
| Timing data (latency, duration) | info | Performance monitoring |

---

## Pino Configuration

Each service configures Pino through the `nestjs-pino` module:

```
PinoLogger configuration:
  - redact: ['authorization', 'password', 'refreshToken', 'apiKey', 'token', 'secret', 'encryptedConfig']
  - level: based on NODE_ENV (debug in development, info in production)
  - autoLogging: enabled (with SSE route exclusions)
  - transport: pino-pretty in development, raw JSON in production
```

### SSE Route Exclusions

SSE endpoints are excluded from pino-http autoLogging because the long-lived connections conflict with pino-http's request completion tracking:

```
autoLogging: {
  ignore: (req) => req.url?.includes('/stream/') ?? false
}
```

Without this exclusion, SSE endpoints would cause "Cannot set headers after they are sent to the client" errors.

---

## Centralized Log Collection

All services publish structured log events to the server-logs-service via RabbitMQ:

```
log.server event:
  level:       string
  serviceName: string
  module:      string
  action:      string
  message:     string
  requestId:   string | null
  traceId:     string | null
  userId:      UUID | null
  threadId:    UUID | null
  error:       object | null
  timestamp:   ISO 8601
```

Server logs are stored in MongoDB with a 30-day TTL index. Client logs (from the frontend) are stored separately with the same TTL.

---

## Compliance Considerations

| Requirement | How ClawAI Addresses It |
| --- | --- |
| No secrets in logs | Automatic Pino redaction + architectural exclusion |
| Audit trail | Audit logs in MongoDB (no TTL, retained indefinitely) |
| User activity tracking | All significant actions produce audit events |
| Log retention | Server/client logs: 30 days (TTL). Audit logs: indefinite |
| Log integrity | MongoDB append-only (no update/delete exposed) |
| Log access control | Server/client logs accessible to ADMIN only |
