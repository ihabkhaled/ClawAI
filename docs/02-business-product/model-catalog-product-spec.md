# Model Catalog Product Specification

## Overview

The Model Catalog is a built-in marketplace for local AI models. Users browse 30 models across 6 categories, download them with real-time progress tracking, and assign them to specialized roles that the routing engine uses for category-aware task dispatch.

---

## User Experience

### Browse Catalog

Users navigate to `/models/catalog` and see a grid/list of 30 models organized by category. Each card shows:

- Model display name and parameter count (e.g., "Qwen 2.5 Coder 32B")
- Category badge (Coding, Reasoning, Routing, etc.)
- Size in GB
- Description of capabilities
- "Recommended" badge for top picks
- Download button (or "Installed" status)

### Filters and Search

- **Category filter**: Coding, File Generation, Image Generation, Routing, Reasoning, Thinking
- **Runtime filter**: Ollama, ComfyUI
- **Status filter**: All, Installed, Not Installed
- **Search**: By model name or description

### Download Flow

1. User clicks "Download" on a catalog entry
2. System creates a PullJob (PENDING -> IN_PROGRESS)
3. Real-time SSE endpoint streams download progress (bytes downloaded / total bytes)
4. Frontend shows a progress bar with percentage and speed
5. On completion: status changes to COMPLETED, model appears in Installed Models list
6. On failure: status changes to FAILED with error message

### Cancel Download

Users can cancel an in-progress download via the active downloads panel. The PullJob is marked FAILED and partial data is cleaned up.

### Role Assignment

After downloading a model, admins can assign it to one of 7 roles:

| Role | Purpose | Default Model |
| --- | --- | --- |
| ROUTER | Makes routing decisions in AUTO mode | gemma3:4b |
| LOCAL_FALLBACK_CHAT | Default local chat model | gemma3:4b |
| LOCAL_CODING | Specialized for code tasks | (none) |
| LOCAL_REASONING | Chain-of-thought reasoning | (none) |
| LOCAL_FILE_GENERATION | Structured output for file generation | (none) |
| LOCAL_THINKING | Agentic/research/analysis tasks | (none) |
| LOCAL_IMAGE_GENERATION | Local diffusion model (ComfyUI) | (none) |

---

## Model Catalog (30 Models)

### Coding (5 models)

| Model | Params | Size | Description |
| --- | --- | --- | --- |
| Qwen 2.5 Coder 32B | 32B | 20 GB | Best local coding model, 300+ languages, matches GPT-4o on HumanEval |
| Qwen 2.5 Coder 14B | 14B | 9 GB | Sweet spot for quality vs hardware |
| Qwen 2.5 Coder 7B | 7B | 4.7 GB | Best coding model for 8-12GB VRAM |
| DeepSeek Coder V2 16B | 16B | 10 GB | Specialist in debugging and code completion |
| StarCoder2 7B | 7B | 4.5 GB | Lightweight autocomplete and code completion |

### File Generation (5 models)

| Model | Params | Size | Description |
| --- | --- | --- | --- |
| Qwen 3 7B | 7B | ~5 GB | Strong structured output for file generation |
| Llama 3.3 8B | 8B | ~5 GB | Meta's latest, good for document generation |
| Mistral Small 3 7B | 7B | ~5 GB | Fast, good for reports and templates |
| Phi-4 14B | 14B | ~9 GB | Microsoft's best for structured tasks |
| Gemma 3 9B | 9B | ~6 GB | Google's model, balanced quality and speed |

### Image Generation (5 models)

| Model | Runtime | Description |
| --- | --- | --- |
| FLUX.2 Dev | ComfyUI | High-quality image generation |
| FLUX.1 Schnell | ComfyUI | Fast image generation |
| SD 3.5 | ComfyUI | Stable Diffusion 3.5, versatile |
| SDXL-Lightning | ComfyUI | Ultra-fast SDXL variant |
| Z-Image-Turbo | ComfyUI | Optimized for speed |

### Routing (5 models)

| Model | Params | Size | Description |
| --- | --- | --- | --- |
| Qwen 3 1.7B | 1.7B | ~1.2 GB | Ultra-lightweight router |
| Phi-4-mini 3.8B | 3.8B | ~2.5 GB | Microsoft's efficient small model |
| SmolLM2 1.7B | 1.7B | ~1.1 GB | Tiny but capable for classification |
| Gemma 3 4B | 4B | ~3.3 GB | Current default router model |
| Mistral Small 3 7B | 7B | ~5 GB | Higher quality routing decisions |

