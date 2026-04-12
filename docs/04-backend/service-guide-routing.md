# Service Guide: claw-routing-service

## Overview

| Property       | Value                          |
| -------------- | ------------------------------ |
| Port           | 4004                           |
| Database       | PostgreSQL (`claw_routing`)    |
| ORM            | Prisma 5.20                    |
| Env prefix     | `ROUTING_`                     |
| Nginx route    | `/api/v1/routing/*`            |

The routing service decides which AI provider and model should handle each user message. It supports 7 routing modes, uses Ollama for intelligent AUTO routing, and maintains a history of routing decisions.

## Database Schema

### RoutingDecision

| Column           | Type         | Notes                             |
| ---------------- | ------------ | --------------------------------- |
| id               | String       | CUID primary key                  |
| messageId        | String?      | Associated message                |
| threadId         | String       | Thread context                    |
| selectedProvider | String       | Chosen provider (e.g., ANTHROPIC) |
| selectedModel    | String       | Chosen model (e.g., claude-sonnet-4) |
| routingMode      | RoutingMode  | Mode used for this decision       |
| confidence       | Decimal?     | 0.0-1.0 confidence score          |
| reasonTags       | String[]     | Why this route was chosen         |
| privacyClass     | String?      | Privacy classification            |
| costClass        | String?      | Cost classification               |
| fallbackProvider | String?      | Backup provider if primary fails  |
| fallbackModel    | String?      | Backup model                      |

### RoutingPolicy

| Column      | Type        | Notes                              |
| ----------- | ----------- | ---------------------------------- |
| id          | String      | CUID primary key                   |
| name        | String      | Policy name                        |
| routingMode | RoutingMode | Which mode this policy applies to  |
| priority    | Int         | Higher priority = evaluated first  |
| isActive    | Boolean     | Soft enable/disable                |
| config      | Json        | Mode-specific configuration        |

## 7 Routing Modes

| Mode           | Logic                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| AUTO           | Dynamic prompt + category keywords + Ollama router + heuristic fallback|
| MANUAL_MODEL   | User explicitly selects provider + model (forcedProvider/forcedModel)   |
| LOCAL_ONLY     | Category-aware: coding tasks go to LOCAL_CODING model, reasoning to LOCAL_REASONING, else gemma3:4b |
| PRIVACY_FIRST  | Local if Ollama healthy; else Anthropic (most privacy-conscious cloud) |
| LOW_LATENCY    | Routes to OpenAI gpt-4o-mini for fastest responses                    |
| HIGH_REASONING | Routes to Anthropic claude-opus-4 for deep analysis                   |
| COST_SAVER     | Local if healthy; else cheapest cloud model                           |

## AUTO Mode Deep Dive

AUTO mode is the most complex. It follows a 5-stage pipeline where each stage can short-circuit:

1. **Privacy enforcement** -- 30 privacy keywords scanned; if ANY match, forces local routing (no cloud fallback)
2. **Image detection** -- 70+ exact keywords + 5 detection layers (verb+noun combo, art styles, reference-based, strong nouns)
3. **File generation detection** -- 7 exact phrases + 9 verbs x 18 format words = 162 combinations
4. **Category detection** -- 370+ keywords across 15 capability classes (coding 100, infrastructure 33, security 25, etc.); maps to LocalModelRole and finds installed model
5. **Ollama router call** -- `PromptBuilderManager` builds dynamic prompt with installed models; sends to router model (default: gemma3:4b) with temperature 0 and Zod-validated JSON response
6. **Heuristic fallback** -- if Ollama fails or returns an invalid response, falls back to cloud priority order or local

## Dynamic Prompt Builder

The `PromptBuilderManager` builds the router prompt dynamically:

1. Fetches installed models from ollama-service internal API (`/api/v1/ollama/internal/installed-models`)
2. Groups models by category (CODING, REASONING, THINKING, etc.)
3. Only includes healthy and installed models in the prompt
4. Prompt is cached with 5-minute TTL (`PROMPT_CACHE_TTL_MS`)
5. Cache is invalidated on `MODEL_PULLED` and `MODEL_DELETED` events

## Category-Aware Routing

