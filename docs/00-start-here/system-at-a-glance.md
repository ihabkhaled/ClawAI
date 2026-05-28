# System at a Glance

ClawAI is a local-first AI orchestration platform built as a monorepo of 17 NestJS backend services, a Next.js frontend, and supporting infrastructure. This document is the single-page reference for understanding the current system.

---

## Architecture Diagram

```text
                          +------------------+
                          |   Browser / UI   |
                          |    Next.js 16    |
                          |    Port 3000     |
                          +--------+---------+
                                   |
                                   v
                          +------------------+
                          |      Nginx       |
                          |  Reverse Proxy   |
                          |    Port 4000     |
                          +--------+---------+
                                   |
     +-----------------------------+------------------------------+
     |              |              |              |               |
     v              v              v              v               v
 +--------+     +--------+     +--------+     +--------+     +--------+
 | Auth   |     | Chat   |     | Routing|     | Memory |     | File   |
 | 4001   |     | 4002   |     | 4004   |     | 4005   |     | 4006   |
 +--------+     +--------+     +--------+     +--------+     +--------+
     |              |              |              |               |
     v              v              v              v               v
 +--------+     +--------+     +--------+     +--------+     +--------+
 | PG     |     | PG     |     | PG     |     | PG     |     | PG     |
 | auth   |     | chat   |     | routing|     | memory |     | files  |
 +--------+     +--------+     +--------+     +--------+     +--------+

 +-----------+  +-----------+  +-----------+  +-----------+  +-----------+
 | Connector |  | Audit     |  | Ollama    |  | Health    |  | Workspace |
 | 4003      |  | 4007      |  | Svc 4008  |  | 4009      |  | 4014      |
 +-----------+  +-----------+  +-----------+  +-----------+  +-----------+
      |              |               |                              |
      v              v               v                              v
 +-----------+   +--------+      +--------+                    +--------+
 | PG        |   | Mongo  |      | PG     |                    | PG     |
 | connectors|   | audit  |      | ollama |                    | workspace|
 +-----------+   +--------+      +--------+                    +--------+

 +-----------+  +-----------+  +-----------+  +-----------+  +-----------+
 | Client    |  | Server    |  | Image     |  | File Gen  |  | Agent     |
 | Logs 4010 |  | Logs 4011 |  | 4012      |  | 4013      |  | 4015      |
 +-----------+  +-----------+  +-----------+  +-----------+  +-----------+
      |              |              |               |               |
      v              v              v               v               v
 +--------+      +--------+     +--------+      +--------+      +--------+
 | Mongo  |      | Mongo  |     | PG     |      | PG     |      | PG     |
 | client |      | server |     | images |      | filegen|      | agent  |
 +--------+      +--------+     +--------+      +--------+      +--------+

 Shared infrastructure:
 +------------+    +---------+    +-------------------+    +--------+
 | RabbitMQ   |    | Redis   |    | Ollama Runtime    |    | ClamAV |
 | 5672/15672 |    | 6380    |    | 11434             |    | 3310   |
 +------------+    +---------+    +-------------------+    +--------+
```

---

## Service Directory

| #   | Service             | Port | Database                           | Purpose                                                      |
| --- | ------------------- | ---- | ---------------------------------- | ------------------------------------------------------------ |
| 1   | **auth**            | 4001 | PostgreSQL `claw_auth`             | JWT authentication, RBAC, user management, sessions          |
| 2   | **chat**            | 4002 | PostgreSQL `claw_chat`             | Threads, messages, context assembly, AI execution            |
| 3   | **connector**       | 4003 | PostgreSQL `claw_connectors`       | Cloud provider configs, health checks, model sync            |
| 4   | **routing**         | 4004 | PostgreSQL `claw_routing`          | 7 routing modes, policy engine, Ollama-assisted AUTO         |
| 5   | **memory**          | 4005 | PostgreSQL `claw_memory`           | Memory CRUD, extraction, context packs, pgvector retrieval   |
| 6   | **file**            | 4006 | PostgreSQL `claw_files`            | Upload, chunking, storage                                    |
| 7   | **audit**           | 4007 | MongoDB `claw_audit`               | Audit events, usage ledger, compliance trail                 |
| 8   | **ollama**          | 4008 | PostgreSQL `claw_ollama`           | Local model management, roles, pull jobs, catalog            |
| 9   | **health**          | 4009 | None                               | Aggregated health from downstream services                   |
| 10  | **client-logs**     | 4010 | MongoDB `claw_client_logs`         | Frontend log ingestion, batched, TTL 30 days                 |
| 11  | **server-logs**     | 4011 | MongoDB `claw_server_logs`         | Backend log aggregation, TTL 30 days                         |
| 12  | **image**           | 4012 | PostgreSQL `claw_images`           | Image generation via AI providers                            |
| 13  | **file-generation** | 4013 | PostgreSQL `claw_file_generations` | AI-driven file/document generation                           |
| 14  | **workspace**       | 4014 | PostgreSQL `claw_workspace`        | External workspace sync, search, object graph, actions       |
| 15  | **agent**           | 4015 | PostgreSQL `claw_agent`            | Desktop agent sessions, command approval, repos, file events |
| --  | **frontend**        | 3000 | --                                 | Next.js 16 UI                                                |
| --  | **nginx**           | 4000 | --                                 | Reverse proxy, route mapping                                 |

