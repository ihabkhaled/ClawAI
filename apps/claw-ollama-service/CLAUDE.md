# Claw Ollama Service - Development Rules

## Service Overview

Ollama microservice for the Claw platform. Manages local AI model lifecycle: pull, assign roles, generate, catalog browsing, and download progress tracking.

## Ownership

- **Model Catalog**: Browse 30+ models across 6 categories (Coding, File Generation, Image Generation, Routing, Reasoning, Thinking)
- **Model Pull**: Download models with real-time SSE progress tracking
- **Role Assignment**: Assign models to roles (Router, Coding, Reasoning, Thinking, etc.)
- **Generation**: Proxy text generation requests to Ollama runtime
- **Chat**: Proxy native `/api/chat` — the only Ollama surface that accepts
  tool definitions and returns `message.tool_calls`. `/api/generate` is
  prompt-completion (no message array, no roles) so tools cannot be retrofitted
  onto it; an agent run has to switch surfaces, not just add a field. The tool
  catalog is passed through unmodified — it is authored and validated by
  chat-service, and rewriting it here would show the model a schema this
  service invented rather than the one the executor enforces.
- **Health**: Runtime health checks

## Tech Details

- **Port**: 4008
- **Database**: PostgreSQL (`claw_ollama`)
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)
- **Upstream**: Ollama API at `OLLAMA_BASE_URL`

## Database Tables

- `LocalModel` — installed models (name, tag, runtime, category, sizeBytes, family, parameters)
- `LocalModelRoleAssignment` — model-to-role mappings (ROUTER, LOCAL_CODING, LOCAL_REASONING, etc.)
- `PullJob` — download job lifecycle (PENDING → IN_PROGRESS → COMPLETED/FAILED, with totalBytes/downloadedBytes)
- `RuntimeConfig` — runtime service configurations (Ollama, vLLM, llama.cpp, LocalAI, ComfyUI)
- `ModelCatalogEntry` — browsable catalog of 30 models (name, tag, category, description, capabilities)

## API Endpoints

| Endpoint                            | Method    | Auth                 | Description                            |
| ----------------------------------- | --------- | -------------------- | -------------------------------------- |
| /ollama/models                      | GET       | Yes                  | List installed models (paginated)      |
| /ollama/pull                        | POST      | Yes                  | Pull model by name                     |
| /ollama/assign-role                 | POST      | Yes                  | Assign role to model                   |
| /ollama/generate                    | POST      | JWT or service token | Generate text (prompt-completion)      |
| /ollama/chat                        | POST      | JWT or service token | Native `/api/chat` — messages + tools  |
| /ollama/health                      | GET       | Public               | Runtime health check                   |
| /ollama/runtimes                    | GET       | Yes                  | List runtime configs                   |
| /ollama/catalog                     | GET       | Yes                  | Browse model catalog with filters      |
| /ollama/catalog/:id                 | GET       | Yes                  | Single catalog entry                   |
| /ollama/catalog/:id/pull            | POST      | Yes                  | Pull from catalog                      |
| /ollama/pull-jobs                   | GET       | Yes                  | List active downloads                  |
| /ollama/pull-jobs/:id/progress      | GET (SSE) | Yes                  | Real-time download progress            |
| /ollama/pull-jobs/:id               | DELETE    | Yes                  | Cancel download                        |
| /internal/ollama/router-model       | GET       | Service token only   | Get router model (internal)            |
| /internal/ollama/installed-models   | GET       | Service token only   | Installed models with roles (internal) |
| /internal/ollama/installed-snapshot | GET       | Service token only   | Routing sync snapshot (internal)       |
| /runtime-progress/probe             | GET       | ADMIN                | Local-runtime rich-progress probe      |

## Inference requires login (ADR-146, 2026-10-02)

`POST /ollama/generate` and `POST /ollama/chat` were `@Public()`, so anyone who
reached nginx could run the GPU. Now:

