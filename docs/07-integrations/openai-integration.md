# OpenAI Integration Guide

## Overview

OpenAI provides GPT-series models and DALL-E image generation. ClawAI integrates via the OpenAI Chat Completions API for text generation and the Images API for image generation. The connector-service manages API key configuration, and the chat-service/image-service handle execution.

## Architecture

```
Frontend (message or image request)
  → Nginx (port 4000)
    → claw-chat-service (port 4002) or claw-image-service (port 4012)
      → OpenAI API (HTTPS)
        → api.openai.com/v1
```

## API Endpoints

### Base URL

```
https://api.openai.com/v1
```

Authentication: `Authorization: Bearer sk-...`

### POST /chat/completions

The primary endpoint for text generation.

**Request:**
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain quantum computing." }
  ],
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": false
}
```

**Response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1705300000,
  "model": "gpt-4o-2025-01-01",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum computing uses..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175
  }
}
```

### POST /images/generations (DALL-E)

Generate images from text prompts.

**Request:**
```json
{
  "model": "dall-e-3",
  "prompt": "A beautiful sunset over mountains, photorealistic",
  "size": "1024x1024",
  "quality": "standard",
  "n": 1,
  "response_format": "b64_json"
}
```

**Response:**
```json
{
  "created": 1705300000,
  "data": [
    {
      "b64_json": "<base64-encoded-png>",
      "revised_prompt": "A breathtaking photorealistic sunset..."
    }
  ]
}
```

### GET /models

List available models.

```json
{
  "data": [
    { "id": "gpt-4o", "object": "model", "owned_by": "openai" },
    { "id": "gpt-4o-mini", "object": "model", "owned_by": "openai" },
    { "id": "dall-e-3", "object": "model", "owned_by": "openai" }
  ]
}
```

## ClawAI Integration

### Connector Configuration

| Field    | Value                                          |
| -------- | ---------------------------------------------- |
| Provider | `OPENAI`                                       |
| Base URL | `https://api.openai.com/v1`                    |
| Config   | `{ apiKey: "sk-..." }` (AES-256-GCM encrypted)|

### Chat Execution Flow

1. Routing decision selects OpenAI (e.g., for creative writing or low-latency tasks)
2. Chat-service retrieves connector config, decrypts API key
3. Builds messages array: system prompt + memories + context + history
4. Calls `POST /chat/completions` with the OpenAI SDK format
5. Parses response, extracts content and token usage
6. Stores ASSISTANT message with provider=OPENAI, model=gpt-4o

### Routing Rules

The AUTO router sends these task types to OpenAI:

- Creative writing, storytelling
- General chat, casual conversation
- Tasks requiring low latency (gpt-4o-mini)

### Available Models

| Model       | Context  | Output  | Best For             | Cost Class |
| ----------- | -------- | ------- | -------------------- | ---------- |
| gpt-4o      | 128K     | 16K     | General purpose      | STANDARD   |
| gpt-4o-mini | 128K     | 16K     | Fast, cheap          | LOW        |

### Image Generation (DALL-E Adapter)

The image-service uses the DALL-E adapter for OpenAI image generation:

1. User submits image generation request with provider=OPENAI
2. Image-service calls `POST /images/generations` with DALL-E 3
3. Decodes base64 response and stores image file
4. Creates database record with generation metadata
5. Publishes `image.generated` event

### Parameter Mapping

| ClawAI Parameter  | OpenAI Chat Parameter | OpenAI Image Parameter |
| ----------------- | --------------------- | ---------------------- |
| `prompt`/`content`| `messages[].content`  | `prompt`               |
| `temperature`     | `temperature`         | N/A                    |
| `maxTokens`       | `max_tokens`          | N/A                    |
| `width x height`  | N/A                   | `size` ("1024x1024")   |

## Error Handling

| HTTP Status | Meaning               | ClawAI Response                   |
| ----------- | --------------------- | --------------------------------- |
| 401         | Invalid API key       | Mark connector unhealthy          |
| 429         | Rate limited          | Retry with backoff, then fallback |
| 500         | OpenAI server error   | Retry once, then fallback         |
| 503         | Service overloaded    | Fallback to alternative provider  |

## Rate Limits

OpenAI rate limits vary by tier and model. ClawAI handles 429 responses with exponential backoff (up to 3 retries) before falling back to alternative providers.

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| 401 Unauthorized | Invalid/revoked API key | Update connector config |
| "insufficient_quota" | Billing limit reached | Add credits to OpenAI account |
| Slow responses | Large context or server load | Reduce context window, use gpt-4o-mini |
| Content filtered | OpenAI safety filter triggered | Rephrase prompt |
| DALL-E 400 error | Invalid size or prompt too long | Use supported sizes: 1024x1024, 1792x1024, 1024x1792 |
