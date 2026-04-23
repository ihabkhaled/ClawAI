# Pattern: SSE Streaming (Server-Sent Events)

> Used in claw-chat-service for real-time AI response delivery. Critical to get right — several gotchas exist.

## Problem

AI responses from LLM providers arrive asynchronously (seconds to minutes). The frontend needs to show "AI is thinking..." and then receive the response without polling.

## Solution: SSE stream per thread, with backend-to-frontend push.

## Backend Setup (NestJS)

```typescript
// In the controller:
@Sse('stream/:threadId')
@SkipLogging()       // CRITICAL: pino-http conflicts with SSE
@SkipThrottle()      // CRITICAL: rate limiting breaks long-lived connections
@UseGuards(AuthGuard)
streamThread(
  @Param('threadId') threadId: string,
  @CurrentUser() user: AuthenticatedUser,
): Observable<MessageEvent> {
  return this.sseService.getStream(threadId, user.id);
}
```

**Why `@SkipLogging()`**: pino-http's `autoLogging` tries to write a response log entry after the response "completes". For SSE connections that stay open for minutes, this fires while headers have already been sent → `"Cannot set headers after they are sent to the client"` crash.

**Why `@SkipThrottle()`**: Rate limiter counts the SSE connection as 1 request per tick, but the connection stays alive — this exhausts the rate limit budget immediately.

## Nginx Configuration (CRITICAL)

```nginx
location /api/v1/chat-messages/stream/ {
  proxy_pass http://claw-chat-service:4002/api/v1/chat-messages/stream/;
  proxy_http_version 1.1;
  proxy_set_header Connection "";      # Must clear Connection header
  proxy_buffering off;                 # CRITICAL: without this, events are buffered
  proxy_cache off;                     # No caching for SSE
  proxy_read_timeout 86400;            # 24h timeout for long-running streams
}
```

**Why `proxy_buffering off`**: nginx buffers upstream responses by default. Without this, SSE events are held in nginx's buffer until it's full, then released in a burst — not real-time at all.

**Why `proxy_set_header Connection ""`**: HTTP/1.1 persistent connections. Prevents nginx from closing the connection.

**SSE location MUST come BEFORE the generic service location block**:

```nginx
# CORRECT: SSE block first
location /api/v1/chat-messages/stream/ { ... }  # SSE
location /api/v1/chat-messages/ { ... }          # REST

# WRONG: would match all chat-messages requests including stream
location /api/v1/chat-messages/ { ... }          # REST (catches /stream/ too)
```

## Frontend Setup

**Never use `EventSource` API** — it cannot set Authorization headers.

Use the `sse.utility.ts` wrapper:

```typescript
// src/utilities/sse.utility.ts wraps fetch() with ReadableStream
const stream = createSSEConnection(`/api/v1/chat-messages/stream/${threadId}`, accessToken);

stream.onMessage((event: SSEEvent) => {
  if (event.type === 'completion') {
    /* update UI */
  }
  if (event.type === 'error') {
    /* show error */
  }
});

stream.onError((error) => {
  /* handle connection error */
});
stream.close(); // Call on component unmount
```

## Event Types Emitted

```typescript
// From ChatSSEService:
emitCompletion(threadId, messageId, content, provider, model);
emitError(threadId, errorMessage);
emitThinking(threadId, model); // "AI is thinking..."
emitJudgeEvaluating(threadId); // Judge mode active
emitProgressStage(threadId, stage); // Pipeline stage updates
```

## Error Handling

When the LLM call fails, the manager MUST:

1. Call `emitError(threadId, message)` — frontend reacts immediately
2. Call `storeErrorMessage(threadId)` — stores ASSISTANT record with `metadata: { error: true }`
3. Both wrapped in separate try-catch (don't let SSE failure prevent DB storage)

Without step 2: the frontend polls indefinitely waiting for an ASSISTANT message that never comes.

## Frontend Polling Fallback

The frontend also polls with `refetchInterval: 1000` as a fallback in case SSE fails:

```typescript
// Stop condition in poll hook:
const isComplete = lastMessage?.role === MessageRole.ASSISTANT;
const hasError = lastMessage?.metadata?.error === true;
const timedOut = pollCount >= MAX_POLLS; // 90 polls × 1s = 90s max

const shouldStopPolling = isComplete || hasError || timedOut;
```

This ensures the UI always resolves even if SSE connection drops.

## GlobalExceptionFilter SSE Safety

```typescript
// In GlobalExceptionFilter.catch():
if (response.headersSent) {
  // SSE connection already started — can't write HTTP error response
  this.logger.error(`Error after headers sent: ${message}`);
  return;
}
// Normal error response for non-SSE routes
response.status(status).json({ ... });
```
