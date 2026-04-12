# Service Guide: claw-chat-service

## Overview

| Property       | Value                              |
| -------------- | ---------------------------------- |
| Port           | 4002                               |
| Database       | PostgreSQL (`claw_chat`)           |
| ORM            | Prisma 5.20                        |
| Env prefix     | `CHAT_`                            |
| Nginx routes   | `/api/v1/chat-threads/*`, `/api/v1/chat-messages/*` |

The chat service is the central orchestrator for user conversations. It manages threads, stores messages, assembles context from multiple services, executes LLM calls with fallback chains, and streams responses via SSE.

## Database Schema

### ChatThread

| Column            | Type         | Notes                                |
| ----------------- | ------------ | ------------------------------------ |
| id                | String       | CUID primary key                     |
| userId            | String       | Owner                                |
| title             | String?      | Auto-generated or user-set           |
| routingMode       | RoutingMode  | AUTO, MANUAL_MODEL, LOCAL_ONLY, etc. |
| lastProvider      | String?      | Last used provider                   |
| lastModel         | String?      | Last used model                      |
| isPinned          | Boolean      | User-pinned thread                   |
| isArchived        | Boolean      | Soft archive                         |
| preferredProvider | String?      | Thread-level override                |
| preferredModel    | String?      | Thread-level override                |
| contextPackIds    | String[]     | Attached context pack IDs            |
| systemPrompt      | String?      | Custom system prompt                 |
| temperature       | Float?       | Default 0.7                          |
| maxTokens         | Int?         | Token limit override                 |

### ChatMessage

| Column        | Type         | Notes                              |
| ------------- | ------------ | ---------------------------------- |
| id            | String       | CUID primary key                   |
| threadId      | String       | FK to ChatThread                   |
| role          | MessageRole  | SYSTEM, USER, ASSISTANT, TOOL      |
| content       | String       | Message text                       |
| provider      | String?      | Which provider answered            |
| model         | String?      | Which model answered               |
| routingMode   | RoutingMode? | Mode used for this message         |
| routerModel   | String?      | Which model made routing decision  |
| usedFallback  | Boolean      | Whether fallback was triggered     |
| inputTokens   | Int?         | Prompt token count                 |
| outputTokens  | Int?         | Completion token count             |
| estimatedCost | Decimal?     | Cost estimate (12,8 precision)     |
| latencyMs     | Int?         | End-to-end latency                 |
| feedback      | String?      | User feedback (thumbs up/down)     |
| metadata      | Json?        | Error flags, routing details, etc. |

### MessageAttachment

Links messages to files via fileId. Types include `document`, `image`, etc.

## API Endpoints

### Threads (`/api/v1/chat-threads`)

| Method | Path          | Description                      |
| ------ | ------------- | -------------------------------- |
| GET    | /             | List user's threads (paginated)  |
| POST   | /             | Create new thread                |
| GET    | /:id          | Get thread with recent messages  |
| PATCH  | /:id          | Update title, settings, etc.     |
| DELETE | /:id          | Delete thread and all messages   |

### Messages (`/api/v1/chat-messages`)

| Method | Path               | Description                      |
| ------ | ------------------ | -------------------------------- |
| GET    | /thread/:threadId  | List messages (paginated)        |
| POST   | /                  | Send new message (triggers flow) |
| PATCH  | /:id/feedback      | Submit feedback on a message     |
| POST   | /:id/regenerate    | Regenerate an assistant response |
| POST   | /parallel          | Send prompt to 2-5 models simultaneously |

## Message Flow (End-to-End)

1. **User sends message** -- POST creates a USER message record
2. **Publish `message.created`** -- routing service picks it up
3. **Routing decision arrives** -- via `message.routed` event with provider, model, fallback
4. **Context assembly** -- `ContextAssemblyManager` gathers:
   - User memories from memory-service (HTTP, limit 20)
   - Context pack items from memory-service (HTTP)
   - File chunks from file-service (HTTP)
   - Thread message history
