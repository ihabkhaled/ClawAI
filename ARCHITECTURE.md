# Architecture

Technical architecture documentation for the Claw platform.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                           │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼───────────────────────────────────────────┐
│                     Next.js Frontend (:3000)                         │
│  ┌─────────┐  ┌────────────┐  ┌──────────┐  ┌────────────────┐     │
│  │  Views   │─▸│ Controllers│─▸│ Services │─▸│  Repositories  │     │
│  │ (Pages)  │  │  (Hooks)   │  │ (API)    │  │  (HTTP Client) │     │
│  └─────────┘  └────────────┘  └──────────┘  └───────┬────────┘     │
└──────────────────────────────────────────────────────┼──────────────┘
                                                       │ REST API
┌──────────────────────────────────────────────────────▼──────────────┐
│                     NestJS Backend (:4000)                           │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Controllers  │─▸│ Services │─▸│ Managers │─▸│ Repositories │    │
│  │ (Routes)     │  │ (Logic)  │  │(Orchestr)│  │  (Prisma)    │    │
│  └─────────────┘  └──────────┘  └────┬─────┘  └──────┬───────┘    │
│                                      │                │             │
│  ┌───────────┐  ┌─────────────┐  ┌───▼───┐    ┌──────▼───────┐    │
│  │  Guards   │  │    Pipes    │  │ Queue │    │   Prisma     │    │
│  │(Auth/RBAC)│  │(Zod Validn) │  │(BullMQ)│    │   Client     │    │
│  └───────────┘  └─────────────┘  └───────┘    └──────────────┘    │
└─────────────┬────────────────────────┬────────────────┬────────────┘
              │                        │                │
    ┌─────────▼─────────┐   ┌─────────▼────────┐  ┌────▼──────────┐
    │   PostgreSQL 16    │   │    Redis 7       │  │    Ollama     │
    │   (pgvector)       │   │  (Cache/Queue)   │  │  (Local AI)   │
    └────────────────────┘   └──────────────────┘  └───────────────┘
                                                          │
                                                   ┌──────▼──────────┐
                                                   │  Cloud Providers │
                                                   │  (OpenAI, etc.) │
                                                   └─────────────────┘
```

---

## Frontend Architecture

The frontend follows a layered architecture inspired by MVC, adapted for React.

### Layer Responsibilities

```
View (Page/Component)
  │   Renders UI, handles user interaction
  ▼
Controller (Custom Hook)
  │   Orchestrates state and side effects
  ▼
Service (API Service)
  │   Transforms data, applies business rules
  ▼
Repository (HTTP Client)
      Makes HTTP requests to the backend API
```

### Views (Pages and Components)

- Located in `src/app/` (Next.js App Router) and `src/components/`
- Responsible for rendering UI and capturing user input
- Delegate all logic to controller hooks
- Never call API services directly

### Controllers (Custom Hooks)

- Located in `src/hooks/`
- Manage component state via Zustand stores
- Coordinate TanStack Query mutations and queries
- Handle form validation and submission flow
- Return data and callbacks for views to consume

### Services

- Located in `src/services/`
- Contain data transformation and business logic
- Map between API response shapes and frontend domain types
- Provide a clean interface between controllers and repositories

### Repositories

- Located in `src/repositories/`
- Thin wrappers around HTTP client calls
- Each repository corresponds to a backend module endpoint
- Handle request/response serialization

### State Management

- **Server state**: TanStack Query for all API data (caching, refetching, optimistic updates)
- **Client state**: Zustand stores for UI state (sidebar open/closed, selected items, theme)
- **Form state**: React Hook Form with Zod schema validation

---

## Backend Architecture

The backend follows a layered NestJS module architecture.

### Layer Responsibilities

```
Controller
  │   Receives HTTP requests, validates input, returns responses
  ▼
Service
  │   Business logic, authorization checks, data orchestration
  ▼
Manager (optional)
  │   Complex multi-step orchestration (e.g., routing engine)
  ▼
Repository
      Data access via Prisma ORM