---

## Database Topology

| Engine     | Instance                | Used By                 | Notes                                         |
| ---------- | ----------------------- | ----------------------- | --------------------------------------------- |
| PostgreSQL | `claw_auth`             | auth-service            | Users, sessions, settings                     |
| PostgreSQL | `claw_chat`             | chat-service            | Threads, messages, attachments                |
| PostgreSQL | `claw_connectors`       | connector-service       | Providers, models, health events              |
| PostgreSQL | `claw_routing`          | routing-service         | Decisions, policies                           |
| PostgreSQL | `claw_memory`           | memory-service          | Memories, context packs (pgvector extension)  |
| PostgreSQL | `claw_files`            | file-service            | File metadata, chunks                         |
| PostgreSQL | `claw_ollama`           | ollama-service          | Local models, role assignments, pull jobs     |
| PostgreSQL | `claw_images`           | image-service           | Image generation records                      |
| PostgreSQL | `claw_file_generations` | file-generation-service | Generated file records                        |
| PostgreSQL | `claw_workspace`        | workspace-service       | Connectors, sync runs, objects, actions       |
| PostgreSQL | `claw_agent`            | agent-service           | Sessions, commands, repos, file events        |
| MongoDB    | `claw_audit`            | audit-service           | Audit logs, usage ledger                      |
| MongoDB    | `claw_client_logs`      | client-logs-service     | Frontend logs (TTL 30d)                       |
| MongoDB    | `claw_server_logs`      | server-logs-service     | Backend logs (TTL 30d)                        |
| Redis      | --                      | Shared cache layer      | Session cache, rate limiting, ephemeral state |
| RabbitMQ   | `claw.events`           | All services            | Topic exchange, durable, DLQ + 3 retries      |

---

## Tech Stack Summary

| Layer              | Technology                                          | Version               |
| ------------------ | --------------------------------------------------- | --------------------- |
| Runtime            | Node.js                                             | >= 20                 |
| Backend framework  | NestJS                                              | 11.x                  |
| Frontend framework | Next.js                                             | 16                    |
| UI library         | React                                               | 19                    |
| ORM (SQL)          | Prisma                                              | 5.22+                 |
| ODM (Mongo)        | Mongoose                                            | via NestJS            |
| Validation         | Zod                                                 | 3.24                  |
| Language           | TypeScript                                          | 5.6+                  |
| Server state       | TanStack Query                                      | v5                    |
| Client state       | Zustand                                             | v4                    |
| Styling            | Tailwind CSS + shadcn/ui                            | v3 / latest           |
| Auth               | JWT + argon2                                        | Custom implementation |
| Message broker     | RabbitMQ                                            | 3.x                   |
| Local AI           | Ollama                                              | Latest                |
| Containerization   | Docker Compose                                      | v2                    |
| Reverse proxy      | Nginx                                               | Latest                |
| Security scanning  | ClamAV                                              | Stable                |
| Linting            | ESLint 9 (flat config)                              | v9                    |
| Testing            | Jest (backend), Vitest (frontend), Playwright (E2E) | Latest                |

---

## Key Flows

### Message Flow (End-to-End)

```text
User types message
       |
       v
POST /api/v1/chat-messages {content, provider?, model?, fileIds?}
       |
       v
Chat service creates USER message --> publishes message.created
       |
       v
Routing service receives event
  - AUTO mode: Ollama router analyzes (temp=0, Zod-validated response)
  - Other modes: heuristic or forced selection
  - Publishes message.routed {provider, model, fallback}
       |
       v
Chat service receives routed event
  - ContextAssemblyManager builds prompt from:
    1. System prompt
    2. User memories
    3. Context pack items
    4. Workspace search results
    5. File chunks
    6. Thread history
  - ChatExecutionManager calls provider (with fallback chain)
       |
       v
Store ASSISTANT message --> SSE to client --> publish message.completed
       |
       v
Memory service extracts facts/preferences/instructions via Ollama
Audit service records usage + audit log
```

### Advanced Chat Orchestration

