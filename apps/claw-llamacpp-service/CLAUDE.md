# claw-llamacpp-service — Service-Specific Rules

**Port:** 4017
**Database:** `claw_llamacpp` (PostgreSQL, prefix `LLAMACPP_*`)
**Codename:** "Local Frontier" — runs frontier open-weight LLMs (Kimi K2.6, GLM-5.1, DeepSeek V3.2/V4) via vanilla `llama.cpp` binary.
**Status:** v0.1 (foundation phases complete; live inference depends on installed binary + downloaded weights).

## Purpose

Manages the full lifecycle of frontier open-weight models that exceed Ollama's practical envelope (>70B parameters). Owns binary install, HF download, process supervision, runtime config, OpenAI-compatible inference proxy, and hardware preflight.

## Layer ownership

| Layer | Owner | Notes |
|---|---|---|
| Catalog browse / refresh | `CatalogService` + `CatalogRefreshManager` | HF metadata enrichment, paginated list |
| Pull jobs (HF download) | `PullJobsService` + `PullJobRunnerManager` + `PullJobProgressEmitterManager` | SSE + resume + SHA verify |
| Model load / unload | `ModelsLifecycleService` + `LlamaServerLauncherManager` + `ProcessSupervisorManager` + `RuntimeConfigManager` | Single resident model in v1; mutex-guarded |
| Inference proxy | `InferenceService` + `InferenceProxyManager` | Pass-through SSE / non-SSE to llama-server child process |
| Hardware detection / preflight | `HardwareService` + `HardwareDetectorManager` + `PreflightValidatorManager` | Hard gate per `05-risk-register.md` R-60 |
| Binary lifecycle | `BinaryService` + `BinaryInstallerManager` + `BinaryReleaseRepository` | Auto-installs llama-server on bootstrap |
| Health rollup | `HealthService` | Reports DB, binary, active model |

## Sensitive operations

- `llama-server` is spawned via `LlamaServerLauncherManager.spawn()` — argv is built from typed `RuntimeConfig`. NEVER interpolate user strings into argv. `customArgs` parser enforces allowlist (`--n-batch`, `--n-ubatch`, `--mlock`, `--no-mmap`, `--numa`, `--rope-freq-base`, `--rope-freq-scale`, `--cache-type-k`, `--cache-type-v`, `--keep`, `--main-gpu`, `--tensor-split`) and forbids shell metacharacters.
- All weight paths resolved via `resolveSafePath(LLAMACPP_DATA_PATH, segment)` which throws on traversal.
- llama-server always binds to `127.0.0.1` (config `LLAMACPP_BIND_HOST`); a random port from `[LLAMACPP_PROCESS_PORT_MIN, LLAMACPP_PROCESS_PORT_MAX]` (default 48500–48999) is allocated per load.
- Binary archive is SHA-256 verified post-download (placeholder hashes in `binary-releases.constants.ts` use 64 zeros — replace with real GitHub release hashes before production).
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

1. Update `PINNED_LLAMACPP_VERSION` in `src/modules/binary/constants/binary-releases.constants.ts`.
2. Update each platform's `archiveUrl` and `archiveSha256` (real SHA from the GitHub release page; do NOT keep the 0×64 placeholder for production).
3. Restart container — `BinaryService.onApplicationBootstrap` will detect the version mismatch and re-install.