When LOCAL_ONLY mode is used (and in AUTO mode's category detection stage), the service detects task category from message content and maps to the appropriate local model role:

| Category | Keywords (count) | Sample Keywords | Routes To |
| --- | --- | --- | --- |
| Security | 25 | CVE, XSS, OWASP, pentest, threat model | LOCAL_CODING |
| Medical | 19 | clinical, HIPAA, diagnosis, ICD-10 | LOCAL_REASONING |
| Legal | 21 | NDA, GDPR, contract, jurisdiction | LOCAL_REASONING |
| Coding | 100 | typescript, debug, prisma, jest, SOLID | LOCAL_CODING |
| Infrastructure | 33 | terraform, kubernetes, AWS, Lambda | LOCAL_CODING |
| Data Analysis | 33 | pandas, ETL, BigQuery, window function | LOCAL_REASONING |
| Reasoning | 21 | prove, theorem, probability, step by step | LOCAL_REASONING |
| Thinking | 15 | research, deep dive, trade-offs, pros and cons | LOCAL_THINKING |
| Business | 30 | KPI, ROI, pitch deck, go-to-market | LOCAL_FILE_GENERATION |
| Translation | 12 | translate, localize, i18n, multilingual | LOCAL_FALLBACK_CHAT |
| Creative Writing | 26 | blog post, screenplay, tagline, ad copy | LOCAL_FALLBACK_CHAT |
| Default | 0 | Everything else | gemma3:4b |

The order in the table above reflects the detection priority -- security is checked first, creative writing last.

## API Endpoints

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| GET    | /policies           | List routing policies (paginated)    |
| POST   | /policies           | Create policy (ADMIN)                |
| PATCH  | /policies/:id       | Update policy (ADMIN)                |
| DELETE | /policies/:id       | Delete policy (ADMIN)                |
| GET    | /decisions          | List recent routing decisions        |
| POST   | /evaluate           | Evaluate routing for a message       |

## Events

| Event                | Direction | Notes                                  |
| -------------------- | --------- | -------------------------------------- |
| message.created      | Subscribe | Triggers routing decision              |
| message.routed       | Publish   | Sends decision back to chat service    |
| routing.decision_made| Publish   | Audit trail                            |
| connector.synced     | Subscribe | Updates healthy provider list           |
| connector.health_checked | Subscribe | Updates provider health status      |
| model.pulled         | Subscribe | Invalidates prompt cache               |
| model.deleted        | Subscribe | Invalidates prompt cache               |

## Key Constants

```
LOCAL_PROVIDER = 'local-ollama'
LOCAL_MODEL_DEFAULT = 'gemma3:4b'
CLOUD_MODEL_REASONING = 'claude-opus-4'
CLOUD_MODEL_DEFAULT = 'claude-sonnet-4'
CLOUD_MODEL_GEMINI_DEFAULT = 'gemini-2.5-flash'
```

## Key Managers

- **RoutingManager** -- orchestrates the full routing decision pipeline
- **OllamaRouterManager** -- calls Ollama with the router prompt and parses the response
- **PromptBuilderManager** -- builds dynamic router prompts based on installed models

---

## routing.constants.ts Keyword Reference

All keyword arrays are defined in `src/modules/routing/constants/routing.constants.ts`. The routing engine uses these for deterministic category detection before falling back to the Ollama router.

| Array Name | Count | Used By | Purpose |
| --- | --- | --- | --- |
| `CODING_KEYWORDS` | 100 | `detectCodingRequest()` | Languages, tools, patterns, Git, testing, architecture |
| `IMAGE_KEYWORDS` | 70 | `detectImageRequest()` | Exact phrases for image generation detection |
| `INFRASTRUCTURE_KEYWORDS` | 33 | `detectInfrastructureRequest()` | Cloud, containers, networking, serverless |
| `DATA_ANALYSIS_KEYWORDS` | 33 | `detectDataAnalysisRequest()` | Data tools, SQL, ETL, warehousing, visualization |
| `BUSINESS_KEYWORDS` | 30 | `detectBusinessRequest()` | Agile, KPIs, strategy, proposals, meetings |
| `PRIVACY_KEYWORDS` | 30 | `detectPrivacySensitive()` | PII, medical, financial, legal privilege |
| `CREATIVE_WRITING_KEYWORDS` | 26 | `detectCreativeWritingRequest()` | Content types, copywriting, narrative |
| `SECURITY_KEYWORDS` | 25 | `detectSecurityRequest()` | Vulnerabilities, pentesting, OWASP, SOC |
| `REASONING_KEYWORDS` | 21 | `detectReasoningRequest()` | Math, proofs, logic, step-by-step analysis |
| `LEGAL_KEYWORDS` | 21 | `detectLegalRequest()` | Contracts, compliance, IP, litigation |
| `MEDICAL_KEYWORDS` | 19 | `detectMedicalRequest()` | Clinical, diagnosis, HIPAA, trials |
| `FILE_GENERATION_FORMAT_WORDS` | 18 | `detectFileGenerationRequest()` | File extensions and format names |
| `THINKING_KEYWORDS` | 15 | `detectThinkingRequest()` | Research, investigation, comparison |
| `TRANSLATION_KEYWORDS` | 12 | `detectTranslationRequest()` | i18n, language conversion |
| `FILE_GENERATION_VERBS` | 9 | `detectFileGenerationRequest()` | Action verbs for file creation |
| `FILE_GENERATION_KEYWORDS` | 7 | `detectFileGenerationRequest()` | Exact file generation phrases |

**Total**: 370+ unique keywords. Image detection adds another 85+ terms via inline arrays in `detectImageRequest()` (12 verbs, 34 nouns, 18 strong nouns, 21 art styles).

### Additional Constants

| Constant | Value | Purpose |
| --- | --- | --- |
| `CONFIDENCE_EXACT_KEYWORD` | 0.95 | Image/file exact match confidence |
| `CONFIDENCE_VERB_NOUN_COMBO` | 0.90 | Verb+noun combo detection confidence |
| `CONFIDENCE_CATEGORY_KEYWORD` | 0.85 | Category detection confidence |
| `CONFIDENCE_HEURISTIC_FALLBACK` | 0.60 | Heuristic fallback confidence |
| `CONFIDENCE_PRIVACY_ENFORCED` | 0.95 | Privacy-forced local routing confidence |
| `PROMPT_CACHE_TTL_MS` | 300000 (5 min) | Dynamic prompt cache lifetime |
| `CATEGORY_TO_ROLE_MAP` | Record<string, LocalModelRole> | Maps 14 categories to model roles |

---

## All 15 Detection Methods

The `RoutingManager` class exposes 15 detection methods. Each takes a `message: string` and returns `boolean` (or a result object for image/file detection).

### Public Detection Methods

| Method | Keyword Array | Returns |
| --- | --- | --- |
| `detectCodingRequest(message)` | `CODING_KEYWORDS` | boolean |
| `detectReasoningRequest(message)` | `REASONING_KEYWORDS` | boolean |
| `detectThinkingRequest(message)` | `THINKING_KEYWORDS` | boolean |
| `detectInfrastructureRequest(message)` | `INFRASTRUCTURE_KEYWORDS` | boolean |
| `detectDataAnalysisRequest(message)` | `DATA_ANALYSIS_KEYWORDS` | boolean |
| `detectBusinessRequest(message)` | `BUSINESS_KEYWORDS` | boolean |
| `detectCreativeWritingRequest(message)` | `CREATIVE_WRITING_KEYWORDS` | boolean |
| `detectSecurityRequest(message)` | `SECURITY_KEYWORDS` | boolean |
| `detectMedicalRequest(message)` | `MEDICAL_KEYWORDS` | boolean |
| `detectLegalRequest(message)` | `LEGAL_KEYWORDS` | boolean |
| `detectTranslationRequest(message)` | `TRANSLATION_KEYWORDS` | boolean |
| `detectPrivacySensitive(message)` | `PRIVACY_KEYWORDS` | boolean |

### Private Detection Methods

| Method | Detection Logic | Returns |
| --- | --- | --- |
| `detectImageRequest(context)` | 5-layer image detection (exact, verb+noun, strong noun, art style, reference) | `RoutingDecisionResult \| null` |
| `detectFileGenerationRequest(context)` | Exact phrases + verb+format combo | `RoutingDecisionResult \| null` |
| `detectCategoryRole(message)` | Calls all 11 boolean detectors in priority order | `LocalModelRole \| null` |

### Detection Priority in `detectCategoryRole()`

```
1. detectSecurityRequest      → LOCAL_CODING
2. detectMedicalRequest       → LOCAL_REASONING
3. detectLegalRequest         → LOCAL_REASONING
4. detectCodingRequest        → LOCAL_CODING
5. detectInfrastructureRequest → LOCAL_CODING
6. detectDataAnalysisRequest  → LOCAL_REASONING
7. detectReasoningRequest     → LOCAL_REASONING
8. detectThinkingRequest      → LOCAL_THINKING
9. detectBusinessRequest      → LOCAL_FILE_GENERATION
10. detectTranslationRequest  → LOCAL_FALLBACK_CHAT
11. detectCreativeWritingRequest → LOCAL_FALLBACK_CHAT
```

---

## PromptBuilderManager Dynamic Prompt System

The `PromptBuilderManager` generates router prompts dynamically based on which models are actually installed and healthy.

### How It Works

1. **Fetch models**: Calls `GET /api/v1/internal/ollama/installed-models` on the ollama-service (5s timeout)
2. **Group by category**: Models are grouped by their `category` field (CODING, REASONING, THINKING, etc.)
3. **Build local section**: Generates a formatted list of local models with roles and parameter counts
4. **Merge with template**: Combines the dynamic local section with the static cloud models and routing rules
5. **Cache**: The generated prompt is cached for 5 minutes (`PROMPT_CACHE_TTL_MS`)
6. **Apply variables**: `{healthyProviders}` placeholder is replaced with the current healthy provider list

### Cache Invalidation

The cache is invalidated (both prompt and model list) when:

- `MODEL_PULLED` event is received (new model installed)
- `MODEL_DELETED` event is received (model removed)
- Cache TTL expires (5 minutes)

### Fallback to Static Template

If the ollama-service is unreachable or returns no models, the `ROUTER_PROMPT_TEMPLATE` constant is used as a static fallback. This template hardcodes the 5 default models (gemma3:4b, llama3.2:3b, phi3:mini, gemma2:2b, tinyllama).

### Dynamic Prompt Structure

```
You are an intelligent AI routing engine...

Available providers and models:

LOCAL MODELS (free, private, no internet needed):
  [CODING]
  - local-ollama / qwen2.5-coder:7b, 7B params (roles: LOCAL_CODING)
  [REASONING]
  - local-ollama / deepseek-r1:7b, 7B params (roles: LOCAL_REASONING)
  ...

CLOUD MODELS (paid, internet required, higher quality):
  - OPENAI / gpt-4o-mini ...
  - ANTHROPIC / claude-sonnet-4 ...
  ...

Healthy providers: OPENAI, ANTHROPIC, GEMINI, local-ollama

ROUTING RULES (follow strictly, in priority order):
  ...

User message: {message}
```

---

## How Category Detection Works in handleAuto()

The `handleAuto()` method is the core of AUTO mode routing. Here is the exact execution flow:

```
handleAuto(context)
  |
  1. detectPrivacySensitive(message)
  |   → If true: return buildLocalPrivacyDecision() [STOP]
  |
  2. detectImageRequest(context)
  |   → 5-layer image detection
  |   → If match: return image decision [STOP]
  |
  3. detectFileGenerationRequest(context)
  |   → Exact phrases + verb+format combo
  |   → If match: return file-gen decision [STOP]
  |
  4. detectCategoryRoute(context)
  |   → Check if Ollama runtime is healthy
  |   → detectCategoryRole(message) — runs all 11 keyword detectors
  |   → findModelForRole(role) — finds installed model with matching role
  |   → If role found AND model installed: return category decision [STOP]
  |
  5. ollamaRouter.route(context)
  |   → Build dynamic prompt via PromptBuilderManager
  |   → Send to Ollama with 10s timeout
  |   → Validate response with Zod schema
  |   → If valid: return Ollama decision [STOP]
  |
  6. handleAutoHeuristic(context)
      → Re-check image + file generation (safety net)
      → Re-check category route (safety net)
      → Short message + local healthy → local routing
      → Else: try cloud providers in priority order
      → Ultimate fallback: local-ollama/gemma3:4b
```

Each step can short-circuit the pipeline. Steps 1-3 are keyword-only (sub-millisecond). Step 4 may make an HTTP call to check installed models (cached). Step 5 calls the Ollama LLM (up to 10s). Step 6 is the final safety net.
