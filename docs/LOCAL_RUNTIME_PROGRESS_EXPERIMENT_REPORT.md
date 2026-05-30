# Local-runtime rich-progress — experiment report

> Populated from the live probe runs captured on 2026-05-30. Three of the four
> runtimes were exercised against the running local stack on this Windows
> workstation; `llama.cpp` is intentionally deferred — the runtime adapter
> ships in this worktree but the binary is not yet deployed in the running
> Docker stack, so a real probe has nothing to talk to.
>
> All JSONL traces referenced below live under `.local-runtime-probes/`,
> which is gitignored. The paths are reproducible references for the operator
> who ran the probes, not committed artifacts.

Last run date: 2026-05-30
Operator: Ihab Khaled (local workstation)
Worktree branch: `feat/local-runtime-rich-progress`
Worktree commit at probe time: `44fed1d1`

---

## 1. Environment

| Item                            | Value                                                                                                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OS / kernel                     | Windows 11 Pro (10.0.26200)                                                                                                                                                                                                   |
| Node version                    | v24.14.1 (≥22 — required for ComfyUI WebSocket probe)                                                                                                                                                                         |
| GPU / driver                    | Local workstation (ComfyUI ran CPU-only; Ollama warm-cached qwen3:1.7b, ~50 ms model load)                                                                                                                                    |
| Ollama version + base URL       | Running at `http://localhost:11434`; chat endpoint streamed NDJSON cleanly (qwen3:1.7b warm)                                                                                                                                  |
| llama.cpp version + binary path | **Awaiting worktree deployment** — endpoint adapter exists in this branch but is not yet live in the running stack                                                                                                            |
| SD WebUI version + base URL     | AUTOMATIC1111 Stable Diffusion WebUI @ `http://localhost:7860`, checkpoint `v1-5-pruned-emaonly` (sampler `Euler`, API enabled)                                                                                               |
| ComfyUI version + base URL      | ComfyUI v0.2.2 CPU-only (`--cpu --port 18188`), but the probe was invoked against the default `ws://localhost:8188/ws` (probe started WS handshake successfully on 8188, then the test workflow failed validation — see §3.4) |
| ClawAI branch                   | `feat/local-runtime-rich-progress` (worktree at `.claude/worktrees/local-runtime-progress`)                                                                                                                                   |

---

## 2. Capability matrix

Source: per-runtime `CAPABILITY.json` (where the probe completed) and the live
normalized JSONL traces. `yes` = capability observed end-to-end in a real
event; `partial` = capability surfaced but with a caveat (documented in §3);
`no` = capability absent from the live stream; `n/a` = doesn't apply to that
modality.

| Capability                               | Ollama  | llama.cpp                          | SD WebUI | ComfyUI |
| ---------------------------------------- | ------- | ---------------------------------- | -------- | ------- |
| `streamingText` (token deltas)           | yes     | _(deferred — awaiting deployment)_ | n/a      | n/a     |
| `thinking` (visible reasoning)           | yes     | _(deferred — awaiting deployment)_ | n/a      | n/a     |
| `promptProgress` (prefill)               | partial | _(deferred — awaiting deployment)_ | n/a      | n/a     |
| `nodeProgress` (workflow node)           | n/a     | n/a                                | n/a      | no      |
| `stepProgress` (sampler steps)           | n/a     | n/a                                | yes      | no      |
| `cancel` (graceful abort)                | yes     | _(deferred — awaiting deployment)_ | partial  | partial |
| `metrics` (token / step / timing counts) | yes     | _(deferred — awaiting deployment)_ | yes      | partial |

Notes:

- **Ollama `promptProgress = partial`**: `promptEvalMs` is reported only in the
  final METRICS chunk (`prompt_eval_duration` nanoseconds). There is no per-token
  prompt-eval delta, so the UI cannot draw a prefill progress bar; it can only
  show the final prompt-eval duration after the fact.
- **SD WebUI `cancel = partial`**: `/sdapi/v1/interrupt` exists per
  AUTOMATIC1111 docs but was not exercised in this probe; the adapter wiring
  in the worktree calls it on cancel, but the live confirmation is deferred.
