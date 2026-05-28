# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js :3000)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│               Nginx Reverse Proxy (:4000 → :80)                 │
│                                                                  │
│  /api/v1/auth/*            → Auth Service :4001                 │
│  /api/v1/users/*           → Auth Service :4001                 │
│  /api/v1/chat-threads/*    → Chat Service :4002                 │
│  /api/v1/chat-messages/*   → Chat Service :4002  (SSE stream)   │
│  /api/v1/connectors/*      → Connector Service :4003            │
│  /api/v1/routing/*         → Routing Service :4004              │
│  /api/v1/memories/*        → Memory Service :4005               │
│  /api/v1/context-packs/*   → Memory Service :4005               │
│  /api/v1/files/*           → File Service :4006                 │
│  /api/v1/audits/*          → Audit Service :4007                │
│  /api/v1/usage/*           → Audit Service :4007                │
│  /api/v1/ollama/*          → Ollama Service :4008               │
│  /api/v1/health            → Health Service :4009               │
│  /api/v1/client-logs       → Client Logs Service :4010          │
│  /api/v1/server-logs/*     → Server Logs Service :4011          │
│  /api/v1/images/*          → Image Service :4012                │
│  /api/v1/file-generations/*→ File Generation Service :4013      │
│  /api/v1/agent/*           → Agent Service :4015                │
│  /api/v1/research/*        → Research Service :4016             │
│  /api/v1/workspace/*       → Workspace Service :4017            │
└──────────────────────────────────────────────────────────────────┘
```

## Microservices

| Service         | Port | Database                                  | Owns                                                       |
| --------------- | ---- | ----------------------------------------- | ---------------------------------------------------------- |
| Auth            | 4001 | PostgreSQL `claw_auth` (5441)             | users, sessions, system_settings                           |
| Chat            | 4002 | PostgreSQL `claw_chat` (5442)             | chat_threads, chat_messages, message_attachments           |
| Connector       | 4003 | PostgreSQL `claw_connectors` (5443)       | connectors, connector_models, health_events, sync_runs     |
| Routing         | 4004 | PostgreSQL `claw_routing` (5444)          | routing_decisions, routing_policies                        |
| Memory          | 4005 | PostgreSQL `claw_memory` (5445)           | memory_records, context_packs, context_pack_items          |
| File            | 4006 | PostgreSQL `claw_files` (5446)            | files, file_chunks                                         |
| Audit           | 4007 | MongoDB `claw_audit` (27018)              | audit_logs, usage_ledger                                   |
| Ollama          | 4008 | PostgreSQL `claw_ollama` (5447)           | local_models, pull_jobs, runtime_configs, role_assignments |
| Health          | 4009 | None (stateless)                          | Aggregates health from all services                        |
| Client Logs     | 4010 | MongoDB `claw_client_logs` (27018)        | client_logs (TTL 30d)                                      |
| Server Logs     | 4011 | MongoDB `claw_server_logs` (27018)        | server_logs (TTL 30d)                                      |
| Image           | 4012 | PostgreSQL `claw_images` (5448)           | image_generations                                          |
| File Generation | 4013 | PostgreSQL `claw_file_generations` (5449) | file_generations                                           |
| Agent           | 4015 | PostgreSQL `claw_agent` (5451)            | agent_sessions, terminal_commands, repos, file_events      |
| Research        | 4016 | PostgreSQL `claw_research` (5452)         | search_providers, search_runs, evidence                    |
| Workspace       | 4017 | PostgreSQL `claw_workspace` (5450)        | workspace_connectors, workspace_items, sync_runs           |

## Infrastructure

| Component  | Host Port    | Internal Port | Purpose                         |
| ---------- | ------------ | ------------- | ------------------------------- |
| Nginx      | 4000         | 80            | Reverse proxy / API gateway     |
| PostgreSQL | 5441–5452    | 5432          | Per-service relational storage  |
| MongoDB    | 27018        | 27017         | Audit, client logs, server logs |
| Redis      | 6380         | 6379          | Caching, ephemeral state        |
| RabbitMQ   | 5672 / 15672 | 5672 / 15672  | Async inter-service messaging   |
| Ollama     | 11434        | 11434         | Local model inference runtime   |
| ClamAV     | 3310         | 3310          | File antivirus scanning         |

## Communication Patterns

### Frontend → Services

Frontend calls Nginx (:4000), which routes to the correct service by URL path. SSE streams require
`proxy_buffering off` and `proxy_http_version 1.1` in nginx — the SSE location block comes **before**
the generic service block.

### Service → Service (Async)

RabbitMQ topic exchange `claw.events` (durable, dead-letter queued, 3 retries with backoff). Services
publish events and subscribe to routing key patterns.

Key event flows:

| Event Pattern              | Publisher    | Consumers      |
| -------------------------- | ------------ | -------------- |
| `message.created`          | chat         | routing        |
| `message.routed`           | routing      | chat           |
| `message.completed`        | chat         | audit, memory  |
| `connector.synced`         | connector    | audit, routing |
| `connector.health_checked` | connector    | audit, routing |
| `routing.decision_made`    | routing      | audit          |
| `memory.extracted`         | memory       | audit          |
| `file.uploaded`            | file         | —              |
| `log.server`               | all services | server-logs    |
| `image.generated`          | image        | audit          |
| `file.generated`           | file-gen     | audit          |
| `agent.session.connected`  | agent        | audit          |
| `agent.policy_violated`    | agent        | audit          |

### Service → Service (Sync)

Direct HTTP calls when immediate response is needed:

- Chat → Memory (context assembly, embeddings)
- Chat → File (chunk retrieval for RAG)
- Routing → Ollama (router model inference)
- Routing → Ollama Service (installed model list)
- Health → All services (health aggregation)

## Backend Service Architecture

Each service follows: **Controller → Service → Manager → Repository**

```
HTTP Request
    ↓
Controller     (3-line method: extract → call service → return)
    ↓
Service        (business logic, ownership validation, event publishing; max 30 lines/method)
    ↓
Manager        (complex orchestration, external calls, retries; max 80 lines/method)
    ↓
Repository     (pure Prisma/Mongoose data access; no business logic, no throw)
```

## Chat Service — AI Execution Pipeline

The chat service has 14 managers implementing a full AI orchestration pipeline:

| Manager                     | Responsibility                                                              |
| --------------------------- | --------------------------------------------------------------------------- |
| `ContextAssemblyManager`    | Builds prompt from memories, packs, files, history; token budget truncation |
| `ChatExecutionManager`      | Calls provider with fallback chain; fire-and-forget with error storage      |
| `ParallelExecutionManager`  | Fires 2–5 LLM calls via Promise.allSettled(); per-model results             |
| `PipelineManager`           | Multi-stage sequential pipelines with stage-level SSE events                |
| `TaskDecompositionManager`  | Breaks complex tasks into sub-tasks; reassembles results                    |
| `QualityCheckManager`       | Grades LLM output against rubric; triggers repair if needed                 |
| `BestOfNManager`            | Runs N completions; selects best by score                                   |
| `JudgeRefereeManager`       | Uses a judge model to select winner from competing responses                |
| `ConsensusExecutionManager` | Requires agreement across N models before returning                         |
| `EscalationChainManager`    | Tries providers in cost order; escalates until one succeeds                 |
| `CostEnsembleManager`       | Blends cheap + expensive models by confidence threshold                     |
| `AnswerRepairManager`       | Detects malformed output; reruns with repair prompt                         |
| `RolePackManager`           | Injects role-specific system prompts (expert, critic, etc.)                 |
| `VerifierManager`           | Cross-verifies factual claims; flags low-confidence answers                 |

## Routing Pipeline (5 Stages)

```
Message received
    ↓
Stage 1: Privacy filter       — 30 keywords → force LOCAL if any match
    ↓
Stage 2: Image detection      — 70+ keywords → route to image service
    ↓
Stage 3: File generation      — 34 keywords → route to file-gen service
    ↓
Stage 4: Category classifier  — 1650+ keywords, 33 capability classes
    ↓
Stage 5: Ollama/heuristic     — category → model role → local model
         or cloud selector    — based on routing mode (AUTO/MANUAL/etc.)
```

Routing modes: `AUTO`, `MANUAL_MODEL`, `LOCAL_ONLY`, `PRIVACY_FIRST`, `LOW_LATENCY`, `HIGH_REASONING`, `COST_SAVER`

## Adapter Factory Pattern

Six services use the adapter factory pattern for provider-agnostic operations:

| Service         | Factory                        | Adapters                                                                                                           |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Connector       | `AdapterFactory`               | 7 (OpenAI, Anthropic, Gemini, Bedrock, DeepSeek, Ollama, Grok)                                                     |
| Image           | `ImageAdapterFactory`          | 3 (DALL-E, Gemini, Stable Diffusion)                                                                               |
| File Generation | `FileFormatAdapterFactory`     | 7 (PDF, DOCX, CSV, HTML, MD, JSON, TXT)                                                                            |
| Ollama          | `RuntimeAdapterFactory`        | 5 (Ollama, ComfyUI, llama.cpp, LocalAI, vLLM)                                                                      |
| Research        | `SearchProviderAdapterFactory` | 4 (Tavily, SearXNG, Ollama Web, HTTP Fetch)                                                                        |
| Workspace       | `WorkspaceAdapterFactory`      | 12 (GitHub, GitLab, Jira, Confluence, Slack, Gmail, Google Drive, OneDrive, SharePoint, Figma, Bitbucket, ClickUp) |

Factory resolved at runtime by enum — no `default` case (exhaustive switch catches new providers at compile time).

## SSE Streaming Pattern

Chat service uses SSE for real-time AI response delivery:

1. Controller annotated `@Sse()` + `@SkipLogging()` + `@SkipThrottle()`
2. `@SkipLogging()` prevents pino-http from writing a response log entry while headers are still open
3. Nginx MUST have `proxy_buffering off` and `proxy_http_version 1.1` for SSE routes
4. SSE location block in nginx MUST come before the generic service location block
5. Frontend uses `fetch()` + `ReadableStream` — never `EventSource` (cannot set Authorization header)

## Fire-and-Forget Error Pattern

All background managers store error messages on failure:

```
1. emitError(threadId, message)       — SSE immediate feedback (in try-catch)
2. storeErrorMessage(threadId)        — ASSISTANT record with metadata.error = true
                                        (in separate try-catch so SSE failure cannot block DB write)
```

Without step 2, the frontend polls indefinitely waiting for an ASSISTANT message that never comes.

## End-to-End Message Flow

```
1.  POST /chat-messages {content, provider?, model?, fileIds?}
2.  Chat creates USER message → publishes message.created
3.  Routing receives → 5-stage pipeline → selects provider/model
4.  Routing publishes message.routed {selectedProvider, selectedModel, fallback}
5.  Chat receives → ContextAssemblyManager.assemble():
      fetch memories (memory-service HTTP)
      fetch context pack items (memory-service HTTP)
      fetch file chunks (file-service HTTP)
      build prompt: system → memories → packs → files → history
      token budget truncation (keeps head, drops tail)
6.  ChatExecutionManager.execute() → provider call with fallback chain
7.  Store ASSISTANT message, update thread.lastProvider/Model
8.  SSE emitCompletion() → connected frontend client
9.  Publish message.completed
10. Memory service extracts FACT/PREFERENCE/INSTRUCTION/SUMMARY via Ollama
11. Audit service records usage + audit log
```

## Frontend Architecture

```
Page (.tsx)
    ↓
Controller Hook (useXPage)     — orchestrates smaller hooks, holds no business logic
    ↓
Domain Hooks (useQuery/useMutation via TanStack Query)
    ↓
Repository (src/repositories/)  — all API calls, query key factories
```

- **TanStack Query v5** — all server state (queries + mutations + optimistic updates)
- **Zustand** — minimal client state (auth, sidebar, log filters)
- **shadcn/ui + Radix UI** — all form controls and interactive components
- **Tailwind + CSS variables** — theming; no `dark:` prefixes needed
- **i18n** — 8 locales (EN, AR, DE, ES, FR, IT, PT, RU), Arabic is RTL

## Database Isolation

Each service has its own PostgreSQL container. A failure or compromise of one database does not affect others. Inter-service data access is via RabbitMQ events or internal HTTP — never via shared database connections.

## Shared Packages

| Package                  | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `@claw/shared-types`     | 18 enums, event payload types, auth types            |
| `@claw/shared-constants` | Exchange name, service ports, API prefix, pagination |
| `@claw/shared-rabbitmq`  | NestJS RabbitMQ module, StructuredLogger, retry/DLQ  |
| `@claw/shared-auth`      | AuthGuard, RolesGuard, @Public, @Roles, @CurrentUser |

## File Upload Security Pipeline

Every uploaded file passes 4 checks before storage:

1. **ClamAV antivirus** — TCP INSTREAM scan; fails closed if ClamAV is down
2. **Magic byte validation** — verifies file content matches declared MIME type
3. **Filename validation** — blocks path traversal, null bytes, 30+ dangerous extensions
4. **ZIP bomb detection** — suspicious null byte pattern check on archives

Failed checks → HTTP 422 with reason code.
