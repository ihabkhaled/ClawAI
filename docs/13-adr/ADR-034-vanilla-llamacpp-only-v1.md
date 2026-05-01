# ADR-034 — Vanilla `llama.cpp` only in v1.0

**Status:** Accepted
**Date:** 2026-04-26
**Authors:** Head of Engineering

## Context

Three actively-maintained engines run `.gguf` frontier MoE models:

1. **Vanilla `llama.cpp`** — `llama-server` from `ggerganov/llama.cpp`, prebuilt binaries for every Windows/Linux/Mac × CUDA/Vulkan/Metal/CPU combination, published with checksums on GitHub Releases.
2. **`ik_llama.cpp`** — community fork by `ikawrakow` with MoE-specific kernels; benchmarks show 2–3× faster decode on Kimi/DSV3 at the same quant.
3. **KTransformers** — Python-based, MoE-optimized, even faster on some workloads but requires a Python runtime alongside Node.

## Decision

Ship vanilla `llama-server` only in v1.0. Defer backend selection (vanilla / ik_llama.cpp / KTransformers) to v1.1.

## Rationale

- **Cross-platform binaries.** Vanilla llama.cpp publishes signed/checksummed releases for all 8 platform combinations; `ik_llama.cpp` does not (would force shipping a CMake build pipeline inside the container or asking users to compile).
- **No new runtime dependency.** KTransformers needs Python 3.11+, virtual envs, and a separate launcher. ClawAI ships Node-only services today; adding Python materially increases container size and breaks our hot-reload story.
- **Adequate first-cut quality.** Vanilla decode at 7–14 tps on a 4090 + 384 GB DDR5 is "noticeable but usable" for the Q4 frontier models. v1.0 ships; v1.1 wins back the missing 2×.
- **Time-to-market.** Backend selection is a feature; shipping nothing while we build it would block the entire Local Frontier rollout.

## Consequences

- **Slower decode** than is achievable on Kimi/DSV3 — accepted with a UI hint ("ik_llama.cpp v1.1 will speed this up").
- **Simpler binary lifecycle** in v1: one platform → one URL → one SHA → one extract path.
- v1.1 will add a `BackendSelector` module and per-backend `BinaryReleaseRepository` rows.

## Alternatives considered

- **Ship ik_llama.cpp from day 1.** Rejected — no prebuilt cross-platform binaries; CMake-in-container balloons the image and slows cold start.
- **Ship KTransformers.** Rejected — Python runtime dependency; conflict with the Node-only operating model.
