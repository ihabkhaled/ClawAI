# Local-runtime rich-progress — user-facing summary

> **Status (2026-05-31): PR1 + PR2 + PR3 + PR4 + PR5 all shipped and on `main`.**
> The cloud-vs-local progress gap is closed: users on local runtimes (Ollama,
> llama.cpp, Stable Diffusion WebUI, ComfyUI) now see the same depth of live
> progress that cloud chat threads already show. For the full architecture
> see [`docs/03-architecture/runtime-progress.md`](./03-architecture/runtime-progress.md).

## What this gives you (now live)

ClawAI's cloud chat path already streams a live progress card: lifecycle
stages, partial answer text, partial reasoning, TTFT, tokens-per-second,
provider/model badge, fallback chain. Pick `claude-sonnet-4` and you see it
the instant you hit send.

As of 2026-05-31 you get the **same** live experience picking a local runtime:

- **Local chat (Ollama, llama.cpp)** — partial tokens stream as they arrive,
  thinking deltas surface in a collapsible reasoning panel, the final
  `METRICS` event includes `modelLoadMs` / `promptEvalMs` / `generationMs` /
  `tokensPerSecond`, and a bottleneck breakdown shows which stage dominated
  wall-clock time. The stage timeline plots the per-stage windows.
- **Local image (Stable Diffusion WebUI)** — the image progress panel
  renders the sampler step bar, the step counter, an ETA, and a Cancel
  button that calls `/sdapi/v1/interrupt` server-side.
- **Local image (ComfyUI)** — the node timeline shows each workflow node
  as it starts, progresses, and completes, with human-readable node names.
- **`/admin/runtime-progress`** — ADMIN-only diagnostics page invokes both
  probe endpoints (Ollama + llama.cpp) in parallel and renders a per-runtime
  card with reachability, version, latency, capability matrix, installed
  models, and recent events.

## What shipped (PR1-5)

| PR      | Area                                      | What                                                                                                                                                                                                                                          |
| ------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR1** | Unified envelope                          | `ClawRuntimeProgressEvent` + 9 supporting enums in `packages/shared-types/src/runtime-progress/`. Transport-agnostic.                                                                                                                         |
| **PR1** | RabbitMQ pattern declarations             | 12 `runtime.progress.*` patterns frozen in `packages/shared-constants`. Declared today — SSE-only delivery in PR2-5; durable publishing is future work.                                                                                       |
| **PR1** | Admin probe endpoints                     | `GET /api/v1/ollama/runtime-progress/probe` and `GET /api/v1/llamacpp/runtime-progress/probe`. Reachability, models, capabilities.                                                                                                            |
| **PR1** | Think-tag leak fix                        | `ThinkTagScanner` in `InferenceProxyManager`. New env var `LLAMACPP_REASONING_EXTRACTION_ENABLED` (default `true`).                                                                                                                           |
| **PR1** | Frontend decomposition                    | `RuntimeProgressPanel`, `VisibleReasoningPanel`, `RuntimeMetricsHud`, `RuntimeRawEventsDrawer`, `RuntimeStageTimeline` stub.                                                                                                                  |
| **PR1** | Probe scripts                             | 4 Node `.mjs` scripts under `scripts/local-runtime-probes/`. Output to gitignored `.local-runtime-probes/`.                                                                                                                                   |
| **PR2** | Chat-service text-runtime metrics         | `NormalizedStreamFragment.finalTimings` → `ProviderStreamExecutor.buildFinalMetrics()` → rich METRICS event with `modelLoadMs` / `promptEvalMs` / `generationMs` / `tokensPerSecond` + `bottleneck` + `stageTimings`. Per-stage window capture. |
| **PR2** | Bottleneck UI                             | `RuntimeBottleneckBreakdown` component, `RuntimeStageTimeline` filled in (was a stub in PR1), `RuntimeMetricsHud` shows bottleneck chip, native i18n × 9.                                                                                     |
| **PR3** | Stable Diffusion WebUI adapter            | `stable-diffusion-webui-progress.adapter.ts` polls `/sdapi/v1/progress`, emits `STEP_PROGRESS` + `ARTIFACT_SAVED`, cancel via `/sdapi/v1/interrupt`. New env vars `CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS` + `CLAW_IMAGE_PROGRESS_PREVIEW_ENABLED`. |
| **PR3** | Image progress panel                      | `ImageGenerationProgressPanel` (frontend): sampler step bar, step counter, ETA, cancel button.                                                                                                                                                |
| **PR4** | ComfyUI WebSocket adapter                 | `comfyui-progress.adapter.ts` drives POST `/prompt` → WS `/ws` → GET `/history` loop; normalizes `executing` / `progress` / `executed` frames to NODE_PROGRESS / EXECUTING_NODE / NODE_COMPLETED / ARTIFACT_SAVED. New env var `COMFYUI_BASE_URL`. |
| **PR4** | Workflow template loader + node mapper    | `sd15-minimal.workflow.ts` baseline; `comfyui-workflow-node.mapper.ts` for node-id → display-name mapping.                                                                                                                                   |
| **PR4** | ComfyUI node timeline UI                  | `ComfyUINodeTimeline` (frontend) — per-node card with mapper-resolved names and elapsed time.                                                                                                                                                |
| **PR5** | `/admin/runtime-progress` diagnostics page | ADMIN-only page calls both probe endpoints in parallel; `RuntimeProbeCard` per runtime with status/version/latency/capabilities/models/recent events; sidebar entry; AdminGuard.                                                            |
| **PR5** | Documentation                             | This doc + architecture doc + experiment report + ADR + service-level CLAUDE.md updates (kept current as each PR landed).                                                                                                                    |

