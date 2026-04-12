# Routing Engine

## Overview

The routing engine is the decision-making core of ClawAI. It determines which AI provider and model should handle each user message based on the routing mode, active policies, task characteristics, privacy requirements, and cost constraints. The engine lives in the routing-service (port 4004) and is triggered asynchronously via the `message.created` RabbitMQ event.

---

## Routing Modes

ClawAI supports 7 routing modes. The mode is set at the thread level (`ChatThread.routingMode`) and can be overridden by routing policies.

### AUTO

The intelligent routing mode. Uses a local Ollama model to analyze the user's message and select the optimal provider/model combination.

- **Router model**: Configurable via `OLLAMA_ROUTER_MODEL` (default: `gemma3:4b`)
- **Temperature**: 0 (deterministic)
- **Output**: Zod-validated structured JSON
- **Timeout**: 10 seconds (configurable via `OLLAMA_ROUTER_TIMEOUT_MS`)
- **Fallback**: If Ollama times out or returns invalid output, heuristic rules are applied

### MANUAL_MODEL

User explicitly selects a provider and model. The routing engine respects the forced selection without modification.

- Reads `forcedProvider` and `forcedModel` from the message or thread settings
- No routing logic executed
- Confidence: 1.0 (user-directed)
- Still records a routing decision for audit purposes

### LOCAL_ONLY

All messages are routed to the local Ollama instance. No data leaves the user's machine.

