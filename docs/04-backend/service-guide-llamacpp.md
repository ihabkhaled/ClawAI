# Service Guide — claw-llamacpp-service (Local Frontier LLM)

**Codename:** Local Frontier
**Port:** 4017
**DB:** `claw_llamacpp` (PostgreSQL)
**Volume:** `llamacpp-data` mounted at `/var/lib/claw/llamacpp`
**Status:** v0.2 — all foundation phases delivered AND fully wired across the stack: dynamic GitHub-API binary resolver (no manual SHA pinning), per-vendor GPU passthrough overlays auto-detected by `claw.sh`, audit consumer for all 11 events, connector adapter (`LLAMACPP` provider), chat-execution dispatch (`callLlamacpp`), routing health probe + runtime fallback, and a complete frontend page with hardware panel / filters / live download SSE / 3 dialogs across 9 i18n locales.

## What landed in v0.2 (post-foundation wiring pass)

| Area                          | Change                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary install**            | Replaced static `BINARY_RELEASES` map with dynamic resolution against `https://api.github.com/repos/ggml-org/llama.cpp/releases/latest`; `PLATFORM_ASSET_PATTERNS` matches the right archive per platform (incl. new `linux-x64-rocm`, `linux-arm64-vulkan`). The `0×64` SHA placeholders are no longer load-bearing — kept only as fallback when the API is unreachable.                                             |
| **GPU detection (host)**      | `scripts/claw.sh` cross-platform probe: NVIDIA (`nvidia-smi -L`), AMD ROCm (`/dev/kfd`), Intel/Vulkan (`/dev/dri/render*`), macOS warn. Picks the matching `docker/docker-compose.{dev,prod}.gpu-{nvidia,rocm,vulkan}.yml` overlay automatically.                                                                                                                                                                     |
| **GPU detection (container)** | Service-side `detectGpuBackend()` cascades NVIDIA → ROCm → Vulkan → CPU; new `rocm-smi.utility.ts` + `dri.utility.ts`; `GpuBackend.ROCM` enum added. Once GPU passthrough is on, the binary installer picks the matching CUDA / ROCm / Vulkan archive.                                                                                                                                                                |
| **Catalog**                   | 12 entries seeded (was 9): added 3 dev-class (`phi-4-mini` Q4 ~2 GB, `qwen3-coder` Q4 ~5 GB, `llama-3.3` 70 B IQ2_XS ~22 GB) so contributors with consumer GPUs can validate the full pull → load → inference pipeline.                                                                                                                                                                                               |
| **Audit**                     | New `LlamacppAuditConsumer` in claw-audit-service subscribes to all 11 `LLAMACPP_*` events, writes audit rows under `entityType='llamacpp_model'`. Severity mapping: HIGH for crash/fail/delete, MEDIUM for binary-update/preflight-override, LOW for the rest. `pull.progress` is intentionally suppressed (high-frequency).                                                                                         |
| **Connector**                 | `LLAMACPP` enum value added to shared-types `ConnectorProvider`; new `LlamacppAdapter` in claw-connector-service maps `/api/v1/catalog?downloadStatus=READY` rows to `NormalizedModel`s with per-model capability flags from `entry.capabilities`. Prisma migration `20260501000000_add_llamacpp_provider`.                                                                                                           |
| **Routing**                   | `LlamacppHealthManager` registered in `RoutingModule`; polls `/api/v1/health` every 30 s and subscribes to `llamacpp.model.{loaded,unloaded,crashed}`; populates `runtimeHealth['LLAMACPP']` consumed by `RoutingManager.isRuntimeHealthy()` for fallback decisions.                                                                                                                                                  |
| **Chat**                      | `ChatExecutionManager.callLlamacpp` dispatches both `local-llamacpp` and `LLAMACPP` providers to `${LLAMACPP_SERVICE_URL}/api/v1/v1/chat/completions`; bypasses connector-config fetch (no API key needed). Inference endpoints marked `@Public()` for service-to-service calls. `LLAMACPP` added to `PROVIDER_BASE_URLS` for symmetry.                                                                               |
| **Frontend**                  | New `/models/local-frontier` page with `HardwarePanel` (RAM/disk/CPU/GPU/binary), `FilterBar` (category + tier + compatible-only + refresh), `DownloadsDrawer` (live SSE progress, cancel, retry), 3 dialogs (delete-weights, hardware-gate override, runtime config). `local-llamacpp` group appears in chat ModelSelector once a model is READY. Sidebar nav entry added. ~80 i18n keys added across all 9 locales. |
| **Nginx**                     | 3 location blocks now strip the `/llamacpp` prefix via `rewrite ^/api/v1/llamacpp(/.*)$ /api/v1$1 break;` — controllers in this service do not use a `/llamacpp/` namespace prefix (unlike ollama-service).                                                                                                                                                                                                           |
| **Compose**                   | Legacy `docker/docker-compose.dev.yml` + `docker/docker-compose.yml` deleted; `claw.sh up` is THE entrypoint. Per-vendor GPU overlays added (6 files: dev/prod × nvidia/rocm/vulkan). Service is in `docker/docker-compose.dev.services.yml` + `docker/docker-compose.prod.services.yml`; DB is in `docker/docker-compose.dev.databases.yml` + prod mirror.                                                           |
| **Tests**                     | 450 backend + 45 frontend = **495 tests passing** for new code paths (publisher, dynamic resolver, audit consumer, adapter, health manager, callLlamacpp dispatch, controller hook with override/delete/config flows, SSE hook, ModelSelector frontier branch, compat utilities). New CI workflow `.github/workflows/claw-sh-gpu-detection.yml` exercises all 4 GPU scenarios on Linux + macOS Metal-warn path.       |

