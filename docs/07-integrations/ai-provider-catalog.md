# AI Provider Catalog

## Overview

ClawAI integrates with 5 AI providers for text generation and 4 providers for image generation. This document provides a comparative reference across all providers, covering models, capabilities, pricing tiers, API patterns, and routing recommendations.

## Provider Comparison Matrix

### Text Generation

| Provider     | Type  | Models                    | Context  | Streaming | Vision | Tools | Privacy  | Cost       | Latency |
| ------------ | ----- | ------------------------- | -------- | --------- | ------ | ----- | -------- | ---------- | ------- |
| OpenAI       | Cloud | gpt-4o, gpt-4o-mini      | 128K     | Yes       | Yes    | Yes   | CLOUD    | STANDARD   | LOW     |
| Anthropic    | Cloud | claude-sonnet-4, claude-opus-4 | 200K | Yes       | Yes    | Yes   | CLOUD    | HIGH       | MEDIUM  |
| Gemini       | Cloud | gemini-2.5-flash          | 1M       | Yes       | Yes    | Yes   | CLOUD    | LOW        | LOW     |
| DeepSeek     | Cloud | deepseek-chat             | 128K     | Yes       | No     | Yes   | CLOUD    | LOW        | MEDIUM  |
| Local Ollama | Local | 25+ models (catalog)      | 4K-128K  | No*       | No     | No    | LOCAL    | FREE       | VARIABLE|

*Ollama supports streaming but ClawAI currently uses non-streaming mode.

### Image Generation

| Provider          | Type  | Models                  | Max Resolution | Formats | Cost    |
| ----------------- | ----- | ----------------------- | -------------- | ------- | ------- |
| OpenAI (DALL-E)   | Cloud | dall-e-3                | 1792x1024      | PNG     | $0.04+  |
| Gemini            | Cloud | gemini-2.5-flash        | 1024x1024      | PNG     | Varies  |
| SD WebUI          | Local | SDXL, SD 3.5            | Unlimited*     | PNG     | FREE    |
| ComfyUI           | Local | FLUX, SDXL, SD 3.5      | Unlimited*     | PNG     | FREE    |

*Limited by GPU VRAM.

## Provider Details

### OpenAI

**Best for**: Creative writing, casual chat, low-latency responses

**API Pattern**: REST, JSON request/response, Bearer token auth

**Models:**

| Model       | Context | Output | Input $/1M | Output $/1M | Notes          |
| ----------- | ------- | ------ | ---------- | ----------- | -------------- |
| gpt-4o      | 128K    | 16K    | $2.50      | $10.00      | Flagship       |
| gpt-4o-mini | 128K    | 16K    | $0.15      | $0.60       | Fast and cheap |

**Routing triggers**: Creative tasks, general chat, quick questions

### Anthropic

**Best for**: Coding, deep reasoning, complex analysis, architecture decisions

**API Pattern**: REST, JSON, `x-api-key` header auth

**Models:**

| Model          | Context | Output | Input $/1M | Output $/1M | Notes              |
| -------------- | ------- | ------ | ---------- | ----------- | ------------------ |
| claude-sonnet-4| 200K    | 8K     | $3.00      | $15.00      | Best for coding    |
| claude-opus-4  | 200K    | 8K     | $15.00     | $75.00      | Best for reasoning |

**Routing triggers**: Code generation, debugging, code review, architecture, complex analysis

### Google Gemini

**Best for**: Multimodal tasks, vision, large document analysis, web content

**API Pattern**: REST, JSON, API key as query parameter

**Models:**

| Model            | Context | Output | Input $/1M | Output $/1M | Notes               |
| ---------------- | ------- | ------ | ---------- | ----------- | -------------------- |
| gemini-2.5-flash | 1M      | 8K     | $0.075     | $0.30       | Huge context, vision |

**Routing triggers**: Image analysis, YouTube content, file analysis, web search, multimodal

### DeepSeek