- **Inference** carries `@AllowServiceToken()`: the global `AuthGuard` accepts a
  user JWT (`Bearer`) OR `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>`
  (constant-time compare). On every route WITHOUT that decorator a service
  token is a 401 (`Service token not accepted on this route`).
- **`/internal/ollama/*`** is `@UseGuards(ServiceTokenGuard)` (service token
  only; `@Public()` there only skips the user-JWT guard).
- **Health** (`/health`, `/ollama/health`) stays public.
- **Callers** (chat, routing, memory, workspace) send
  `buildInterServiceAuthHeader()` / `buildAuthHeader()`. A new caller that
  forgets it gets `401 Missing authorization header`.
- Files: `src/app/guards/auth.guard.ts`, `src/app/guards/service-token.guard.ts`,
  `src/app/decorators/allow-service-token.decorator.ts`,
  `src/common/utilities/constant-time-equal.utility.ts`. Tests:
  `src/app/guards/__tests__/`.
- No plan/quota check here: any signed-in user may call inference directly.
  Metering still happens in chat-service.

## Runtime-progress probe (PR1 — local-runtime rich-progress)

`GET /api/v1/ollama/runtime-progress/probe` — admin-only diagnostic snapshot of
the Ollama runtime. Returns a `RuntimeProbeReport` (shape defined in
`@claw/shared-types/runtime-progress`) with reachability status, version,
installed models, optional execution profile, recent generate events, and a
boolean capability matrix:

```ts
RuntimeProbeReport = {
  provider: RuntimeProvider.OLLAMA,
  runtimeUrl: string,
  status: RuntimeProbeStatus,  // REACHABLE | UNREACHABLE | DEGRADED | …
  probedAtMs: number,
  latencyMs?: number,
  version?: string,
  models?: RuntimeProbeModel[],
  executionProfile?: RuntimeExecutionProfile, // CPU | CUDA | ROCM | METAL | …
  capabilities?: { streamingText, thinking, promptProgress, cancel, metrics, … },
  recentEvents?: RuntimeProbeRecentEvent[],
  errorType?: StreamingErrorType,
  errorMessage?: string,
};
```

Implementation: `src/modules/runtime-progress/controllers/runtime-progress.controller.ts`

- `services/ollama-probe.service.ts`. Guarded by `@Roles(UserRole.ADMIN)` —
  non-admins receive 403.

The probe powers the experiment-report capability matrix at
`docs/LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md`. Full architecture:
[`docs/03-architecture/runtime-progress.md`](../../docs/03-architecture/runtime-progress.md).

## Model Categories & Roles

| Category         | Role Enum              | Example Models           |
| ---------------- | ---------------------- | ------------------------ |
| Coding           | LOCAL_CODING           | qwen2.5-coder:7b/14b/32b |
| Reasoning        | LOCAL_REASONING        | deepseek-r1:7b/14b/32b   |
| Routing          | ROUTER                 | qwen3:1.7b, phi4-mini    |
| File Generation  | LOCAL_FILE_GENERATION  | qwen3:7b, llama3.3:8b    |
| Thinking         | LOCAL_THINKING         | glm-4.7-thinking         |
| Image Generation | LOCAL_IMAGE_GENERATION | (ComfyUI models)         |
| General          | LOCAL_FALLBACK_CHAT    | gemma3:4b                |

## Baseline rules

Baseline rules for every backend service (commands, absolute rules, declarations, library wrapping, Docker rebuild, workflow phases, checklists, output format): [docs/04-backend/backend-service-baseline.md](../../docs/04-backend/backend-service-baseline.md). This file adds only what is specific to `claw-ollama-service`.

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate Prisma client
npm run seed:catalog     # Seed model catalog by hand
```

The catalog also seeds itself at boot (`CatalogSeedService.onApplicationBootstrap`). The
`seed:catalog` script calls `tsx`, which is not a repository dependency, so npx fetches it.