```

### Controllers

- Located in each module's directory (e.g., `src/modules/auth/auth.controller.ts`)
- Define route handlers with decorators
- Use Zod-based validation pipes for request DTOs
- Apply guards for authentication and authorization
- Return typed response DTOs

### Services

- Core business logic for each module
- Handle authorization decisions
- Coordinate between repositories and external services
- Emit events for audit logging

### Managers

- Used when operations span multiple services or require multi-step orchestration
- The routing manager coordinates provider selection, model evaluation, and request dispatch
- Managers call services, never repositories directly

### Repositories

- Thin Prisma query wrappers
- Each repository maps to one or more Prisma models
- Handle query construction, pagination, and filtering
- Never contain business logic

### Module Structure

Each backend module follows a consistent structure:

```
modules/auth/
├── auth.controller.ts      # Route handlers
├── auth.service.ts          # Business logic
├── auth.repository.ts       # Data access
├── auth.module.ts           # NestJS module definition
├── dto/                     # Request/response DTOs (Zod schemas)
│   ├── login.dto.ts
│   └── register.dto.ts
├── guards/                  # Auth guards
└── __tests__/               # Unit tests
```

### Backend Modules

| Module          | Responsibility                                              |
|-----------------|-------------------------------------------------------------|
| `auth`          | Login, registration, JWT issuance, token refresh            |
| `users`         | User CRUD, profile management, role assignment              |
| `connectors`    | Provider connection management, encrypted secret storage    |
| `routing`       | Model routing engine, provider selection, request dispatch  |
| `chat-threads`  | Conversation thread lifecycle                               |
| `chat-messages` | Message storage, retrieval, streaming                       |
| `audits`        | Audit log recording and querying                            |
| `health`        | Liveness and readiness health checks                        |

---

## Database Design

Claw uses PostgreSQL 16 with the pgvector extension, accessed through Prisma ORM.

### Core Tables

| Table              | Purpose                                    |
|--------------------|--------------------------------------------|
| `users`            | User accounts with roles                   |
| `connectors`       | Provider connections (API keys encrypted)   |
| `connector_models` | Available models per connector             |
| `chat_threads`     | Conversation threads owned by users        |
| `chat_messages`    | Individual messages within threads         |
| `routing_rules`    | Routing configuration and preferences      |
| `audit_logs`       | Immutable audit trail                      |
| `refresh_tokens`   | JWT refresh token tracking                 |

### Key Design Decisions

- **Soft deletes** are used for user-facing data (threads, messages) via `deleted_at` timestamps
- **Encrypted columns** store connector secrets using AES-256-GCM; the encryption key never touches the database
- **pgvector** extension is available for future embedding-based features (semantic search, memory)
- **Timestamps** use `timestamptz` for all `created_at` and `updated_at` columns
- **UUIDs** are used as primary keys for all tables

---

## Authentication Flow

```
┌────────┐                    ┌─────────┐                    ┌────────┐
│ Client │                    │ Backend │                    │  DB    │
└───┬────┘                    └────┬────┘                    └───┬────┘
    │  POST /auth/login            │                             │
    │  {email, password}           │                             │
    │─────────────────────────────▸│                             │
    │                              │  Find user by email         │
    │                              │────────────────────────────▸│
    │                              │◂────────────────────────────│
    │                              │                             │
    │                              │  Verify password (argon2)   │
    │                              │                             │
    │                              │  Generate access token (JWT)│
    │                              │  Generate refresh token     │
    │                              │  Store refresh token hash   │
    │                              │────────────────────────────▸│
    │                              │                             │
    │  {accessToken, refreshToken} │                             │
    │◂─────────────────────────────│                             │
    │                              │                             │
    │  GET /api/resource           │                             │
    │  Authorization: Bearer <jwt> │                             │
    │─────────────────────────────▸│                             │
    │                              │  Verify JWT signature       │
    │                              │  Extract user + role        │
    │                              │  Check role guard           │
    │                              │                             │
    │  {resource data}             │                             │
    │◂─────────────────────────────│                             │
    │                              │                             │
    │  POST /auth/refresh          │                             │
    │  {refreshToken}              │                             │
    │─────────────────────────────▸│                             │
    │                              │  Verify refresh token       │
    │                              │  Rotate: invalidate old,    │
    │                              │  issue new pair             │
    │                              │────────────────────────────▸│
    │  {accessToken, refreshToken} │                             │
    │◂─────────────────────────────│                             │
```

### Key Details

- **Passwords** are hashed with argon2id (memory-hard, resistant to GPU attacks)
- **Access tokens** are short-lived JWTs (default 15 minutes) containing user ID and role
- **Refresh tokens** are long-lived (default 7 days) and rotated on each use
- **Refresh token rotation** invalidates the old token when a new one is issued, limiting the window for stolen token reuse
- **Guards** are NestJS decorators applied at the controller or route level to enforce authentication and role-based access

---

## Routing Engine Design

The routing engine is the core intelligence of Claw. It decides which provider and model should handle each user request.

### Flow

```
User sends message
       │
       ▼
