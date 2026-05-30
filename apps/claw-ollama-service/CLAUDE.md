# Claw Ollama Service - Development Rules

## Service Overview

Ollama microservice for the Claw platform. Manages local AI model lifecycle: pull, assign roles, generate, catalog browsing, and download progress tracking.

## Ownership

- **Model Catalog**: Browse 30+ models across 6 categories (Coding, File Generation, Image Generation, Routing, Reasoning, Thinking)
- **Model Pull**: Download models with real-time SSE progress tracking
- **Role Assignment**: Assign models to roles (Router, Coding, Reasoning, Thinking, etc.)
- **Generation**: Proxy text generation requests to Ollama runtime
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

| Endpoint                          | Method    | Auth   | Description                            |
| --------------------------------- | --------- | ------ | -------------------------------------- |
| /ollama/models                    | GET       | Yes    | List installed models (paginated)      |
| /ollama/pull                      | POST      | Yes    | Pull model by name                     |
| /ollama/assign-role               | POST      | Yes    | Assign role to model                   |
| /ollama/generate                  | POST      | Public | Generate text                          |
| /ollama/health                    | GET       | Public | Runtime health check                   |
| /ollama/runtimes                  | GET       | Yes    | List runtime configs                   |
| /ollama/catalog                   | GET       | Yes    | Browse model catalog with filters      |
| /ollama/catalog/:id               | GET       | Yes    | Single catalog entry                   |
| /ollama/catalog/:id/pull          | POST      | Yes    | Pull from catalog                      |
| /ollama/pull-jobs                 | GET       | Yes    | List active downloads                  |
| /ollama/pull-jobs/:id/progress    | GET (SSE) | Yes    | Real-time download progress            |
| /ollama/pull-jobs/:id             | DELETE    | Yes    | Cancel download                        |
| /internal/ollama/router-model     | GET       | Public | Get router model (internal)            |
| /internal/ollama/installed-models | GET       | Public | Installed models with roles (internal) |
| /runtime-progress/probe           | GET       | ADMIN  | Local-runtime rich-progress probe      |

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

## All Standard Backend Rules Apply

See the root CLAUDE.md for the full set of architecture rules, naming conventions, and code quality requirements.

## No Inline Declarations Rule

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in service, controller, repository, manager, adapter, utility, guard, filter, interceptor, pipe, or module files. Extract to dedicated files:

- Types/interfaces → `src/modules/<domain>/types/<name>.types.ts`
- Enums → `src/common/enums/<name>.enum.ts`
- Constants → `src/modules/<domain>/constants/<name>.constants.ts`
  Only exception: `private readonly logger = new Logger(...)` inside NestJS classes.

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`.

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate Prisma client
npx tsx prisma/seed-catalog.ts  # Seed model catalog
```

## Docker Container Rebuild Procedure

When rebuilding this service (especially after shared package changes):

```bash
./scripts/claw.sh stop ollama-service
./scripts/claw.sh rm -f ollama-service
docker rmi claw-ollama-service
./scripts/claw.sh up -d --build ollama-service
```

**NEVER skip steps.** See root CLAUDE.md for full explanation.

## Workflow Phase Requirements

All work on this service MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): Define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): Follow backend architecture rules above
- **Phase 4** (SSE rules if applicable): Apply SSE-specific patterns from root CLAUDE.md
- **Phase 5** (Error handling): All async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): Verify all new endpoints with curl/Postman before claiming done
- **Phase 12** (QE Gates): All phases from docs/16-quality-engineering/ must pass

## Pre-Implementation Checklist (this service)

Before writing code for this service:

- [ ] Read root CLAUDE.md
- [ ] Read this service CLAUDE.md
- [ ] Read existing service code for the area being changed
- [ ] Read current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events published/consumed by this service
- [ ] Check if shared packages need updating

## Post-Implementation Checklist (this service)

After implementing any change to this service:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new Zod DTOs have: max() on strings, max() on arrays, required fields explicit
- [ ] All new service methods are ≤ 30 lines
- [ ] All new manager methods are ≤ 80 lines
- [ ] All new controllers are 3-line methods
- [ ] No try/catch in controllers
- [ ] No Prisma calls outside repositories
- [ ] All new events published using RabbitMQService
- [ ] All new messageKeys added to error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure

## Required Output Format

After completing any implementation task on this service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output
