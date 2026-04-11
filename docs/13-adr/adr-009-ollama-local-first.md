# ADR-009: Ollama as Local-First AI Runtime

## Status

Accepted (2025-Q1)

## Context

ClawAI's core value proposition is local-first AI orchestration. Users should be able to run AI models on their own hardware without sending data to cloud providers. This requires a local model runtime that can:

- Run open-source LLMs (Llama, Gemma, Phi, etc.) on consumer hardware
- Provide an HTTP API compatible with the existing service architecture
- Manage model downloads, storage, and lifecycle
- Support multiple models simultaneously
- Run in Docker alongside the rest of the stack

## Decision

Use Ollama as the primary local AI runtime. Ollama provides a Docker-compatible HTTP API for model management and text generation, runs on CPU and GPU, and supports a broad catalog of open-source models.

### Integration Architecture

```
claw-ollama-service (NestJS, port 4008)
  → Ollama runtime (HTTP API, port 11434)
    → Local models on disk (~2-30 GB each)
```

### Key Integration Points

| Ollama API Endpoint | ClawAI Usage                                  |
| ------------------- | --------------------------------------------- |
| `GET /api/tags`     | Sync installed models to database             |
| `POST /api/pull`    | Download models (streaming progress via SSE)  |
| `POST /api/generate`| Text generation for chat, routing, extraction |
| `DELETE /api/delete` | Remove models from disk                      |
| `GET /`             | Health check                                  |

### Default Models (auto-pulled on startup)

| Model       | Size  | Role                          |
| ----------- | ----- | ----------------------------- |
| gemma3:4b   | 3.3GB | Default chat + routing        |
| llama3.2:3b | 2.0GB | Reasoning                     |
| phi3:mini   | 2.2GB | Coding + math                 |
| gemma2:2b   | 1.6GB | Fast general purpose          |
| tinyllama   | 637MB | Routing fallback (ultra-fast) |

## Consequences

### Positive

- **Privacy**: All data stays on the user's machine. No API keys, no cloud dependency, no data leaving the network.
- **Cost**: After initial model download, inference is free. No per-token charges.
- **Broad model support**: Ollama supports 100+ models from the Ollama model library. Users can pull any model.
- **Docker native**: Ollama provides official Docker images with GPU passthrough support.
- **Simple API**: REST-based HTTP API. No gRPC, no custom protocols.
- **Model management**: Built-in model download, storage, and lifecycle management.

### Negative

- **Hardware requirements**: Running local models requires significant RAM (8+ GB) and benefits greatly from a GPU. Not viable on low-end machines.
- **Inference speed**: Local inference on CPU is 5-50x slower than cloud APIs. Acceptable for the privacy trade-off.
- **No streaming in current integration**: The ClawAI chat execution manager uses non-streaming generation for simplicity. Streaming could be added later.
- **Single runtime**: Ollama is a single process. If it crashes, all local model inference stops. Mitigated by health checks and automatic restart in Docker.
- **Model storage**: Models consume significant disk space (2-30 GB each). Users must manage available storage.

## Alternatives Considered

### llama.cpp Direct

The C++ inference engine that Ollama wraps. Running llama.cpp directly provides maximum control over inference parameters and memory management. However, it lacks an HTTP API, model management, and Docker integration out of the box. Rejected for insufficient developer experience.

### vLLM

High-performance inference server optimized for throughput with PagedAttention. Excellent for production GPU deployments but requires NVIDIA GPU with CUDA, uses more memory, and is more complex to configure. Rejected because ClawAI targets consumer hardware, including CPU-only setups.

### LocalAI

OpenAI-compatible local inference API. Similar to Ollama but with broader backend support (llama.cpp, whisper, stable diffusion). However, LocalAI's Docker images are larger, setup is more complex, and the project has fewer contributors. Rejected for inferior developer experience.

### LM Studio

Desktop application for running local models with a GUI. Provides an OpenAI-compatible API. However, it is a desktop application (not suited for Docker deployment), closed-source, and targets end users rather than developers. Rejected because ClawAI needs a headless, Docker-native runtime.