┌──────────────────┐
│  Routing Manager  │
│                   │
│  1. Collect       │──▸ Fetch active connectors and their models
│     available     │
│     providers     │
│                   │
│  2. Classify      │──▸ Local judge model (e.g., qwen2.5:3b) analyzes
│     the request   │    the prompt and returns task characteristics:
│                   │    - complexity (low/medium/high)
│                   │    - domain (code, creative, analysis, general)
│                   │    - required capabilities
│                   │
│  3. Match         │──▸ Score available models against task requirements
│     provider      │    considering: capability fit, cost, latency,
│                   │    user preferences, routing rules
│                   │
│  4. Execute       │──▸ Send request to selected provider
│                   │
│  5. Audit         │──▸ Log routing decision, provider, latency, tokens
│                   │
└──────────────────┘
```

### Routing Rules

Users and admins can configure routing preferences:

- **Provider priority** -- Prefer certain providers over others
- **Cost limits** -- Set maximum cost per request or per period
- **Fallback chain** -- Define fallback providers if the primary is unavailable
- **Model pinning** -- Force a specific model for certain thread types
- **Local-only mode** -- Route all requests through Ollama, never touching cloud providers

### Judge Model

The local judge model is a small, fast model (e.g., qwen2.5:3b) that runs via Ollama. Its job is classification, not generation. It evaluates the incoming prompt and outputs a structured assessment that the routing manager uses to score candidates. This keeps the judge cost near zero and latency minimal.

---

## Connector System Design

Connectors represent configured connections to AI providers.

### Architecture

```
┌─────────────────┐
│   Connector      │
│                  │
│  - provider type │    (openai, anthropic, google, aws, deepseek, ollama)
│  - display name  │
│  - credentials   │──▸ Encrypted with AES-256-GCM at rest
│  - status        │    (active, inactive, error)
│  - models[]      │──▸ Available models for this connector
└─────────────────┘
```

### Secret Lifecycle

1. User submits API key via the UI
2. Frontend sends the key over HTTPS to the backend
3. Backend encrypts the key using AES-256-GCM with the `ENCRYPTION_KEY` from the environment
4. The encrypted blob (ciphertext + IV + auth tag) is stored in PostgreSQL
5. When the key is needed for an API call, the backend decrypts it in memory, uses it, and discards the plaintext
6. Keys are never logged, never returned in API responses, and never sent to the frontend

### Provider Adapters

Each provider type has an adapter that normalizes the provider's API into a common interface:

- `OllamaAdapter` -- Local model inference via Ollama HTTP API
- `OpenAIAdapter` -- OpenAI chat completions API
- `AnthropicAdapter` -- Anthropic messages API
- `GoogleAdapter` -- Google Gemini API
- `AWSBedrockAdapter` -- AWS Bedrock runtime API
- `DeepSeekAdapter` -- DeepSeek chat API

All adapters implement a common interface: `sendMessage(prompt, options) -> response`.

---

## Memory and Context System

### Thread-Based Context

Each conversation exists within a chat thread. The context window for each request is built from:

1. **System prompt** -- Configurable per thread or globally
2. **Thread history** -- Previous messages in the thread, trimmed to fit the model's context window
3. **User message** -- The current user input

### Context Window Management

- Messages are loaded newest-first and trimmed from the oldest when the total token count approaches the model's context limit
- Token counting uses provider-specific tokenizers where available, with a conservative character-based estimate as fallback
- The routing engine considers context length when selecting a model (longer contexts may route to models with larger windows)

### Future: Embedding-Based Memory

The pgvector extension is included in the database for future implementation of:
- Semantic search across conversation history
- Long-term memory that persists across threads
- Knowledge base indexing for RAG (retrieval-augmented generation)

---

## Infrastructure

### Docker Compose Services

| Service        | Image                      | Port  | Profile     |
|----------------|----------------------------|-------|-------------|
| PostgreSQL     | `pgvector/pgvector:pg16`   | 5432  | default     |
| Redis          | `redis:7-alpine`           | 6379  | default     |
| Ollama         | `ollama/ollama:latest`     | 11434 | `local-ai`  |
| Ollama (GPU)   | `ollama/ollama:latest`     | 11434 | `gpu`       |

### Data Persistence

All services use named Docker volumes for data persistence:
- `postgres-data` -- Database files
- `redis-data` -- Redis AOF/RDB snapshots
- `ollama-data` -- Downloaded model weights

### Health Checks

- PostgreSQL: `pg_isready` every 10 seconds
- Redis: `redis-cli ping` every 10 seconds
- Backend: `/health` endpoint (liveness and readiness)

### Job Queue (BullMQ)

BullMQ is used for background job processing, backed by Redis:
- Long-running AI inference requests
- Audit log writing (non-blocking)
- Future: scheduled tasks, batch processing
