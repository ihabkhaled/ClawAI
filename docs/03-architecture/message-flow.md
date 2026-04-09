# Message Flow

## Overview

This document traces the complete lifecycle of a user message from the moment it is sent in the frontend to the final audit log entry. The flow involves 7 services, 3 communication patterns (HTTP, RabbitMQ, SSE), and multiple async pipelines.

---

## Sequence Diagram

```
User        Frontend       Nginx      Chat Svc     Routing Svc   Ollama Svc   Provider
 |              |            |            |              |             |           |
 |--send msg--->|            |            |              |             |           |
 |              |--POST----->|            |              |             |           |
 |              |            |--forward-->|              |             |           |
 |              |            |            |              |             |           |
 |              |            |            |--store USER--|             |           |
 |              |            |            |   message    |             |           |
 |              |            |            |              |             |           |
 |              |            |            |--publish---->|             |           |
 |              |            |            | msg.created  |             |           |
 |              |            |            |              |             |           |
 |              |            |            |              |--route req->|           |
 |              |            |            |              |  (if AUTO)  |           |
 |              |            |            |              |<-decision---|           |
 |              |            |            |              |             |           |
 |              |            |            |<--publish----|             |           |
 |              |            |            |  msg.routed  |             |           |
 |              |            |            |              |             |           |
 |              |            |            |--assemble context-------->|           |
 |              |            |            |  (memories, files, packs) |           |
 |              |            |            |              |             |           |
 |              |            |            |--execute-----|-------------|---------->|
 |              |            |            |              |             |  (or Ollama)
 |              |            |            |<-------------|-------------|--response-|
 |              |            |            |              |             |           |
 |              |            |            |--store ASST--|             |           |
 |              |            |            |   message    |             |           |
 |              |            |            |              |             |           |
 |              |<===========|============|--SSE done----|             |           |
 |<--render-----|            |            |              |             |           |
 |              |            |            |              |             |           |
 |              |            |            |--publish---->|             |           |
 |              |            |            | msg.completed|             |           |
 |              |            |            |       |      |             |           |
 |              |            |            |       +----->Memory Svc   |           |
 |              |            |            |       +----->Audit Svc    |           |
```

---

## Step-by-Step Flow

### Step 1: User Sends Message

**Actor**: Frontend (Next.js)
**Action**: User types a message and presses send.

The frontend sends a POST request to the chat-messages endpoint:

```
POST /api/v1/chat-messages
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "threadId": "uuid",
  "content": "Explain the observer pattern",
  "provider": null,          // optional: force specific provider
  "model": null,             // optional: force specific model
  "fileIds": ["uuid", ...],  // optional: attached files
  "contextPackIds": ["uuid"] // optional: attached context packs
}
```

The frontend also opens (or maintains) an SSE connection to receive the response:

```
GET /api/v1/chat-messages/stream?threadId=<uuid>
```

### Step 2: Chat Service Receives and Stores

**Service**: chat-service (port 4002)
**Action**: Validate input, create USER message, publish event.

1. `ChatMessageController.create()` validates the request via Zod DTO
2. `ChatMessageService.create()` stores the USER message in the `ChatMessage` table
3. The service attaches any referenced files via `MessageAttachment` records
4. Publishes `message.created` event to RabbitMQ:

```
Exchange: claw.events
Routing key: message.created
Payload: {
  messageId, threadId, userId, content,
  forcedProvider, forcedModel, fileIds,
  threadRoutingMode, threadPreferredProvider, threadPreferredModel
}
```

### Step 3: Routing Service Determines Provider

**Service**: routing-service (port 4004)
**Action**: Consume event, determine optimal provider, publish decision.

The routing service consumes `message.created` and executes the routing pipeline:

1. Load active routing policies (sorted by priority)
2. Determine routing mode (thread setting or system default)
3. Execute the appropriate routing strategy (see [Routing Engine](./routing-engine.md))
4. For AUTO mode: call Ollama router model with structured output (Zod schema)
5. If Ollama times out (10s): fall back to heuristic rules
6. Record the routing decision in `RoutingDecision` table
7. Publish `message.routed` event:

```
Exchange: claw.events
Routing key: message.routed
Payload: {
  messageId, threadId,
  selectedProvider, selectedModel,
  confidence, reasonTags, privacyClass, costClass,
  fallbackProvider, fallbackModel
}
```

