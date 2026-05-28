# End-to-End Data Flow

> How a single chat message travels through ClawAI. Use this to trace bugs
> across service boundaries — each numbered step names the service, the
> transport (HTTP / RabbitMQ / SSE), and where state lands.

## The transports

- **HTTP (sync)** — frontend → nginx → service; and service → service internal calls.
- **RabbitMQ (async)** — topic exchange `claw.events`, durable, DLQ + 3 retries with backoff. Used for fire-and-forget domain events.
- **SSE (stream)** — chat service → browser, for live progress while the model runs. Uses `fetch()` + `ReadableStream` (never `EventSource`, which can't set the `Authorization` header).

## Standard chat message

```
Browser ──POST /api/v1/chat-messages──► nginx :4000 ──► chat :4002
   ▲                                                        │
   │ SSE progress (RoutingTransparency, ThinkingIndicator)  │ publish message.created
   │                                                        ▼
   │                                              routing :4004  (RabbitMQ consumer)
   │                                                        │ Ollama router (temp=0) or heuristic
   │                                                        │ publish message.routed
   │                                                        ▼
   └──────────────────────────────────────────────  chat :4002  assembles context:
                                                       ├─HTTP─► memory :4005   (memories + context packs)
                                                       └─HTTP─► file :4006     (file chunks)
                                                              builds prompt, then executes:
                                                       └─────► connector :4003 → cloud provider
                                                               or Ollama runtime :11434 (local)
                                                              store ASSISTANT message
                                                              publish message.completed
                                                                        │
                                            ┌───────────────────────────┴───────────────┐
                                            ▼                                            ▼
                                     audit :4007 (Mongo)                          memory :4005
                                     usage ledger + audit log              extract FACT/PREF/INSTRUCTION
```

### Step by step

1. **Frontend → chat.** `POST /api/v1/chat-messages {content, provider?, model?, fileIds?}`. Chat creates the USER `ChatMessage`, opens the SSE stream, and **publishes `message.created`**.
2. **routing consumes `message.created`.** Runs the 5-stage AUTO pipeline (privacy → image → file → category → Ollama/heuristic) or honors a forced provider/model. **Publishes `message.routed {selectedProvider, selectedModel, fallback}`.**
3. **chat consumes `message.routed`** → `ContextAssemblyManager.assemble()`:
   - HTTP GET memories from **memory** (user-scoped, top-K).
   - HTTP GET context-pack items from **memory** (per attached pack).
   - HTTP GET file chunks from **file** (per attached file).
   - Build prompt: system → memories → packs → files → thread history, with token-budget truncation. Writes a `ChatMessageContextReceipt` ("why was this used?").
4. **chat executes** via `ChatExecutionManager`: calls **connector** (cloud provider) or the **Ollama runtime** with a fallback chain. SSE emits progress (`PROVIDER_SELECTED`, `FALLBACK_ATTEMPT`, `DONE`, `ERROR`).
5. **chat stores** the ASSISTANT `ChatMessage`, updates `thread.lastProvider/Model`, SSE-emits completion, and **publishes `message.completed`** (includes content).
6. **audit consumes `message.completed`** → writes `AuditLog` + `UsageLedger` (MongoDB). **memory consumes `message.completed`** → extracts FACT/PREFERENCE/INSTRUCTION/SUMMARY via Ollama (with dedup) and may enqueue a `MemorySuggestion`.

### Failure path (important)

If **all providers fail**, chat MUST still store an ASSISTANT message with
`metadata: { error: true }` and SSE-emit an error event. Otherwise the
frontend's polling condition (`lastMessage.role === ASSISTANT`) never trips and
"AI is thinking…" spins forever. See
[../11-runbooks/runbook-service-crash.md](../11-runbooks/runbook-service-crash.md)
and the SSE/error-handling lessons in the root [../../CLAUDE.md](../../CLAUDE.md).

## Parallel / orchestration flows

`POST /chat-messages/parallel {models[]}` assembles the prompt **once**, then
`ParallelExecutionManager` fans out 2–5 LLM calls via `Promise.allSettled()`,
storing each result as its own ASSISTANT message. The same pattern underlies
consensus, escalation chains, repair, best-of-n, verifier, and pipeline modes
(see [../02-business-product/](../02-business-product/)).

## Tracing a bug across services

1. **Find the request id.** The frontend sends `X-Request-ID`; it propagates through nginx and into every service log (pino) and is the join key in `claw-server-logs`.
2. **Follow the events.** Search logs for `Published event: message.*` (producer) then the consumer service's log for the same pattern.
3. **Verify persistence.** Query the owning service's DB directly (`docker exec claw-pg-chat psql …`). Never assume the API response matches the DB — confirm.
4. **Check the DLQ.** If a consumer threw, the message lands in `<queue>.dlq` after 3 retries.

## See also

- [event-bus.md](event-bus.md) — full event catalog (producers/consumers)
- [message-flow.md](message-flow.md) — message-flow deep dive (if present)
- [routing-engine.md](routing-engine.md) — the 5-stage routing pipeline
- [../08-runtime-devops/port-service-map.md](../08-runtime-devops/port-service-map.md)
