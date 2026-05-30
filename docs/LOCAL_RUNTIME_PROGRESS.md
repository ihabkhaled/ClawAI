# Local-runtime rich-progress — user-facing summary

> A short overview of what shipped in PR1, what's deferred to later PRs, and
> where to look next. For the full architecture see
> [`docs/03-architecture/runtime-progress.md`](./03-architecture/runtime-progress.md).

## What this gives you

ClawAI's cloud chat path already streams a live progress card: lifecycle
stages, partial answer text, partial reasoning, TTFT, tokens-per-second,
provider/model badge, fallback chain. Pick `claude-sonnet-4` and you see it
the instant you hit send.

Pick a **local** runtime — Ollama, llama.cpp, ComfyUI, SD WebUI — and that
live experience disappears. The progress signal stops at the chat-service
boundary, the UI shows a generic spinner, and the answer only appears once
the runtime has finished. The local-runtime rich-progress initiative closes
that gap.

PR1 ships the foundation. The contract, the probes, and the most visible
regression fix (llama.cpp think-tag leakage). PR2+ wires the contract into
chat-service so a local-runtime chat behaves identically to a cloud chat.

## What shipped in PR1

| Area                              | What                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Unified envelope**              | `ClawRuntimeProgressEvent` + 9 supporting enums in `packages/shared-types/src/runtime-progress/`. Transport-agnostic.              |
| **RabbitMQ pattern declarations** | 12 `runtime.progress.*` patterns frozen in `packages/shared-constants`. Declared only — PR4 wires publishers and consumers.        |
| **Admin probe endpoints**         | `GET /api/v1/ollama/runtime-progress/probe` and `GET /api/v1/llamacpp/runtime-progress/probe`. Reachability, models, capabilities. |
| **Think-tag leak fix**            | `ThinkTagScanner` in `InferenceProxyManager`. New env var `LLAMACPP_REASONING_EXTRACTION_ENABLED` (default `true`).                |
| **Frontend decomposition**        | `RuntimeProgressPanel`, `VisibleReasoningPanel`, `RuntimeMetricsHud`, `RuntimeRawEventsDrawer`, `RuntimeStageTimeline` stub.       |
| **Probe scripts**                 | 4 Node `.mjs` scripts under `scripts/local-runtime-probes/`. Output to gitignored `.local-runtime-probes/`.                        |
| **Documentation**                 | This doc + architecture doc + experiment report template + ADR + service-level CLAUDE.md updates.                                  |

## What is explicitly deferred

| Deferred to | What                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| **PR2**     | Wire local-runtime adapters into chat-service `ProviderStreamExecutor`. Lights up live token streaming end-to-end.   |
| **PR3**     | Finish `RuntimeStageTimeline`, polish `RuntimeMetricsHud`, add per-runtime capability hints to the model selector.   |
| **PR4**     | Promote the 12 `runtime.progress.*` event patterns from declared to fully published + consumed by audit-service.     |
| **PR5**     | Image-runtime (ComfyUI + SD WebUI) progress parity. Sampler step progress, in-progress preview frames, artifact ids. |

## What's NOT changing in PR1

- The existing cloud rich-progress code path. Cloud chats stream exactly as they did before.
- The chat-service SSE controller (`@Sse('stream/:threadId')`). No new endpoint.
- `AiStreamStage` / `AiStreamProtocol`. PR2 will extend the protocol enum; PR1 leaves it alone.
- Persistence. `ChatMessage` rows still hold the final answer only.
- The frontend chat thread page render path. `thinking-indicator.tsx` still mounts where it always did.

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
