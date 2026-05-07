# Runbook — First-time pull and load on a consumer GPU

**Audience:** developers and operators validating `claw-llamacpp-service` end-to-end on a single workstation with a consumer GPU (8 GB - 24 GB VRAM, 16-64 GB RAM).

**Goal:** prove the full `pull → SHA verify → load → inference` path with one of the **dev-class** catalog entries — no need to rent a 256 GB-RAM server.

**Time:** 15-30 minutes (most of it model download).

---

## Pre-flight (one-time, ~10 min)

### 1. Enable Docker Desktop GPU support (NVIDIA hosts)

| Platform | Action                                                                                                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows  | Settings → General → "Use WSL 2 based engine" ✓<br>Settings → Resources → WSL Integration → enable for your distro<br>Settings → Features in development → "Use NVIDIA GPU support" ✓<br>Restart Docker Desktop |
| Linux    | Install [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html), then `sudo systemctl restart docker`                                                  |
| macOS    | Skip — Docker on macOS can't access Apple Silicon Metal. The container will run CPU-only. For Metal GPU, run `claw-llamacpp-service` natively (outside Docker).                                                 |

Verify on the host:

```bash
nvidia-smi -L
# → GPU 0: NVIDIA GeForce RTX 2060 SUPER (UUID: GPU-...)
```

### 2. Bring up the stack

```bash
./scripts/claw.sh up
```

Expected output (for an NVIDIA host):

```
✓ NVIDIA GPU detected (NVIDIA GeForce RTX 2060 SUPER) — enabling CUDA passthrough
Starting all ClawAI services (dev mode, gpu=nvidia)...
...
```

### 3. Verify the binary auto-installed

```bash
curl -s http://localhost:4017/api/v1/health | jq .binary
```

Expected:

```json
{
  "installed": true,
  "version": "b8994",
  "platform": "linux-x64-cuda12",
  "path": "data/llamacpp/bin/llama-server"
}
```

If `platform` says `linux-x64-cpu` instead of `linux-x64-cuda12`, GPU passthrough isn't reaching the container — recheck step 1 and run `./scripts/claw.sh services:rebuild` to force the container to re-detect with the GPU available.

### 4. Verify the catalog is seeded

```bash
docker compose -f docker-compose.dev.databases.yml exec -T pg-llamacpp \
  psql -U claw -d claw_llamacpp -tAc \
  'SELECT name, tag, "requiredRamGb", "recommendedGpuVramGb"
     FROM "FrontierCatalogEntry"
     WHERE "isRecommended" = true
     ORDER BY "requiredRamGb";'
```

Expected:

```
phi-4-mini       | Q4_K_M     |  6 |  4
qwen3-coder      | Q4_K_M     |  8 |  6
llama-3.3        | 70b-IQ2_XS | 32 | 24
glm-5.1          | Q4_K_M     | 192 | 24
deepseek-v3.2    | Q4_K_M     | 256 | 24
kimi-k2-thinking | INT4       | 256 | 24
```

If the table is empty, seed it:

```bash
docker compose -f docker-compose.dev.services.yml exec -T llamacpp-service npm run seed:catalog
```

---

## Pick the right entry for your hardware

| Your VRAM | Your RAM | Entry to pull              | Disk       | Why                                                                            |
| --------- | -------- | -------------------------- | ---------- | ------------------------------------------------------------------------------ |
| 4 GB iGPU | 12+ GB   | **`phi-4-mini:Q4_K_M`**    | 4 GB       | Smallest end-to-end validator. Runs at ~30 tok/s on a 4 GB GPU.                |
| 6 GB      | 16+ GB   | **`qwen3-coder:Q4_K_M`**   | 8 GB       | Compact 7B coding model. Good for code-completion smoke tests.                 |
| 24 GB     | 32+ GB   | **`llama-3.3:70b-IQ2_XS`** | 30 GB      | Bridges dev-class and frontier-class. Tests CPU offload + 70B-class inference. |
| 24+ GB    | 96+ GB   | Frontier-class entries     | 200-680 GB | Real production hardware.                                                      |

**Your RTX 2060 SUPER (8 GB VRAM)** → start with `phi-4-mini`. It fits entirely in VRAM and validates everything.

---

## End-to-end walkthrough

### 5. Authenticate

```bash
TOK=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<your admin email>","password":"<your admin password>"}' \
  | jq -r .accessToken)
echo "${TOK:0:30}..."  # sanity check — should print a JWT prefix
```

### 6. Find the catalog entry id

```bash
curl -s "http://localhost:4000/api/v1/llamacpp/catalog?compatibleOnly=true&limit=20" \
  -H "Authorization: Bearer $TOK" \
  | jq '.data[] | {id, name, tag, downloadStatus, fileSizeBytes}'
```

Pick the `id` of `phi-4-mini:Q4_K_M`.

### 7. Initiate the pull

```bash
MODEL_ID="<paste the id from step 6>"

curl -s -X POST "http://localhost:4000/api/v1/llamacpp/catalog/$MODEL_ID/pull" \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -d '{"overrideHardwareGate": false}'
# → {"jobId": "...", "sseUrl": "/api/v1/llamacpp/pull-jobs/.../progress"}
```

### 8. Watch live progress

In a second terminal:

```bash
JOB_ID="<paste jobId from step 7>"

curl -N -s "http://localhost:4000/api/v1/llamacpp/pull-jobs/$JOB_ID/progress" \
  -H "Authorization: Bearer $TOK"
# Streams SSE events:
# data: {"jobId":"...","status":"RUNNING","bytesDownloaded":...,"totalBytes":...,"mbps":...,"etaSeconds":...}
```