## Purpose & non-goals

ClawAI's `claw-ollama-service` runs models comfortably up to ~70B parameters via the Ollama daemon. Frontier open-weight models — **Kimi K2.6 (1T MoE)**, **GLM-5.1 (754B MoE)**, **DeepSeek V3.2 (671B MoE)**, **DeepSeek V4 Pro (1.4T MoE)** — exceed Ollama's practical envelope. They require:

- A different inference backend (`llama.cpp` `llama-server`) capable of CPU-MoE offload + 4-bit/5-bit quantization.
- 96–512 GB system RAM and explicit hardware gating.
- Multi-shard `.gguf` downloads from HuggingFace (200–750 GB per model).

`claw-llamacpp-service` provides a fully-managed "click to download, click to chat" experience for these models.

**Explicitly NOT in scope (deferred):**

- `ik_llama.cpp` / `KTransformers` accelerated MoE backends (v1.1).
- Multiple resident models simultaneously (v1.2).
- Mac M3 Ultra polished support (v1.0 documents Mac as best-effort).
- Custom GGUF upload (v1.1, security review needed).

## High-level architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Frontend (3000)                                                              │
│  /models/local-frontier  → uses TanStack Query hooks + SSE for live progress │
└─────────────────────────┬────────────────────────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼────────────────────────────────────────────────────┐
│ Nginx (4000)                                                                 │
│  /api/v1/llamacpp/pull-jobs/:id/progress  → SSE (proxy_buffering off)        │
│  /api/v1/llamacpp/v1/...                  → SSE (proxy_buffering off)        │
│  /api/v1/llamacpp/...                     → standard proxy                   │
└─────────────────────────┬────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────────────────┐
│ claw-llamacpp-service (4017)                                                 │
│   BinaryService          — auto-installs llama-server on bootstrap            │
│   CatalogService         — 9 frontier seed entries; HF metadata refresh       │
│   HardwareService        — RAM/disk/GPU snapshot, 60s cache                   │
│   PreflightValidator     — RAM_INSUFFICIENT / DISK_INSUFFICIENT / GPU_…       │
│   PullJobsService        — HF multi-file download + SHA-256 verify + SSE      │
│   ModelsLifecycleService — single-resident mutex, supervisor, runtime config  │
│   InferenceService+Proxy — OpenAI-compatible chat / completions pass-through  │
│   HealthService          — DB + binary + active model rollup                  │
└─────────┬─────────────────────────────────┬──────────────────────────────────┘
          │                                  │
   ┌──────▼─────────┐               ┌────────▼─────────────────────────────┐
   │ Postgres        │               │ llama-server (127.0.0.1:48500-48999) │
   │ claw_llamacpp   │               │ child process (single resident)      │
   └─────────────────┘               └──────────────────────────────────────┘
