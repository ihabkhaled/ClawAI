# Service Guide: claw-image-service

## Overview

| Property       | Value                          |
| -------------- | ------------------------------ |
| Port           | 4012                           |
| Database       | PostgreSQL (`claw_images`)     |
| ORM            | Prisma 5.22                    |
| Env prefix     | `IMAGE_`                       |
| Nginx route    | `/api/v1/images`               |

The image service orchestrates AI image generation across multiple providers (DALL-E 3, Gemini, Stable Diffusion). It manages the full lifecycle from prompt submission through generation to asset storage, with retry and fallback capabilities.

## Database Schema

### ImageGeneration

| Column             | Type                    | Notes                          |
| ------------------ | ----------------------- | ------------------------------ |
| id                 | String                  | CUID primary key               |
| userId             | String                  | Requesting user                |
| threadId           | String?                 | Associated chat thread         |
| userMessageId      | String?                 | Triggering user message        |
| assistantMessageId | String?                 | Response message ID            |
| prompt             | String                  | User's image prompt            |
| revisedPrompt      | String?                 | Provider-revised prompt        |
| provider           | String                  | IMAGE_OPENAI, IMAGE_GEMINI, IMAGE_LOCAL |
| model              | String                  | dall-e-3, gemini-2.5-flash-image, sdxl-turbo |
| width              | Int                     | Default 1024                   |
| height             | Int                     | Default 1024                   |
| quality            | String?                 | Provider-specific quality      |
| style              | String?                 | Provider-specific style        |
| status             | ImageGenerationStatus   | QUEUED through COMPLETED/FAILED|
| errorCode          | String?                 | Error identifier               |
| errorMessage       | String?                 | Human-readable error           |
| latencyMs          | Int?                    | Generation time                |

### ImageGenerationAsset

| Column      | Type   | Notes                              |
| ----------- | ------ | ---------------------------------- |
| id          | String | CUID primary key                   |
| generationId| String | FK to ImageGeneration              |
| storageKey  | String | Local storage key                  |
| url         | String | Public URL                         |
| downloadUrl | String | Direct download URL                |
| mimeType    | String | image/png, image/jpeg, etc.        |
| width       | Int?   | Actual generated width             |
| height      | Int?   | Actual generated height            |
| sizeBytes   | Int?   | File size                          |

### ImageGenerationEvent

Status change log for each generation, enabling timeline reconstruction.

## Generation Status Flow

```
QUEUED -> STARTING -> GENERATING -> FINALIZING -> COMPLETED
                                               -> FAILED
                                               -> TIMED_OUT
                                               -> CANCELLED
```

## Provider Adapters

### DALL-E 3 (OpenAI)

- Endpoint: POST `https://api.openai.com/v1/images/generations`
- Supports: text-to-image, revised prompts, quality/style parameters
- Sizes: 1024x1024, 1792x1024, 1024x1792
- Returns: base64 or URL

### Gemini Image Generation

- Endpoint: POST `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`
- Uses the `generateContent` API with image generation response modality
- Supports: text-to-image with reference images
- Returns: inline base64 image data

### Stable Diffusion (Local)

- Endpoint: POST `http://comfyui:8188/api/prompt` or SD WebUI API
- Configured via `STABLE_DIFFUSION_URL` and `COMFYUI_BASE_URL`
- Supports: txt2img, img2img
- Free, no internet required, lower quality than cloud providers

## API Endpoints

| Method | Path                    | Auth   | Description                      |
| ------ | ----------------------- | ------ | -------------------------------- |
| POST   | /                       | Bearer | Create image generation request  |
| GET    | /                       | Bearer | List user's generations          |
| GET    | /:id                    | Bearer | Get generation details + assets  |
| GET    | /:id/status             | Bearer | Poll generation status           |
| DELETE | /:id                    | Bearer | Cancel/delete generation         |

## Reference Image Support

Users can attach reference images to influence generation:

1. Images are uploaded via the file-service first
2. File IDs are passed in the generation request
3. The adapter downloads the reference image and includes it in the provider API call
4. Currently supported by Gemini (native) and Stable Diffusion (img2img)

## Retry with Model Picker

When generation fails with one provider, the service can:

1. Try an alternate model from the same provider
2. Fall back to a different provider entirely
3. As a last resort, try local Stable Diffusion

## Events

| Event          | Direction | Consumers |
| -------------- | --------- | --------- |
| image.generated| Publish   | audit     |
| image.failed   | Publish   | audit     |
