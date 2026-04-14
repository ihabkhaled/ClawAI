# Service Guide: claw-agent-service

## Overview

| Property    | Value                     |
| ----------- | ------------------------- |
| Port        | 4015                      |
| Database    | PostgreSQL (`claw_agent`) |
| ORM         | Prisma 5.22               |
| Env prefix  | `AGENT_`                  |
| Nginx route | `/api/v1/agent/*`         |

The agent service is the backend for the **desktop agent runtime** — a local Node.js CLI (`agent-cli/`) that runs on the user's machine. It manages agent session lifecycle, a **human-in-the-loop terminal command approval flow**, local repository awareness, and filesystem event ingestion. This enables ClawAI to act as a local AI orchestrator that can run commands on behalf of the user — but only after the user explicitly approves them in the web UI.

---

## Architecture

```
Desktop Machine (agent-cli/)
  → POST /sessions            (register)
  → POST /sessions/heartbeat  (keepalive every 60s)
  → GET  /commands/pending    (poll for approved commands, every 3s)
  → POST /commands/:id/dispatch (claim + start execution atomically)
  → POST /commands/:id/result   (report output + exit code)
  → POST /repos               (register discovered repos)
  → POST /events              (batch-ingest file watch events)

Web UI (user)
  → GET  /sessions            (see connected agents)
  → POST /commands            (send a command to an agent session)
  → POST /commands/:id/approve (approve a pending command)
  → POST /commands/:id/reject  (reject a pending command)
  → GET  /commands            (audit trail of all commands)
  → GET  /repos               (list detected local repos)
  → GET  /events              (file system change history)
```

### Dual Authentication Model

The service uses **two distinct authentication mechanisms** in parallel:

| Audience    | Guard           | Token type                                         | How obtained                  |
| ----------- | --------------- | -------------------------------------------------- | ----------------------------- |
| Web browser | `AuthGuard`     | JWT (`Authorization: Bearer <jwt>`)                | Login via auth-service        |
| Desktop CLI | `AgentKeyGuard` | Session key (`Authorization: Bearer <sessionKey>`) | Returned once at registration |

The `sessionKey` is a 32-byte cryptographically random hex string (`randomBytes(32).toString('hex')`). It is stored hashed in the database and returned only once at registration. Subsequent agent requests use this key as a Bearer token. The `AgentKeyGuard` validates the key and also checks that the session status is `CONNECTED` — a disconnected or expired session key is immediately rejected with `401`.

---

## Data Models

### AgentSession

Represents one running instance of the agent CLI on a user's machine.

| Column          | Type               | Notes                                             |
| --------------- | ------------------ | ------------------------------------------------- |
| id              | CUID               | Primary key                                       |
| userId          | String             | Owning user (from JWT at registration)            |
| sessionKey      | String             | Unique, used as Bearer token by agent             |
| hostname        | String             | Machine hostname                                  |
| platform        | String             | OS platform (linux/win32/darwin)                  |
| agentVersion    | String             | Semver of the CLI                                 |
| status          | AgentSessionStatus | CONNECTED / DISCONNECTED / EXPIRED                |
| lastHeartbeatAt | DateTime?          | Updated every heartbeat                           |
| connectedAt     | DateTime           | When session was created                          |
| disconnectedAt  | DateTime?          | When explicitly disconnected                      |
| metadata        | Json?              | Arbitrary CLI metadata (Prisma.DbNull for absent) |

**Indexes**: `(userId, status)`, `(sessionKey)`

### TerminalCommand

Represents one command dispatched from the web UI to an agent session, with a full approval/execution lifecycle.