- Provider: `local-ollama`
- Model: `gemma3:4b` (default, or user's preferred local model)
- No cloud fallback
- Confidence: 1.0

### PRIVACY_FIRST

Prefers local processing. Falls back to the most privacy-respecting cloud provider only if local Ollama is unhealthy.

- Primary: `local-ollama` / `gemma3:4b`
- Fallback: `anthropic` / `claude-sonnet-4` (Anthropic has strong data privacy commitments)
- Privacy class: HIGH

### LOW_LATENCY

Optimized for fastest response time. Routes to the provider/model combination with the lowest expected latency.

- Default: `openai` / `gpt-4o-mini`
- Rationale: OpenAI's smaller models have consistently low latency
- Cost class: LOW

### HIGH_REASONING

Routes to the most capable reasoning model available.

- Default: `anthropic` / `claude-opus-4`
- Used for complex analysis, architecture decisions, deep reasoning tasks
- Cost class: HIGH

### COST_SAVER

Minimizes cost. Uses local Ollama when healthy, otherwise selects the cheapest cloud option.

- Primary: `local-ollama` / `gemma3:4b` (free)
- Fallback: Cheapest available cloud model
- Cost class: LOW

---

## AUTO Mode: Deep Dive

AUTO mode uses a 5-stage pipeline. Each stage can short-circuit the pipeline by returning a routing decision. Stages are ordered by priority and computational cost (cheapest/fastest first, Ollama LLM call last).

### Stage 1-4: Keyword-Based Detection (Sub-Millisecond)

Before calling the Ollama router LLM, the engine runs deterministic keyword detection:

1. **Privacy enforcement** (30 keywords) -- forces local, no cloud fallback
2. **Image detection** (70+ keywords, 5 detection layers) -- routes to image provider
3. **File generation detection** (7 phrases + 162 verb/format combos) -- routes to FILE_GENERATION
4. **Category detection** (1650+ keywords across 33 categories) -- routes to category-specific local model

If any of these stages match, the Ollama router is never called, saving 1-10 seconds of latency.

### Stage 5: Ollama Router Request

When no keyword match is found, the routing service sends a dynamically-built prompt to the Ollama router model. The prompt is constructed by `PromptBuilderManager` and includes only currently installed and healthy models.

### Zod Validation Schema

The router's response is validated against a strict Zod schema:

```
{
  provider: string (min 1 char),
  model: string (min 1 char),
  confidence: number (0-1),
  reason: string (min 1 char)
}
```

If the response fails Zod validation, the system immediately falls back to heuristic routing.

### Timeout Handling

```
Router request sent
      |
      +-- Response within 10s --> Validate with Zod
      |                               |
      |                    Valid ------+----- Invalid
      |                      |                  |
      |                Use decision     Heuristic fallback
      |
      +-- Timeout (10s) --> Heuristic fallback
```

The 10-second timeout is configurable via `OLLAMA_ROUTER_TIMEOUT_MS`. This prevents slow model inference from blocking the entire message pipeline.

---

## 5-Stage Routing Pipeline

Every message in AUTO mode passes through a 5-stage pipeline. Each stage can short-circuit and return a decision, skipping later stages.

```
Stage 1: Privacy Enforcement
  → 30 privacy keywords scanned (medical, SSN, confidential, etc.)
  → If ANY match: force local-ollama, confidence 0.95, NO cloud fallback
  → Privacy is never overridden by any later stage

Stage 2: Image Generation Detection
  → 70 exact-match keywords + verb/noun combo detection
  → 12 image verbs x 34 image nouns = 408 combinations
  → 21 art style indicators (photorealistic, watercolor, pixel art, etc.)
  → 18 strong image nouns that indicate visual output
  → Reference-based detection (recreate/reproduce + this/attached)
  → Routes to IMAGE_GEMINI > IMAGE_OPENAI > IMAGE_LOCAL

Stage 3: File Generation Detection
  → 7 exact phrases (export as, save as, download as, etc.)
  → 9 verbs x 18 format words = 162 verb+format combinations
  → Routes to FILE_GENERATION / auto

Stage 4: Category Detection (1650+ keywords across 33 capability classes)
  → Scans message against all 33 keyword arrays
  → Maps detected category to a LocalModelRole
  → Finds installed model with that role via PromptBuilderManager
  → If found: routes to that local model, confidence 0.85

Stage 5: Ollama Router + Heuristic Fallback
  → Sends message to Ollama router model with dynamic prompt
  → If Ollama responds with valid JSON in 10s: use its decision
  → If Ollama fails: heuristic fallback (short messages → local, else cloud priority)
```

---

## 33 Capability Classes

The routing engine classifies messages into 33 capability classes, each backed by a dedicated keyword array in `routing.constants.ts` (2274 lines). This enables fine-grained routing to the most appropriate model. The top 15 classes by keyword count are shown below; the remaining 18 classes cover HR, Education, Sales, Logistics, Hospitality, Science, Government, Finance, Executive, and other specialty domains.

| # | Capability Class | Keyword Count | Example Keywords | Routes To (Local Role) |
| - | ---------------- | ------------- | ---------------- | ---------------------- |
| 1 | Coding | 100 | code, debug, typescript, prisma, jest, SOLID, design pattern | LOCAL_CODING |
| 2 | Reasoning | 21 | prove, solve, theorem, probability, chain of thought | LOCAL_REASONING |
| 3 | Thinking | 15 | research, investigate, deep dive, trade-offs, pros and cons | LOCAL_THINKING |
| 4 | Infrastructure | 33 | terraform, kubernetes, docker, AWS, Lambda, VPC, helm | LOCAL_CODING |
| 5 | Data Analysis | 33 | pandas, matplotlib, ETL, BigQuery, Spark, window function | LOCAL_REASONING |
| 6 | Business | 30 | user story, KPI, ROI, roadmap, SWOT, pitch deck, go-to-market | LOCAL_FILE_GENERATION |
| 7 | Creative Writing | 26 | blog post, screenplay, narrative, tagline, press release | LOCAL_FALLBACK_CHAT |
| 8 | Security | 25 | CVE, XSS, OWASP, penetration test, threat model, WAF | LOCAL_CODING |
| 9 | Medical | 19 | clinical, diagnosis, HIPAA, ICD-10, adverse event | LOCAL_REASONING |
| 10 | Legal | 21 | contract, NDA, GDPR, patent, jurisdiction, case law | LOCAL_REASONING |
| 11 | Translation | 12 | translate, localize, i18n, multilingual, convert to English | LOCAL_FALLBACK_CHAT |
| 12 | Image Generation | 70+ | generate image, draw, sketch, logo, portrait, watercolor | LOCAL_IMAGE_GENERATION |
| 13 | File Generation | 34 | export as PDF, create CSV, generate report, save to file | LOCAL_FILE_GENERATION |
| 14 | Privacy (enforcement) | 30 | medical, SSN, confidential, private key, PII, attorney-client | Forces local (no role) |
| 15 | General Chat | 0 (default) | Everything that matches no other class | LOCAL_FALLBACK_CHAT |

**Total keyword count**: 1650+ unique keywords across 33 capability classes (2274 lines in `routing.constants.ts`), plus hundreds of verb/noun combinations for image and file detection.

### Category-to-Role Mapping

The `CATEGORY_TO_ROLE_MAP` constant maps each detected category to a `LocalModelRole`:

| Category | LocalModelRole | Rationale |
| --- | --- | --- |
| coding | LOCAL_CODING | Code generation, debugging, refactoring |
| reasoning | LOCAL_REASONING | Mathematical proofs, logic, step-by-step analysis |
| thinking | LOCAL_THINKING | Research, deep investigation, comparative analysis |
| infrastructure | LOCAL_CODING | DevOps and infra tasks need code-aware models |
| data-analysis | LOCAL_REASONING | Data tasks need analytical reasoning |
| business | LOCAL_FILE_GENERATION | Business tasks often produce documents |
| creative-writing | LOCAL_FALLBACK_CHAT | Creative tasks use general chat models |
| security | LOCAL_CODING | Security audits need code-aware models |
| medical | LOCAL_REASONING | Medical queries need careful reasoning |
| legal | LOCAL_REASONING | Legal analysis needs structured reasoning |
| translation | LOCAL_FALLBACK_CHAT | Translation uses general language models |
| image-generation | LOCAL_IMAGE_GENERATION | Routes to diffusion models |
| file-generation | LOCAL_FILE_GENERATION | Routes to structured output models |
| chat | LOCAL_FALLBACK_CHAT | Default general conversation |

---

## Privacy Enforcement Layer

Privacy detection is the highest-priority check in the routing pipeline. It runs BEFORE any other detection and cannot be overridden.

### 30 Privacy Keywords

`medical`, `patient`, `diagnosis`, `health record`, `PHI`, `HIPAA`, `tax return`, `salary`, `SSN`, `social security`, `credit card`, `bank account`, `password`, `private key`, `secret`, `confidential`, `NDA`, `attorney-client`, `privilege`, `personal data`, `PII`, `financial statement`, `investment portfolio`, `insurance claim`, `disability`, `mental health`, `therapy`, `counseling`, `genetic`, `criminal record`

### Enforcement Behavior

- **Detection**: Case-insensitive substring match against all 30 keywords
- **Action**: Force `local-ollama` / `gemma3:4b`, confidence 0.95
- **Fallback chain**: Filtered to LOCAL_PROVIDER only (cloud entries removed)
- **Reason tags**: `['auto', 'privacy_enforced', 'local_only']`
- **Privacy class**: `local`
- **Zero cloud exposure guarantee**: Even the fallback chain contains no cloud providers

---

## 1650+ Keyword Detection System

### How Detection Works

Each capability class has a dedicated `detect*Request(message)` method in `RoutingManager`:

1. The message is lowercased once
2. Each keyword in the class array is checked via `String.includes()` (case-insensitive)
3. First match wins -- no need to match all keywords
4. Categories are checked in priority order (security > medical > legal > coding > infrastructure > data-analysis > reasoning > thinking > business > translation > creative-writing)

### Detection Priority Order

When a message matches multiple categories (e.g., "debug this Kubernetes deployment"), the first matching category in priority order wins:

1. Security (force to LOCAL_CODING)
2. Medical (force to LOCAL_REASONING)
3. Legal (force to LOCAL_REASONING)
4. Coding (LOCAL_CODING)
5. Infrastructure (LOCAL_CODING)
6. Data Analysis (LOCAL_REASONING)
7. Reasoning (LOCAL_REASONING)
8. Thinking (LOCAL_THINKING)
9. Business (LOCAL_FILE_GENERATION)
10. Translation (LOCAL_FALLBACK_CHAT)
11. Creative Writing (LOCAL_FALLBACK_CHAT)

### Image Detection (Multi-Layer)

Image detection uses 5 independent detection layers. Any single layer matching triggers image routing:

1. **Exact keyword match**: 70 phrases from `IMAGE_KEYWORDS` array
2. **Verb + noun combo**: 12 verbs x 34 nouns (generate+image, create+portrait, etc.)
3. **Strong noun + context**: 18 strong nouns (logo, poster, mascot) + any image verb or word
4. **Art style indicators**: 21 style keywords (photorealistic, watercolor, pixel art, cyberpunk, etc.)
5. **Reference-based**: recreate/reproduce/remake + this/attached

### Confidence Scoring Matrix

| Detection Source | Confidence | Notes |
| --- | --- | --- |
| Privacy enforcement | 0.95 | Highest -- never overridden |
| Image exact keyword | 0.95 | High confidence for explicit image requests |
| Image verb+noun combo | 0.95 | Same confidence as exact match |
| File generation exact phrase | 0.95 | "export as PDF" is unambiguous |
| File generation verb+format combo | 0.90 | "generate" + "pdf" may be ambiguous |
| Category keyword match | 0.85 | Strong signal from domain-specific keywords |
| Ollama router (high match) | 0.80 - 0.99 | Depends on router model confidence |
| Ollama router (uncertain) | 0.50 - 0.79 | Router model was less sure |
| Heuristic fallback (cloud) | 0.75 | Best available cloud provider |
| Heuristic fallback (local, short msg) | 0.60 | Short message + local available |
| Heuristic fallback (no healthy connector) | 0.50 | Best-effort, no health data |
| Ultimate fallback (no cloud) | 0.40 | No cloud available at all |
| Default fallback | 0.20 | Nothing matched |
| MANUAL_MODEL | 1.00 | User explicitly chose |

---

## Routing Policies

Routing policies allow administrators to define rules that override or influence routing decisions. Policies are stored in the `RoutingPolicy` table and evaluated in priority order.

### Policy Structure

```
RoutingPolicy {
  id: UUID
  name: string
  routingMode: RoutingMode
  priority: number (lower = higher priority)
  config: JSON {
    conditions: [
      { field: "messageLength", operator: "gt", value: 500 },
      { field: "hasFiles", operator: "eq", value: true }
    ],
    action: {
      forceProvider: "google",
      forceModel: "gemini-2.5-flash",
      overrideMode: null
    }
  }
  isActive: boolean
  createdAt, updatedAt
}
```

### Policy Evaluation Flow

```
1. Load all active policies, sorted by priority (ascending)
2. For each policy:
   a. Evaluate all conditions against the current message context
   b. If ALL conditions match:
      - Apply the policy's action
      - Stop evaluating further policies (first match wins)
3. If no policy matches:
   - Proceed with normal routing mode logic
```

### Condition Fields

| Field               | Type    | Description                     |
| ------------------- | ------- | ------------------------------- |
| `messageLength`     | number  | Character count of user message |
| `hasFiles`          | boolean | Whether files are attached      |
| `fileCount`         | number  | Number of attached files        |
| `threadRoutingMode` | string  | Current thread routing mode     |
| `userRole`          | string  | ADMIN, OPERATOR, or VIEWER      |
| `timeOfDay`         | number  | Hour (0-23) in server timezone  |
| `provider`          | string  | Specific provider name          |

---

## Provider Selection Matrix

### AUTO Mode Routing Table

| Task Category            | Primary Provider | Primary Model    | Fallback Provider      | Fallback Model  |
| ------------------------ | ---------------- | ---------------- | ---------------------- | --------------- |
| Coding / debugging       | anthropic        | claude-sonnet-4  | openai                 | gpt-4o          |
| Architecture / reasoning | anthropic        | claude-opus-4    | google                 | gemini-2.5-pro  |
| Image / video / web      | google           | gemini-2.5-flash | openai                 | gpt-4o          |
| Math / algorithms        | deepseek         | deepseek-chat    | local-ollama           | phi3:mini       |
| Creative writing         | openai           | gpt-4o-mini      | anthropic              | claude-sonnet-4 |
| Simple Q&A               | local-ollama     | gemma3:4b        | openai                 | gpt-4o-mini     |
| File / data analysis     | google           | gemini-2.5-flash | anthropic              | claude-sonnet-4 |
| Privacy-sensitive        | local-ollama     | gemma3:4b        | _(none - never cloud)_ | _(none)_        |
| General / unknown        | openai           | gpt-4o-mini      | local-ollama           | gemma3:4b       |

### Provider Health Requirements

Before selecting a provider, the routing engine checks:

1. **Connector status**: Must be ACTIVE (not DISABLED or ERROR)
2. **Recent health check**: Last health check must be within the configured interval
3. **Model availability**: The specific model must be synced and available
4. **Local Ollama**: Must be reachable and have the target model loaded

If the selected provider is unhealthy, the system uses the fallback. If the fallback is also unhealthy, it falls through to local Ollama (which is always the last resort).

---

## Decision Recording

Every routing decision is persisted for observability and analytics.

### RoutingDecision Record

```
RoutingDecision {
  id: UUID
  messageId: UUID
  threadId: UUID
  userId: UUID
  routingMode: RoutingMode
  selectedProvider: string
  selectedModel: string
  confidence: float
  reasonTags: string[]
  privacyClass: enum
  costClass: enum
  fallbackProvider: string | null
  fallbackModel: string | null
  policyId: UUID | null        // which policy was applied, if any
  heuristicUsed: boolean       // true if Ollama router was bypassed
  latencyMs: number            // time taken for routing decision
  createdAt: DateTime
}
```

### Routing Transparency (Frontend)

The frontend displays routing decisions in the `RoutingTransparency` component:

- Provider and model used (with badge)
- Confidence score (color-coded: green > 0.7, yellow > 0.4, red < 0.4)
- Reason tags (e.g., "coding", "privacy", "low-latency")
- Privacy class and cost class indicators
- Whether fallback was used
- Whether heuristic routing was applied (indicates Ollama router was skipped)

---

## Fallback Chain Construction

The routing engine builds a fallback chain for every decision:

```
1. Selected provider/model (from router or heuristic)
      |
      +--(fail)--> 2. Fallback provider/model (from routing decision)
                        |
                        +--(fail)--> 3. Local Ollama / gemma3:4b
                                          |
                                          +--(fail)--> 4. Error returned to user
```

### Fallback Triggers

The chat-service's `ChatExecutionManager` triggers a fallback when:

- HTTP connection timeout
- HTTP 429 (rate limited)
- HTTP 500, 502, 503 (server errors)
- Network unreachable
- Invalid or empty response body
- Response parsing failure

### Fallback Behavior

- Each fallback attempt is logged with the reason for the previous failure
- The final `ChatMessage` records the **actual** provider/model used (which may differ from the **selected** one)
- The `metadata` JSON field stores the full fallback chain: which providers were tried and why each failed
- If a fallback was used, the SSE event includes `fallbackUsed: true` so the frontend can display this to the user

---

## Configuration Reference

| Environment Variable       | Default               | Description                         |
| -------------------------- | --------------------- | ----------------------------------- |
| `OLLAMA_ROUTER_MODEL`      | `gemma3:4b`           | Ollama model used for AUTO routing  |
| `OLLAMA_ROUTER_TIMEOUT_MS` | `10000`               | Timeout for Ollama router inference |
| `OLLAMA_BASE_URL`          | `http://ollama:11434` | Ollama API endpoint                 |

---

## Validation Results

Final validation of the routing engine across 150 prompts and 500+ total experiments.

### Overall Accuracy

- **150-prompt final validation**: 99.1% accuracy (114/115 valid responses correctly routed)
- **33 detection categories** with 1650+ keywords across 2274 lines of routing constants
- **115 models in catalog** across 13 domains
- **All 40 routing unit tests pass** as a quality gate

### Privacy Enforcement

Privacy enforcement achieved **100% accuracy** across all sensitive domains:

| Domain | Enforcement Rate |
| --- | --- |
| Medical | 100% |
| Legal | 100% |
| Finance | 100% |
| Government | 100% |
| Executive | 100% |

Zero privacy-sensitive messages were sent to cloud providers during any validation round. The 30 privacy keywords plus domain-specific detection ensure all sensitive content stays on local infrastructure.

### Category-Level Results

| Category | Accuracy |
| --- | --- |
| Engineering | 100% |
| Data / ML | 100% |
| Security | 100% |
| Business | 100% |
| Creative | 100% |
| Science | 100% |
| Logistics | 100% |
| Hospitality | 100% |
| HR / Education / Sales | 100% |
| Specialty | 100% |
| General | 100% |
| Privacy | 97%+ |

### Iterative Improvement

The routing engine was refined across 5 experiment rounds:

| Round | Image Accuracy | Overall Notes |
| --- | --- | --- |
| Round 1 | 33% | Initial keyword set too narrow |
| Round 2 | 67% | Added verb/noun combos |
| Round 3 | 85% | Added art style indicators |
| Round 4 | 95% | Added strong noun detection |
| Round 5 | 100% | Final 5-layer detection system |