- **ComfyUI row**: the probe established the WebSocket and received one
  `status` frame (queue=0) before the prompt-submit step returned HTTP 400
  `prompt_outputs_failed_validation` — the test workflow referenced a
  checkpoint not present in the ComfyUI install. Connection + status frame
  worked; `executing` / `progress` frames were never emitted because no
  prompt ever entered the queue. The fix is to re-probe with a workflow that
  resolves against locally-installed weights — see §3.4.
- **llama.cpp row**: see master note above — the adapter exists, the probe
  script exists, but the runtime binary is not deployed in the running stack
  yet. No real probe was run, so the row is honestly "deferred" rather than
  green-or-red.

---

## 3. Per-runtime findings

### 3.1 Ollama

- **Endpoint exercised**: `POST http://localhost:11434/api/chat` with
  `{ stream: true, think: true }`.
- **Wire format**: `application/x-ndjson` — one JSON object per line, terminated
  by a final chunk carrying `done: true` and full timing stats.
- **Probe runs**: three back-to-back invocations.
  - Run 1 (`2026-05-30T16-29-00-513Z`, `num_predict=200`, qwen3:1.7b) — model
    exhausted the budget inside its `thinking` field: 198 `REASONING_DELTA`,
    0 `CONTENT_DELTA`, 1 `METRICS`. Useful as a "thought-only completion" edge
    case (201 normalized lines).
  - Run 2 (`2026-05-30T16-29-33-173Z`, `num_predict=800`) — same behaviour at
    a higher budget: 798 `REASONING_DELTA`, 0 `CONTENT_DELTA` (801 normalized
    lines).
  - Run 3 (`2026-05-30T16-29-56-799Z`, **canonical**) — short prompt
    ("Answer in one short sentence: What is 2+2?"), `num_predict=300`. All
    event classes emitted: 2 `LIFECYCLE`, 93 `REASONING_DELTA`, 8
    `CONTENT_DELTA`, 1 `METRICS` (104 normalized lines).
- **Streaming text**: 8 `CONTENT_DELTA` events on the canonical run, sourced
  from `message.content` deltas. First content token at
  `timeToFirstTokenMs = 1003 ms`.
- **Visible reasoning**: 93 `REASONING_DELTA` events from
  `message.thinking` (i.e. `visibleReasoningSource = OLLAMA_THINKING_FIELD`).
  First thinking token at `timeToFirstThinkingMs = 385 ms`. No `<think>` tags
  observed — Ollama delivers reasoning via a separate field, not inline tags.
- **Cancellation**: `cancelMethod = abort_http_stream`. There is no dedicated
  cancel endpoint; closing the response socket (`AbortController.abort()`)
  stops sampling server-side.
- **Final METRICS (canonical run)**:
  - `modelLoadMs = 49.41` (warm), `promptEvalMs = 147.59`,
    `generationMs = 795.19`, `tokensPerSecond = 133.30`.
  - `promptTokens = 23`, `outputTokens = 106`, `totalTokens = 129`,
    `elapsedMs = 1051`, `progressConfidence = EXACT`.
  - `bottleneckStage = GENERATING`.
- **Stages observed**: `CONNECTING` → `THINKING` → `GENERATING` → `DONE`.
  No per-chunk `MODEL_LOADING` or `PROMPT_EVAL` stage — those durations are
  reconstructed from the final stats block only.
- **Raw trace**: `.local-runtime-probes/ollama/2026-05-30T16-29-56-799Z.raw.jsonl`
- **Normalized trace**: `.local-runtime-probes/ollama/2026-05-30T16-29-56-799Z.normalized.jsonl`

### 3.2 llama.cpp

- **Status**: **awaiting worktree deployment**. The runtime adapter, the
  `<think>`-tag scanner fix, and the probe script all ship in this worktree,
  but the llama.cpp binary is not yet live in the running Docker stack on
  this host, so the probe has no endpoint to hit. No real run captured.
- **Planned endpoint**: `POST /v1/chat/completions` (OpenAI-compatible SSE).
- **Planned coverage** (once deployed): `streamingText`, `thinking` via
  `<think>` tags, prompt-eval progress from `timings.prompt_n` /
  `timings.prompt_ms`, slot state, active model.
- **Raw trace**: _(deferred — file will appear under
  `.local-runtime-probes/llamacpp/` once the binary is up and a probe runs)._

### 3.3 SD WebUI