| Column          | Type                  | Notes                      |
| --------------- | --------------------- | -------------------------- |
| id              | CUID                  | Primary key                |
| sessionId       | String → AgentSession | Cascade delete             |
| userId          | String                | Owner                      |
| command         | String                | Shell command string       |
| workingDir      | String?               | Execution directory        |
| status          | TerminalCommandStatus | See lifecycle below        |
| stdout          | String?               | Captured stdout            |
| stderr          | String?               | Captured stderr            |
| exitCode        | Int?                  | Process exit code          |
| approvedAt      | DateTime?             | When approved              |
| rejectedAt      | DateTime?             | When rejected              |
| startedAt       | DateTime?             | When agent began executing |
| completedAt     | DateTime?             | When execution finished    |
| rejectionReason | String?               | Free-text rejection note   |
| expiresAt       | DateTime              | 10 minutes from creation   |

**Command Lifecycle**:

```
PENDING_APPROVAL
  ↓ user approves
APPROVED
  ↓ agent polls + dispatches (atomic updateMany with compound condition)
EXECUTING
  ↓ agent reports result
EXECUTED  (exitCode = 0)
FAILED    (exitCode ≠ 0 or error)
          (OR)
REJECTED  (user rejects before execution)
EXPIRED   (not approved within 10 minutes — background cleanup job)
```

**Atomic dispatch**: The agent calls `POST /commands/:id/dispatch` which internally uses `updateMany({ where: { id, sessionId, status: APPROVED } })`. This compound condition prevents double-execution if two agent processes poll simultaneously.

**Indexes**: `(sessionId, status)`, `(userId, status)`

### LocalRepo

Represents a Git repository discovered by the agent on the local machine.

| Column        | Type      | Notes                           |
| ------------- | --------- | ------------------------------- |
| id            | CUID      | Primary key                     |
| sessionId     | String    | Which agent session reported it |
| userId        | String    | Owner                           |
| repoPath      | String    | Absolute path on machine        |
| name          | String    | Repository name                 |
| branch        | String?   | Current branch                  |
| commitHash    | String?   | HEAD commit SHA                 |
| isDirty       | Boolean   | Has uncommitted changes         |
| fileCount     | Int       | Total tracked files             |
| lastScannedAt | DateTime? | Last full scan                  |

### FileWatchEvent

Batched filesystem change events streamed from the agent's chokidar watcher.

| Column    | Type          | Notes                                  |
| --------- | ------------- | -------------------------------------- |
| id        | CUID          | Primary key                            |
| sessionId | String        | Source agent session                   |
| userId    | String        | Owner                                  |
| eventType | FileEventType | CREATED / MODIFIED / DELETED / RENAMED |
| filePath  | String        | Absolute path on machine               |
| repoId    | String?       | Associated local repo (if any)         |
| createdAt | DateTime      | Server-side ingestion timestamp        |

Events are batch-inserted with `createMany({ skipDuplicates: true })` for efficiency.

---

## API Endpoints

### User-facing (JWT required)

| Method | Path                                  | Description                                    |
| ------ | ------------------------------------- | ---------------------------------------------- |
| POST   | /api/v1/agent/sessions                | Register new session (returns sessionKey once) |
| GET    | /api/v1/agent/sessions                | List all sessions for current user             |
| GET    | /api/v1/agent/sessions/:id            | Get single session with counts                 |
| POST   | /api/v1/agent/sessions/:id/disconnect | Disconnect session                             |
| POST   | /api/v1/agent/commands                | Create command (sends to agent session)        |
| GET    | /api/v1/agent/commands                | List commands (filterable by session, status)  |
| GET    | /api/v1/agent/commands/:id            | Get single command                             |
| POST   | /api/v1/agent/commands/:id/approve    | Approve pending command                        |
| POST   | /api/v1/agent/commands/:id/reject     | Reject pending command                         |
| GET    | /api/v1/agent/repos                   | List repos for current user                    |
| GET    | /api/v1/agent/events                  | List file events (filterable by session)       |

### Agent-facing (AgentKeyGuard — sessionKey as Bearer token)

