# claw-llamacpp-service — Service-Specific Rules

**Port:** 4017
**Database:** `claw_llamacpp` (PostgreSQL, prefix `LLAMACPP_*`)
**Codename:** "Local Frontier" — runs frontier open-weight LLMs (Kimi K2.6, GLM-5.1, DeepSeek V3.2/V4) via vanilla `llama.cpp` binary.
**Status:** v0.2 (foundation + full cross-stack wiring: dynamic resolver, audit consumer, connector adapter, chat dispatch, routing health probe, frontend page, multi-vendor GPU passthrough). Live inference still depends on a downloaded model + (optionally) GPU passthrough enabled at the host.

## Purpose

Manages the full lifecycle of frontier open-weight models that exceed Ollama's practical envelope (>70B parameters). Owns binary install, HF download, process supervision, runtime config, OpenAI-compatible inference proxy, and hardware preflight.

## Layer ownership

| Layer                          | Owner                                                                                                         | Notes                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Catalog browse / refresh       | `CatalogService` + `CatalogRefreshManager`                                                                    | HF metadata enrichment, paginated list                   |
| Pull jobs (HF download)        | `PullJobsService` + `PullJobRunnerManager` + `PullJobProgressEmitterManager`                                  | SSE + resume + SHA verify                                |
| Model load / unload            | `ModelsLifecycleService` + `LlamaServerLauncherManager` + `ProcessSupervisorManager` + `RuntimeConfigManager` | Single resident model in v1; mutex-guarded               |
| Inference proxy                | `InferenceService` + `InferenceProxyManager`                                                                  | Pass-through SSE / non-SSE to llama-server child process |
| Hardware detection / preflight | `HardwareService` + `HardwareDetectorManager` + `PreflightValidatorManager`                                   | Hard gate per `05-risk-register.md` R-60                 |
| Binary lifecycle               | `BinaryService` + `BinaryInstallerManager` + `BinaryReleaseRepository`                                        | Auto-installs llama-server on bootstrap                  |
| Health rollup                  | `HealthService`                                                                                               | Reports DB, binary, active model                         |

## Sensitive operations

- `llama-server` is spawned via `LlamaServerLauncherManager.spawn()` — argv is built from typed `RuntimeConfig`. NEVER interpolate user strings into argv. `customArgs` parser enforces allowlist (`--n-batch`, `--n-ubatch`, `--mlock`, `--no-mmap`, `--numa`, `--rope-freq-base`, `--rope-freq-scale`, `--cache-type-k`, `--cache-type-v`, `--keep`, `--main-gpu`, `--tensor-split`) and forbids shell metacharacters.
- All weight paths resolved via `resolveSafePath(LLAMACPP_DATA_PATH, segment)` which throws on traversal.
- llama-server always binds to `127.0.0.1` (config `LLAMACPP_BIND_HOST`); a random port from `[LLAMACPP_PROCESS_PORT_MIN, LLAMACPP_PROCESS_PORT_MAX]` (default 48500–48999) is allocated per load.
- **Binary install is dynamic** — `BinaryInstallerManager.resolveRelease()` queries `https://api.github.com/repos/ggml-org/llama.cpp/releases/latest` and matches `release.assets[].name` against `PLATFORM_ASSET_PATTERNS[platformKey]` (regex array per platform — supports `linux-x64-{cpu,cuda12,rocm,vulkan}`, `linux-arm64-{cpu,vulkan}`, `win-x64-{cpu,cuda12,cuda13,vulkan}`, `darwin-{arm64-metal,x64-cpu}`). The static `BINARY_RELEASES` map is a fallback only when the GitHub API is unreachable.
- Binary archive SHA-256 verification: `maybeVerifyArchive` only runs when a real (non-`0×64`) hash is pinned in `BINARY_RELEASES`. With dynamic resolution we WARN and skip — the GitHub-served URL is the implicit trust anchor. To re-enable per-archive SHA verification, fill real hashes into the static map and the verifier will pick them up.
- After extract, `locateBinary()` recursively searches the extracted tree for `llama-server[.exe]` (recent llama.cpp release archives nest binaries under sub-directories like `build/bin/`).
- `DELETE /models/:id/weights` requires `confirmName === "<name>:<tag>"` body and refuses if model is currently RESIDENT.

## Testing patterns

- Mock `child_process` for launcher tests (verify argv only).
- Mock HuggingFace via `undici.MockAgent` for pull-job tests.
- Real binary integration test gated by `RUN_E2E_BINARY=1` env flag.
- Coverage target ≥ 70% (Jest). Phase 12 raises to 92%.

