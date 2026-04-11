# ADR-008: SSE Over WebSocket

## Status

Accepted (2025-Q1)

## Context

ClawAI needs real-time communication for two primary use cases:

1. **AI response streaming**: When a user sends a message, the AI response should appear incrementally as it is generated.
2. **Model download progress**: When pulling an Ollama model, the download progress should update in real time.

Both use cases are server-to-client only. The client sends a request and then receives a stream of updates. There is no bidirectional communication requirement.

The team evaluated WebSocket and Server-Sent Events (SSE) for these use cases.

## Decision

Use Server-Sent Events (SSE) for all real-time server-to-client communication. SSE endpoints use NestJS's `@Sse()` decorator and return `Observable<MessageEvent>`.

### Implementation Details

- **NestJS side**: Controller methods return `Observable<MessageEvent>` with `@Sse()` decorator
- **Frontend side**: `fetch()` with `ReadableStream` parsing (not `EventSource` API, because `EventSource` cannot set Authorization headers)
- **Nginx config**: SSE routes require `proxy_buffering off`, `proxy_cache off`, `proxy_read_timeout 86400`
- **Authentication**: JWT token sent via `Authorization: Bearer` header in the `fetch()` call
- **Decorator**: `@SkipLogging()` on SSE controllers to prevent pino-http conflicts
- **Throttle**: `@SkipThrottle()` on SSE endpoints to avoid rate-limiting long-lived connections

### SSE Endpoints

| Endpoint                                    | Service | Purpose                  |
| ------------------------------------------- | ------- | ------------------------ |
| `/api/v1/chat-messages/:threadId/stream`    | chat    | AI response streaming    |
| `/api/v1/ollama/pull-jobs/:id/progress`     | ollama  | Model download progress  |

## Consequences

### Positive

- **Simpler protocol**: SSE uses standard HTTP. No upgrade handshake, no frame protocol, no ping/pong.
- **Automatic reconnection**: The SSE protocol includes built-in reconnection with `Last-Event-ID` support.
- **HTTP/2 compatible**: SSE works well with HTTP/2 multiplexing, avoiding the connection limit issues of HTTP/1.1.
- **Nginx friendly**: SSE works through Nginx with minimal configuration (`proxy_buffering off`).
- **No state management**: No connection registry, no room management, no heartbeat logic. The server just writes events.

### Negative

- **No bidirectional communication**: If the client needs to send data during the stream (e.g., cancel generation), a separate HTTP request is needed.
- **EventSource API limitation**: The browser's `EventSource` API cannot set custom headers. ClawAI uses `fetch()` with manual stream parsing instead, which is more code but more flexible.
- **Connection limits**: HTTP/1.1 allows only 6 connections per domain. With multiple SSE streams open, other requests could be blocked. Mitigated by HTTP/2 and closing SSE connections when not needed.
- **NestJS/pino-http conflict**: pino-http's `autoLogging` tries to set response headers after SSE has started streaming, causing "Cannot set headers after they are sent" crashes. Requires explicit exclusion of SSE routes.

## Alternatives Considered

### WebSocket

Bidirectional, full-duplex communication. The standard choice for real-time features in web apps. However:

- ClawAI only needs server-to-client streaming. Bidirectional capability is wasted complexity.
- WebSocket requires a connection upgrade, sticky sessions in load balancers, and heartbeat logic.
- Nginx WebSocket proxy configuration is more complex (Connection: Upgrade headers).
- Authentication must be handled during the upgrade handshake or via a ticket system.

Rejected because unidirectional SSE covers all current use cases with less complexity.

### Long Polling

The client repeatedly sends HTTP requests, each blocking until the server has data. Simulated real-time. Simple to implement but creates high server load with many concurrent connections and has higher latency than SSE. Rejected for inferior performance.

### GraphQL Subscriptions

If the project used GraphQL, subscriptions would be the natural choice. However, ClawAI uses REST, and adding GraphQL only for subscriptions would be disproportionate. Rejected as unnecessary scope creep.