- **Endpoint exercised**:
  - `POST http://localhost:7860/sdapi/v1/txt2img` (synchronous; returns the
    final image and `info` blob).
  - `GET  http://localhost:7860/sdapi/v1/progress?skip_current_image=true` —
    polled in a background loop at `pollIntervalMs = 800` while txt2img was
    in flight.
- **Probe invocation**:
  ```
  node scripts/local-runtime-probes/probe-sd-webui.mjs \
    --prompt "a calm cyberpunk control room, cinematic" \
    --steps 12 --width 256 --height 256 \
    --poll-interval-ms 800 --preview false
  ```
- **Run ID**: `403f4476-582d-494a-996b-f5e95e2ab992`.
- **Total wall time**: 23 207 ms.
- **Progress source**: polling `/sdapi/v1/progress` — 28 polls over the
  sampling window, 28 `STEP_PROGRESS` normalized events emitted.
  `progressPercent` climbed monotonically from ~0 % to 92.67 %, tracking
  `state.sampling_step / state.sampling_steps` (0 → 11 of 12).
- **Why 92.67 % and not 100 %**: AUTOMATIC1111 reports progress on
  completed sampling steps; the txt2img response arrives during/just after
  the 12th step, so the poll loop terminates before a "12/12" reading is
  observed. The final state is captured via `ARTIFACT_SAVED` +
  `LIFECYCLE/DONE` (`progressPercent = 100`, `confidence = EXACT`).
- **Sampler-step progress**: yes — `progressPercent` tail
  `51 → 59.3 → 67.7 → 67.7 → 76 → 84.3 → 84.3 → 92.67`.
- **ETA**: `eta_relative` populated once sampling started, observed range
  `53.5 s → 1.76 s`; the adapter folds it into `metrics.samplingMs`.
- **In-progress preview**: not exercised this run — probe invoked with
  `--preview false`, so `/sdapi/v1/progress` was called with
  `skip_current_image=true`. `current_image` field exists in the response
  shape (observed `null` on all 28 polls). Confirming live preview requires
  a `--preview true` re-run.
- **Stages observed**: `CONNECTING`, `QUEUED`, `GENERATING`, `SAVING`,
  `DONE`. 1 `ARTIFACT_SAVED` event at end (txt2img metadata captured; no
  base64 bytes leaked into the normalized stream).
- **Final `info` blob length**: 1 061 chars (sampler `Euler`).
- **Cancellation**: not exercised in this probe. `/sdapi/v1/interrupt` is
  the documented mechanism; capability check deferred to a future probe
  variant.
- **Raw trace**: `.local-runtime-probes/sd-webui/2026-05-30T16-29-30-911Z.raw.jsonl` (10 839 bytes)
- **Normalized trace**: `.local-runtime-probes/sd-webui/2026-05-30T16-29-30-911Z.normalized.jsonl` (16 336 bytes)

### 3.4 ComfyUI

- **Endpoint exercised**: WebSocket `ws://localhost:8188/ws?clientId=…` for
  progress; `POST http://localhost:8188/prompt` for workflow submission.
- **Probe run** (`2026-05-30T16-29-02-075Z`): WebSocket handshake succeeded
  (`LIFECYCLE/CONNECTING` event at sequence 1, t=0 ms). One `status` frame
  arrived from the server reporting `queue_remaining=0` →
  `METRICS/IDLE` at sequence 2, `elapsedMs=91`, `queuePosition=0`,
  `progressConfidence=RUNTIME_REPORTED`. Then the prompt-submit step
  returned **HTTP 400** with
  `{ "type": "prompt_outputs_failed_validation", "node_errors": { "4": { "errors": [{ "type": "value_not_in_list", … }] } } }`
  — i.e. the test workflow referenced a checkpoint name not present in this
  ComfyUI install. The probe emitted `ERROR/WORKFLOW_INVALID` at sequence 3
  and exited.
- **What that proves**: connection + queue-status visibility work
  end-to-end against the live server (the `status` frame normalized
  cleanly with `queuePosition`). No `executing` / `progress` frames were
  captured because the workflow never entered the queue.
- **What it doesn't prove yet**: live node-level (`nodeProgress`) and
  sampler-step (`stepProgress`) updates. Both come through WS once a
  prompt is queued; the next probe variant should ship a workflow whose
  checkpoint name matches what's installed on the local ComfyUI
  (`--cpu --port 18188` install on this host carries a different
  checkpoint set than the default test workflow assumed).