Or just open `http://localhost:3000/models/local-frontier` in a browser — the **Active Downloads** drawer shows the same SSE stream as a progress bar.

Expected duration for `phi-4-mini`: **30-90 seconds on a 100 Mbps connection**.

When `status: "COMPLETED"` arrives, the catalog entry's `downloadStatus` flips to `READY`.

### 9. Load the model

```bash
curl -s -X POST "http://localhost:4000/api/v1/llamacpp/models/$MODEL_ID/load" \
  -H "Authorization: Bearer $TOK"
# → {"id":"...","name":"phi-4-mini","tag":"Q4_K_M","loadStatus":"READY","port":48xxx,"pid":...}
```

The service spawns `llama-server` on a random port in `[48500, 48999]`, polls `/health` until ready, attaches `ProcessSupervisorManager`, and writes a `LOADED` row to `ModelLoadEvent`.

Verify the spawned process inside the container:

```bash
docker compose -f docker-compose.dev.services.yml exec -T llamacpp-service \
  sh -c 'ps aux | grep -i llama-server | grep -v grep'
# Should show one llama-server process bound to 127.0.0.1:48xxx
```

### 10. Run inference

#### Direct API call (proves the inference path)

```bash
curl -s -X POST "http://localhost:4000/api/v1/llamacpp/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi-4-mini:Q4_K_M",
    "messages": [{"role":"user","content":"Say hello in one sentence."}],
    "stream": false
  }'
# → {"id":"chatcmpl-...","choices":[{"message":{"content":"Hello!..."}}],...}
```

#### Through the chat UI (proves the routing + chat-service dispatch)

1. Open `http://localhost:3000`
2. Start a new chat thread
3. Click the model selector → choose `local-llamacpp / phi-4-mini:Q4_K_M`
4. Send a message
5. Response should stream back token-by-token

This proves the whole stack: frontend → chat-service → `callLlamacpp` dispatch → `claw-llamacpp-service` → `llama-server` child process → response.

---

## Cleanup

### Unload (frees VRAM, keeps weights)

```bash
curl -s -X POST "http://localhost:4000/api/v1/llamacpp/models/$MODEL_ID/unload" \
  -H "Authorization: Bearer $TOK"
```

### Delete weights (frees disk; requires exact name:tag confirmation)

```bash
curl -s -X DELETE "http://localhost:4000/api/v1/llamacpp/models/$MODEL_ID/weights" \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -d '{"confirmName": "phi-4-mini:Q4_K_M"}'
```

Or use the trash-icon button on the catalog card at `/models/local-frontier` — it pops a confirmation dialog requiring the exact `name:tag` typed in.

---

## Failure-mode cookbook

| Symptom                                              | Likely cause                                          | Fix                                                                                                                                                                                                                                                |
| ---------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health.binary.installed = false`                    | Dynamic GitHub-API resolver couldn't fetch            | Check `docker compose logs llamacpp-service \| grep -i "fetchLatestRelease"`. Network issue → fallback to static `BINARY_RELEASES` map (uses placeholder SHA so install will WARN-skip verify).                                                    |
| `platform: linux-x64-cpu` despite host having NVIDIA | GPU passthrough not reaching container                | Verify `nvidia-smi -L` works inside container: `docker compose exec llamacpp-service nvidia-smi -L`. If "command not found", the gpu-nvidia overlay isn't applied. Run `./scripts/claw.sh gpu` to confirm vendor=nvidia.                           |
| `503 NO_MODEL_LOADED` on `/v1/chat/completions`      | Inference endpoint reached but no model resident      | Run step 9 (load). Check `GET /api/v1/llamacpp/models/loaded` — if 204, nothing is loaded.                                                                                                                                                         |
| Pull stuck at `RUNNING` for >5 min on small file     | HF rate-limit or network issue                        | Check the `pull-jobs/:id` row's `errorMessage`. The runner retries 5× with exponential backoff; if all fail, status flips to FAILED with `reasonCode: "HF_UNAVAILABLE"`. Cancel + retry: `DELETE /pull-jobs/:id` then `POST /pull-jobs/:id/retry`. |
| `MODEL_RESIDENT` error on weights delete             | Trying to delete the currently-loaded model           | Unload first (step 11), then delete.                                                                                                                                                                                                               |
| `confirmName does not match` (422)                   | Typo in `confirmName` body                            | Must be exactly `<name>:<tag>` — for `phi-4-mini` that's `phi-4-mini:Q4_K_M`.                                                                                                                                                                      |
| Frontend page renders but "No GPU detected"          | Hardware probe ran before GPU passthrough was enabled | Click the **Refresh** button on the Hardware panel, or POST `/api/v1/llamacpp/hardware/refresh`.                                                                                                                                                   |

---

## Where to look next

- Architecture & module deep-dive: [docs/04-backend/service-guide-llamacpp.md](../04-backend/service-guide-llamacpp.md)
- Frontier-class hardware tiers: [docs/03-architecture/local-frontier-models.md](../03-architecture/local-frontier-models.md)
- Symptom-driven recovery: [docs/11-runbooks/frontier-troubleshooting.md](./frontier-troubleshooting.md)
- ADR rationale: ADR-033 (separate service), 034 (vanilla llama.cpp v1), 035 (single resident), 036 (hard hardware gate), 037 (LLAMACPP connector provider)
