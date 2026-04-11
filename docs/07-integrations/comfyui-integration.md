# ComfyUI Integration Guide

## Overview

ComfyUI is a node-based UI and API for Stable Diffusion and other diffusion models. ClawAI integrates with ComfyUI for local image generation, providing an alternative to cloud-based image APIs (DALL-E, Gemini). The `claw-image-service` (port 4012) dispatches image generation requests to ComfyUI when the selected runtime is `COMFYUI`.

## Architecture

```
Frontend (image generation UI)
  → Nginx (port 4000)
    → claw-image-service (port 4012)
      → ComfyUI API (port 8188)
        → Diffusion models on disk (checkpoints/, loras/, vae/)
```

## ComfyUI API Endpoints

### Base URL

- **Docker**: `http://comfyui:8188`
- **Host**: `http://localhost:8188`
- **Configurable**: `COMFYUI_BASE_URL` environment variable

### POST /prompt

Submits a workflow for execution. ComfyUI uses a JSON workflow format where each node is a processing step (text encoding, sampling, decoding, saving).

**Request:**
```json
{
  "prompt": {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": 42,
        "steps": 20,
        "cfg": 7.0,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1.0,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      }
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": { "ckpt_name": "flux1-dev.safetensors" }
    },
    "5": {
      "class_type": "EmptyLatentImage",
      "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": { "text": "a beautiful sunset over mountains", "clip": ["4", 1] }
    },
    "7": {
      "class_type": "CLIPTextEncode",
      "inputs": { "text": "blurry, low quality", "clip": ["4", 1] }
    },
    "8": {
      "class_type": "VAEDecode",
      "inputs": { "samples": ["3", 0], "vae": ["4", 2] }
    },
    "9": {
      "class_type": "SaveImage",
      "inputs": { "filename_prefix": "claw", "images": ["8", 0] }
    }
  }
}
```

**Response:**
```json
{
  "prompt_id": "abc-123-def",
  "number": 1,
  "node_errors": {}
}
```

### GET /history/{prompt_id}

Retrieves the execution result after the workflow completes.

```json
{
  "abc-123-def": {
    "status": { "status_str": "success", "completed": true },
    "outputs": {
      "9": {
        "images": [
          { "filename": "claw_00001_.png", "subfolder": "", "type": "output" }
        ]
      }
    }
  }
}
```

### GET /view

Retrieves a generated image by filename.

```
GET /view?filename=claw_00001_.png&type=output
Content-Type: image/png
```

### WebSocket /ws

Real-time execution progress updates. ClawAI uses this to track generation status.

```json
{"type": "status", "data": {"status": {"exec_info": {"queue_remaining": 1}}}}
{"type": "executing", "data": {"node": "3"}}
{"type": "progress", "data": {"value": 10, "max": 20}}
{"type": "executed", "data": {"node": "9", "output": {"images": [...]}}}
```

## ClawAI Workflow Templates

The image-service maintains workflow templates for different model architectures:

| Model Architecture | Template | Key Differences |
| ------------------ | -------- | --------------- |
| SDXL               | `sdxl-workflow.json` | Dual CLIP encoders, 1024x1024 default |
| SD 3.5             | `sd35-workflow.json` | MMDiT architecture, triple encoders |
| FLUX               | `flux-workflow.json` | Flow matching, single text encoder |

### Model Catalog Entries (ComfyUI Runtime)

| Catalog Name     | ComfyUI Checkpoint          | Architecture |
| ---------------- | --------------------------- | ------------ |
| FLUX.2 Dev       | `flux1-dev.safetensors`     | FLUX         |
| FLUX.1 Schnell   | `flux1-schnell.safetensors` | FLUX         |
| SD 3.5           | `sd3.5_large.safetensors`   | SD 3.5       |
| SDXL-Lightning   | `sdxl-lightning.safetensors`| SDXL         |
| Z-Image-Turbo    | `z-image-turbo.safetensors` | SDXL         |

## Docker Setup

### docker-compose.dev.ollama.yml

```yaml
comfyui:
  image: ghcr.io/ai-dock/comfyui:latest
  ports:
    - "${COMFYUI_PORT:-8188}:8188"
  volumes:
    - comfyui_models:/opt/ComfyUI/models
    - comfyui_output:/opt/ComfyUI/output
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
  environment:
    - CLI_ARGS=--listen 0.0.0.0
```

### Model Installation

Models must be placed in the correct ComfyUI subdirectory:

```
/opt/ComfyUI/models/
  checkpoints/    # Main model files (.safetensors)
  loras/          # LoRA adapters
  vae/            # VAE models
  clip/           # CLIP text encoders
  controlnet/     # ControlNet models
```

## Environment Variables

| Variable          | Default                  | Description              |
| ----------------- | ------------------------ | ------------------------ |
| `COMFYUI_BASE_URL`| `http://comfyui:8188`    | ComfyUI API base URL     |
| `COMFYUI_PORT`    | `8188`                   | ComfyUI exposed port     |

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `ECONNREFUSED :8188` | ComfyUI not running | `docker compose restart comfyui` |
| "Checkpoint not found" | Model file not in checkpoints/ | Download and place in volume |
| CUDA out of memory | Model too large for GPU VRAM | Use a smaller model or reduce resolution |
| Slow generation (>60s) | CPU mode or large model | Verify GPU passthrough with `nvidia-smi` |
| Black/corrupted images | Wrong workflow for model arch | Match workflow template to model type |
