# Local Runtime Probes

Four small ESM scripts (Node 22+) that drive a single end-to-end call against
each of the local AI runtimes we ship with ClawAI and capture both the raw
provider stream and a normalized `ClawRuntimeProgressEvent` stream as JSONL.

All output goes under `.local-runtime-probes/<runtime>/` at the worktree root.
That directory is gitignored — these are operator diagnostic dumps, not
artifacts to commit.

| Runtime   | Script               | Output dir                        |
| --------- | -------------------- | --------------------------------- |
| Ollama    | `probe-ollama.mjs`   | `.local-runtime-probes/ollama/`   |
| llama.cpp | `probe-llamacpp.mjs` | `.local-runtime-probes/llamacpp/` |
| SD WebUI  | `probe-sd-webui.mjs` | `.local-runtime-probes/sd-webui/` |
| ComfyUI   | `probe-comfyui.mjs`  | `.local-runtime-probes/comfyui/`  |

Per-run files:

- `<iso-timestamp>.raw.jsonl` — one JSON object per provider chunk (verbatim
  plus a `timestampMs` capture time). For SD WebUI and ComfyUI the raw file
  also contains a metadata-only summary of any final image artifact (no
  base64 image bytes ever land in these files — they would balloon the dump
  to megabytes for no diagnostic value).
- `<iso-timestamp>.normalized.jsonl` — one
  `ClawRuntimeProgressEvent` (envelope from `packages/shared-types`) per
  semantically interesting provider chunk. Sequence numbers are
  per-script-invocation and strictly monotonic.

## Requirements

- Node 22+ (for global `WebSocket` used by ComfyUI). For older Node the
  ComfyUI probe will dynamic-import `ws` if available.
- No npm install required — the probes are pure-Node `.mjs`.

## Ollama

```bash
node scripts/local-runtime-probes/probe-ollama.mjs \
     --model qwen3:1.7b \
     --prompt "What is 17 x 23? Think step by step." \
     --mode chat \
     --think true \
     --num-predict 256 \
     --url http://localhost:11434
```

Flags: `--model`, `--prompt`, `--mode chat|generate`, `--think true|false`,
`--num-predict`, `--url`.

Emits `LIFECYCLE(CONNECTING)`, `REASONING_DELTA` per thinking chunk,
`CONTENT_DELTA` per content chunk, and on `done:true` a single
`METRICS(DONE)` envelope that converts Ollama's nanosecond timings to
milliseconds (`modelLoadMs`, `promptEvalMs`, `generationMs`,
`tokensPerSecond`, `bottleneckStage`).

## llama.cpp

```bash
# Default: via claw-llamacpp-service (nginx-fronted, requires admin JWT)
QA_ADMIN_EMAIL=admin@claw.local QA_ADMIN_PASS=ClawAdmin123! \
  node scripts/local-runtime-probes/probe-llamacpp.mjs \
       --service-url https://localhost \
       --prompt "Solve 14*23. Show your reasoning."

# Direct llama-server (no auth)
node scripts/local-runtime-probes/probe-llamacpp.mjs \
     --direct-url http://localhost:8080 \
     --prompt "Solve 14*23." \
     --mode completion
```

Env (only needed for the default service-mode run):

- `QA_ADMIN_EMAIL` — default `admin@claw.local`
- `QA_ADMIN_PASS` — default `ClawAdmin123!`

Service mode pulls
`GET /api/v1/llamacpp/runtime-progress/probe` first (capability report,
written to the raw file), then streams
`POST /api/v1/llamacpp/v1/chat/completions stream:true` and normalizes
OpenAI-style `delta.content` -> `CONTENT_DELTA` and
`delta.reasoning_content` -> `REASONING_DELTA`
(`visibleReasoningSource=LLAMACPP_REASONING_CONTENT`).

Direct mode posts `/completion stream:true return_progress:true
timings_per_token:true` and normalizes:

- `prompt_progress.{processed,total}` -> `PROMPT_EVAL_PROGRESS`
- `content` -> `CONTENT_DELTA`
- `stop:true` -> final `METRICS(DONE)` using llama.cpp's `timings.*` block.