## Common pitfalls

- **Windows paths**: `LLAMACPP_DATA_PATH` may contain spaces. Always use `path.join` / `path.resolve`, never string concat.
- **SSE buffering**: `pull-jobs/:id/progress` and `v1/chat/completions` are SSE. They have `@SkipLogging()` + `@SkipThrottle()` AND `app.module.ts`'s `pino-http autoLogging.ignore` excludes their URLs. nginx must have `proxy_buffering off` for those routes (`infra/nginx/nginx.conf`).
- **Process orphans**: `ProcessSupervisorManager.attach()` always replaces (`detach()`s) the previous instance before tracking a new one. On service shutdown `ModelsLifecycleService.unload()` SIGTERMs then SIGKILLs.
- **Mutex**: `ModelsLifecycleService` uses an `async-mutex` Mutex around load/unload. NEVER add a second mutex — there is one global lifecycle lock.
- **Stale READY on bootstrap**: `OnApplicationBootstrap` clears any READY/LOADING state in DB to UNLOADED, since the in-memory child is gone after a restart.

## How to add a new frontier model entry

1. Add the seed object to `prisma/seed-catalog.ts` (verify HF repo + `filePattern`).
2. Run `npm run seed:catalog` (idempotent upsert on `(name, tag)`).
3. Trigger `POST /api/v1/llamacpp/catalog/refresh` to backfill `fileSizeBytes` + `manifestSha256` from the HF API.

## How to upgrade pinned llama.cpp version

**Default path (recommended)** — do nothing. The dynamic resolver picks the newest release on every container start. To upgrade, just restart the container.

**Pinning a specific version** (only if you need reproducibility for prod):

1. Update `PINNED_LLAMACPP_VERSION` in `src/modules/binary/constants/binary-releases.constants.ts`.
2. Fill `archiveUrl` and `archiveSha256` for each platform with real values from the GitHub release page.
3. Restart container — current behavior always tries dynamic first; if you also need to bypass the API and ALWAYS use the static map, gate that in `resolveRelease()`.

## Cross-service wiring (read this if you touch any of these)

| Concern            | Lives in                                                                  | Notes                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audit              | `claw-audit-service/.../consumers/llamacpp.consumer.ts`                   | Subscribes to all 11 `LLAMACPP_*` event patterns; `pull.progress` intentionally suppressed (high frequency); writes under `entityType='llamacpp_model'`.                                                                                                                                                |
| Connector adapter  | `claw-connector-service/.../adapters/llamacpp.adapter.ts`                 | Calls `/api/v1/health` for status, `/api/v1/catalog?downloadStatus=READY` for sync. `LLAMACPP` enum value in `shared-types/ConnectorProvider`. Prisma migration `20260501000000_add_llamacpp_provider`.                                                                                                 |
| Routing health     | `claw-routing-service/.../managers/llamacpp-health.manager.ts`            | Polls `/api/v1/health` every 30 s + subscribes to `llamacpp.model.{loaded,unloaded,crashed}`; populates `runtimeHealth['LLAMACPP']` consumed by `RoutingManager.isRuntimeHealthy()`.                                                                                                                    |
| Chat dispatch      | `claw-chat-service/.../managers/chat-execution.manager.ts:callLlamacpp()` | Routes both `local-llamacpp` and `LLAMACPP` providers to `${LLAMACPP_SERVICE_URL}/api/v1/v1/chat/completions`. Bypasses connector-config fetch (no API key required).                                                                                                                                   |
| Inference @Public  | `src/modules/inference/controllers/inference.controller.ts`               | Both `chatCompletions` and `completions` are `@Public()` for service-to-service calls. Auth happens at the chat-service hop.                                                                                                                                                                            |
| Nginx prefix strip | `infra/nginx/nginx.conf`                                                  | Three location blocks (`/api/v1/llamacpp/`, `/api/v1/llamacpp/v1/`, `~ ^/api/v1/llamacpp/pull-jobs/[^/]+/progress$`) all rewrite `^/api/v1/llamacpp(/.*)$ → /api/v1$1` because controllers in this service do NOT use a `/llamacpp/` prefix (unlike ollama-service which does `@Controller('ollama')`). |

## GPU passthrough

`./scripts/claw.sh` auto-detects host GPU and applies `docker-compose.{dev,prod}.gpu-{nvidia,rocm,vulkan}.yml` overlay. Service-side `detectGpuBackend()` cascades NVIDIA → ROCm → Vulkan → CPU; with passthrough on, the dynamic binary resolver picks the matching CUDA / ROCm / Vulkan archive automatically.
