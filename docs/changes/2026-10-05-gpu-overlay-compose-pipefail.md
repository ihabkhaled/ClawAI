# Change - avoid SIGPIPE in GPU overlay validation

## Before

The GPU workflow piped `docker compose config --services` directly to `grep
-q`. With `pipefail`, grep's early exit could give Compose SIGPIPE and fail the
Vulkan overlay job even though the service was present.

## Change

The workflow now captures the completed Compose output before checking for
`llamacpp-service`, while retaining strict shell failure handling.

## Knowledge delta

- `.github/workflows/claw-sh-gpu-detection.yml`
- `wiki/Docker-and-DevOps-Architecture.md`
- Generated `.ai/**`, workspace `AGENTS.md`, and
  `docs/features/ai-native-engineering-os/inventory.snapshot.json`

No new rule or skill was needed; the wiki now records the `pipefail` constraint.

## Validation

- The three local Compose configurations each resolved `llamacpp-service` with
  the DB file, service file, and matching GPU overlay.
- The Compose output is assigned before `grep -q`, avoiding the early pipe
  close from the prior command.
- The updated GitHub workflow run is pending.
