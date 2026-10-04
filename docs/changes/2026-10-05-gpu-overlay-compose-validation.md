# Change - validate GPU overlays with split service dependencies

## Before

The GPU detection workflow merged an overlay with the services Compose file
only. Threads generation references `pg-thread-generation`, which is declared
in the database Compose file, so the Nvidia, ROCm, and Vulkan overlay checks
failed before validating their overlays.

## Change

The workflow now supplies the database Compose file along with services and
the selected GPU overlay. Its validation remains scoped to the overlay scenario
and still checks `llamacpp-service`.

## Knowledge delta

- `.github/workflows/claw-sh-gpu-detection.yml`
- `wiki/Docker-and-DevOps-Architecture.md`
- Generated `.ai/**`, workspace `AGENTS.md`, and
  `docs/features/ai-native-engineering-os/inventory.snapshot.json`

No new rule or skill was needed; the Docker and DevOps architecture page now
records the CI Compose merge topology.

## Validation

- Dev Compose config resolved `llamacpp-service` for Nvidia, ROCm, and Vulkan
  when each overlay was merged with both DB and service files.
- The workflow CI run for the previous commit showed the same missing-DB-file
  failure in all three overlay jobs; this change adds that definition.
