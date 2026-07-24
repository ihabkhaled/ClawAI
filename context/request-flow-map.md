# Request Flow Map

End-to-end paths a request takes. Gateway routes are ground truth in
`.ai/manifests/nginx-routes.json`; endpoints in `.ai/manifests/api-endpoints.json`.

## Standard authenticated REST request

```
Browser (https://claw.local)
  → Next.js app: repository calls fetch('/api/v1/<x>', { Authorization: Bearer <jwt> })
  → nginx: TLS terminate, longest-prefix match → service:port
  → Service:
       AuthGuard/RolesGuard (@claw/shared-auth) verify JWT + permissions
       Controller (3-line) → Service (business logic, ownership check)
         → Repository (owned DB)         and/or
         → Manager → Adapter (vendor)    and/or
         → publish RabbitMQ event        and/or
         → HTTP call to another /internal/* endpoint
  → response bubbles back up (GlobalExceptionFilter maps errors)
```

Never a JWT in a URL query param (leaks in logs/history/Referer). Auth is always
a Bearer header.

## nginx routing (longest-prefix)

nginx routes by longest prefix, so specific routes must precede generic ones.
Selected mappings from the manifest:

| Prefix                                                                           | Service:port     |
| -------------------------------------------------------------------------------- | ---------------- |
| `/api/v1/auth`, `/api/v1/users`, `/api/v1/admin`                                 | auth:4001        |
| `/api/v1/chat-threads`, `/api/v1/chat-messages`                                  | chat:4002        |
| `/api/v1/connectors`, `/api/v1/models`                                           | connector:4003   |
| `/api/v1/routing`                                                                | routing:4004     |
| `/api/v1/memories`, `/api/v1/context-packs`, `/api/v1/context`, `/api/v1/memory` | memory:4005      |
| `/api/v1/files`                                                                  | file:4006        |
| `/api/v1/audits`, `/api/v1/usage`                                                | audit:4007       |
| `/api/v1/ollama`                                                                 | ollama:4008      |
| `/api/v1/health`                                                                 | health:4009      |
| `/api/v1/client-logs`                                                            | client-logs:4010 |
| `/api/v1/server-logs`                                                            | server-logs:4011 |
| `/api/v1/images`                                                                 | image:4012       |
| `/api/v1/file-generations`                                                       | file-gen:4013    |
| `/api/v1/workspace`                                                              | workspace:4014   |
| `/api/v1/agent`                                                                  | agent:4015       |
| `/api/v1/research`                                                               | research:4016    |
| `/api/v1/llamacpp`                                                               | llamacpp:4017    |
| `/`                                                                              | frontend:3000    |

The chat-service exposes many sub-route location blocks (`/parallel`,
`/consensus`, `/best-of-n`, `/stream`, …) that all target chat:4002.

## Chat message flow (end-to-end, async)

```
1. POST /api/v1/chat-messages {content, provider?, model?, fileIds?}
2. chat creates USER message → publishes message.created
3. routing consumes → 5-stage pipeline (privacy→image→file→category→Ollama/heuristic)
4. routing publishes message.routed {selectedProvider, selectedModel, fallback}
5. chat consumes → ContextAssemblyManager.assemble():
     - HTTP → memory /internal/memories/retrieve (memories)
     - HTTP → memory (context-pack items)
     - HTTP → file /internal/files/:id/content (chunks)
     - build prompt, apply token budget
6. ChatExecutionManager.execute() → provider (Ollama/cloud) with fallback chain
7. store ASSISTANT message, update thread
8. SSE emitCompletion() to connected clients
9. publish message.completed (content included)
10. memory consumes → extracts FACT/PREFERENCE/INSTRUCTION/SUMMARY (Ollama)
11. audit consumes → usage ledger + audit log
```

## SSE streaming path

`@Sse('stream/:threadId')` on chat-service. Requirements:

- Controller: `@SkipLogging()` + `@SkipThrottle()`.
- `app.module.ts`: exclude `/stream/` from pino-http autoLogging.
- nginx: `proxy_http_version 1.1`, `proxy_set_header Connection ""`,
  `proxy_read_timeout 86400`, **`proxy_buffering off`**, `proxy_cache off`.
- Frontend: `fetch()` + `ReadableStream` (never `EventSource` — it can't set
  Authorization).
- On total provider failure, store an error ASSISTANT message (`metadata.error:
true`) so polling terminates.

## Internal (service-to-service) request

Same as standard, but the caller is another service using a **service token**
against an `/internal/*` endpoint, over HTTPS verified against the local CA
(`NODE_EXTRA_CA_CERTS`). Base URLs come from `*_SERVICE_URL` env vars. See
[service-dependency-map.md](service-dependency-map.md).
