# Technical Capabilities Overview

## Overview

This document summarizes ClawAI's technical capabilities for business stakeholders. It covers what the platform can do, how many models and providers it supports, and the key technical differentiators.

---

## Platform Scale

| Metric | Value |
| --- | --- |
| Backend services | 13 NestJS microservices |
| Frontend | Next.js 16 with React 19 |
| PostgreSQL databases | 9 |
| MongoDB databases | 3 |
| Cloud AI providers | 5 (OpenAI, Anthropic, Google Gemini, DeepSeek, xAI) |
| Local AI models (catalog) | 30 across 6 categories |
| Pre-installed local models | 5 (auto-pulled on startup) |
| Routing modes | 7 |
| Supported languages (UI) | 8 (including Arabic RTL) |
| File generation formats | 7 (PDF, DOCX, CSV, HTML, MD, TXT, JSON) |
| Image generation providers | 3 (DALL-E, Gemini, Stable Diffusion) |
| Audit event types | 10 |
| Frontend pages | 17 |

---

## AI Provider Capabilities

### Cloud Providers

| Provider | Models | Strengths | Authentication |
| --- | --- | --- | --- |
| OpenAI | GPT-4o, GPT-4o-mini | Fast general purpose, creative writing | API key |
| Anthropic | Claude Opus 4, Claude Sonnet 4 | Coding, deep reasoning, analysis | API key |
| Google Gemini | Gemini 2.5 Flash, Gemini 2.5 Pro | Multimodal, data analysis, image generation | API key |
| DeepSeek | DeepSeek Chat | Math, algorithms, coding (low cost) | API key |
| xAI | Grok models | General purpose | API key |

### Local Models (Pre-Installed)

| Model | Parameters | Size | Best For |
| --- | --- | --- | --- |
| gemma3:4b | 4B | 3.3 GB | Default chat + routing |
| llama3.2:3b | 3B | 2.0 GB | Local reasoning |
| phi3:mini | 3.8B | 2.2 GB | Coding and math |
| gemma2:2b | 2B | 1.6 GB | Fast general purpose |
| tinyllama | 1.1B | 637 MB | Very fast, routing fallback |

### Model Catalog (30 Models Available for Download)

| Category | Count | Notable Models |
| --- | --- | --- |
| Coding | 5 | Qwen 2.5 Coder (7B/14B/32B), DeepSeek Coder V2, StarCoder2 |
| File Generation | 5 | Qwen 3 7B, Llama 3.3 8B, Mistral Small 3, Phi-4, Gemma 3 9B |
| Image Generation | 5 | FLUX.2 Dev, FLUX.1 Schnell, SD 3.5, SDXL-Lightning |
| Routing | 5 | Qwen 3 1.7B, Phi-4-mini, SmolLM2, Gemma 3 4B, Mistral Small 3 |
| Reasoning | 5 | DeepSeek R1 (7B/14B/32B), QwQ 32B, Phi-4 14B |
| Thinking | 5 | GLM-4.7 Thinking, DeepSeek V3.2, MiMo-V2-Flash, Qwen 3.5 27B |

---

## Intelligent Routing

### 7 Routing Modes

| Mode | When to Use | Cost | Privacy |
| --- | --- | --- | --- |
| AUTO | Default -- system selects best model | Variable | Variable |
| MANUAL_MODEL | User knows which model they want | Variable | Variable |
| LOCAL_ONLY | Sensitive data, no cloud access | Free | Maximum |
| PRIVACY_FIRST | Prefer local, cloud as fallback | Low | High |
| LOW_LATENCY | Need fastest response | Low | Cloud |
| HIGH_REASONING | Complex analysis, architecture | High | Cloud |
| COST_SAVER | Minimize spending | Lowest | Prefer local |

### AUTO Mode Intelligence

- Analyzes message content using 64 keyword patterns
- Ollama-powered classification with Zod-validated output
- 10-second timeout with deterministic heuristic fallback
- Dynamic prompt built from currently installed models
- Fallback chain: Primary -> Fallback -> Local Ollama -> Error

### Category Detection Keywords

| Category | Keywords | Routes To |
| --- | --- | --- |
| Coding (28 keywords) | code, debug, function, refactor, typescript, etc. | Anthropic Claude Sonnet |
| Reasoning (21 keywords) | prove, solve, analyze, theorem, etc. | Anthropic Claude Opus |
| Thinking (15 keywords) | research, investigate, compare, evaluate, etc. | DeepSeek or local |
| Image (90+ keywords) | generate image, draw, paint, sketch, etc. | Gemini Image |
| File generation | create PDF, export CSV, save as, etc. | File generation service |

---

## Memory & Knowledge Management

| Feature | Capability |
| --- | --- |
| Automatic extraction | FACT, PREFERENCE, INSTRUCTION, SUMMARY from every conversation |
| Deduplication | Semantic similarity check prevents redundant memories |
| Context packs | Curated knowledge collections attached to threads |
| Memory CRUD | Create, read, update, enable/disable, delete |
| Context assembly | Memories + packs + files + history combined in every prompt |
| Token budget | Automatic truncation preserving most important context |

---

## Security Capabilities

| Feature | Technology | Detail |
| --- | --- | --- |
| Authentication | JWT + refresh token rotation | 15-min access, 7-day refresh, single-use rotation |
| Authorization | RBAC (3 roles) | ADMIN, OPERATOR, VIEWER with per-endpoint enforcement |
| Password hashing | argon2id | Memory-hard, GPU-resistant |
| API key encryption | AES-256-GCM | 256-bit key, random IV, integrity verification |
| Input validation | Zod schemas | Every field has type, length, and format constraints |
| Rate limiting | @nestjs/throttler | 100 req/min default, per-endpoint overrides |
| Security headers | Helmet | HSTS, CSP, X-Frame-Options, and more |
| Log redaction | Pino | 7 sensitive field patterns automatically redacted |
| Request correlation | X-Request-ID | End-to-end tracing from frontend to all services |

---

## File Capabilities

### File Upload & Analysis
- Supported formats: JSON, CSV, Markdown, plain text
- Automatic chunking for context injection
- Chunks included in AI prompt via context assembly

### File Generation
- 7 output formats: PDF, DOCX, CSV, HTML, Markdown, TXT, JSON
- Two-phase approach: LLM content generation + format adapter conversion

### Image Generation
- 3 providers: DALL-E 3, Gemini 2.5 Flash Image, local Stable Diffusion
- Reference image support (generate variations)
- Multi-provider fallback

---

## Observability

| Capability | Implementation |
| --- | --- |
| Health monitoring | Aggregated health check across all 13 services |
| Audit logging | 10 event types, immutable MongoDB logs |
| Usage tracking | Token consumption, cost, latency per provider/model/user |
| Server logs | Centralized with 30-day retention |
| Client logs | Frontend log ingestion with 30-day retention |
| Request tracing | X-Request-ID correlation across all services |

---

## Deployment

| Aspect | Capability |
| --- | --- |
| Installation | Single command (`docker compose up`) |
| Containers | ~22 (13 services + databases + infrastructure) |
| Hot reload | Source changes auto-detected (Node --watch) |
| CI/CD | GitHub Actions (lint -> typecheck -> test -> build) |
| Pre-commit | 5-step quality gate (format, lint, type-check, build, test) |
| Configuration | Single `.env` file for everything |
| Scripts | Automated install (Linux/macOS/Windows), service management |