5. **Prompt building** -- system prompt, memories, packs, files, history, with token budget truncation
6. **LLM execution** -- `ChatExecutionManager` calls the selected provider via connector-service
7. **Fallback chain** -- if primary fails, tries fallback provider/model
8. **Store ASSISTANT message** -- with token counts, latency, provider metadata
9. **SSE emission** -- `emitCompletion()` pushes to connected clients
10. **Publish `message.completed`** -- memory service extracts facts; audit logs usage

## SSE Streaming

The chat service uses SSE for real-time message delivery. Key implementation details:

- SSE controller uses `@SkipLogging()` to avoid pino-http header conflicts
- SSE controller uses `@SkipThrottle()` to avoid rate limiting on long-lived connections
- SSE routes are excluded from pino-http `autoLogging` in `app.module.ts`
- Frontend uses `fetch()` with `ReadableStream` (not EventSource) to set Authorization headers
- Nginx must have `proxy_buffering off` for SSE routes

## Error Handling

When all providers fail, the service stores an error message as an ASSISTANT record with `metadata: { error: true }`. This ensures the frontend's polling logic finds a terminal message and stops the "AI is thinking..." indicator.

## Events

| Event             | Direction | Notes                              |
| ----------------- | --------- | ---------------------------------- |
| message.created   | Publish   | After USER message stored          |
| message.routed    | Subscribe | Receives routing decision          |
| message.completed | Publish   | After ASSISTANT message stored     |
| thread.created    | Publish   | After new thread created           |

## Inter-Service HTTP Calls

| Target Service    | Purpose                         |
| ----------------- | ------------------------------- |
| memory-service    | Fetch user memories, pack items |
| file-service      | Fetch file chunks               |
| connector-service | Execute LLM calls               |
| ollama-service    | Execute local Ollama calls      |

## Key Managers

- **ContextAssemblyManager** -- assembles full prompt from multiple sources
- **ChatExecutionManager** -- executes LLM calls with fallback chain and error handling
- **ParallelExecutionManager** -- executes the same prompt against 2-5 models simultaneously via `Promise.allSettled`

---

## Parallel Multi-Model Response Mode

The parallel compare feature lets users send a single prompt to multiple models at once and view responses side by side. This is useful for comparing model quality, latency, and cost across providers.

### How It Works

1. **User selects 2-5 models** -- frontend multi-select picker allows choosing provider/model pairs
2. **POST /chat-messages/parallel** -- sends the prompt, threadId, and list of models
3. **ParallelExecutionManager** -- fires all LLM calls via `Promise.allSettled()` so failures in one model do not block others
4. **Store responses** -- each model's response is stored as a separate ASSISTANT message with its own token counts, latency, and provider metadata
5. **Return all results** -- response includes an array of model responses with status (fulfilled/rejected), content, latency, and token usage

### ParallelExecutionManager

The `ParallelExecutionManager` handles:

- Building the prompt once via `ContextAssemblyManager` (shared across all models)
- Dispatching concurrent calls to each selected provider/model
- Collecting results via `Promise.allSettled()` -- each call is independent
- Recording per-model latency and token counts
- Storing each response as a separate ASSISTANT message linked to the same thread
- Publishing `message.completed` events for each successful response

### Types

| Type | Description |
| --- | --- |
| `ParallelRequest` | threadId, content, models (array of {provider, model}), fileIds |
| `ParallelModelResult` | provider, model, status (fulfilled/rejected), content, inputTokens, outputTokens, latencyMs, error? |
| `ParallelResponse` | threadId, userMessageId, results (array of ParallelModelResult), totalLatencyMs |

### Constraints

- Minimum 2 models, maximum 5 models per request
- Each model must belong to a healthy, active connector (or be a local Ollama model)
- Thread ownership is validated before execution
- All models share the same assembled context (system prompt, memories, files, history)
