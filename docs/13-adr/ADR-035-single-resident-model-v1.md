# ADR-035 — Single resident frontier model in v1.0

**Status:** Accepted
**Date:** 2026-04-26
**Authors:** Backend Lead, Principal Developers

## Context

A user could plausibly want both Kimi K2 (coding) and GLM-5.1 (thinking) loaded simultaneously, switching the router target per message. With Ollama, that's the daemon's job (`OLLAMA_MAX_LOADED_MODELS`). With llama-server, each model is a separate child process; concurrent residency means concurrent processes — and concurrent RAM/GPU/disk-cache contention.

## Decision

In v1.0, only one frontier model is resident at a time. Loading a second auto-unloads the first. Concurrent multi-resident is deferred to v1.2.

## Rationale

- **RAM pressure.** A single Q4_K_M frontier model (200–540 GB on disk, 192–384 GB resident) already saturates a 256 GB workstation. Two resident models would force OOM or aggressive swap.
- **GPU contention.** With one 24 GB GPU, two models fight over offload layers; the router would need to pick which gets the GPU per request — significant added complexity.
- **UX simplicity.** "Currently loaded: GLM-5.1" is unambiguous. Multi-resident requires a new "active model per request" concept that frontend must surface.
- **Mutex correctness.** A single global `lifecycleMutex` (in `ModelsLifecycleService`) is straightforward to reason about and test. Multi-mutex coordination is a separate engineering exercise.

## Consequences

- **Easy:** load/unload semantics are simple and predictable.
- **Tradeoff:** users who want to A/B-compare models pay a load+unload cycle (~30s) per swap.
- **Foreshadowed v1.2:** the schema already includes `RuntimeConfig` per model (not per-slot), so a future multi-slot model fits without breaking changes.

## Alternatives considered

- **N concurrent slots from day 1.** Rejected — RAM/GPU contention, mutex coordination, and frontend slot picker UX are all v1.2-scope work.
- **Hot model swap (warm-cache).** Rejected — llama.cpp doesn't expose a warm-swap API; cold load + unload is the only reliable path.