The local-CA leaf cert that `claw.sh up` issues for `https://localhost` is
trusted by setting `NODE_TLS_REJECT_UNAUTHORIZED=0` inside the script
process — this is local-only, never propagated to the rest of the system.

## Stable Diffusion WebUI (AUTOMATIC1111)

```bash
node scripts/local-runtime-probes/probe-sd-webui.mjs \
     --url http://localhost:7860 \
     --prompt "a futuristic AI control room" \
     --steps 12 \
     --width 256 --height 256 \
     --poll-interval-ms 1000 \
     --preview false
```

AUTOMATIC1111 doesn't stream — we fire `POST /sdapi/v1/txt2img` and in
parallel poll `GET /sdapi/v1/progress` every `--poll-interval-ms`. Each
progress JSON is captured raw; each tick emits a `STEP_PROGRESS` envelope
with `currentStep`/`totalSteps`/`progressPercent` and (when reported)
`eta_relative` mapped to `samplingMs`. On final response we write a
metadata-only summary (image count, base64 length only, width/height,
parameters block) and emit `ARTIFACT_SAVED` + `LIFECYCLE(DONE)`.

`--preview true` removes the `skip_current_image=true` flag so progress
includes the live preview; default is `false` (skip image, much faster
polling).

Width/height default to `256x256` so the probe finishes in seconds even on
a CPU-only host.

## ComfyUI

```bash
node scripts/local-runtime-probes/probe-comfyui.mjs \
     --url http://localhost:8188 \
     --workflow-file scripts/local-runtime-probes/fixtures/comfyui-minimal-workflow.json
```

Flags: `--url`, `--workflow-file`, `--client-id` (default
`clawai-probe-<uuid>`).

Opens `ws://<host>/ws?clientId=<id>`, POSTs the workflow to `/prompt`,
captures every WS message verbatim into the raw file and normalizes:

| ComfyUI WS message    | Normalized envelope                                              |
| --------------------- | ---------------------------------------------------------------- |
| `status`              | `METRICS` with `queuePosition`                                   |
| `execution_cached`    | `LIFECYCLE(MODEL_WARMING_UP)` (cached node ids tallied)          |
| `executing`           | `NODE_PROGRESS(EXECUTING_NODE)` + node start-time captured       |
| `progress`            | `NODE_PROGRESS(EXECUTING_NODE)` with `value/max/progressPercent` |
| `executed`            | `NODE_PROGRESS(NODE_COMPLETED)` + node duration captured         |
| `executing` w/ `null` | `LIFECYCLE(FINALIZING)` — workflow finished                      |
| `execution_error`     | `ERROR(ERROR)` with `errorType=DECODER_ERROR`                    |

After completion the probe `GET /history/<prompt_id>` and writes a
**metadata-only** summary (node ids + image counts, never base64 bytes) plus
an `ARTIFACT_SAVED` + `LIFECYCLE(DONE)` envelope. Stdout summary lists
nodes executed, cached nodes, total time and slowest node.

The bundled fixture
(`scripts/local-runtime-probes/fixtures/comfyui-minimal-workflow.json`) is
the canonical 7-node SD-1.5 graph (CheckpointLoaderSimple ->
CLIPTextEncode positive+negative -> KSampler -> VAEDecode -> SaveImage) at
`256x256`, `steps:8`, `cfg:7`, `sampler:euler`, scheduler `normal`. It
requires the checkpoint `v1-5-pruned-emaonly.safetensors` to be present in
ComfyUI's `models/checkpoints/`.

## Exit codes

Every probe exits `0` on success and `1` on any connection / HTTP / runtime
error. Stderr output is single-line and human-readable (no Node stack
traces) so the scripts compose nicely in shell pipelines and CI matrices.

## File output discipline

- Timestamps come from `Date.now()` (epoch ms). Wall-clock ISO is used
  only for the file-name stamp.
- Run IDs are UUID v4 (`crypto.randomUUID()`).
- Per-script monotonic sequence counter starts at 1, increments on every
  emitted envelope. Lines in `.normalized.jsonl` are in emit order with no
  gaps.
- Raw files preserve every provider chunk; normalized files preserve only
  semantically meaningful events (we don't normalize heartbeat/keepalive
  frames).
- Image bytes are **never** written. Only counts, dimensions, and string
  lengths.