```text
Specialized POST /chat-messages/* endpoints
       |
       +--> parallel         -> same prompt to multiple models
       +--> consensus        -> compare candidates and synthesize answer
       +--> escalation-chain -> cheap model first, stronger models when needed
       +--> repair / verify  -> critique or validate an answer before final delivery
       +--> decompose        -> split complex tasks into structured subtasks
       +--> best-of-n        -> multiple samples, pick strongest result
       +--> cost-ensemble    -> quality vs spend balancing
       +--> role-pack        -> multi-role prompts
       +--> pipeline         -> staged prompt workflow
```

### Workspace and Agent Flow

```text
Workspace:
  User connects provider -> OAuth/init -> OAuth/callback
  Sync runs store objects -> search returns grounded citations
  Action drafts require approve/reject before execution

Agent:
  User registers local CLI session
  User creates command from UI
  User approves or rejects command
  CLI polls pending approved commands and reports completion
```

---

## Docker Topology

The full development environment runs 33 containers:

| Container Group  | Containers             | Resource Notes               |
| ---------------- | ---------------------- | ---------------------------- |
| Frontend         | 1 (Next.js dev server) | ~200-500MB RAM               |
| Nginx            | 1 (reverse proxy)      | ~20MB RAM                    |
| Backend services | 15 (one per service)   | ~100-250MB each              |
| PostgreSQL       | 11 instances           | ~50-100MB each               |
| MongoDB          | 1 (3 databases)        | ~200MB RAM                   |
| Redis            | 1                      | ~50MB RAM                    |
| RabbitMQ         | 1                      | ~150MB RAM                   |
| Ollama           | 1                      | 2-8GB+ RAM (model dependent) |
| ClamAV           | 1                      | Signature DB + scan worker   |

**Startup command:**

```bash
./scripts/claw.sh up -d
```

**Management script:**

```bash
./scripts/claw.sh up       # Start all
./scripts/claw.sh down     # Stop all
./scripts/claw.sh status   # Check health
./scripts/claw.sh logs     # Tail logs
```

---

## Nginx Route Map

All API traffic enters through Nginx on port 4000 and is routed to the appropriate backend service:

| Route Pattern                | Target Service  | Port |
| ---------------------------- | --------------- | ---- |
| `/api/v1/auth/*`             | auth            | 4001 |
| `/api/v1/users/*`            | auth            | 4001 |
| `/api/v1/chat-threads/*`     | chat            | 4002 |
| `/api/v1/chat-messages/*`    | chat            | 4002 |
| `/api/v1/connectors/*`       | connector       | 4003 |
| `/api/v1/routing/*`          | routing         | 4004 |
| `/api/v1/memories/*`         | memory          | 4005 |
| `/api/v1/context-packs/*`    | memory          | 4005 |
| `/api/v1/files/*`            | file            | 4006 |
| `/api/v1/audits/*`           | audit           | 4007 |
| `/api/v1/usage/*`            | audit           | 4007 |
| `/api/v1/ollama/*`           | ollama          | 4008 |
| `/api/v1/health`             | health          | 4009 |
| `/api/v1/client-logs/*`      | client-logs     | 4010 |
| `/api/v1/server-logs/*`      | server-logs     | 4011 |
| `/api/v1/images/*`           | image           | 4012 |
| `/api/v1/file-generations/*` | file-generation | 4013 |
| `/api/v1/workspace/*`        | workspace       | 4014 |
| `/api/v1/agent/*`            | agent           | 4015 |

---

## Supported AI Providers

| Provider          | Models (examples)                                       | Capabilities                           |
| ----------------- | ------------------------------------------------------- | -------------------------------------- |
| **OpenAI**        | gpt-4o, gpt-4o-mini                                     | Chat, vision, tools                    |
| **Anthropic**     | claude-opus-4, claude-sonnet-4                          | Chat, vision, tools, extended thinking |
| **Google Gemini** | gemini-2.5-flash, gemini-2.5-pro                        | Chat, vision, audio, video, search     |
| **DeepSeek**      | deepseek-chat, deepseek-reasoner                        | Chat, math, reasoning                  |
| **xAI**           | grok-\*                                                 | Chat, reasoning                        |
| **Local Ollama**  | gemma3:4b, llama3.2:3b, phi3:mini, gemma2:2b, tinyllama | Chat, routing, privacy-safe            |

---

## RBAC Roles

| Role         | Can Do                                                                                                 | Cannot Do                            |
| ------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| **ADMIN**    | Everything: user management, connectors, routing policies, workspace and agent oversight               | --                                   |
| **OPERATOR** | Chat, manage own connectors, view audit logs, manage files and memories, use workspace and agent flows | Manage users, change system settings |
| **VIEWER**   | Chat (read-only threads), view dashboards                                                              | Modify anything                      |
