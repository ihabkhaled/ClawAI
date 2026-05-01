# Local Frontier Models — Architecture

## Why frontier-local matters

ClawAI's privacy-first design promises that data on the local workstation can stay local. With Ollama, that promise covers models up to ~70B parameters. Once a user is asked to run **Kimi K2 (1T)**, **GLM-5.1 (754B)**, or **DeepSeek V3.2 (671B)**, Ollama doesn't fit the bill: the daemon's process model and quantization options are not optimized for trillion-parameter MoE models with 256k-token contexts. Cloud is the only alternative — except for users (privacy-mandated lawyers, in-house AI leads at regulated firms, researchers comparing open weights) for whom that's exactly what cannot happen.

The Local Frontier service exists to close that gap.

## Where it sits in the stack

```
Frontend  →  Nginx  →  claw-llamacpp-service  →  llama-server (child process)
                       ├── claw-llamacpp-db (PG)
                       ├── HuggingFace API     (download)
                       ├── filesystem volume   (binary + weights)
                       └── RabbitMQ            (events → audit, routing)

claw-routing-service  ──probes──► /api/v1/llamacpp/health  (caches state)
claw-chat-service     ──HTTP────► /api/v1/llamacpp/v1/chat/completions
claw-connector-service──registers── LLAMACPP provider entry
```

`claw-llamacpp-service` runs alongside `claw-ollama-service` — they coexist. Ollama keeps owning small/medium models (qwen3:1.7b for routing, gemma3:4b for memory extraction, etc.). LLAMACPP owns frontier models that exceed Ollama's envelope.

## Comparison to Ollama

| Dimension | claw-ollama-service | claw-llamacpp-service |
|---|---|---|
| Underlying engine | Ollama daemon | Vanilla `llama.cpp` `llama-server` (binary) |
| Model size envelope | ≤ ~70B params | ~140 GB to ~750 GB GGUF (96 GB to 512 GB RAM) |
| Process model | One persistent daemon, multi-model resident | One child process per resident model (single-resident in v1) |
| Download source | Ollama registry | HuggingFace (multi-shard `.gguf`) |
| Hardware gate | Soft (warns) | Hard (refuses) on disk; overridable on RAM/GPU |
| Catalog | 142 entries across 7 categories | 9 frontier entries (Kimi K2, GLM-5.1, DeepSeek V3.2/V4) |
| Routing role | LOCAL_FALLBACK_CHAT, LOCAL_REASONING, etc. | LOCAL_FRONTIER (privacy-first preference) |

## Routing integration

Phase 9 adds the **LOCAL_FRONTIER** logical role. The decision flow:

```
PRIVACY_FIRST mode:
  if llamacppHealthManager.isFrontierAvailable() → route to LLAMACPP
  elif ollamaHealthy → route to Ollama
  else → REFUSE

LOCAL_ONLY mode:
  candidate pool = [
    ...(llamacppHealthManager.getState().loadedModel ? [{runtime: LLAMACPP, ...}] : []),
    ...ollamaCandidates,
  ]

AUTO mode:
  if privacyKeyword detected AND llamacppHealthManager.isFrontierAvailable() → LLAMACPP
  if reasoning-heavy AND llamacppHealthManager.isFrontierAvailable() AND user prefers local → LLAMACPP
  else → existing AUTO logic (cloud / Ollama)
```

The `LlamacppHealthManager` polls `${LLAMACPP_SERVICE_URL}/api/v1/llamacpp/health` every 30s and caches `{binaryReady, loadedModel, reachable}`. Router decisions never block on a network call — they read the cached state. When LLAMACPP service is down, routing falls back to Ollama / cloud silently.

## Hardware tiers

Three quality tiers per model, mapped to hardware budgets:

| Tier | Quantization examples | RAM floor | Use case |
|---|---|---|---|
| **Survival** | UD-Q2_K_XL, UD-IQ1_M | 96 GB | Run on a workstation that "shouldn't" be able to run this. Quality drops noticeably. |
| **Balanced** (default) | Q4_K_M, INT4 | 192–384 GB | Production-quality answers. The recommended path. |
| **Best** | Q5_K_M, Q6_K, Q8_0 | 384–512 GB | Maximum fidelity. For benchmark/reference use. |

Each `FrontierCatalogEntry` row carries `requiredRamGb`, `recommendedRamGb`, `requiredDiskGb`, `recommendedGpuVramGb`. `PreflightValidatorManager.validate(entry, hardware, allowOverride)` returns `{ ok, reasons[], overridable }` based on these against the live `HardwareSnapshot`.

## Failure modes & recovery

| Mode | Detection | Recovery |
|---|---|---|
| Binary download fails on cold start | `BinaryService` catches and logs; health flips `binary.installed=false` | Retry on container restart; manual `POST /runtime/update` |
| Pull job stuck (network blip) | `PullJobRunnerManager` retries each chunk up to 5× exponential backoff | After exhaustion: marks `FAILED` with `reasonCode=NETWORK_TIMEOUT`; user clicks Retry |
| SHA mismatch | `verifySha256` fails post-download | Marks `FAILED` with `reasonCode=SHA_MISMATCH`; partial files preserved for inspection |
| Disk full mid-download | `ENOSPC` thrown by stream write | Marks `FAILED` with `reasonCode=DISK_FULL`; partial preserved |
| llama-server crash | `ProcessSupervisorManager.attach` callback fires | Mark catalog `loadStatus=CRASHED`, publish `llamacpp.model.crashed`; user must re-load |
| Model load timeout | Health-check polling exhausts `LLAMACPP_LOAD_TIMEOUT_MS` | Kill child, mark `FAILED`, return `MODEL_LOAD_TIMEOUT` |

See [docs/11-runbooks/frontier-troubleshooting.md](../11-runbooks/frontier-troubleshooting.md) for user-facing recovery procedures.

## Future evolution

**v1.1**:
- ik_llama.cpp / KTransformers backend selection (2–3× faster MoE decode).
- Custom GGUF upload (with sandbox load + magic-byte check).
- Speculative decoding with draft models.

**v1.2**:
- Concurrent multi-resident (e.g., GLM-5.1 + a small Ollama model in parallel slots).
- Per-model GPU partitioning (`--main-gpu`, `--tensor-split`).

**v2.0**:
- Distributed inference across multiple workstations.
