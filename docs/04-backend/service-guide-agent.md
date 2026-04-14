# Service Guide: claw-agent-service

## Overview

| Property    | Value                     |
| ----------- | ------------------------- |
| Port        | 4015                      |
| Database    | PostgreSQL (`claw_agent`) |
| ORM         | Prisma 5.22               |
| Env prefix  | `AGENT_`                  |
| Nginx route | `/api/v1/agent/*`         |

The agent service is the backend for the desktop agent runtime -- a local Node.js CLI (`agent-cli/`) that runs on the user's machine. It manages agent session lifecycle, a human-in-the-loop terminal command approval flow, local repository awareness, and filesystem event ingestion.

---

## Architecture

```text
Desktop Machine (agent-cli/)
  -> POST /agent/sessions                (register)
  -> POST /agent/sessions/:id/heartbeat  (keepalive)
  -> GET  /agent/commands/pending        (poll approved commands)
  -> POST /agent/commands/:id/complete   (report output + exit code)
  -> POST /agent/events                  (batch-ingest file watch events)

Web UI (user)
  -> GET    /agent/sessions              (see connected agents)
  -> POST   /agent/commands              (queue a command)
  -> POST   /agent/commands/:id/approve  (approve pending command)
  -> POST   /agent/commands/:id/reject   (reject pending command)
  -> GET    /agent/commands              (audit trail of commands)
  -> GET    /agent/repos                 (list detected local repos)
  -> POST   /agent/repos                 (register repo metadata)
  -> GET    /agent/events                (file system change history)
```

### Dual Authentication Model

The service uses two distinct authentication mechanisms in parallel:

| Audience    | Guard           | Token type                                         | How obtained                  |
| ----------- | --------------- | -------------------------------------------------- | ----------------------------- |
| Web browser | `AuthGuard`     | JWT (`Authorization: Bearer <jwt>`)                | Login via auth-service        |
| Desktop CLI | `AgentKeyGuard` | Session key (`Authorization: Bearer <sessionKey>`) | Returned once at registration |

The `sessionKey` is a cryptographically random token. It is stored hashed in the database and returned only once at registration. Subsequent agent requests use this key as a Bearer token. The `AgentKeyGuard` validates the key and checks that the session is still active.

---

## Data Models

### AgentSession

Represents one running instance of the agent CLI on a user's machine.

| Column          | Type               | Notes                                             |
| --------------- | ------------------ | ------------------------------------------------- |
| id              | CUID               | Primary key                                       |
| userId          | String             | Owning user                                       |
| sessionKey      | String             | Used as Bearer token by agent                     |
| hostname        | String             | Machine hostname                                  |
| platform        | String             | OS platform                                       |
| agentVersion    | String             | CLI semver                                        |
| status          | AgentSessionStatus | CONNECTED / DISCONNECTED / EXPIRED                |
| lastHeartbeatAt | DateTime?          | Updated every heartbeat                           |
| connectedAt     | DateTime           | When session was created                          |
| disconnectedAt  | DateTime?          | When explicitly disconnected                      |
| metadata        | Json?              | Arbitrary CLI metadata                            |

### TerminalCommand

Represents one command dispatched from the web UI to an agent session, with a full approval/execution lifecycle.

| Column          | Type                  | Notes                      |
| --------------- | --------------------- | -------------------------- |
| id              | CUID                  | Primary key                |
| sessionId       | String -> AgentSession| Cascade delete             |
| userId          | String                | Owner                      |
| command         | String                | Shell command string       |
| workingDir      | String?               | Execution directory        |
| status          | TerminalCommandStatus | Pending, approved, executing, completed, failed, etc. |
| stdout          | String?               | Captured stdout            |
| stderr          | String?               | Captured stderr            |
| exitCode        | Int?                  | Process exit code          |
| approvedAt      | DateTime?             | When approved              |
| rejectedAt      | DateTime?             | When rejected              |
| startedAt       | DateTime?             | When agent began executing |
| completedAt     | DateTime?             | When execution finished    |
| rejectionReason | String?               | Optional rejection note    |
| expiresAt       | DateTime              | Approval timeout           |

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

Batched filesystem change events streamed from the agent's watcher.

| Column    | Type          | Notes                                  |
| --------- | ------------- | -------------------------------------- |
| id        | CUID          | Primary key                            |
| sessionId | String        | Source agent session                   |
| userId    | String        | Owner                                  |
| eventType | FileEventType | CREATED / MODIFIED / DELETED / RENAMED |
| filePath  | String        | Absolute path on machine               |
| repoId    | String?       | Associated local repo                  |
| createdAt | DateTime      | Server-side ingestion timestamp        |

---

## API Endpoints

### User-facing (JWT required)

