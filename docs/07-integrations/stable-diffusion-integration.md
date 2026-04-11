# Stable Diffusion WebUI Integration Guide

## Overview

Stable Diffusion WebUI (AUTOMATIC1111/stable-diffusion-webui) provides a web interface and REST API for image generation using Stable Diffusion models. ClawAI integrates with the WebUI API as an alternative to ComfyUI for simpler image generation workflows. The `claw-image-service` dispatches to the SD WebUI API when configured.

## Architecture

```
Frontend (image generation request)
  → Nginx (port 4000)
    → claw-image-service (port 4012)
      → SD WebUI API (port 7860)
        → Stable Diffusion models on disk
```

## API Endpoints

### Base URL

- **Docker**: `http://stable-diffusion:7860`
- **Host**: `http://localhost:7860`
- **Configurable**: `STABLE_DIFFUSION_URL` environment variable

### POST /sdapi/v1/txt2img

Generate an image from a text prompt.

**Request:**
```json
{
  "prompt": "a beautiful sunset over mountains, photorealistic, 8k",
  "negative_prompt": "blurry, low quality, deformed",
  "width": 1024,
  "height": 1024,
  "steps": 20,
  "cfg_scale": 7.0,
  "sampler_name": "Euler",
  "seed": -1,
  "batch_size": 1,
  "n_iter": 1
}
```

**Response:**
```json
{
  "images": ["<base64-encoded-png>"],
  "parameters": {
    "prompt": "a beautiful sunset...",
    "steps": 20,
    "cfg_scale": 7.0,
    "seed": 42
  },
  "info": "{\"seed\": 42, \"steps\": 20, ...}"
}
```

The response returns images as base64-encoded strings. ClawAI decodes these and stores them as files.

### POST /sdapi/v1/img2img

Generate an image from an existing image plus a text prompt.

**Request:**
```json
{
  "init_images": ["<base64-encoded-png>"],
  "prompt": "make it look like a painting",
  "negative_prompt": "blurry",
  "denoising_strength": 0.75,
  "width": 1024,
  "height": 1024,
  "steps": 20,
  "cfg_scale": 7.0
}
```

### GET /sdapi/v1/sd-models

List available checkpoint models.

```json
[
  {
    "title": "sd_xl_base_1.0.safetensors",
    "model_name": "sd_xl_base_1.0",
    "hash": "abc123",
    "filename": "/models/Stable-diffusion/sd_xl_base_1.0.safetensors"
  }
]
```

### POST /sdapi/v1/options

Set the active model and other runtime options.

```json
{
  "sd_model_checkpoint": "sd_xl_base_1.0.safetensors"
}
```

### GET /sdapi/v1/progress

Check generation progress for long-running requests.

```json
{
  "progress": 0.65,
  "eta_relative": 3.5,
  "state": {
    "skipped": false,
    "interrupted": false,
    "job": "txt2img",
    "job_count": 1,
    "sampling_step": 13,
    "sampling_steps": 20
  },
  "current_image": "<base64-preview>"
}
```

## ClawAI Integration

### Image Service Adapter

The image-service uses an adapter pattern to support multiple image generation backends:

```
ImageGenerationManager
  → DallEAdapter        (OpenAI DALL-E API)
  → GeminiImageAdapter  (Google Gemini generateContent)
  → SDWebUIAdapter      (Stable Diffusion WebUI API)
  → ComfyUIAdapter      (ComfyUI workflow API)
```

### SD WebUI Adapter Flow

1. Receive generation request with prompt, dimensions, and model
2. Set the active model via `POST /sdapi/v1/options` if different from current
3. Send `POST /sdapi/v1/txt2img` with prompt and parameters
4. Decode base64 image from response
5. Store image file and create database record
6. Publish `image.generated` event

### Parameter Mapping

| ClawAI Parameter | SD WebUI Parameter | Default |
| ---------------- | ------------------ | ------- |
| `prompt`         | `prompt`           | -       |
| `negativePrompt` | `negative_prompt`  | ""      |
| `width`          | `width`            | 1024    |
| `height`         | `height`           | 1024    |
| `steps`          | `steps`            | 20      |
| `guidance`       | `cfg_scale`        | 7.0     |
| `seed`           | `seed`             | -1      |

## Docker Setup

```yaml
stable-diffusion:
  image: ghcr.io/AUTOMATIC1111/stable-diffusion-webui:latest
  ports:
    - "7860:7860"
  volumes:
    - sd_models:/app/models/Stable-diffusion
    - sd_outputs:/app/outputs
  command: --api --listen --no-half-vae
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

## Environment Variables

| Variable              | Default                           | Description       |
| --------------------- | --------------------------------- | ----------------- |
| `STABLE_DIFFUSION_URL`| `http://stable-diffusion:7860`    | SD WebUI base URL |

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `ECONNREFUSED :7860` | WebUI not running | Check container logs, restart |
| "Model not found" | Checkpoint not in models dir | Download to volume |
| CUDA OOM | Model + generation exceeds VRAM | Reduce resolution or use `--medvram` flag |
| Black images | VAE issue | Add `--no-half-vae` to command args |
| Slow (>2 min) | CPU mode | Verify GPU passthrough |
| 422 Unprocessable | Invalid parameters | Check dimensions (must be multiples of 8) |
