# Runbook — First-time pull and load on a consumer GPU

**Audience:** developers and operators validating `claw-llamacpp-service` end-to-end on a single workstation with a consumer GPU (8 GB - 24 GB VRAM, 16-64 GB RAM).

**Goal:** prove the full `pull → SHA verify → load → inference` path with one of the **dev-class** catalog entries — no need to rent a 256 GB-RAM server.

**Time:** 15-30 minutes (most of it model download).

---

## Pre-flight (one-time, ~10 min)

### 1. Enable GPU passthrough for your hardware

`claw.sh up` auto-detects what GPU you have and applies the matching overlay
(`docker-compose.{dev,prod}.gpu-{nvidia,rocm,vulkan}.yml`). But each vendor
needs **one-time host setup** before Docker can see the device. Pick the
section that matches your machine and follow it once.

#### 1a. NVIDIA on Linux (native Docker, not Docker Desktop)

```bash
# Install NVIDIA Container Toolkit (Ubuntu / Debian shown):
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
# Sanity check (host):
nvidia-smi -L
# Sanity check (container):
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi -L
```

Full upstream guide: <https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html>

#### 1b. NVIDIA on Windows (Docker Desktop, WSL2)

1. **Docker Desktop → Settings → General** → "Use WSL 2 based engine" ✓
2. **Settings → Resources → WSL Integration** → enable for your default distro
3. **Settings → Features in development** → "Use NVIDIA GPU support" ✓
4. Quit and restart Docker Desktop completely
5. Sanity check from PowerShell or the WSL distro:
   ```powershell
   nvidia-smi -L
   docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi -L
   ```

If `nvidia-smi -L` fails on the Windows host, install the latest NVIDIA Studio or Game Ready driver — Docker uses the host driver via WDDM passthrough, no separate WSL driver needed.

#### 1c. NVIDIA in pure WSL2 (no Docker Desktop, e.g. wsl-distrod)

Same as section 1a (Linux native), but the WSL2 distro must also have CUDA-WSL drivers installed:

```bash
# Inside WSL2:
sudo apt-get install -y nvidia-cuda-toolkit
nvidia-smi -L  # should print the host's GPU
```

#### 1d. AMD ROCm on Linux

ROCm container support requires the host to have ROCm drivers installed AND your user must be in the `video` and `render` groups.

```bash
# Install ROCm (Ubuntu 22.04 example — adjust for your distro):
wget https://repo.radeon.com/amdgpu-install/6.2/ubuntu/jammy/amdgpu-install_6.2.60200-1_all.deb
sudo apt install -y ./amdgpu-install_6.2.60200-1_all.deb
sudo amdgpu-install --usecase=rocm,hip,mllib --no-dkms
sudo usermod -aG video,render "$USER"
# Log out and back in for the group changes to take effect.

# Sanity check (host):
rocm-smi
ls /dev/kfd /dev/dri/render*
# Sanity check (container, after `claw.sh up` loads the rocm overlay):
docker compose -f docker-compose.dev.services.yml -f docker-compose.dev.gpu-rocm.yml \
  exec llamacpp-service rocm-smi
```

Optional: if your specific GPU isn't auto-detected by ROCm, set the GFX override before `claw.sh up`:

```bash
export HSA_OVERRIDE_GFX_VERSION=10.3.0   # example for older RDNA cards
./scripts/claw.sh up
```

Docker Desktop on Windows does NOT support AMD ROCm passthrough today — for AMD GPUs use a native Linux host or WSL2 with [WSL2-ROCm preview](https://rocm.docs.amd.com/projects/install-on-windows/) (currently experimental).

#### 1e. Intel iGPU / Intel Arc / generic Vulkan on Linux

Intel and other render-node-based GPUs work via `/dev/dri` passthrough. Most Linux distros ship the kernel driver out of the box.

```bash
# Sanity check the render node exists on the host:
ls /dev/dri/
# Should show: card0  renderD128  (or higher numbers)

# For Intel Arc, install compute runtime (Ubuntu shown):
sudo apt-get install -y intel-opencl-icd intel-level-zero-gpu level-zero
sudo usermod -aG video,render "$USER"
# Log out and back in.

# Sanity check (container, after `claw.sh up` loads the vulkan overlay):
docker compose -f docker-compose.dev.services.yml -f docker-compose.dev.gpu-vulkan.yml \
  exec llamacpp-service ls /dev/dri/
```

Intel iGPUs only — no extra packages needed beyond your distro defaults; just add yourself to the `video` and `render` groups.

#### 1f. Apple Silicon Metal (macOS)

**Docker on macOS cannot access Apple Silicon Metal**, regardless of any setting. The Linux VM that Docker Desktop runs on is hardware-virtualized and the GPU is not exposed across the boundary. Two paths:

- **CPU-only inside Docker (default)** — `claw.sh up` will warn `macOS detected — Docker can't access Apple Silicon Metal. llamacpp-service will run CPU-only inside the container.` Inference still works, just on CPU.
- **Native Metal (recommended for real perf)** — install Node + Postgres + RabbitMQ + Redis on the host, run `claw-llamacpp-service` directly with `npm run start:dev` from `apps/claw-llamacpp-service/`. The dynamic resolver will pick `darwin-arm64-metal` and download the Metal-accelerated `llama-server` binary. Then run the rest of the stack in Docker as usual.

Intel-Mac (`darwin-x64-cpu`) follows the same CPU-only path; there is no Metal acceleration on Intel Macs.

#### 1g. No GPU / unsupported vendor

`claw.sh up` will print `ℹ No GPU detected on host — running CPU-only` and skip all overlays. Inference still works on the dev-class catalog entries (phi-4-mini Q4 will run at ~5-10 tok/s on a modern CPU).

#### Verify auto-detection picked the right vendor

After completing the host setup, run:

```bash
./scripts/claw.sh gpu
```

Expected outputs:

| Setup                 | Output                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------- |
| NVIDIA (any platform) | `✓ NVIDIA GPU detected (<model>) — enabling CUDA passthrough` + `GPU vendor: nvidia`          |
| AMD ROCm (Linux)      | `✓ AMD ROCm GPU detected — enabling ROCm passthrough` + `GPU vendor: rocm`                    |
| Intel/Vulkan (Linux)  | `✓ Intel/Vulkan-capable GPU detected — enabling /dev/dri passthrough` + `GPU vendor: vulkan`  |
| Apple Silicon         | `ℹ macOS detected — Docker can't access Apple Silicon Metal.` + `GPU vendor: metal-host-only` |
| No GPU                | `ℹ No GPU detected on host — running CPU-only` + `GPU vendor: none`                           |

If `claw.sh gpu` reports `none` but you have a GPU, the host setup above isn't complete — recheck the relevant section.

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

The `platform` field reflects what the service-side `detectGpuBackend()`
saw inside the container. Expected values per host setup:

| Host setup                                | Expected `platform`   |
| ----------------------------------------- | --------------------- |
| NVIDIA passthrough working                | `linux-x64-cuda12`    |
| AMD ROCm passthrough working              | `linux-x64-rocm`      |
| Intel/Vulkan passthrough working          | `linux-x64-vulkan`    |
| Apple Silicon (native, not Docker)        | `darwin-arm64-metal`  |
| Linux no GPU / Docker without passthrough | `linux-x64-cpu`       |
| Windows native (not Docker)               | `win-x64-cuda12` etc. |

If the service is running in Docker on a GPU host but reports `linux-x64-cpu`, GPU passthrough isn't reaching the container — recheck step 1 for your vendor and run `./scripts/claw.sh services:rebuild` to force the container to re-detect with the GPU available.

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