```

## Module / file layout (highlights)

| File                                                                                            | Responsibility                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [src/main.ts](../../apps/claw-llamacpp-service/src/main.ts)                                     | NestJS bootstrap (helmet, CORS, RabbitMQ logger, prefix `/api/v1`)                                                              |
| [src/app/app.module.ts](../../apps/claw-llamacpp-service/src/app/app.module.ts)                 | Root module — wires Binary, Catalog, Hardware, PullJobs, ModelsLifecycle, Inference, Health                                     |
| [src/app/config/app.config.ts](../../apps/claw-llamacpp-service/src/app/config/app.config.ts)   | Zod-validated `AppConfig` with all `LLAMACPP_*` env vars                                                                        |
| [src/modules/binary/](../../apps/claw-llamacpp-service/src/modules/binary/)                     | `BinaryService` + `BinaryInstallerManager` — pinned llama.cpp release                                                           |
| [src/modules/catalog/](../../apps/claw-llamacpp-service/src/modules/catalog/)                   | `CatalogService` + `CatalogRefreshManager` — 9 seed entries + HF refresh                                                        |
| [src/modules/pull-jobs/](../../apps/claw-llamacpp-service/src/modules/pull-jobs/)               | `PullJobsService` + `PullJobRunnerManager` + `PullJobProgressEmitterManager` (SSE)                                              |
| [src/modules/models-lifecycle/](../../apps/claw-llamacpp-service/src/modules/models-lifecycle/) | `ModelsLifecycleService` + `LlamaServerLauncherManager` + `ProcessSupervisorManager`                                            |
| [src/modules/inference/](../../apps/claw-llamacpp-service/src/modules/inference/)               | `InferenceService` + `InferenceProxyManager` (OpenAI-compatible passthrough)                                                    |
| [src/modules/hardware/](../../apps/claw-llamacpp-service/src/modules/hardware/)                 | `HardwareService` + `HardwareDetectorManager` + `PreflightValidatorManager`                                                     |
| [src/modules/health/](../../apps/claw-llamacpp-service/src/modules/health/)                     | `HealthService` — rolls up DB + binary + active model                                                                           |
| [prisma/schema.prisma](../../apps/claw-llamacpp-service/prisma/schema.prisma)                   | 7 models: FrontierCatalogEntry, PullJob, ModelLoadEvent, RuntimeConfig, HardwareSnapshot, BinaryRelease, PreflightOverrideAudit |
| [prisma/seed-catalog.ts](../../apps/claw-llamacpp-service/prisma/seed-catalog.ts)               | 9 seed entries: Kimi K2.6, Kimi K2-Thinking, GLM-5.1, DeepSeek V3.2/V4                                                          |

## API surface (all under `/api/v1/llamacpp`)

| Method | Path                      | Purpose                                                                   |
| ------ | ------------------------- | ------------------------------------------------------------------------- |
| GET    | `/health`                 | DB + binary + active model rollup                                         |
| GET    | `/runtime/info`           | Binary version, platform, GPU backend, capabilities                       |
| POST   | `/runtime/update`         | Re-run installer (admin)                                                  |
| GET    | `/hardware`               | Cached hardware snapshot (60s TTL)                                        |
| POST   | `/hardware/refresh`       | Force re-detection                                                        |
| GET    | `/catalog`                | List with `category`, `qualityTier`, `compatibleOnly`, `limit`            |
| GET    | `/catalog/:id`            | Single entry                                                              |
| POST   | `/catalog/refresh`        | Re-fetch HF metadata (admin/operator)                                     |
| POST   | `/catalog/:id/pull`       | Initiate download — returns `{jobId, sseUrl}`                             |
| GET    | `/pull-jobs`              | Paginated list with status filter                                         |
| GET    | `/pull-jobs/:id`          | Single job                                                                |
| GET    | `/pull-jobs/:id/progress` | **SSE** stream — emits `pull-progress` events                             |
| DELETE | `/pull-jobs/:id`          | Cancel running job                                                        |
| POST   | `/pull-jobs/:id/retry`    | Retry failed/cancelled job                                                |
| POST   | `/models/:id/load`        | Spawn llama-server, wait for `/health` ready, returns `{port, pid}`       |
| POST   | `/models/:id/unload`      | SIGTERM → SIGKILL after 30s, clears resident state                        |
| GET    | `/models/loaded`          | Currently resident model (204 if none)                                    |
| PUT    | `/models/:id/config`      | Update `RuntimeConfig` (admin/operator)                                   |
| DELETE | `/models/:id/weights`     | Delete weights — requires `confirmName` body, refuses if resident (admin) |
| POST   | `/v1/chat/completions`    | **OpenAI-compatible** — supports `stream:true` SSE                        |
| POST   | `/v1/completions`         | Legacy completions, also SSE-capable                                      |

## Event bus contracts

Published by claw-llamacpp-service, consumed by `claw-audit-service` (and `claw-routing-service` for model.loaded/unloaded/crashed):

| Event                           | Payload                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `llamacpp.binary.installed`     | `{version, platform, binaryPath}`                           |
| `llamacpp.binary.updated`       | `{oldVersion, newVersion, platform}`                        |
| `llamacpp.pull.started`         | `{jobId, modelId, totalBytes, totalFiles}`                  |
| `llamacpp.pull.progress`        | `{jobId, bytesDownloaded, completedFiles}` (throttled 5s)   |
| `llamacpp.pull.completed`       | `{jobId, modelId, totalBytes}`                              |
| `llamacpp.pull.failed`          | `{jobId, modelId, reasonCode, errorMessage}`                |
| `llamacpp.model.loaded`         | `{modelId, port, pid}`                                      |
| `llamacpp.model.unloaded`       | `{modelId}`                                                 |
| `llamacpp.model.crashed`        | `{modelId, code, signal}`                                   |
| `llamacpp.weights.deleted`      | `{modelId, sizeBytes}`                                      |
| `llamacpp.preflight.overridden` | `{userId, modelId, modelName, reasons[], hardwareSnapshot}` |

## Configuration (env vars)

| Variable                              | Purpose                                        | Default                        |
| ------------------------------------- | ---------------------------------------------- | ------------------------------ |
| `LLAMACPP_DATABASE_URL`               | Postgres connection                            | required                       |
| `LLAMACPP_SERVICE_URL`                | Inter-service URL                              | `http://llamacpp-service:4017` |
| `LLAMACPP_PORT`                       | Listen port                                    | `4017`                         |
| `LLAMACPP_DATA_PATH`                  | Filesystem root for binary + weights           | required                       |
| `LLAMACPP_BINARY_VERSION`             | Pinned llama.cpp release tag                   | `b4123`                        |
| `LLAMACPP_GPU_BACKEND`                | `auto` / `cuda12` / `vulkan` / `cpu` / `metal` | `auto`                         |
| `LLAMACPP_DEFAULT_CTX_SIZE`           | Default `--ctx-size`                           | `32768`                        |
| `LLAMACPP_AUTO_INSTALL_BINARY`        | Run installer on bootstrap                     | `true`                         |
| `LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED` | Allow RAM/GPU override path                    | `true`                         |
| `LLAMACPP_LOAD_TIMEOUT_MS`            | Max load time before FAILED                    | `600000`                       |
| `LLAMACPP_BIND_HOST`                  | llama-server bind host                         | `127.0.0.1`                    |
| `LLAMACPP_PROCESS_PORT_MIN`/`MAX`     | Random allocation range                        | `48500–48999`                  |
| `HUGGINGFACE_TOKEN`                   | Optional HF token for gated repos              | none                           |
| `HUGGINGFACE_API_BASE`                | HF API base URL                                | `https://huggingface.co`       |