### Step 4: Chat Service Assembles Context

**Service**: chat-service (port 4002)
**Action**: Build the complete prompt with all context sources.

The `ContextAssemblyManager` orchestrates context gathering:

1. **Fetch memories** (HTTP GET to memory-service)
   - User-scoped memories, limit 20
   - Types: FACT, PREFERENCE, INSTRUCTION, SUMMARY
   - Only enabled memories included

2. **Fetch context pack items** (HTTP GET to memory-service)
   - For each context pack attached to the thread
   - Items sorted by `sortOrder`

3. **Fetch file chunks** (HTTP GET to file-service)
   - For each file attached to the message
   - Chunks returned in order by `chunkIndex`

4. **Retrieve thread history** (local database query)
   - Recent messages from the thread
   - Ordered chronologically

5. **Build prompt structure**:

   ```
   [System Prompt]        <- thread.systemPrompt or default
   [Memories]             <- user memories as context
   [Context Pack Items]   <- knowledge base items
   [File Chunks]          <- attached file content
   [Thread History]       <- previous messages
   [Current User Message] <- the new message
   ```

6. **Token budget truncation**
   - Keeps the head (system prompt, memories, current message)
   - Drops from the tail (oldest history messages) if over budget
   - Respects the thread's `maxTokens` setting

### Step 5: Chat Service Executes LLM Call

**Service**: chat-service (port 4002)
**Action**: Call the selected provider with fallback chain.

The `ChatExecutionManager` handles execution:

1. **Primary attempt**: Call the selected provider/model
   - If provider is `local-ollama`: HTTP POST to ollama-service (port 4008)
   - If provider is cloud (OpenAI, Anthropic, Google, DeepSeek, xAI): HTTP POST to connector-service (port 4003), which proxies to the cloud API

2. **Fallback chain** (if primary fails):

   ```
   Primary provider (from routing)
     --> Fallback provider (from routing decision)
       --> Local Ollama gemma3:4b (always available)
   ```

3. **Error conditions that trigger fallback**:
   - HTTP timeout (configurable per provider)
   - 429 rate limit response
   - 500/502/503 from provider
   - Network connectivity failure
   - Invalid response format

4. **Response capture**:
   - Content (full text)
   - Input token count
   - Output token count
   - Latency in milliseconds
   - Actual provider and model used (may differ from selected if fallback occurred)

### Step 6: Store Assistant Message

**Service**: chat-service (port 4002)
**Action**: Persist the AI response.

1. Create ASSISTANT `ChatMessage` record:
   - `role`: ASSISTANT
   - `content`: full response text
   - `provider`: actual provider used
   - `model`: actual model used
   - `routingMode`: mode that was active
   - `inputTokens`, `outputTokens`, `latencyMs`: performance metrics
   - `metadata`: JSON with routing decision details, fallback info

2. Update thread metadata:
   - `lastProvider`, `lastModel`: track what was last used
   - `updatedAt`: timestamp

### Step 7: SSE Completion Event

**Service**: chat-service (port 4002)
**Action**: Notify the frontend that the response is ready.

The chat service emits an SSE event to the connected frontend:

```
event: message.done
data: {
  "messageId": "uuid",
  "threadId": "uuid",
  "content": "The observer pattern is...",
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "inputTokens": 1250,
  "outputTokens": 430,
  "latencyMs": 2340,
  "routingMode": "AUTO",
  "confidence": 0.92,
  "reasonTags": ["coding", "explanation"],
  "fallbackUsed": false
}
```

Nginx is configured for SSE passthrough:

- `proxy_buffering off`
- `X-Accel-Buffering: no`
- `proxy_read_timeout 86400s` (24 hours)
- `Connection: keep-alive`

The frontend receives the event, updates the message list via TanStack Query cache invalidation, and renders the response in the `MessageBubble` component with provider badge, token counts, and routing transparency details.

### Step 8: Publish Completion Event

**Service**: chat-service (port 4002)
**Action**: Notify downstream services.

```
Exchange: claw.events
Routing key: message.completed
Payload: {
  messageId, threadId, userId,
  userContent,          // original user message
  assistantContent,     // AI response
  provider, model, routingMode,
  inputTokens, outputTokens, latencyMs,
  fallbackUsed, fallbackProvider, fallbackModel
}
```