### Reasoning (5 models)

| Model | Params | Size | Description |
| --- | --- | --- | --- |
| DeepSeek R1 32B | 32B | ~20 GB | Best local reasoning, chain-of-thought |
| DeepSeek R1 14B | 14B | ~9 GB | Strong reasoning in smaller footprint |
| DeepSeek R1 7B | 7B | ~5 GB | Compact reasoning model |
| QwQ 32B | 32B | ~20 GB | Alibaba's reasoning specialist |
| Phi-4 14B | 14B | ~9 GB | Microsoft reasoning model |

### Thinking (5 models)

| Model | Params | Size | Description |
| --- | --- | --- | --- |
| GLM-4.7 Thinking | -- | -- | Zhipu's thinking model |
| DeepSeek V3.2 | -- | -- | Latest DeepSeek general model |
| MiMo-V2-Flash | -- | -- | Fast thinking model |
| Qwen 3.5 27B | 27B | -- | Alibaba's latest thinking model |
| Llama 4 Maverick | -- | -- | Meta's latest agentic model |

---

## API Endpoints

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/v1/ollama/catalog` | GET | Yes | Browse catalog with category, search, pagination |
| `/api/v1/ollama/catalog/:id` | GET | Yes | Single catalog entry details |
| `/api/v1/ollama/catalog/:id/pull` | POST | Yes | Start downloading a model |
| `/api/v1/ollama/pull-jobs` | GET | Yes | List active/recent downloads |
| `/api/v1/ollama/pull-jobs/:id/progress` | GET (SSE) | Yes | Real-time download progress stream |
| `/api/v1/ollama/pull-jobs/:id` | DELETE | Yes | Cancel an active download |
| `/api/v1/ollama/models` | GET | Yes | List installed models |
| `/api/v1/ollama/assign-role` | POST | Yes | Assign a role to an installed model |

---

## Integration with Routing

When a model is installed and assigned a role, the routing engine's dynamic prompt builder:

1. Fetches installed models from ollama-service internal API (`/internal/ollama/installed-models`)
2. Groups models by category
3. Builds the router prompt listing only healthy, installed models
4. Caches the prompt for 5 minutes (invalidated on MODEL_PULLED/MODEL_DELETED events)

This means the routing intelligence automatically adapts to the available local models. If a user installs Qwen 2.5 Coder 32B and assigns it as LOCAL_CODING, coding tasks in LOCAL_ONLY mode will use it instead of the default gemma3:4b.

---

## Data Model

### ModelCatalogEntry (PostgreSQL)

```
id:              UUID
name:            String       (e.g., "qwen2.5-coder")
tag:             String       (e.g., "32b")
displayName:     String       (e.g., "Qwen 2.5 Coder 32B")
category:        Enum         (CODING, FILE_GENERATION, IMAGE_GENERATION, ROUTING, REASONING, THINKING)
description:     String
sizeBytes:       BigInt
parameterCount:  String       (e.g., "32B")
runtime:         String       (OLLAMA, COMFYUI)
ollamaName:      String       (e.g., "qwen2.5-coder:32b")
isRecommended:   Boolean
capabilities:    String[]     (e.g., ["code_generation", "debugging"])
createdAt:       DateTime
updatedAt:       DateTime
```

### PullJob (PostgreSQL)

```
id:              UUID
catalogEntryId:  UUID
modelName:       String
status:          Enum         (PENDING, IN_PROGRESS, COMPLETED, FAILED)
totalBytes:      BigInt?
downloadedBytes: BigInt?
error:           String?
createdAt:       DateTime
updatedAt:       DateTime
```

---

## Hardware Requirements

| Category | Minimum VRAM | Recommended VRAM |
| --- | --- | --- |
| Routing models (1.7B-4B) | 4 GB | 6 GB |
| Coding 7B / Reasoning 7B | 8 GB | 12 GB |
| Coding 14B / Reasoning 14B | 12 GB | 16 GB |
| Coding 32B / Reasoning 32B | 20 GB | 24 GB |
| Image Generation (ComfyUI) | 8 GB | 12 GB |

Models can run on CPU with reduced performance. GPU acceleration requires NVIDIA CUDA or Apple Metal.
