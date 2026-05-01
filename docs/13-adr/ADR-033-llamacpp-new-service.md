# ADR-033 — claw-llamacpp-service is a separate microservice

**Status:** Accepted
**Date:** 2026-04-26
**Authors:** Head of Engineering, Backend Lead

## Context

ClawAI already runs Ollama via `claw-ollama-service` (port 4008, DB `claw_ollama`). Frontier open-weight LLMs (Kimi K2 1T, GLM-5.1 754B, DeepSeek V3.2 671B, DeepSeek V4 1.4T) are MIT/Modified-MIT licensed and freely downloadable, but they cannot be served effectively by Ollama:

- Ollama's daemon model is multi-resident; frontier models saturate a 256 GB box and demand single-resident.
- Ollama's quantization options don't extend to Q2_K_XL or IQ1_M needed for survival-tier frontier serving.
- Frontier weights ship as multi-shard `.gguf` from HuggingFace, not the Ollama registry.
- Hardware preflight requirements (96–512 GB RAM, NVMe required, single 24 GB GPU) are dramatically different.

A natural reaction would be to extend `claw-ollama-service` with frontier support.

## Decision

Build a new microservice — `claw-llamacpp-service` — owning catalog, downloads, binary lifecycle, model load/unload, inference proxy, and hardware preflight for frontier models. `claw-ollama-service` remains untouched and continues to own small/medium models.

## Rationale

- **Different runtime.** Ollama's daemon vs. native `llama-server` child process. Conflating them would add a runtime-selector god-class to ollama-service.
- **Different model footprint.** ≤70 GB Ollama models vs. up to 540 GB GGUF — different storage, different volume layout, different cleanup semantics.
- **Different hardware gate.** Ollama models warn on under-provisioning; frontier downloads (4-hour, 540 GB) demand a hard refusal.
- **Different routing semantics.** Routing service distinguishes `OLLAMA` runtime (LOCAL_FALLBACK_CHAT, LOCAL_REASONING, etc.) from `LLAMACPP` runtime (LOCAL_FRONTIER) — privacy decisions hinge on which runtime is loaded.
- **Codebase clarity.** Separate services keep both small and well-tested.

## Consequences

- **Easier:** clear boundaries, no god-service. Operators reason about each independently.
- **Easier:** Phase rollout (each phase touches a single service).
- **Harder:** some catalog code patterns are duplicated between services. Accepted — kept lean by sharing only what truly fits in `packages/shared-*`.
- **Required:** every infra file (7 docker-compose, nginx, env, install scripts, CI matrix, health-service aggregator) gets a new entry.

## Alternatives considered

- **Extend claw-ollama-service.** Rejected — would require introducing a runtime enum, a launcher/supervisor pair, doubled lifecycle code paths, and complicating the existing module that already has 14 routing roles to manage.
- **Subpackage inside ollama-service.** Rejected — same problem, plus DB schema fork.
- **External binary launched by ollama-service.** Rejected — Ollama daemon and llama-server have incompatible process models; one container-per-service is the cleaner boundary.