| Method   | Path                           | Description                                    |
| -------- | ------------------------------ | ---------------------------------------------- |
| POST     | /api/v1/agent/sessions         | Register new session (returns sessionKey once) |
| GET      | /api/v1/agent/sessions         | List all sessions for current user             |
| GET      | /api/v1/agent/sessions/:id     | Get single session with counts                 |
| DELETE   | /api/v1/agent/sessions/:id     | Disconnect session                             |
| POST     | /api/v1/agent/commands         | Create command for an agent session            |
| GET      | /api/v1/agent/commands         | List commands                                  |
| GET      | /api/v1/agent/commands/:id     | Get single command                             |
| POST     | /api/v1/agent/commands/:id/approve | Approve pending command                    |
| POST     | /api/v1/agent/commands/:id/reject  | Reject pending command                     |
| GET      | /api/v1/agent/repos            | List repos for current user                    |
| POST     | /api/v1/agent/repos            | Register repo                                  |
| GET      | /api/v1/agent/repos/:id        | Get repo                                       |
| PATCH    | /api/v1/agent/repos/:id        | Update repo                                    |
| DELETE   | /api/v1/agent/repos/:id        | Delete repo                                    |
| GET      | /api/v1/agent/events           | List file events                               |

### Agent-facing (AgentKeyGuard)

| Method | Path                                | Description                             |
| ------ | ----------------------------------- | --------------------------------------- |
| POST   | /api/v1/agent/sessions/:id/heartbeat | Update lastHeartbeatAt                 |
| GET    | /api/v1/agent/commands/pending      | Poll approved commands ready to execute |
| POST   | /api/v1/agent/commands/:id/complete | Report stdout/stderr/exitCode           |
| POST   | /api/v1/agent/events                | Batch-ingest file watch events          |

`GET /agent/commands/pending` also marks the returned commands as started so they cannot be executed twice by a second polling process.

---

## Background Jobs

The service uses scheduled cleanup tasks:

### Expired Command Cleanup

- Finds commands still waiting for approval after their TTL
- Marks them as `EXPIRED`
- Prevents stale approval queues

### Stuck Execution Cleanup

- Finds commands stuck in `EXECUTING`
- Marks them as `FAILED`
- Handles the case where a local CLI crashes mid-run

### Session Expiry Cleanup

- Finds sessions with stale heartbeats
- Marks them as `EXPIRED`
- Prevents stale sessions from appearing as connected

---

## RabbitMQ Events Published

| Event                        | When published       | Payload                            |
| ---------------------------- | -------------------- | ---------------------------------- |
| `agent.session.connected`    | Session registered   | `{ sessionId, userId, timestamp }` |
| `agent.session.disconnected` | Session disconnected | `{ sessionId, userId, timestamp }` |

Events are fire-and-forget with error logging so RabbitMQ availability does not block agent operations.

---

## Desktop Agent CLI (`agent-cli/`)

The `agent-cli/` package at the repo root is a standalone Node.js CLI that connects to the ClawAI backend.

### Commands

```bash
node agent-cli/index.js register  # First-time registration
node agent-cli/index.js start     # Connect to server and begin working
node agent-cli/index.js status    # Show current session status
```

### Runtime Behavior (when started)

1. Reads config from local agent config storage
2. Sends heartbeat on the registered session
3. Polls `GET /commands/pending`
4. Executes approved commands locally
5. Reports results through `POST /commands/:id/complete`
6. Watches the filesystem and batches file events to `POST /events`

### Security Model

- The CLI stores the session key locally
- The key is never sent to the frontend or exposed in logs
- Commands only execute after explicit user approval in the web UI
- Session and command cleanup limit stale execution state

---

## Frontend Pages

| Page           | Route             | Description                                       |
| -------------- | ----------------- | ------------------------------------------------- |
| Agent Sessions | `/agent`          | Grid of connected agents + pending command list   |
| Terminal       | `/agent/terminal` | Approval queue + recent command history           |
| Repositories   | `/agent/repos`    | Cards showing detected local Git repositories     |

### Key Frontend Hooks

| Hook                       | Responsibility                                                        |
| -------------------------- | --------------------------------------------------------------------- |
| `useAgentSessions`         | TanStack Query wrapper for session list                               |
| `useAgentCommands`         | TanStack Query wrapper for command list                               |
| `useAgentRepos`            | TanStack Query wrapper for repo list                                  |
| `useAgentCommandMutations` | Create, approve, reject command mutations                             |
| `useAgentPage`             | Controller hook for `/agent` page                                     |
| `useAgentTerminalPage`     | Controller hook for terminal queue/history                            |
| `useAgentReposPage`        | Controller hook for `/agent/repos`                                    |

---

## Key Design Decisions

### Why a separate service?

The agent runtime has completely different data access patterns from the chat service and owns its own PostgreSQL database. Keeping it separate follows the microservice ownership principle: one service, one database, no shared tables.

### Why approval-gated command execution?

The product goal is local execution with human control. The backend stores, audits, and transitions command state, but the CLI only executes work that the user has explicitly approved.

### Why poll for pending commands?

Polling keeps the local CLI simple and resilient. The backend can atomically transition commands into execution as they are claimed by the CLI.

### Why fire-and-forget event publishing?

RabbitMQ availability should not block session registration or command handling. Event publication failures are logged, but core agent flows keep moving.

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

```text
apps/claw-agent-service/src/
  common/
    decorators/
    enums/
    errors/
    guards/
    types/
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
      agent-command.manager.ts
    repositories/
      agent-session.repository.ts
      agent-command.repository.ts
      agent-repo.repository.ts
      agent-event.repository.ts
    dto/
      create-agent-session.dto.ts
      create-command.dto.ts
      complete-command.dto.ts
      register-repo.dto.ts
      create-file-events.dto.ts
    types/
      agent.types.ts
  generated/prisma/
```