## Lifecycle sequences

### Cold start (binary install — dynamic resolver)

1. Service boots → `BinaryService.onApplicationBootstrap` runs.
2. `BinaryInstallerManager.ensureInstalled()` detects platform (e.g. `linux-x64-cuda12`).
3. `resolveRelease(platformKey)` — primary path is dynamic:
   - `GET https://api.github.com/repos/ggml-org/llama.cpp/releases/latest`
   - Filter `release.assets[].name` against `PLATFORM_ASSET_PATTERNS[platformKey]` (multiple regex patterns in priority order)
   - Returns `{ tag, archiveUrl, assetName, binaryName }`
4. Fallback to static `BINARY_RELEASES[platformKey]` only if API fails (network down, rate-limit).
5. If existing DB record's `version === resolved tag` AND binary present on disk → no-op (idempotent).
6. Otherwise: download → SHA-256 verify (skipped with WARN log when no real SHA pinned — accepted for dev) → extract to `${LLAMACPP_DATA_PATH}/bin/` → recursive `locateBinary()` finds the unpacked `llama-server[.exe]` (release archives nest binaries under subdirs).
7. Persist `BinaryRelease` row with `isActive=true`. Publish `llamacpp.binary.installed` (or `.updated` if previousVersion existed).
8. Health endpoint flips `binary.installed` to `true`.

