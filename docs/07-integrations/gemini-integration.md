# Google Gemini Integration Guide

## Overview

Google Gemini is ClawAI's primary cloud AI provider for multimodal tasks (vision, image analysis, file analysis, web search). ClawAI integrates via the Gemini API (`generativelanguage.googleapis.com`) for both chat completions and image generation. The connector-service manages API key configuration, and the chat-service handles execution.

## Architecture

```
Frontend (message or image request)
  → Nginx (port 4000)
    → claw-chat-service (port 4002) or claw-image-service (port 4012)
      → Gemini API (HTTPS)
        → generativelanguage.googleapis.com/v1beta
```

## API Endpoints

### Base URL

```
https://generativelanguage.googleapis.com/v1beta
```

Authentication is via API key as a query parameter: `?key=YOUR_API_KEY`

### POST /models/{model}:generateContent

The primary endpoint for chat, vision, and multimodal generation.

**Chat Request:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Explain quantum computing" }]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 4096,
    "topP": 0.95
  }
}
```

**Response:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [{ "text": "Quantum computing uses..." }],
        "role": "model"
      },
      "finishReason": "STOP",
      "safetyRatings": [...]
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 15,
    "candidatesTokenCount": 250,
    "totalTokenCount": 265
  }
}
```

**Vision Request (image analysis):**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "What is in this image?" },
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": "<base64-encoded-image>"
          }
        }
      ]
    }
  ]
}
```

### POST /models/{model}:streamGenerateContent

Streaming variant. Returns chunks as server-sent data.

```
data: {"candidates":[{"content":{"parts":[{"text":"Quantum"}]}}]}
data: {"candidates":[{"content":{"parts":[{"text":" computing"}]}}]}
data: {"candidates":[{"content":{"parts":[{"text":" uses..."}]}}],"usageMetadata":{...}}
```

### GET /models

List available models and their capabilities.

```json
{
  "models": [
    {
      "name": "models/gemini-2.5-flash",
      "displayName": "Gemini 2.5 Flash",
      "description": "Fast and versatile",
      "inputTokenLimit": 1048576,
      "outputTokenLimit": 8192,
      "supportedGenerationMethods": ["generateContent", "streamGenerateContent"]
    }
  ]
}
```

## ClawAI Integration

### Connector Configuration

Gemini is configured as a connector in the connector-service:

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| Provider     | `GEMINI`                                       |
| Base URL     | `https://generativelanguage.googleapis.com`     |
| Config       | `{ apiKey: "..." }` (AES-256-GCM encrypted)   |

### Chat Execution Flow

1. Routing decision selects Gemini (e.g., for vision or file analysis tasks)
2. Chat-service retrieves connector config (decrypts API key)
3. Builds message array with system prompt, memories, context packs, file chunks, and thread history
4. Calls `POST /models/gemini-2.5-flash:generateContent`
5. Parses response, extracts text and token counts
6. Stores ASSISTANT message with provider/model metadata

### Image Generation Flow

1. User requests image generation with Gemini provider
2. Image-service retrieves connector config
3. Sends prompt via `generateContent` with image generation instructions
4. Gemini returns generated image inline as base64
5. Image-service decodes and stores the image file

### Routing Rules

The AUTO router sends these task types to Gemini:

- Image/video analysis (vision capability)
- YouTube/web content analysis
- File/data analysis (large context window)
- Tasks requiring multimodal understanding

### Available Models

| Model              | Input Limit | Output Limit | Best For               |
| ------------------ | ----------- | ------------ | ---------------------- |
| gemini-2.5-flash   | 1M tokens   | 8K tokens    | Fast multimodal, vision|

## Rate Limits

| Tier    | RPM  | TPM       | RPD     |
| ------- | ---- | --------- | ------- |
| Free    | 15   | 1M        | 1,500   |
| Pay-go  | 2000 | 4M        | Unlimited|

ClawAI handles rate limits via the `@nestjs/throttler` middleware and connector health checks. If Gemini returns 429, the routing system falls back to alternative providers.

## Error Handling

| HTTP Status | Meaning              | ClawAI Response                    |
| ----------- | -------------------- | ---------------------------------- |
| 400         | Invalid request      | Log error, return user-facing msg  |
| 403         | API key invalid      | Mark connector unhealthy           |
| 429         | Rate limited         | Retry with backoff, then fallback  |
| 500         | Gemini server error  | Retry once, then fallback          |
| 503         | Service unavailable  | Mark connector unhealthy, fallback |

## Environment Variables

The API key is stored encrypted in the connector database, not in environment variables. The connector is created via the frontend UI at `/connectors`.

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| 403 on all requests | Invalid or expired API key | Update connector config in UI |
| "Safety" finish reason | Content blocked by safety filters | Adjust safety settings or rephrase |
| Empty response | Model returned no candidates | Check prompt, try different model |
| Slow responses (>10s) | Large input or high server load | Reduce context size, check Gemini status |
| Vision not working | Image too large or wrong format | Compress image, use JPEG/PNG |