## Live evidence

A parallel API-smoke agent exercised PR2-5 against the deployed `main` stack
on 2026-05-31. Captured probe responses, sample runtime-progress events,
and the admin-page screenshot are in
`.claude/Integrations/pr2-5__live_smoke.md` (gitignored, operator-local).

## What's still on the future-work backlog

- **Durable RabbitMQ publishing of the 12 `runtime.progress.*` patterns.**
  Today the envelope flows in-process over SSE only. Wiring publishers in
  chat-service / image-service and the consumer in audit-service unlocks
  observability replay + dashboards.
- **In-progress preview frames for SD WebUI** beyond the opt-in flag —
  default is OFF; enable `CLAW_IMAGE_PROGRESS_PREVIEW_ENABLED=true` to opt in.
- **llama.cpp final timings.** PR2 currently wires only the Ollama NDJSON
  terminal frame. llama.cpp's OpenAI-SSE `timings` block should flow through
  the same `extractOllamaFinalTimings`-shaped extractor in a follow-up.

## What did NOT change across PR1-5

- The existing cloud rich-progress code path. Cloud chats stream exactly as
  they did before; the new envelope is a strict superset that coexists.
- The chat-service SSE controller (`@Sse('stream/:threadId')`). No new
  endpoint was introduced for local-runtime progress.
- Persistence semantics. `ChatMessage` rows still hold the final answer +
  metrics; partial reasoning remains ephemeral on the SSE channel.
- The frontend chat thread page render path. `thinking-indicator.tsx`
  still mounts where it always did and now delegates internally.

## How to run the probes

The probes are operator diagnostics — useful for validating a new local
runtime is reachable and to fill in the capability matrix in
[`docs/LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md`](./LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md).

```bash
# Ollama
node scripts/local-runtime-probes/probe-ollama.mjs --model qwen3:1.7b

# llama.cpp (requires a loaded model)
node scripts/local-runtime-probes/probe-llamacpp.mjs

# SD WebUI
node scripts/local-runtime-probes/probe-sd-webui.mjs

# ComfyUI
node scripts/local-runtime-probes/probe-comfyui.mjs
```

Output lands in `.local-runtime-probes/<runtime>/` as paired
`<iso-timestamp>.raw.jsonl` + `<iso-timestamp>.normalized.jsonl` files.

## Where to read next

- **Architecture:** [`docs/03-architecture/runtime-progress.md`](./03-architecture/runtime-progress.md).
- **Capability matrix:** [`docs/LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md`](./LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md).
- **Decision record:** [`docs/LOCAL_RUNTIME_PROGRESS_ADR.md`](./LOCAL_RUNTIME_PROGRESS_ADR.md).
- **Existing cloud rich-progress audit:** [`STREAMING_AUDIT.md`](../STREAMING_AUDIT.md).