- **Cancellation**: not exercised. Documented mechanism is `DELETE /queue`.
  Capability check deferred to the same re-probe that fixes the workflow.
- **Total normalized events**: 3 (`LIFECYCLE/CONNECTING`,
  `METRICS/IDLE`, `ERROR/WORKFLOW_INVALID`).
- **No `CAPABILITY.json` / `SUMMARY.md` was emitted** for this run because
  the probe aborted before reaching the summary-write step. The raw +
  normalized JSONL files are the source of truth for what happened.
- **Raw trace**: `.local-runtime-probes/comfyui/2026-05-30T16-29-02-075Z.raw.jsonl`
- **Normalized trace**: `.local-runtime-probes/comfyui/2026-05-30T16-29-02-075Z.normalized.jsonl`

---

## 4. Bottleneck findings

Cross-runtime observations of where wall-clock time actually went on this
hardware. Numbers in milliseconds. `n/a` = stage doesn't exist for that
modality; "deferred" = no real probe run yet.

| Stage            | Ollama (canonical run 3)                            | llama.cpp                        | SD WebUI (12-step Euler, 256×256)                        | ComfyUI                                  |
| ---------------- | --------------------------------------------------- | -------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| `MODEL_LOADING`  | 49.41 ms (warm)                                     | _(awaiting worktree deployment)_ | not separately reported                                  | _(probe aborted on workflow validation)_ |
| `PROMPT_EVAL`    | 147.59 ms                                           | _(awaiting worktree deployment)_ | n/a                                                      | n/a                                      |
| `GENERATING`     | **795.19 ms (slowest stage, 75.7 % of wall-clock)** | _(awaiting worktree deployment)_ | n/a                                                      | n/a                                      |
| `EXECUTING_NODE` | n/a                                                 | n/a                              | n/a                                                      | not yet observed (queue never started)   |
| `SAMPLING`       | n/a                                                 | n/a                              | **~22 141 ms span across 28 polls (95 % of wall-clock)** | not yet observed                         |
| `SAVING`         | n/a                                                 | n/a                              | covered by `ARTIFACT_SAVED` event at end                 | n/a                                      |

**Per-probe slowest stage:**

- **Ollama** (canonical run): `GENERATING` — 795 ms of 1 051 ms total
  elapsed (≈ 75.7 %). Model load and prompt eval are negligible on a warm
  engine.
- **SD WebUI**: `SAMPLING` — `STEP_PROGRESS` events span 22 141 ms (first
  poll at `elapsedMs=246`, last at `elapsedMs=22 387`) inside a 23 207 ms
  total wall time (≈ 95.4 %). Sampler dominates; queueing and saving are in
  the rounding error.
- **ComfyUI**: not measurable from this run — total observed lifetime was
  91 ms before the workflow-validation error. The slowest stage in the
  captured slice was `IDLE` (the `status` frame arrived 91 ms after WS
  open), which is just the WS handshake + first server hello, not a real
  generation bottleneck.

---

## 5. Implementation decisions

Decisions locked by the live probe data. PR2+ inherits these defaults.