**Verified live**: container today reports `{"installed":true,"version":"b8994","platform":"linux-x64-cpu","path":"data/llamacpp/bin/llama-server"}` — installed entirely via the dynamic resolver, no static URL update required.

### Model load (single-resident mutex)

1. `POST /models/:id/load` → `ModelsLifecycleService.load(id)`.
2. Acquire global `lifecycleMutex`.
3. If another model resident → unload it first (SIGTERM → SIGKILL after 30s).
4. Assert catalog entry's `downloadStatus === READY`.
5. Resolve `RuntimeConfig` (per-model overrides + defaults from `LLAMACPP_DEFAULT_CTX_SIZE`).
6. `LlamaServerLauncherManager.spawn` → builds argv, allocates random port from `[48500, 48999]`, child_process.spawn.
7. Poll `http://127.0.0.1:<port>/health` every 1s (timeout `LLAMACPP_LOAD_TIMEOUT_MS`).
8. On READY: persist `ModelLoadEvent('LOADED')`, attach supervisor, publish `llamacpp.model.loaded`, return `{port, pid}`.
9. On crash: `ProcessSupervisorManager.attach` callback → mark CRASHED → publish `llamacpp.model.crashed`.

### Pull job (with SSE)

1. `POST /catalog/:id/pull {overrideHardwareGate:false}` → `PullJobsService.create`.
2. Hardware preflight (`PreflightValidatorManager.validate`) — refuses on `DISK_INSUFFICIENT` always; allows override for `RAM/GPU_INSUFFICIENT` if `LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED=true`.
3. Reject if active job exists for same model (409).
4. Insert PullJob row in PENDING.
5. Async `PullJobRunnerManager.run(jobId)`:
   - Mark RUNNING, mark catalog `downloadStatus=PULLING`.
   - List HF files via `HuggingFaceClient.listFiles(repo, pattern)`.
   - For each: stream-download with resume, retry up to 5× exponential backoff, SHA-256 verify, atomic rename.
   - DB writes throttled to 5s; SSE `pull-progress` events on every chunk.
   - On success: catalog `downloadStatus=READY`, publish `llamacpp.pull.completed`.
6. Frontend subscribes to `GET /pull-jobs/:id/progress` (SSE).

## Observability

- **Logs**: NestJS pino logger with structured fields. `pino-http autoLogging.ignore` excludes SSE routes (`/v1/*`, `/pull-jobs/*/progress`).
- **Audit events**: 11 event patterns published to RabbitMQ exchange `claw.events` → `claw-audit-service`.
- **Health**: `GET /api/v1/llamacpp/health` aggregated by `claw-health-service`.
- **Process supervision**: `ProcessSupervisorManager` records every `LOAD_REQUESTED`, `LOADED`, `UNLOAD_REQUESTED`, `UNLOADED`, `CRASHED`, `FAILED` to `ModelLoadEvent`.

## Security model