| Method | Path                                | Description                             |
| ------ | ----------------------------------- | --------------------------------------- |
| POST   | /api/v1/agent/sessions/heartbeat    | Update lastHeartbeatAt                  |
| GET    | /api/v1/agent/commands/pending      | Poll approved commands ready to execute |
| POST   | /api/v1/agent/commands/:id/dispatch | Atomically claim + start execution      |
| POST   | /api/v1/agent/commands/:id/result   | Report stdout/stderr/exitCode           |
| POST   | /api/v1/agent/repos                 | Register discovered repo                |
| POST   | /api/v1/agent/events                | Batch-ingest file watch events          |

---

## Background Jobs

The service uses `@nestjs/schedule` with `@Interval()` decorators for two cleanup tasks, both running every 60 seconds:

### Expired Command Cleanup (`AgentCommandManager.expireStaleCommands`)

- Finds all commands in `PENDING_APPROVAL` or `APPROVED` status where `expiresAt < now()`
- Bulk-updates them to `EXPIRED`
- Prevents commands from staying in the approval queue indefinitely (10-minute TTL)

### Stuck Execution Cleanup (`AgentCommandManager.expireStaleCommands`)

- Finds all commands in `EXECUTING` status where `startedAt < now() - 5 minutes`
- Bulk-updates them to `FAILED`
- Handles the case where an agent crashes mid-execution without reporting a result

### Session Expiry Cleanup (`AgentSessionManager` / via repository)

- Finds sessions with `lastHeartbeatAt < now() - SESSION_HEARTBEAT_TIMEOUT_SECONDS (120s)`
- Marks them as `EXPIRED`
- Prevents stale sessions from appearing as CONNECTED in the UI

---

## RabbitMQ Events Published

| Event                        | When published       | Payload                            |
| ---------------------------- | -------------------- | ---------------------------------- |
| `agent.session.connected`    | Session registered   | `{ sessionId, userId, timestamp }` |
| `agent.session.disconnected` | Session disconnected | `{ sessionId, userId, timestamp }` |

Events are published as fire-and-forget (`void this.publishEvent(...)`) with error logging but no throwing. The audit service can subscribe to these to record agent activity.

---

## Desktop Agent CLI (`agent-cli/`)

The `agent-cli/` package at the root is a standalone Node.js CLI that connects to the ClawAI backend.

### Commands

```bash
node agent-cli/index.js register  # First-time registration (prompts for server URL + JWT)
node agent-cli/index.js start     # Connect to server and begin working
node agent-cli/index.js status    # Show current session status
```

### Runtime Behavior (when started)

1. Reads config from `~/.claw-agent/config.json`
2. Sends `POST /sessions/heartbeat` every 30s
3. Polls `GET /commands/pending` every 3s
4. For each pending command: calls `POST /commands/:id/dispatch`, executes it via `child_process.exec`, reports result via `POST /commands/:id/result`
5. Watches the filesystem with **chokidar** and batches `CREATED/MODIFIED/DELETED/RENAMED` events, flushing them every 2s via `POST /events`
6. Handles `SIGINT` gracefully — stops all loops and calls `POST /sessions/:id/disconnect`

### Security Model

- The CLI stores the session key in `~/.claw-agent/config.json` on the local machine
- The key is never sent to the frontend or exposed in logs
- Commands only execute after **explicit user approval** in the web UI
- The atomic dispatch mechanism prevents double-execution

---

## Frontend Pages

| Page           | Route             | Description                                       |
| -------------- | ----------------- | ------------------------------------------------- |
| Agent Sessions | `/agent`          | Grid of connected agents + pending command list   |
| Terminal       | `/agent/terminal` | Approval queue (pending) + recent command history |
| Repositories   | `/agent/repos`    | Cards showing detected local Git repositories     |

### Key Frontend Hooks