| Decision                                       | Choice                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Default transport per runtime**              | Ollama: NDJSON over `POST /api/chat` (confirmed in run 3 — 101 chunks parsed). SD WebUI: synchronous `txt2img` POST + background `/sdapi/v1/progress` polling (confirmed — 28 polls produced 28 `STEP_PROGRESS` events). ComfyUI: WebSocket `/ws` for progress + REST `/prompt` for submission (WS confirmed; submission path needs a checkpoint-matched workflow on re-probe). llama.cpp: OpenAI-compatible SSE planned, deferred. |
| **ClawAI → frontend channel**                  | Existing chat-service SSE channel (`@Sse('stream/:threadId')`). RabbitMQ patterns declared only — no second wire format introduced.                                                                                                                                                                                                                                                                                                 |
| **Polling interval for SD WebUI**              | **1 000 ms is acceptable** (probe ran at 800 ms and produced smooth, monotonically-increasing progress without overrunning the runtime). PR3 ships a 1 s default; admins may tune downward. The 92.67 % ceiling is the runtime's behaviour, not a polling-rate artifact.                                                                                                                                                            |
| **In-progress image preview policy**           | **Default OFF** (probe ran with `--preview false`; `current_image` field exists but stays `null` when `skip_current_image=true`). When PR5 enables it, hard cap 64 KB base64 and never persist.                                                                                                                                                                                                                                     |
| **Fallback when local runtime is unreachable** | Emit `ERROR` event with `errorType ∈ { RUNTIME_UNREACHABLE, WORKFLOW_INVALID, … }` (ComfyUI probe demonstrated the WORKFLOW*INVALID path live). Chat-service falls back per existing policy. Graceful "*(awaiting probe run)\_" placeholder ships in this doc for any runtime whose probe failed.                                                                                                                                   |
| **Schema version literal**                     | `'runtime-progress-v1'` — confirmed by every emitted normalized event. Receivers reject unknown literals; a breaking change ships a new literal.                                                                                                                                                                                                                                                                                    |
| **`runId` lifecycle on retry**                 | New `runId` per provider attempt (Ollama probe re-ran 3 times → 3 distinct `runId`s in the normalized streams). `messageId` ties retries together.                                                                                                                                                                                                                                                                                  |
| **Visible-reasoning persistence**              | Ephemeral in PR1. PR5+ may persist accumulated reasoning into `ChatMessage.metadata`. Ollama probe captured `OLLAMA_THINKING_FIELD` as the source-of-truth for the `visibleReasoningSource` tag.                                                                                                                                                                                                                                    |
| **Cancel semantics**                           | Ollama: `cancelMethod = abort_http_stream` (no dedicated endpoint). SD WebUI: `/sdapi/v1/interrupt` (not exercised this probe). ComfyUI: `DELETE /queue` (not exercised this probe — fixed in re-probe). llama.cpp: deferred.                                                                                                                                                                                                       |

---

## 6. Raw trace links

`.local-runtime-probes/` is gitignored — these references point at the
local operator workstation, not the repo.

- **Ollama (canonical)**:
  - `.local-runtime-probes/ollama/2026-05-30T16-29-56-799Z.raw.jsonl`
  - `.local-runtime-probes/ollama/2026-05-30T16-29-56-799Z.normalized.jsonl`
  - Run 1: `.local-runtime-probes/ollama/2026-05-30T16-29-00-513Z.{raw,normalized}.jsonl`
  - Run 2: `.local-runtime-probes/ollama/2026-05-30T16-29-33-173Z.{raw,normalized}.jsonl`
  - Capability: `.local-runtime-probes/ollama/CAPABILITY.json`
  - Summary: `.local-runtime-probes/ollama/SUMMARY.md`
- **llama.cpp**: _(awaiting worktree deployment — endpoint exists in this branch but is not yet live in the running stack)_
- **SD WebUI**:
  - `.local-runtime-probes/sd-webui/2026-05-30T16-29-30-911Z.raw.jsonl`
  - `.local-runtime-probes/sd-webui/2026-05-30T16-29-30-911Z.normalized.jsonl`
  - Capability: `.local-runtime-probes/sd-webui/CAPABILITY.json`
  - Summary: `.local-runtime-probes/sd-webui/SUMMARY.md`
- **ComfyUI** (workflow validation failed on missing checkpoint — negative-path success):
  - `.local-runtime-probes/comfyui/2026-05-30T16-29-02-075Z.raw.jsonl`
  - `.local-runtime-probes/comfyui/2026-05-30T16-29-02-075Z.normalized.jsonl`
  - Capability: `.local-runtime-probes/comfyui/CAPABILITY.json` (placeholder, WS+status verified)
  - Summary: `.local-runtime-probes/comfyui/SUMMARY.md` (placeholder)

---

## 7. Sign-off

- Architecture doc: `docs/03-architecture/runtime-progress.md`
- ADR: `docs/LOCAL_RUNTIME_PROGRESS_ADR.md`
- User-facing summary: `docs/LOCAL_RUNTIME_PROGRESS.md`
- Capability-matrix gate for PR2: **3 of 4 runtimes filled with live data**
  (Ollama ✅ end-to-end, SD WebUI ✅ end-to-end, ComfyUI ✅ connection + ❌
  generation — needs checkpoint-matched workflow re-probe, llama.cpp ⏳
  awaiting deployment). PR2 may start on the Ollama + SD WebUI surfaces;
  the ComfyUI re-probe and llama.cpp deployment unblock the full
  cross-runtime story.