- **JWT auth** on all endpoints except `/health` (Public decorator).
- **RBAC**: `/runtime/update`, `/catalog/refresh`, `/models/:id/config`, `/models/:id/weights` require `ADMIN` or `ADMIN+OPERATOR`.
- **Argv injection** prevented: `LlamaServerLauncherManager.parseCustomArgs` enforces allowlist (`--n-batch`, `--n-ubatch`, `--mlock`, `--no-mmap`, `--numa`, `--rope-freq-base`, `--rope-freq-scale`, `--cache-type-k`, `--cache-type-v`, `--keep`, `--main-gpu`, `--tensor-split`) and rejects shell metacharacters (`;`, `&&`, `|`, `` ` ``, `$(`).
- **Path traversal** prevented: `resolveSafePath(LLAMACPP_DATA_PATH, ...)` asserts every weight/binary path stays under the data root.
- **Network binding**: llama-server always binds `127.0.0.1` (config `LLAMACPP_BIND_HOST`); never `0.0.0.0`.
- **SHA verification**: every downloaded weight file SHA-256-verified against HF manifest before catalog entry flips to READY.
- **Hard hardware gate**: `DISK_INSUFFICIENT` is non-overridable; `RAM/GPU_INSUFFICIENT` overrides logged to `PreflightOverrideAudit` table.

## Operational runbook

See [docs/11-runbooks/frontier-troubleshooting.md](../11-runbooks/frontier-troubleshooting.md) for symptom-driven recovery procedures (download stuck, model won't load, model crashed, antivirus quarantine, etc.).

## GPU passthrough matrix (auto-detected by `claw.sh`)

| Host GPU                          | Probe                     | Overlay file                                      | Container gets                                                                      |
| --------------------------------- | ------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| NVIDIA (Linux/WSL2/Win)           | `nvidia-smi -L` succeeds  | `docker/docker-compose.{dev,prod}.gpu-nvidia.yml` | `deploy.resources.reservations.devices.driver=nvidia`, `NVIDIA_VISIBLE_DEVICES=all` |
| AMD ROCm (Linux only)             | `/dev/kfd` exists         | `docker/docker-compose.{dev,prod}.gpu-rocm.yml`   | `devices: [/dev/kfd, /dev/dri]`, `group_add: [video, render]`, `ipc: host`          |
| Intel iGPU / Arc / Vulkan (Linux) | `/dev/dri/render*` exists | `docker/docker-compose.{dev,prod}.gpu-vulkan.yml` | `devices: [/dev/dri]`, `group_add: [video, render]`                                 |
| Apple Silicon Metal               | `uname -s = Darwin`       | (none — warns)                                    | CPU-only inside container; for Metal, run service natively                          |
| None                              | (no probe matches)        | (none)                                            | CPU-only                                                                            |

CI matrix at `.github/workflows/claw-sh-gpu-detection.yml` shimmies `nvidia-smi` and faked `/dev/kfd`, `/dev/dri/renderD128` to assert all 4 Linux scenarios + the macOS warn path.

## Catalog tiers

| Tier                                        | Models                                                                                                             | Hardware envelope                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Dev-class (3 entries, `isRecommended=true`) | `phi-4-mini` Q4_K_M, `qwen3-coder` Q4_K_M, `llama-3.3` 70b-IQ2_XS                                                  | 4-24 GB VRAM, 6-32 GB RAM, 4-30 GB disk     |
| Frontier-class (9 entries)                  | Kimi K2.6 Q4 / UD-Q2, Kimi K2-Thinking INT4, GLM-5.1 Q4 / UD-Q2, DeepSeek V3.2 Q4 / UD-IQ1, V4 Pro Q4, V4 Flash Q5 | 96-512 GB RAM, 24+ GB VRAM, 200-680 GB disk |

Dev-class entries exist so contributors with consumer GPUs can validate the full pull → load → inference pipeline without renting an H100.

## ADR index

- ADR-0010 / ADR-033 — claw-llamacpp-service is a separate service (not folded into claw-ollama-service)
- ADR-0011 / ADR-034 — Vanilla `llama.cpp` only in v1.0; ik_llama.cpp / KTransformers deferred to v1.1
- ADR-0012 / ADR-035 — Single resident model in v1.0; concurrent slots deferred to v1.2
- ADR-036 — Hard hardware gate: `DISK_INSUFFICIENT` non-overridable, RAM/GPU overridable with audit
- ADR-037 — `LLAMACPP` registered as a `ConnectorProvider` enum value so users can attach the service as a managed connector
- ADR-0013 — Hard hardware gate; override requires explicit body flag + audit trail
- ADR-0014 — `LLAMACPP` is a distinct connector provider type (not OPENAI_COMPATIBLE)

(See [docs/13-adr/](../13-adr/) for full text.)
