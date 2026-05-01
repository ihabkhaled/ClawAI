# Runbook — Local Frontier (claw-llamacpp-service) Troubleshooting

**Audience:** Operators, on-call, end users with admin access.
**Service:** `claw-llamacpp-service` (port 4017, DB `claw_llamacpp`).

## Quick diagnostics

```bash
# Health rollup
curl -s http://localhost:4000/api/v1/llamacpp/health | jq .

# Runtime info (binary + GPU backend)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/llamacpp/runtime/info | jq .

# Hardware snapshot
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/llamacpp/hardware | jq .

# Tail the service logs
./scripts/claw.sh logs -f claw-llamacpp-service
```

## Symptoms → Fixes

### "My download is stuck"

1. Check pull-job status:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/api/v1/llamacpp/pull-jobs | jq '.rows[0]'
   ```
2. Check the SSE progress stream directly:
   ```bash
   curl -N http://localhost:4000/api/v1/llamacpp/pull-jobs/<JOB_ID>/progress
   ```
3. If the stream is silent for >60s → check HuggingFace reachability from the container:
   ```bash
   docker exec claw-llamacpp-service curl -s -o /dev/null -w "%{http_code}" \
     https://huggingface.co/unsloth/GLM-5.1-GGUF
   ```
4. Check disk: `df -h` on the host volume backing `${LLAMACPP_DATA_PATH}`.
5. Cancel + retry: `DELETE /pull-jobs/:id` then `POST /pull-jobs/:id/retry`.

### "My model won't load"

1. Verify binary is installed:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/api/v1/llamacpp/runtime/info | jq .binaryPath
   ```
   If `null` → trigger install: `POST /runtime/update`.
2. Verify weights READY:
   ```bash
   docker exec claw-pg-llamacpp psql -U claw -d claw_llamacpp -tAc \
     "SELECT name, tag, \"downloadStatus\" FROM \"FrontierCatalogEntry\" WHERE id='<MODEL_ID>';"
   ```
3. Tail logs while loading:
   ```bash
   docker compose logs -f claw-llamacpp-service | grep -E "spawn|llama-stderr|onCrash"
   ```
4. Common causes:
   - **Free RAM too low** at load time → free memory or unload other apps; consider Survival quant.
   - **GPU layers too aggressive** → reduce `nGpuLayers` via `PUT /models/:id/config`.
   - **ctxSize too high** → drop to 8192, retry.

### "My model crashed"

1. Read the `ModelLoadEvent` table:
   ```bash
   docker exec claw-pg-llamacpp psql -U claw -d claw_llamacpp -tAc \
     "SELECT \"modelId\", \"eventType\", \"errorMessage\", \"occurredAt\" FROM \"ModelLoadEvent\" ORDER BY \"occurredAt\" DESC LIMIT 10;"
   ```
2. The supervisor restarts once if exit happens within 60s of READY. A second crash within 60s marks `CRASHED` permanently — the user must explicitly re-load.
3. If crash is OOM (check `dmesg | grep -i "out of memory"`), reduce ctxSize or use Survival quant.

### "My machine is slow during inference"

- **RAM swapping**: free RAM is the #1 factor. Survival quants help but degrade quality.
- **GPU layer count**: too low underutilizes the GPU; too high spills back to RAM.
- **Context size**: every doubling of `--ctx-size` roughly doubles KV-cache memory. Drop to 4096 or 2048 if memory-constrained.
- Tune via `PUT /models/:id/config { ctxSize, nGpuLayers, threads, cpuMoe }` and reload.

### "I want to update llama.cpp"

1. Pin the new version in `apps/claw-llamacpp-service/src/modules/binary/constants/binary-releases.constants.ts`:
   - Update `PINNED_LLAMACPP_VERSION`.
   - Update each platform's `archiveUrl` and `archiveSha256` (real SHAs from the GitHub release page).
2. Rebuild + restart the container.
3. `BinaryService.onApplicationBootstrap` detects mismatch and re-installs.
4. Or trigger explicitly: `POST /api/v1/llamacpp/runtime/update`.

### "I want to clean up disk"

- Storage UI: `/models/local-frontier/storage` (lists every downloaded model with size and last-used).
- API: `DELETE /api/v1/llamacpp/models/:id/weights` with `{confirmName: "<name>:<tag>"}` body.
- The model must be UNLOADED first (the API refuses if resident).

### "Antivirus quarantined `llama-server.exe`"

Windows Defender (and many enterprise EPP products) flag freshly-downloaded unsigned binaries.

1. Allow path: `C:\Path\To\Claw\data\llamacpp\bin\llama-server.exe`.
2. Or add the directory:
   ```powershell
   Add-MpPreference -ExclusionPath "C:\Path\To\Claw\data\llamacpp"
   ```
3. The pinned binary's SHA-256 is in `binary-releases.constants.ts` for verification before allowing.

## Error code reference

| Code | Source | Meaning | User action |
|---|---|---|---|
| `RAM_INSUFFICIENT` | preflight | Total system RAM < `requiredRamGb` | Pick Survival quant or upgrade RAM (or use override flag if allowed) |
| `DISK_INSUFFICIENT` | preflight | Free disk < `requiredDiskGb × 1.05` | Free disk space — NOT overridable |
| `GPU_INSUFFICIENT` | preflight | Model expects GPU, none detected | Install NVIDIA driver, or use override (CPU-only fallback) |
| `BINARY_NOT_INSTALLED` | preflight / load | llama-server binary not on disk | `POST /runtime/update` |
| `RUNTIME_INCOMPATIBLE` | preflight | e.g. asking for CUDA on a CPU-only build | Reinstall correct platform binary |
| `SHA_MISMATCH` | pull | Downloaded file doesn't match HF manifest hash | Retry; if persistent, check HF for repo updates |
| `NETWORK_TIMEOUT` | pull | 5 retries exhausted | Check network, retry |
| `DISK_FULL` | pull | `ENOSPC` mid-download | Free disk, retry (resume picks up from `.partial`) |
| `USER_CANCELLED` | pull | DELETE called on running job | Re-initiate via `POST /pull-jobs/:id/retry` |
| `NO_MODEL_LOADED` | inference | `/v1/chat/completions` called, no resident model | `POST /models/:id/load` first |
| `MODEL_LOADING` | inference | Inference attempted while load is in progress | Wait for `loadStatus=READY` |
| `MODEL_CRASHED` | inference | llama-server child died | `POST /models/:id/load` to relaunch |
| `MODEL_LOAD_TIMEOUT` | lifecycle | Load exceeded `LLAMACPP_LOAD_TIMEOUT_MS` | Reduce ctxSize or nGpuLayers, retry |
| `CONFIRM_NAME_MISMATCH` | delete | confirmName body didn't match `<name>:<tag>` | Type the exact name |
| `MODEL_RESIDENT` | delete | Tried to delete weights of resident model | Unload first |