**Best for**: Math, algorithms, code with strong reasoning

**API Pattern**: OpenAI-compatible REST API

**Models:**

| Model         | Context | Output | Input $/1M | Output $/1M | Notes          |
| ------------- | ------- | ------ | ---------- | ----------- | -------------- |
| deepseek-chat | 128K    | 8K     | $0.14      | $0.28       | Very cheap     |

**Routing triggers**: Math problems, algorithms, cost-sensitive tasks

### Local Ollama

**Best for**: Privacy-sensitive tasks, offline usage, cost-free inference

**API Pattern**: REST, JSON, no auth (local only)

**Default Models:**

| Model       | Params | Size  | Role                  |
| ----------- | ------ | ----- | --------------------- |
| gemma3:4b   | 4B     | 3.3GB | Default chat + router |
| llama3.2:3b | 3B     | 2.0GB | Reasoning             |
| phi3:mini   | 3.8B   | 2.2GB | Coding + math         |
| gemma2:2b   | 2B     | 1.6GB | Fast general purpose  |
| tinyllama   | 1.1B   | 637MB | Router fallback       |

**Catalog models** (30 total): See CLAUDE.md Model Catalog section.

**Routing triggers**: Privacy-sensitive content, simple Q&A, translations, when all cloud providers are unavailable

## Routing Decision Matrix

The AUTO router uses this priority when selecting a provider:

| Task Type              | Primary Choice          | Fallback 1            | Fallback 2      |
| ---------------------- | ----------------------- | --------------------- | --------------- |
| Coding/debugging       | Anthropic/claude-sonnet-4| Local coding model   | OpenAI/gpt-4o   |
| Deep reasoning         | Anthropic/claude-opus-4  | Local reasoning model| Gemini           |
| Vision/multimodal      | Gemini/gemini-2.5-flash | OpenAI/gpt-4o        | N/A             |
| Creative writing       | OpenAI/gpt-4o-mini      | Gemini               | Local            |
| Simple Q&A             | Local/gemma3:4b          | OpenAI/gpt-4o-mini   | Gemini           |
| Privacy-sensitive      | Local/gemma3:4b          | N/A (never cloud)    | N/A             |
| Math/algorithms        | DeepSeek/deepseek-chat   | Local/phi3:mini      | Anthropic        |
| File/data analysis     | Gemini/gemini-2.5-flash | Anthropic             | OpenAI           |

## API Authentication Comparison

| Provider  | Auth Method                 | Header/Param                          |
| --------- | --------------------------- | ------------------------------------- |
| OpenAI    | Bearer token                | `Authorization: Bearer sk-...`        |
| Anthropic | API key header              | `x-api-key: sk-ant-...`              |
| Gemini    | Query parameter             | `?key=AIza...`                        |
| DeepSeek  | Bearer token (OpenAI compat)| `Authorization: Bearer sk-...`        |
| Ollama    | None (local only)           | N/A                                   |

## Common API Response Patterns

All cloud providers return similar structures. ClawAI normalizes responses in the chat-execution manager:

```typescript
// Normalized response (internal)
{
  content: string;          // Generated text
  inputTokens: number;      // Prompt token count
  outputTokens: number;     // Completion token count
  provider: Provider;        // Which provider was used
  model: string;            // Which model was used
  latencyMs: number;        // Round-trip time
}
```

## Cost Estimation

For a typical workload of 1000 messages/day with average 500 input + 200 output tokens:

| Provider             | Daily Cost | Monthly Cost |
| -------------------- | ---------- | ------------ |
| OpenAI gpt-4o-mini   | $0.20      | $6           |
| Gemini 2.5 Flash     | $0.10      | $3           |
| DeepSeek             | $0.13      | $4           |
| OpenAI gpt-4o        | $3.25      | $98          |
| Anthropic Claude Sonnet | $3.50   | $105         |
| Anthropic Claude Opus | $18.25    | $548         |
| Local Ollama         | $0         | $0           |