This event fans out to multiple consumers asynchronously.

---

## Async Post-Processing Pipelines

### Memory Extraction Pipeline

**Service**: memory-service (port 4005)
**Trigger**: Consumes `message.completed` event

1. Receive the user message and assistant response
2. Call Ollama (memory extraction model, default `gemma3:4b`) with a structured extraction prompt
3. Ollama returns extracted facts in a Zod-validated schema:
   ```
   [
     { "type": "FACT", "content": "User is learning design patterns" },
     { "type": "PREFERENCE", "content": "User prefers code examples in TypeScript" }
   ]
   ```
4. **Deduplication check**: Compare each extracted memory against existing memories for the user
   - Skip if a substantially similar memory already exists
5. Store new `MemoryRecord` entries:
   - `userId`: from the event
   - `type`: FACT / PREFERENCE / INSTRUCTION / SUMMARY
   - `content`: extracted text
   - `sourceThreadId`, `sourceMessageId`: provenance tracking
   - `isEnabled`: true by default
6. Publish `memory.extracted` event for audit trail

### Audit Logging Pipeline

**Service**: audit-service (port 4007)
**Trigger**: Consumes `message.completed` event

1. Create `AuditLog` entry:
   - `action`: MESSAGE_COMPLETED
   - `entityType`: ChatMessage
   - `entityId`: messageId
   - `severity`: INFO
   - `details`: provider, model, token counts, latency

2. Create `UsageLedger` entry:
   - `resourceType`: TOKEN
   - `action`: CONSUME
   - `quantity`: inputTokens + outputTokens
   - `unit`: TOKENS
   - `metadata`: provider, model, userId

---

## Error Handling at Each Step

| Step                   | Error Scenario             | Handling                                              |
| ---------------------- | -------------------------- | ----------------------------------------------------- |
| 1. Frontend POST       | Network failure            | Retry with exponential backoff, show error toast      |
| 2. Chat stores message | Database error             | BusinessException, 500 response, no event published   |
| 3. Routing             | Ollama timeout             | Heuristic fallback (no user-visible delay beyond 10s) |
| 3. Routing             | No healthy providers       | Return local-ollama as default, low confidence        |
| 4. Context assembly    | Memory service unavailable | Continue without memories, log warning                |
| 4. Context assembly    | File service unavailable   | Continue without file chunks, log warning             |
| 5. LLM execution       | Primary provider fails     | Automatic fallback to secondary, then local Ollama    |
| 5. LLM execution       | All providers fail         | BusinessException with clear error message to user    |
| 6. Store response      | Database error             | Log error, SSE error event to frontend                |
| 7. SSE delivery        | Connection dropped         | Frontend reconnects, polls for missed messages        |
| 8. Memory extraction   | Ollama unavailable         | Event remains in RabbitMQ, retried 3x with backoff    |
| 8. Audit logging       | MongoDB unavailable        | Event goes to DLQ after 3 retries                     |

---

## Timing Expectations

| Phase                      | Typical Duration | Notes                                   |
| -------------------------- | ---------------- | --------------------------------------- |
| Frontend to Nginx          | < 5ms            | Local network                           |
| Nginx to chat-service      | < 5ms            | Docker network                          |
| Store USER message         | 5-20ms           | PostgreSQL write                        |
| RabbitMQ publish + consume | 10-50ms          | Async, non-blocking                     |
| Routing decision (AUTO)    | 500ms-10s        | Ollama inference, 10s timeout           |
| Context assembly           | 50-200ms         | Parallel HTTP calls                     |
| LLM execution (local)      | 1-30s            | Depends on model size and prompt length |
| LLM execution (cloud)      | 500ms-60s        | Depends on provider and model           |
| Store ASSISTANT message    | 5-20ms           | PostgreSQL write                        |
| SSE delivery               | < 5ms            | Already connected                       |
| Memory extraction          | 2-15s            | Async, not user-blocking                |
| Audit logging              | 5-20ms           | Async, MongoDB write                    |

**Total user-perceived latency**: Routing (up to 10s) + LLM execution (0.5-60s) = typically 2-15 seconds for most requests.
