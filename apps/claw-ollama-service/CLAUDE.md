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
