# SSE and Real-Time Patterns

> Server-Sent Events, polling patterns, TanStack Query refetchInterval, and real-time UI.

---

## 1. Real-Time Communication Overview

ClawAI uses two patterns for real-time data:

| Pattern            | Use Case                               | Mechanism                              |
| ------------------ | -------------------------------------- | -------------------------------------- |
| SSE (Server-Sent Events) | Streaming AI responses, fallback attempts, image/file generation progress | fetch() + ReadableStream |
| Polling            | Waiting for completed AI messages, general data freshness | TanStack Query refetchInterval |

---

## 2. SSE Utility

The SSE utility is at `src/utilities/sse.utility.ts`. It uses `fetch()` instead of the native `EventSource` API because EventSource cannot set custom headers (needed for JWT authentication).

### Implementation

```typescript
// src/utilities/sse.utility.ts
export function connectSse(url: string, callbacks: SseCallbacks): SseConnection {
  const controller = new AbortController();
  void readSseStream(url, controller.signal, callbacks);
  return { close: () => controller.abort() };
}

async function readSseStream(
  url: string,
  signal: AbortSignal,
  callbacks: SseCallbacks,
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        const data = trimmed.slice(5).trim();
        if (data.length > 0) {
          callbacks.onMessage(data);
        }
      }
    }
  }
}
```

### Key Design Decisions

1. **No EventSource API** -- cannot set Authorization headers
2. **No JWT in URL query params** -- tokens would leak in server logs and browser history
3. **AbortController** -- allows clean connection teardown on component unmount
4. **Buffer handling** -- SSE messages may arrive across chunk boundaries
5. **Automatic reconnection** -- not implemented; the polling fallback handles recovery

---

## 3. Chat Stream Hook

The `useChatStream` hook manages the SSE connection for a chat thread:

```typescript
// src/hooks/chat/use-chat-stream.ts
export function useChatStream(threadId: string, isActive: boolean) {
  const [fallbackAttempts, setFallbackAttempts] = useState<FallbackAttemptInfo[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const connectionRef = useRef<SseConnection | null>(null);

  useEffect(() => {
    if (!isActive || !threadId) return;

    const url = `${API_BASE_URL}/chat-messages/stream/${threadId}`;
    const connection = connectSse(url, {
      onMessage: (data: string) => {
        const parsed = JSON.parse(data) as StreamEvent;
        if (parsed.type === StreamEventType.FALLBACK_ATTEMPT) {
          setFallbackAttempts((prev) => [...prev, attempt]);
        }
        if (parsed.type === StreamEventType.ERROR) {
          setStreamError(parsed.error ?? 'All providers failed');
        }
      },
      onError: () => {
        // Falls back to polling automatically
      },
    });

    connectionRef.current = connection;
    return () => connection.close();
  }, [threadId, isActive]);

  return { fallbackAttempts, streamError, resetStream };
}
```

### Stream Event Types

```typescript
enum StreamEventType {
  FALLBACK_ATTEMPT = 'fallback_attempt',  // Provider failed, trying next
  ERROR = 'error',                         // All providers failed
  COMPLETION = 'completion',               // Message completed
}
```

---

## 4. Image Generation Listener

The `useImageGenerationListener` hook connects to the image generation SSE endpoint:

```
SSE URL: ${API_BASE_URL}/images/${imageId}/progress
```

It receives progress events during image generation and updates the UI in real-time.

---

## 5. File Generation Listener

The `useFileGenerationListener` hook connects to the file generation SSE endpoint:

```
SSE URL: ${API_BASE_URL}/file-generations/${generationId}/progress
```

---

## 6. Polling Patterns

### TanStack Query Automatic Polling

The global query config polls every 10 seconds:

```typescript
defaultOptions: {
  queries: {
    refetchInterval: 10 * 1000,  // 10 second polling for all queries
  },
},
```

### Conditional Polling (Waiting for AI Response)

When waiting for an AI response, increase polling frequency:

```typescript
useQuery({
  queryKey: queryKeys.threads.messages(threadId),
  queryFn: () => chatRepository.listMessages(threadId),
  refetchInterval: isWaitingForResponse ? 1000 : 10000,  // 1s when waiting, 10s otherwise
});
```

### Polling Safety Limits

Polling has a maximum duration to prevent infinite loops:

- **Max polls**: 90 iterations at 1-second interval (3 minutes total)
- **Condition check**: Polling stops when `lastMessage.role === ASSISTANT`
- **Error messages**: If all providers fail, an error ASSISTANT message is stored in the DB, which satisfies the polling stop condition

### Polling + SSE Dual Path

The frontend uses both SSE and polling simultaneously:

1. **SSE (fast path)**: Receives events in real-time (fallback attempts, errors, completion)
2. **Polling (reliable path)**: Checks for new messages every 1 second while waiting

This dual approach ensures:
- Users see fallback attempts in real-time (via SSE)
- Messages are never missed (polling always works even if SSE fails)
- The "AI is thinking..." indicator stops correctly

---

## 7. ThinkingIndicator Component

Shown while waiting for an AI response:

```tsx
function ThinkingIndicator({ fallbackAttempts, streamError }: ThinkingIndicatorProps): ReactElement {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {streamError ? (
        <span className="text-destructive">{streamError}</span>
      ) : fallbackAttempts.length > 0 ? (
        <FallbackAttemptDisplay attempts={fallbackAttempts} />
      ) : (
        <span>{t('chat.thinking')}</span>
      )}
    </div>
  );
}
```

### States

1. **Thinking** -- default animated spinner with "AI is thinking..."
2. **Fallback attempt** -- shows which provider failed and what is being tried next
3. **Error** -- shows error message when all providers failed

---

## 8. Routing Transparency

After a message is completed, routing decision details are available:

```tsx
function RoutingTransparency({ decision }: RoutingTransparencyProps): ReactElement {
  return (
    <Collapsible>
      <CollapsibleTrigger>
        <Badge>{decision.selectedProvider} / {decision.selectedModel}</Badge>
        <span>Confidence: {decision.confidence}%</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div>Privacy: {decision.privacyClass}</div>
        <div>Cost: {decision.costClass}</div>
        <div>Reasons: {decision.reasonTags.join(', ')}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

## 9. Nginx SSE Configuration

For SSE to work correctly through the reverse proxy, Nginx requires special configuration:

```nginx
location /api/v1/chat-messages/stream {
    proxy_http_version 1.1;     # Required for persistent connections
    proxy_set_header Connection "";  # Remove Connection: close
    proxy_read_timeout 86400;   # 24-hour timeout
    proxy_buffering off;        # Send events immediately
    proxy_cache off;            # No caching
}
```

The same configuration applies to image generation SSE (`/api/v1/images/`) and file generation SSE (`/api/v1/file-generations/`).

---

## 10. Critical Lessons Learned

1. **Never use EventSource API** -- it cannot set Authorization headers
2. **Never pass JWT in URL query params** -- leaks in logs, history, Referer headers
3. **Always store error messages as ASSISTANT records** -- without this, polling for completed messages runs forever
4. **Always handle both SSE error events AND polling** -- SSE may fail silently
5. **Polling must have a max limit** (3 minutes) -- never allow infinite polling
6. **Frontend handles dual paths**: SSE error (fast) + polling finding error message (fallback)
7. **SSE connections are not refreshable** -- if the token expires during an SSE connection, the connection must be closed and re-established after token refresh