| Hook                       | Responsibility                                                        |
| -------------------------- | --------------------------------------------------------------------- |
| `useAgentSessions`         | TanStack Query wrapper for session list                               |
| `useAgentCommands`         | TanStack Query with `refetchInterval: 5000` (live polling)            |
| `useAgentRepos`            | TanStack Query wrapper for repo list                                  |
| `useAgentCommandMutations` | `useCreateCommand`, `useApproveCommand`, `useRejectCommand` mutations |
| `useAgentPage`             | Controller hook for `/agent` page                                     |
| `useAgentTerminalPage`     | Controller hook for `/agent/terminal` — splits pending vs recent      |
| `useAgentReposPage`        | Controller hook for `/agent/repos`                                    |

---

## Key Design Decisions

### Why a separate service?

The agent runtime has completely different data access patterns from the chat service (heartbeats, polling, batch events) and owns its own PostgreSQL database. Keeping it separate follows the microservice ownership principle: one service, one database, no shared tables.

### Why atomic dispatch?

Without atomic dispatch, two rapid agent poll-then-execute cycles could both pick up the same APPROVED command. The `updateMany({ where: { id, sessionId, status: APPROVED } })` returns a count — if count is 0, the command was already claimed. This prevents double-execution without any additional locking.

### Why 10-minute command TTL?

Commands that sit unapproved for 10 minutes are likely forgotten. The TTL prevents indefinite accumulation and ensures the agent's poll queue stays clean.

### Why fire-and-forget event publishing?

RabbitMQ availability should not block agent operations. If the message bus is down, sessions still register and commands still flow. The `void publishEvent(...)` pattern with error logging ensures agent stability under infrastructure failures.

---

## Environment Variables

| Variable             | Default                                                  | Description                    |
| -------------------- | -------------------------------------------------------- | ------------------------------ |
| `AGENT_DATABASE_URL` | `postgresql://claw:claw_secret@pg-agent:5432/claw_agent` | PostgreSQL connection string   |
| `AGENT_PORT`         | `4015`                                                   | Service HTTP port              |
| `AGENT_SERVICE_URL`  | `http://agent-service:4015`                              | Internal URL for health checks |
| `PG_AGENT_USER`      | `claw`                                                   | Database user                  |
| `PG_AGENT_PASSWORD`  | `claw_secret`                                            | Database password              |
| `PG_AGENT_DB`        | `claw_agent`                                             | Database name                  |
| `PG_AGENT_PORT`      | `5451`                                                   | Host-mapped PostgreSQL port    |

---

## Module Structure

```
apps/claw-agent-service/src/
  common/
    constants/
      agent.constants.ts     # COMMAND_EXPIRY_MS, SESSION_HEARTBEAT_TIMEOUT_SECONDS, etc.
    decorators/
      agent-session.decorator.ts  # @AgentSession() param decorator
    enums/
      agent-session-status.enum.ts
      terminal-command-status.enum.ts
      file-event-type.enum.ts
    errors/
      business.exception.ts
      entity-not-found.exception.ts
    guards/
      agent-key.guard.ts      # Validates sessionKey Bearer token
    types/
      auth.types.ts           # AgentAuthContext, AgentRequest (IncomingMessage-based)
  modules/agent/
    controllers/
      agent-session.controller.ts
      agent-command.controller.ts
      agent-repo.controller.ts
      agent-event.controller.ts
    services/
      agent-session.service.ts
      agent-command.service.ts
      agent-repo.service.ts
      agent-event.service.ts
    managers/
      agent-command.manager.ts  # Background cleanup jobs, atomic dispatch
    repositories/
      agent-session.repository.ts
      agent-command.repository.ts
      agent-repo.repository.ts
      agent-event.repository.ts
    dto/
      create-agent-session.dto.ts
      list-sessions-query.dto.ts
      create-command.dto.ts
      approve-command.dto.ts
      reject-command.dto.ts
      list-commands-query.dto.ts
      report-command-result.dto.ts
      register-repo.dto.ts
      create-file-events.dto.ts
      list-events-query.dto.ts
    types/
      agent.types.ts   # All response/domain types including ListEventsQuery
  generated/prisma/    # Prisma client (generated at build time)
```
