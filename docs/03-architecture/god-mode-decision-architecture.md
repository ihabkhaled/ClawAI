# God Mode Decision Architecture

Version: 1.0.0
Status: Draft
Author: ClawAI Architecture Team
Date: 2026-04-11
Companion to: `god-mode-routing-spec.md` (roles and capabilities), `god-mode-routing-experiments.md` (50 experiments)

---

## Section 1: Decision Architecture Deep Dive

The routing decision pipeline executes five sequential stages for every incoming message. Total budget: <90ms without LLM involvement, <3s with LLM-assisted routing. Each stage has a hard latency ceiling, a pass-through condition, and a short-circuit exit when a high-confidence decision is reached.

### Pipeline Overview

```
Message In
  |
  v
+---------------------------+
| Stage 1: Modality         |  <10ms
| Detection                 |  Classify: text / image / file / audio / video / multimodal
+---------------------------+
  |
  v
+---------------------------+
| Stage 2: Category         |  <50ms
| Classification            |  15 capability classes, keyword scoring, multi-label, priority
+---------------------------+
  |
  v
+---------------------------+
| Stage 3: Sensitivity      |  <5ms
| Check                     |  Privacy keywords, compliance flags, data classification
+---------------------------+
  |
  v
+---------------------------+
| Stage 4: Provider         |  <20ms
| Selection                 |  Weighted scoring: quality * 0.4 + latency * 0.2 + cost * 0.2 + privacy * 0.2
+---------------------------+
  |
  v
+---------------------------+
| Stage 5: Fallback         |  <5ms
| Chain Assembly            |  Ordered by quality, filtered by health, privacy constraints
+---------------------------+
  |
  v
RoutingDecisionResult
```

### Stage 1: Modality Detection (<10ms)

Modality detection determines what KIND of output the user expects. This is the highest-priority classification because image, file, and audio requests have entirely different provider pipelines.

**Detection Algorithm:**

```
function detectModality(message: string, attachments: Attachment[]): Modality {
  // 1. Check attachments first (explicit signal)
  if (attachments.some(a => isImageMime(a.mimeType)))      return 'image-input'
  if (attachments.some(a => isAudioMime(a.mimeType)))      return 'audio-input'
  if (attachments.some(a => isVideoMime(a.mimeType)))      return 'video-input'
  if (attachments.some(a => isDocumentMime(a.mimeType)))    return 'file-input'

  // 2. Check message content for output modality signals
  if (matchesImageGeneration(message))     return 'image-output'
  if (matchesFileGeneration(message))      return 'file-output'
  if (matchesAudioGeneration(message))     return 'audio-output'

  // 3. Default
  return 'text'
}
```

**Modality-to-Pipeline Mapping:**

| Modality | Pipeline | Short-Circuit | Providers |
|----------|----------|---------------|-----------|
| `image-output` | Image Generation | Yes, skip Stages 2-4 | IMAGE_GEMINI, IMAGE_OPENAI, IMAGE_LOCAL |
| `image-input` | Vision Analysis | No, continue to Stage 2 | GEMINI (vision), OPENAI (vision) |
| `file-output` | File Generation | Yes, skip Stages 2-4 | FILE_GENERATION / auto |
| `file-input` | Document Analysis | No, continue to Stage 2 | GEMINI (1M context), ANTHROPIC |
| `audio-output` | Audio Generation | Yes, skip Stages 2-4 | Future: ElevenLabs |
| `audio-input` | Speech-to-Text | No, continue to Stage 2 | Future: Whisper |
| `video-input` | Video Analysis | No, continue to Stage 2 | GEMINI (video support) |
| `text` | Standard Text | No, continue to Stage 2 | All text providers |

**Image Generation Detection (current implementation in `detectImageRequest`):**

The existing implementation uses four detection layers:
1. Exact keyword match against `IMAGE_KEYWORDS` (100+ entries)
2. Verb + image-word combo (12 verbs x 34 nouns = 408 combinations)
3. Strong image noun + any image-related context (18 strong nouns)
4. Art style indicators (20 style keywords that alone signal visual output)
5. Reference-based phrases ("recreate this", "reproduce", "remake" + "this"/"attached")

Confidence scoring per layer:
- Exact keyword match: 0.95
- Verb + noun combo: 0.92
- Strong noun + context: 0.88
- Art style indicator: 0.90
- Reference phrase: 0.85

**File Generation Detection (current implementation in `detectFileGenerationRequest`):**

Two detection layers:
1. Exact phrase match against `FILE_GENERATION_KEYWORDS` (7 phrases: "export as", "save as", etc.)
2. Verb + format combo: 9 verbs x 18 format words = 162 combinations

Confidence: 0.95 for exact match, 0.90 for verb+format combo.

**Implementation Notes:**
- Modality detection runs BEFORE any category classification
- Image and file generation short-circuit the entire remaining pipeline
- Attachment MIME type detection is O(n) where n = attachment count (typically 0-5)
- Keyword matching uses `String.includes()` on lowercased message (no regex overhead)

### Stage 2: Category Classification (<50ms)

Category classification determines WHAT the user is asking for across 15 capability classes. This stage uses keyword scoring with priority ordering to handle multi-label detection.

**The 15 Capability Classes:**

| # | Class | Keyword Pool | Priority | Role Mapping |
|---|-------|-------------|----------|--------------|
| 1 | IMAGE_GENERATION | 100+ keywords | 1 (highest) | LOCAL_IMAGE_GENERATION |
| 2 | FILE_GENERATION | 162 combos + 7 phrases | 2 | LOCAL_FILE_GENERATION |
| 3 | SECURITY | 25 keywords | 3 | LOCAL_CODING |
| 4 | MEDICAL | 19 keywords | 4 | LOCAL_REASONING |
| 5 | LEGAL | 21 keywords | 5 | LOCAL_REASONING |
| 6 | CODING | 120+ keywords | 6 | LOCAL_CODING |
| 7 | INFRASTRUCTURE | 33 keywords | 7 | LOCAL_CODING |
| 8 | DATA_ANALYSIS | 34 keywords | 8 | LOCAL_REASONING |
| 9 | REASONING | 21 keywords | 9 | LOCAL_REASONING |
| 10 | THINKING | 15 keywords | 10 | LOCAL_THINKING |
| 11 | BUSINESS | 30 keywords | 11 | LOCAL_FILE_GENERATION |
| 12 | TRANSLATION | 12 keywords | 12 | LOCAL_FALLBACK_CHAT |
| 13 | CREATIVE_WRITING | 26 keywords | 13 | LOCAL_FALLBACK_CHAT |
| 14 | SUMMARIZATION | (future) | 14 | LOCAL_FALLBACK_CHAT |
| 15 | GENERAL_CHAT | (default) | 15 | LOCAL_FALLBACK_CHAT |

**Priority Ordering Rationale:**

The priority order (most specific first) prevents misclassification:
- Security before Coding: "Find SQL injection vulnerabilities" should route to LOCAL_CODING with privacy awareness, not generic coding
- Medical before Reasoning: "Analyze this patient's lab results" must be privacy-enforced, not sent to cloud for reasoning
- Legal before Reasoning: "Review this NDA clause" must stay local
- Coding before Infrastructure: "Write a Terraform module" is both, but coding tools handle it better
- Infrastructure before Data Analysis: "Set up an Airflow DAG" is infra, not data analysis
- Reasoning before Thinking: "Prove this theorem" needs focused reasoning, not broad research

**Keyword Scoring with TF-IDF-like Weighting:**

The current implementation uses binary matching (keyword present or not). The proposed enhancement adds scoring:

```
function scoreCategory(message: string, keywords: string[]): CategoryScore {
  const lower = message.toLowerCase()
  const words = lower.split(/\s+/)
  const messageLength = words.length

  let rawScore = 0
  let matchCount = 0
  const matchedKeywords: string[] = []

  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      matchCount++
      matchedKeywords.push(keyword)

      // Weight by keyword specificity (longer = more specific = higher weight)
      const specificity = keyword.split(/\s+/).length
      const weight = 1.0 + (specificity - 1) * 0.5  // multi-word keywords score higher

      // Weight by position (earlier in message = more intentional)
      const position = lower.indexOf(keyword.toLowerCase())
      const positionBoost = position < messageLength * 0.3 ? 1.2 : 1.0

      rawScore += weight * positionBoost
    }
  }

  // Normalize by message length (short messages with keywords are higher signal)
  const density = matchCount / Math.max(messageLength, 1)
  const densityBoost = Math.min(density * 10, 2.0)  // cap at 2x

  return {
    category,
    rawScore,
    matchCount,
    normalizedScore: rawScore * densityBoost,
    matchedKeywords,
    confidence: Math.min(0.5 + rawScore * 0.1, 0.95)
  }
}
```

**Multi-Label Detection:**

A message like "Write a Python function to analyze this CSV dataset and generate a PDF report" matches three categories:
1. CODING: "python", "function" (rawScore ~2.0)
2. DATA_ANALYSIS: "analyze", "csv", "dataset" (rawScore ~3.5)
3. FILE_GENERATION: verb "generate" + format "pdf" + "report" (rawScore ~3.0)

Resolution: The `detectCategoryRole` method in `routing.manager.ts` checks categories in priority order and returns the FIRST match. This means the priority ordering table above determines which category wins in multi-label scenarios.

For the example above, FILE_GENERATION (priority 2) would win over CODING (priority 6) and DATA_ANALYSIS (priority 8) because the method checks image, file, security, medical, legal BEFORE coding.

**Current Implementation (routing.manager.ts, detectCategoryRole):**

```typescript
private detectCategoryRole(message: string): LocalModelRole | null {
  if (this.detectSecurityRequest(message))       return LocalModelRole.LOCAL_CODING
  if (this.detectMedicalRequest(message))         return LocalModelRole.LOCAL_REASONING
  if (this.detectLegalRequest(message))           return LocalModelRole.LOCAL_REASONING
  if (this.detectCodingRequest(message))          return LocalModelRole.LOCAL_CODING
  if (this.detectInfrastructureRequest(message))  return LocalModelRole.LOCAL_CODING
  if (this.detectDataAnalysisRequest(message))    return LocalModelRole.LOCAL_REASONING
  if (this.detectReasoningRequest(message))       return LocalModelRole.LOCAL_REASONING
  if (this.detectThinkingRequest(message))        return LocalModelRole.LOCAL_THINKING
  if (this.detectBusinessRequest(message))        return LocalModelRole.LOCAL_FILE_GENERATION
  if (this.detectTranslationRequest(message))     return LocalModelRole.LOCAL_FALLBACK_CHAT
  if (this.detectCreativeWritingRequest(message))  return LocalModelRole.LOCAL_FALLBACK_CHAT
  return null
}
```

### Stage 3: Sensitivity Check (<5ms)

The sensitivity check runs BEFORE provider selection and can override any category decision by forcing LOCAL-only routing.

**Privacy Keyword Detection (current: 30 keywords in PRIVACY_KEYWORDS):**

```
medical, patient, diagnosis, health record, PHI, HIPAA,
tax return, salary, SSN, social security, credit card, bank account,
password, private key, secret, confidential, NDA, attorney-client,
privilege, personal data, PII, financial statement, investment portfolio,
insurance claim, disability, mental health, therapy, counseling,
genetic, criminal record
```

**Compliance Flag Matrix:**

| Flag | Trigger Keywords | Enforcement | Provider Restriction |
|------|-----------------|-------------|---------------------|
| HIPAA | patient, PHI, diagnosis, health record, medical record, lab result | Hard block | LOCAL only, zero cloud |
| PII | SSN, social security, credit card, bank account, personal data | Hard block | LOCAL only |
| GDPR | personal data, right to be forgotten, data subject, consent | Soft flag | LOCAL preferred, cloud with DPA |
| SOC2 | audit, compliance, SOC2, security controls | Soft flag | Cloud allowed with logging |
| ATTORNEY_CLIENT | attorney-client, privilege, legal counsel, NDA | Hard block | LOCAL only |
| FINANCIAL | salary, compensation, tax return, financial statement | Hard block | LOCAL only |

**Data Classification Levels:**

| Level | Description | Cloud Allowed | Logging Level |
|-------|-------------|---------------|---------------|
| PUBLIC | General knowledge, no PII | Yes | Standard |
| INTERNAL | Company-specific but non-sensitive | Yes with DPA | Standard |
| CONFIDENTIAL | Business-sensitive data | Restricted providers only | Enhanced |
| RESTRICTED | PII, PHI, financial, legal privilege | LOCAL only | Minimal (redacted) |

**Current Implementation (routing.manager.ts, handleAuto):**

```typescript
// Privacy check FIRST -- force local if sensitive content detected
if (this.detectPrivacySensitive(context.message)) {
  return this.buildLocalPrivacyDecision(context)
}
```

The privacy check runs before image detection, file detection, category routing, and LLM-assisted routing. When triggered, the fallback chain is filtered to LOCAL_PROVIDER only:

```typescript
private buildLocalPrivacyDecision(context: RoutingContext): RoutingDecisionResult {
  const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT }
  return {
    selectedProvider: LOCAL_PROVIDER,
    selectedModel: LOCAL_MODEL_DEFAULT,
    confidence: CONFIDENCE_PRIVACY_ENFORCED, // 0.95
    reasonTags: ['auto', 'privacy_enforced', 'local_only'],
    privacyClass: 'local',
    costClass: 'free',
    fallbackChain: this.buildFallbackChain(primary, context)
      .filter(f => f.provider === LOCAL_PROVIDER),
  }
}
```

### Stage 4: Provider Selection (<20ms)

Provider selection uses a weighted scoring formula to choose between eligible providers for the detected capability class.

**Weighted Scoring Formula:**

```
composite_score = quality_score * 0.4
               + latency_score * 0.2
               + cost_score    * 0.2
               + privacy_score * 0.2
```

**Scoring Dimensions:**

| Dimension | 0 (worst) | 5 (acceptable) | 10 (optimal) |
|-----------|-----------|----------------|--------------|
| Quality | Model cannot produce usable output | Output requires edits | Production-ready |
| Latency | >30s TTFB | 5-10s TTFB | <1s TTFB |
| Cost | >$0.10 per request | $0.01-$0.05 | $0.00 (local) |
| Privacy | PII sent to untrusted cloud | Cloud with DPA | Fully local |

**Provider Score Cards:**

| Provider | Quality | Latency | Cost | Privacy | Composite |
|----------|---------|---------|------|---------|-----------|
| local-ollama / gemma3:4b | 6 | 9 | 10 | 10 | 8.20 |
| local-ollama / LOCAL_CODING | 7 | 8 | 10 | 10 | 8.40 |
| local-ollama / LOCAL_REASONING | 7 | 7 | 10 | 10 | 8.00 |
| ANTHROPIC / claude-sonnet-4 | 9 | 6 | 5 | 5 | 6.80 |
| ANTHROPIC / claude-opus-4 | 10 | 4 | 3 | 5 | 6.40 |
| OPENAI / gpt-4o-mini | 7 | 8 | 7 | 5 | 6.80 |
| GEMINI / gemini-2.5-flash | 8 | 8 | 6 | 5 | 7.00 |
| DEEPSEEK / deepseek-chat | 7 | 7 | 8 | 4 | 6.60 |
| IMAGE_GEMINI / gemini-2.5-flash-image | 8 | 6 | 5 | 5 | 6.40 |
| IMAGE_OPENAI / dall-e-3 | 9 | 5 | 4 | 5 | 6.40 |
| IMAGE_LOCAL / sdxl-turbo | 6 | 7 | 10 | 10 | 7.80 |

**Context-Adjusted Scoring:**

The base scores above are adjusted per capability class:

| Capability | Quality Boost | Latency Boost | Cost Boost | Privacy Boost |
|------------|--------------|---------------|------------|---------------|
| CODING | +2 for Anthropic, LOCAL_CODING | -- | -- | -- |
| REASONING | +2 for Anthropic opus, LOCAL_REASONING | -- | -- | -- |
| CREATIVE_WRITING | +2 for OpenAI | +1 for OpenAI | -- | -- |
| DATA_ANALYSIS | +2 for Gemini (1M context) | -- | -- | -- |
| PRIVACY_SENSITIVE | -- | -- | -- | +5 for LOCAL (forces selection) |
| IMAGE_GENERATION | +2 for IMAGE_GEMINI | -- | -- | -- |
| INFRASTRUCTURE | +1 for Anthropic | -- | -- | -- |
| TRANSLATION | +1 for local (multilingual models) | +2 for local | -- | -- |

**Selection Algorithm:**

```
function selectProvider(
  capability: CapabilityClass,
  sensitivity: SensitivityLevel,
  healthMap: HealthMap
): ProviderSelection {
  // 1. Build candidate list from capability routing matrix
  const candidates = getCandidatesForCapability(capability)

  // 2. Filter by health
  const healthy = candidates.filter(c => healthMap[c.provider] !== false)

  // 3. Filter by sensitivity
  const eligible = sensitivity === 'RESTRICTED'
    ? healthy.filter(c => c.provider === LOCAL_PROVIDER)
    : healthy

  // 4. Score each eligible candidate
  const scored = eligible.map(c => ({
    ...c,
    composite: computeComposite(c, capability)
  }))

  // 5. Sort by composite score descending
  scored.sort((a, b) => b.composite - a.composite)

  return scored[0]
}
```

### Stage 5: Fallback Chain Assembly (<5ms)

The fallback chain provides ordered alternatives when the primary provider fails (timeout, rate limit, server error, model overload).

**Chain Construction Rules:**

1. Primary is local -> fallback to cloud providers (Anthropic, OpenAI, Gemini) ordered by composite score
2. Primary is cloud -> fallback to local first, then other cloud providers
3. Privacy-sensitive -> fallback chain contains LOCAL_PROVIDER entries ONLY
4. Image generation -> fallback order: IMAGE_GEMINI, IMAGE_OPENAI, IMAGE_LOCAL
5. File generation -> fallback order: FILE_GENERATION, LOCAL_FILE_GENERATION, ANTHROPIC

**Current Implementation (routing.manager.ts, buildFallbackChain):**

The existing implementation builds the chain based on provider type:
- Local primary: adds all healthy cloud providers (Anthropic, OpenAI, Gemini)
- Cloud primary: adds local first, then other healthy cloud providers
- Each entry is filtered by `isConnectorHealthy()` which checks the `connectorHealth` map in context

**Chain Depth and Timeout:**

| Position | Timeout Budget | Total Elapsed |
|----------|---------------|---------------|
| Primary | 30s | 30s |
| Fallback 1 | 20s | 50s |
| Fallback 2 | 15s | 65s |
| Fallback 3 | 10s | 75s |
| Ultimate (local) | 30s | 105s |

If all fallbacks exhaust, the system stores an error ASSISTANT message (per the hard-won lesson documented in CLAUDE.md Phase 5).

---

## Section 2: Smart Routing Design Patterns

### Pattern 1: Keyword Cascade

Check the most specific category first before falling through to general categories. This prevents common words from triggering broad categories when the intent is narrow.

**Problem:** The word "security" appears in both `SECURITY_KEYWORDS` and `CODING_KEYWORDS`. A message like "Review the security of this API endpoint" should route to security-aware local coding, not generic cloud coding.

**Implementation:**

```
Priority order in detectCategoryRole():
  1. Security (most specific, privacy implications)
  2. Medical (domain-specific, compliance)
  3. Legal (domain-specific, compliance)
  4. Coding (broad but specific tooling)
  5. Infrastructure (subset of coding)
  6. Data Analysis (analytical)
  7. Reasoning (abstract)
  8. Thinking (research-oriented)
  9. Business (general)
  10. Translation (linguistic)
  11. Creative Writing (general)
```

**Rule:** When adding new categories, insert them at the correct specificity level. A new "Finance" category would slot between Legal (3) and Coding (4) because financial data has compliance requirements.

### Pattern 2: Multi-Intent Resolution

When a message matches multiple categories simultaneously, pick the dominant one based on keyword density, not just first match.

**Current behavior:** First match wins (cascade). This works for 90%+ of messages because the cascade order is correct.

**Proposed enhancement for ambiguous cases:**

```
1. Run all detectors, collect scores
2. If top two scores are within 20% of each other, apply tie-breaking:
   a. Prefer the category that matches more MULTI-WORD keywords (higher specificity)
   b. Prefer the category whose keywords appear earlier in the message
   c. Prefer the category with privacy implications (conservative)
3. If still tied, use the cascade priority order
```

**Example:**

Message: "Analyze this patient's blood test results and create a visualization dashboard"

Matches:
- MEDICAL: "patient", "blood test", "results" -> score 3.0 (3 keywords, one multi-word)
- DATA_ANALYSIS: "analyze", "visualization", "dashboard" -> score 3.0 (3 keywords)

Tie-breaking: MEDICAL wins because (a) "blood test" is multi-word, and (c) medical has privacy implications.

### Pattern 3: Context-Aware Routing

Use thread history to bias toward the established category. If the last 5 messages in a thread were all about coding, a new message saying "optimize this" should route to coding, not generic optimization.

**Thread Context Signal:**

```
function getThreadBias(threadHistory: Message[]): CategoryBias | null {
  const recentMessages = threadHistory.slice(-5)
  const recentDecisions = recentMessages
    .map(m => m.metadata?.routingDecision?.reasonTags)
    .filter(Boolean)

  // Count category tags
  const categoryCounts = countCategories(recentDecisions)

  // If 3+ of last 5 used the same category, bias toward it
  const dominant = Object.entries(categoryCounts)
    .find(([_, count]) => count >= 3)

  if (dominant) {
    return { category: dominant[0], boost: 0.15 }  // +15% confidence
  }
  return null
}
```

**Application:** When thread bias exists, add the boost to the matching category's score before comparison. This prevents unnecessary category switching mid-conversation.

**Constraint:** Thread bias is NEVER applied to privacy-sensitive categories. A coding thread that suddenly mentions "patient data" must still trigger privacy enforcement.

### Pattern 4: Confidence Escalation

If the local model's confidence in its routing decision falls below the threshold, escalate to cloud for higher quality.

**Current confidence constants (routing.constants.ts):**

```
CONFIDENCE_EXACT_KEYWORD      = 0.95  // Direct keyword match
CONFIDENCE_VERB_NOUN_COMBO    = 0.90  // Verb + noun combination
CONFIDENCE_CATEGORY_KEYWORD   = 0.85  // Category keyword match
CONFIDENCE_HEURISTIC_FALLBACK = 0.60  // No keyword match, heuristic only
CONFIDENCE_PRIVACY_ENFORCED   = 0.95  // Privacy override
```

**Escalation Rules:**

| Confidence Range | Action | Rationale |
|-----------------|--------|-----------|
| >= 0.85 | Accept local decision | High confidence, local model is sufficient |
| 0.70 - 0.84 | Accept but log for review | Borderline, may need keyword tuning |
| 0.50 - 0.69 | Escalate to Ollama LLM router | Let the local LLM make the call |
| < 0.50 | Escalate to cloud provider | No local confidence, need cloud quality |

**Implementation:** In `handleAuto()`, after `detectCategoryRoute()` returns with confidence 0.85, the decision is accepted. If `detectCategoryRoute()` returns null (no keyword match), the pipeline falls through to `OllamaRouterManager.route()` which uses the local LLM for intelligent routing. If that also fails (Ollama down), `handleAutoHeuristic()` uses message length + connector health as a last resort at confidence 0.60.

### Pattern 5: Privacy Firewall

The Privacy Firewall is an absolute constraint: content matching `PRIVACY_KEYWORDS` must NEVER leave the local machine, even as a fallback.

**Enforcement Points:**

1. `handleAuto()` checks `detectPrivacySensitive()` FIRST, before any other detection
2. `buildLocalPrivacyDecision()` filters the fallback chain to LOCAL_PROVIDER only
3. Even if Ollama is down, the system returns LOCAL with a warning rather than sending to cloud
4. Audit logging records every privacy enforcement event for compliance review

**Edge Cases:**

| Scenario | Behavior |
|----------|----------|
| User explicitly sets MANUAL_MODEL with cloud provider, but message contains PII | Allow -- user explicitly chose. Log warning. |
| User sets AUTO mode, message contains PII | Force LOCAL, no cloud fallback |
| Privacy keyword in thread history but not current message | Do NOT enforce -- only current message triggers |
| Ambiguous keyword: "secret" could mean a cooking secret or a password | Enforce conservatively -- assume sensitive |
| Attached file contains PII but message text does not | Current: no enforcement (file content not scanned at routing time). Future: scan file metadata. |

### Pattern 6: Cost Budget Tracking

Monthly budget caps per provider prevent unexpected cloud bills. This is a future enhancement.

**Budget Structure:**

```
type ProviderBudget = {
  provider: string
  monthlyLimitUsd: number
  currentSpendUsd: number
  resetDay: number  // day of month to reset
  warningThresholdPercent: number  // emit warning at this percentage
  hardCapEnabled: boolean  // if true, stop routing to this provider at 100%
}
```

**Budget-Aware Selection:**

```
1. Before selecting a cloud provider, check budget
2. If spend >= 80% of limit: emit warning event via RabbitMQ
3. If spend >= 100% and hardCapEnabled: exclude from candidate list
4. If all cloud providers are capped: fall back to LOCAL
5. Estimate request cost BEFORE sending (based on input token count and model pricing)
```

**Cost Estimation per Provider:**

| Provider | Input $/1M tokens | Output $/1M tokens | Avg Request Cost |
|----------|-------------------|-------------------|------------------|
| OPENAI / gpt-4o-mini | $0.15 | $0.60 | ~$0.001 |
| ANTHROPIC / claude-sonnet-4 | $3.00 | $15.00 | ~$0.02 |
| ANTHROPIC / claude-opus-4 | $15.00 | $75.00 | ~$0.10 |
| GEMINI / gemini-2.5-flash | $0.15 | $0.60 | ~$0.001 |
| DEEPSEEK / deepseek-chat | $0.14 | $0.28 | ~$0.0005 |
| local-ollama | $0.00 | $0.00 | $0.00 |

### Pattern 7: Latency SLA

Different capability classes have different latency expectations. The routing engine should prefer lower-latency providers for time-sensitive tasks.

**Latency Targets per Capability:**

| Capability | Target p50 | Target p95 | Max Acceptable | Preferred Provider |
|------------|-----------|-----------|----------------|-------------------|
| GENERAL_CHAT | <1s | <3s | 5s | local-ollama, OpenAI gpt-4o-mini |
| CREATIVE_WRITING | <2s | <5s | 10s | OpenAI gpt-4o-mini |
| CODING | <3s | <8s | 15s | LOCAL_CODING, Anthropic |
| TRANSLATION | <1s | <3s | 5s | local-ollama |
| SUMMARIZATION | <2s | <5s | 10s | local-ollama, Gemini |
| REASONING | <5s | <15s | 30s | LOCAL_REASONING, Anthropic opus |
| THINKING | <5s | <20s | 60s | LOCAL_THINKING |
| DATA_ANALYSIS | <3s | <10s | 30s | Gemini |
| IMAGE_GENERATION | <5s | <15s | 30s | IMAGE_GEMINI |
| FILE_GENERATION | <3s | <10s | 30s | FILE_GENERATION |

**Latency-Aware Boost:**

When a capability requires low latency (GENERAL_CHAT, TRANSLATION), add +2 to the latency score of providers known to be fast (local, OpenAI). When high latency is tolerable (REASONING, THINKING), the quality score weight increases to 0.5 and latency drops to 0.1.

### Pattern 8: Health-Aware Selection

Skip unhealthy providers and prefer providers with recent success. Health data comes from `RoutingContext.connectorHealth` and `RoutingContext.runtimeHealth`.

**Health Signal Sources:**

| Signal | Source | Update Frequency | Weight |
|--------|--------|-----------------|--------|
| Connector health check | connector-service periodic checks | Every 60s | Primary |
| Runtime health (Ollama) | ollama-service /health endpoint | Every 30s | Primary |
| Recent request success | Last 10 requests per provider | Per request | Secondary |
| Rate limit status | 429 responses from provider | Per request | Blocking |
| Model availability | Ollama model list, connector model sync | Every 5 min | Informational |

**Current Implementation:**

```typescript
private isConnectorHealthy(provider: string, context: RoutingContext): boolean {
  const healthMap = context.connectorHealth
  if (!healthMap || Object.keys(healthMap).length === 0) return true  // assume healthy
  return healthMap[provider] ?? false
}

private isRuntimeHealthy(runtime: string, context: RoutingContext): boolean {
  return context.runtimeHealth?.[runtime] ?? true  // assume healthy
}
```

**Best-Effort Policy:** When no health data exists, the system assumes all providers are healthy. This prevents cold-start failures when health checks have not yet run.

### Pattern 9: Model Specialization

Route to the best model for the task within a provider. Different local models excel at different tasks based on their training focus.

**Current Role-to-Model Mapping (via CATEGORY_TO_ROLE_MAP):**

| Category | Role | Best Local Model Family |
|----------|------|------------------------|
| coding | LOCAL_CODING | Qwen 2.5 Coder series |
| reasoning | LOCAL_REASONING | DeepSeek R1 series |
| thinking | LOCAL_THINKING | GLM-4.7 Thinking, MiMo-V2 |
| chat | LOCAL_FALLBACK_CHAT | Gemma 3 4B |
| file-generation | LOCAL_FILE_GENERATION | Qwen 3 7B, Mistral Small 3 |
| image-generation | LOCAL_IMAGE_GENERATION | FLUX, SD (ComfyUI) |
| infrastructure | LOCAL_CODING | Qwen 2.5 Coder (IaC) |
| data-analysis | LOCAL_REASONING | DeepSeek R1 (analytical) |
| security | LOCAL_CODING | Qwen 2.5 Coder (audit) |
| medical | LOCAL_REASONING | DeepSeek R1 (forced local) |
| legal | LOCAL_REASONING | DeepSeek R1 (forced local) |
| translation | LOCAL_FALLBACK_CHAT | Gemma 3 (multilingual) |

**Model Selection Algorithm (detectCategoryRoute -> findModelForRole):**

```typescript
private async findModelForRole(role: LocalModelRole): Promise<InstalledModelInfo | null> {
  const models = await this.promptBuilder.fetchInstalledModels()
  return models.find(m => m.roles.includes(role)) ?? null
}
```

If no model is installed for the required role, the method returns null and the pipeline falls through to the Ollama LLM router or heuristic fallback.

### Pattern 10: Dynamic Prompt Adaptation

The router prompt sent to the local LLM changes based on which models are currently installed. This is handled by `PromptBuilderManager`.

**How It Works:**

1. `PromptBuilderManager.fetchInstalledModels()` calls the ollama-service internal API
2. Models are grouped by category (CODING, REASONING, THINKING, etc.)
3. The prompt is built dynamically to only include installed models as routing options
4. A 5-minute TTL cache prevents excessive API calls
5. Cache is invalidated on `MODEL_PULLED` and `MODEL_DELETED` events via RabbitMQ

**Prompt Evolution Examples:**

Minimal installation (only default models):
```
Available local models:
- gemma3:4b (general chat, routing)
- llama3.2:3b (reasoning)
- phi3:mini (coding, math)
```

Full installation (catalog models pulled):
```
Available local models:
CODING:
- qwen2.5-coder:14b (14B params, code generation, debugging)
- deepseek-coder-v2:16b (16B params, code completion)
REASONING:
- deepseek-r1:14b (14B params, chain-of-thought reasoning)
- qwq:32b (32B params, deep reasoning)
THINKING:
- glm-4.7-thinking (thinking, research, analysis)
FILE_GENERATION:
- qwen3:7b (7B params, structured output)
GENERAL:
- gemma3:4b (4B params, general chat)
```

**Fallback:** If `fetchInstalledModels()` fails (ollama-service down), the system uses the static `ROUTER_PROMPT_TEMPLATE` defined in `routing.constants.ts`.

---

## Section 3: Local Model Intelligence Matrix

Scoring each model family across routing duties. Scores are 0-10 based on model architecture, training focus, benchmark results, and empirical testing within ClawAI.

### Model Family Scorecards

#### 1. Gemma (Google)

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 8 | Reliable instruction following, consistent JSON output |
| Fallback Chat | 8 | Strong general purpose, good multilingual |
| Coding | 5 | Adequate for simple code, weak on complex debugging |
| Summarization | 7 | Good at extracting key points |
| Multilingual | 8 | Trained on 100+ languages |

**Recommended Sizes:**
- 16GB RAM: gemma3:4b (default router + chat)
- 32GB RAM: gemma3:4b (router) + gemma3:9b (enhanced chat)
- 64GB RAM: gemma3:4b (router) + gemma3:27b (premium chat)

**Benchmark Protocol:**
- Router test: 100 routing prompts, measure JSON parse success rate and routing accuracy
- Chat test: 50 general questions, measure response quality (human eval 1-5 scale)
- Multilingual test: Same 20 questions in EN, AR, FR, DE, ES -- measure quality consistency

#### 2. Qwen (Alibaba)

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 7 | Good but slightly verbose, may need output trimming |
| Fallback Chat | 7 | Strong general purpose |
| Coding | 9 | Qwen 2.5 Coder series is top-tier for code generation |
| Summarization | 7 | Adequate |
| Multilingual | 9 | Excellent CJK + strong European languages |

**Recommended Sizes:**
- 16GB RAM: qwen2.5-coder:7b (coding specialist)
- 32GB RAM: qwen2.5-coder:14b (primary coding) + qwen3:7b (file generation)
- 64GB RAM: qwen2.5-coder:32b (premium coding) + qwen3:7b (file gen)

**Benchmark Protocol:**
- Coding test: 50 LeetCode-style problems (easy/medium/hard), measure pass@1 rate
- File gen test: 20 document generation prompts, measure structure + content quality
- Code review test: 10 code snippets with known bugs, measure detection accuracy

#### 3. Llama (Meta)

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 6 | Usable but less consistent JSON output than Gemma |
| Fallback Chat | 7 | Strong conversational ability |
| Coding | 6 | Adequate, not specialized |
| Summarization | 7 | Good at concise summaries |
| Multilingual | 6 | English-centric, weaker on non-Latin scripts |

**Recommended Sizes:**
- 16GB RAM: llama3.2:3b (reasoning fallback)
- 32GB RAM: llama3.3:8b (file generation)
- 64GB RAM: llama4-maverick (thinking/agentic tasks)

**Benchmark Protocol:**
- Reasoning test: 30 logic puzzles, measure step-by-step accuracy
- Chat test: 50 conversational prompts, measure coherence and helpfulness
- Instruction following: 20 complex multi-step instructions, measure completion rate

#### 4. DeepSeek

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 5 | Slow for routing, better as a worker model |
| Fallback Chat | 6 | Verbose responses, strong on technical topics |
| Coding | 8 | DeepSeek Coder V2 excellent for code completion |
| Summarization | 6 | Tends to over-explain |
| Multilingual | 5 | Primarily English + Chinese |

**Recommended Sizes:**
- 16GB RAM: deepseek-r1:7b (reasoning specialist)
- 32GB RAM: deepseek-r1:14b (enhanced reasoning) + deepseek-coder-v2:16b (coding)
- 64GB RAM: deepseek-r1:32b (deep reasoning)

**Benchmark Protocol:**
- Reasoning test: 30 mathematical proofs, measure correctness
- Chain-of-thought test: 20 multi-step problems, measure intermediate step quality
- Coding test: 30 algorithm problems, measure solution correctness and efficiency

#### 5. Mistral

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 7 | Clean JSON output, good instruction following |
| Fallback Chat | 7 | Balanced quality and speed |
| Coding | 6 | Adequate, not specialized |
| Summarization | 8 | Excellent at structured summaries |
| Multilingual | 8 | Strong European languages (French, German, Spanish) |

**Recommended Sizes:**
- 16GB RAM: mistral-small3:7b (routing + file generation)
- 32GB RAM: mistral-small3:7b (file gen) + another specialist
- 64GB RAM: mistral-medium (if available via Ollama)

**Benchmark Protocol:**
- Summarization test: 20 long documents (2000+ words), measure summary quality
- File generation test: 15 document prompts, measure format correctness
- Multilingual test: 20 questions in FR, DE, ES, IT, PT -- measure quality

#### 6. Phi (Microsoft)

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 7 | Phi-4-mini is fast and accurate for classification |
| Fallback Chat | 6 | Concise but sometimes too terse |
| Coding | 8 | Phi-3/Phi-4 strong on math and code |
| Summarization | 6 | Adequate |
| Multilingual | 5 | English-centric |

**Recommended Sizes:**
- 16GB RAM: phi3:mini (coding/math specialist), phi-4-mini:3.8b (router)
- 32GB RAM: phi-4:14b (enhanced coding + reasoning)
- 64GB RAM: phi-4:14b + dedicated coding model

**Benchmark Protocol:**
- Math test: 30 calculus/algebra problems, measure solution accuracy
- Coding test: 30 algorithm implementations, measure correctness
- Speed test: 50 routing prompts, measure tokens/second

#### 7. StarCoder (BigCode)

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 2 | Not designed for routing/classification |
| Fallback Chat | 3 | Poor conversational ability |
| Coding | 7 | Specialized for code, fill-in-the-middle |
| Summarization | 3 | Not designed for text summarization |
| Multilingual | 3 | Code-only, no natural language multilingual |

**Recommended Sizes:**
- 16GB RAM: starcoder2:7b (code completion specialist)
- 32GB RAM: starcoder2:7b (dedicated code completion alongside general model)
- 64GB RAM: starcoder2:15b (if available)

**Benchmark Protocol:**
- Code completion test: 50 fill-in-the-middle prompts, measure exact match rate
- Code generation test: 30 function implementations, measure pass@1
- NOT suitable for routing, chat, or summarization benchmarks

#### 8. SmolLM2 (Hugging Face)

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 6 | Fast classifier, limited context |
| Fallback Chat | 4 | Too small for quality chat |
| Coding | 3 | Too small for code generation |
| Summarization | 5 | Basic summarization only |
| Multilingual | 4 | Limited training data diversity |

**Recommended Sizes:**
- 16GB RAM: smollm2:1.7b (ultra-fast router only)
- 32GB RAM: smollm2:1.7b (router) + larger worker models
- 64GB RAM: Not recommended at this tier (use better models)

**Benchmark Protocol:**
- Router speed test: 100 prompts, measure latency (target <200ms)
- Classification accuracy: 100 labeled prompts, measure category accuracy
- NOT suitable for generation benchmarks

#### 9. GLM / MiMo (Research Models)

| Capability | Score | Notes |
|------------|-------|-------|
| Router Duty | 4 | Too large for routing duty |
| Fallback Chat | 7 | Good for complex conversations |
| Coding | 6 | Adequate |
| Summarization | 7 | Good analytical summaries |
| Multilingual | 7 | Strong on CJK languages |

**Recommended Sizes:**
- 16GB RAM: Not recommended (models too large)
- 32GB RAM: mimo-v2-flash (thinking tasks)
- 64GB RAM: glm-4.7-thinking (premium thinking/research)

**Benchmark Protocol:**
- Thinking test: 20 research-style queries, measure depth and accuracy
- Multi-step reasoning: 15 complex problems requiring intermediate steps
- Agentic test: 10 tasks requiring tool use decisions

---

## Section 4: External Connector Intelligence Matrix

### Provider Quality Matrix (Score 0-10 per Capability Class)

#### OPENAI / gpt-4o-mini

| Capability | Quality | Best Use | Avoid |
|------------|---------|----------|-------|
| CODE_GENERATION | 6 | Quick prototypes | Complex multi-file |
| CODE_REVIEW | 5 | Simple reviews | Security audits |
| DEBUGGING | 5 | Simple bugs | Complex system issues |
| INFRASTRUCTURE | 5 | Basic configs | Multi-region architecture |
| DATA_ANALYSIS | 6 | Summary analysis | Large dataset processing |
| MATH_REASONING | 5 | Basic calculations | Formal proofs |
| CREATIVE_WRITING | 9 | Blog posts, copy, social media | -- |
| TECHNICAL_WRITING | 7 | Documentation, READMEs | Formal specs |
| BUSINESS_ANALYSIS | 7 | Market research, summaries | Financial modeling |
| IMAGE_GENERATION | N/A | -- | -- |
| FILE_GENERATION | 6 | Basic documents | Complex structured output |
| TRANSLATION | 7 | Common languages | Rare languages |
| SUMMARIZATION | 8 | Meeting notes, articles | -- |
| PRIVACY_SENSITIVE | 0 | NEVER | Always |
| GENERAL_CHAT | 8 | Conversational AI | -- |

**Cost:** Input $0.15/1M tokens, Output $0.60/1M tokens
**Latency:** p50: 800ms, p95: 2.5s, p99: 5s
**Privacy:** Cloud. Data may be used for training unless opted out via API agreement.
**When to NEVER use:** Privacy-sensitive content. Formal mathematical proofs. Security audit of proprietary code.

#### ANTHROPIC / claude-sonnet-4

| Capability | Quality | Best Use | Avoid |
|------------|---------|----------|-------|
| CODE_GENERATION | 9 | Complex multi-file, refactoring | Simple one-liners (overkill) |
| CODE_REVIEW | 9 | Security-aware review, architecture | -- |
| DEBUGGING | 9 | Complex system issues, race conditions | -- |
| INFRASTRUCTURE | 8 | Terraform, K8s, multi-region | -- |
| DATA_ANALYSIS | 7 | Code-oriented analysis | Large CSV processing |
| MATH_REASONING | 7 | Applied math, optimization | Formal proofs (use opus) |
| CREATIVE_WRITING | 6 | Technical blog posts | Marketing copy (use OpenAI) |
| TECHNICAL_WRITING | 8 | Architecture docs, ADRs | -- |
| BUSINESS_ANALYSIS | 8 | PRDs, technical specs | -- |
| IMAGE_GENERATION | N/A | -- | -- |
| FILE_GENERATION | 7 | Structured documents | -- |
| TRANSLATION | 6 | Code comments, technical text | Literary translation |
| SUMMARIZATION | 7 | Technical summaries | -- |
| PRIVACY_SENSITIVE | 0 | NEVER | Always |
| GENERAL_CHAT | 7 | Technical conversations | Casual chat (overkill) |

**Cost:** Input $3.00/1M tokens, Output $15.00/1M tokens
**Latency:** p50: 1.5s, p95: 5s, p99: 12s
**Privacy:** Cloud. No training on API data.
**When to NEVER use:** Cost-sensitive simple tasks. Privacy-sensitive content. Casual greetings.

#### ANTHROPIC / claude-opus-4

| Capability | Quality | Best Use | Avoid |
|------------|---------|----------|-------|
| CODE_GENERATION | 10 | Architecture, complex systems | Simple CRUD (wasteful) |
| CODE_REVIEW | 10 | Security audits, design review | -- |
| DEBUGGING | 9 | Distributed system issues | Simple type errors |
| INFRASTRUCTURE | 9 | Multi-region, disaster recovery | Basic Docker configs |
| DATA_ANALYSIS | 8 | Complex analytical reasoning | Routine data cleaning |
| MATH_REASONING | 9 | Formal proofs, optimization | Basic arithmetic |
| CREATIVE_WRITING | 7 | Long-form, nuanced writing | Short social posts |
| TECHNICAL_WRITING | 9 | Architecture docs, RFCs | Simple READMEs |
| BUSINESS_ANALYSIS | 9 | Strategy, complex analysis | Simple KPI reports |
| IMAGE_GENERATION | N/A | -- | -- |
| FILE_GENERATION | 8 | Complex documents | Simple exports |
| TRANSLATION | 7 | Nuanced translation | Bulk translation |
| SUMMARIZATION | 8 | Complex document synthesis | Short article summaries |
| PRIVACY_SENSITIVE | 0 | NEVER | Always |
| GENERAL_CHAT | 6 | Deep technical discussion | Casual chat (very wasteful) |

**Cost:** Input $15.00/1M tokens, Output $75.00/1M tokens
**Latency:** p50: 3s, p95: 10s, p99: 25s
**Privacy:** Cloud. No training on API data.
**When to NEVER use:** Any routine task. Cost-sensitive applications. Simple Q&A. Privacy-sensitive.

#### GEMINI / gemini-2.5-flash

| Capability | Quality | Best Use | Avoid |
|------------|---------|----------|-------|
| CODE_GENERATION | 7 | Multi-file with context | Very specialized languages |
| CODE_REVIEW | 7 | Large codebase review (1M context) | -- |
| DEBUGGING | 6 | Log analysis, large traces | Complex concurrency bugs |
| INFRASTRUCTURE | 7 | Cloud architecture (GCP focus) | AWS-specific tasks |
| DATA_ANALYSIS | 9 | Large CSV/JSON, 1M token context | -- |
| MATH_REASONING | 7 | Applied math, statistics | Formal proofs |
| CREATIVE_WRITING | 7 | Content generation | Nuanced literary writing |
| TECHNICAL_WRITING | 7 | Documentation | -- |
| BUSINESS_ANALYSIS | 8 | Market research, report analysis | -- |
| IMAGE_GENERATION | 8 | gemini-2.5-flash-image variant | -- |
| FILE_GENERATION | 7 | Data-driven documents | -- |
| TRANSLATION | 8 | 100+ languages | -- |
| SUMMARIZATION | 9 | Long document summarization | -- |
| PRIVACY_SENSITIVE | 0 | NEVER | Always |
| GENERAL_CHAT | 8 | Multimodal conversations | -- |

**Cost:** Input $0.15/1M tokens, Output $0.60/1M tokens
**Latency:** p50: 1s, p95: 3s, p99: 8s
**Privacy:** Cloud. Data processed per Google Cloud terms.
**When to NEVER use:** Privacy-sensitive. Attorney-client privileged content.

#### DEEPSEEK / deepseek-chat

| Capability | Quality | Best Use | Avoid |
|------------|---------|----------|-------|
| CODE_GENERATION | 8 | Algorithm implementation, competitive programming | UI/UX code |
| CODE_REVIEW | 6 | Algorithm review | Security audits |
| DEBUGGING | 6 | Logic errors, algorithm bugs | Framework-specific issues |
| INFRASTRUCTURE | 4 | Basic configs | Complex multi-cloud |
| DATA_ANALYSIS | 6 | Statistical analysis | Large dataset processing |
| MATH_REASONING | 9 | Competitive math, formal proofs | -- |
| CREATIVE_WRITING | 4 | Technical writing | Marketing copy |
| TECHNICAL_WRITING | 5 | Technical docs | Polished documentation |
| BUSINESS_ANALYSIS | 5 | Quantitative analysis | Qualitative analysis |
| IMAGE_GENERATION | N/A | -- | -- |
| FILE_GENERATION | 5 | Data reports | Formatted documents |
| TRANSLATION | 5 | EN-ZH, technical | Literary, non-CJK |
| SUMMARIZATION | 5 | Technical summaries | Executive summaries |
| PRIVACY_SENSITIVE | 0 | NEVER | Always |
| GENERAL_CHAT | 5 | Technical Q&A | Casual conversation |

**Cost:** Input $0.14/1M tokens, Output $0.28/1M tokens
**Latency:** p50: 1.5s, p95: 5s, p99: 15s
**Privacy:** Cloud. Data processed in China. Not suitable for regulated industries.
**When to NEVER use:** Privacy-sensitive. GDPR-regulated data. HIPAA content. Non-technical writing.

#### IMAGE_GEMINI / gemini-2.5-flash-image

| Capability | Quality | Best Use | Avoid |
|------------|---------|----------|-------|
| IMAGE_GENERATION | 8 | Photo-style, illustrations, reference-based | Pixel-perfect UI mockups |

**Cost:** ~$0.04/image
**Latency:** p50: 5s, p95: 12s, p99: 20s
**Privacy:** Cloud.
**When to NEVER use:** Privacy-sensitive image content.

#### IMAGE_OPENAI / dall-e-3

| Capability | Quality | Best Use | Avoid |
|------------|---------|----------|-------|
| IMAGE_GENERATION | 9 | Photorealistic, creative, artistic | Batch generation (expensive) |

**Cost:** ~$0.04-0.12/image (depends on resolution)
**Latency:** p50: 8s, p95: 15s, p99: 25s
**Privacy:** Cloud.
**When to NEVER use:** Budget-constrained bulk image generation.

#### IMAGE_LOCAL / sdxl-turbo (ComfyUI)

| Capability | Quality | Best Use | Avoid |
|------------|---------|----------|-------|
| IMAGE_GENERATION | 6 | Quick drafts, iteration, private content | Final production images |

**Cost:** $0.00/image (local compute)
**Latency:** p50: 3s, p95: 8s, p99: 15s (GPU dependent)
**Privacy:** Fully local.
**When to NEVER use:** When high quality is required and cloud is available.

---

## Section 5: Experiment Lab -- 100 Iterations

All experiments use the same format and scoring framework defined in `god-mode-routing-experiments.md`. Experiments 1-50 are documented there. This section extends to iterations 51-150.

### Engineering Experiments (51-70)

#### Experiment 51: GraphQL Schema Design

```
Iteration:             51
Hypothesis:            "GraphQL schema design should route to coding model"
Input:                 "Design a GraphQL schema for an e-commerce platform with products, categories, orders, users, and reviews including pagination, filtering, and nested resolvers"
Role Simulation:       Backend Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:8 / L:9 / C:10 / S:10 / E:8
Composite:             8.90
Action:                Verify "graphql" in CODING_KEYWORDS
```

#### Experiment 52: Rust Lifetime Debugging

```
Iteration:             52
Hypothesis:            "Language-specific debugging should route to coding specialist"
Input:                 "Why does this Rust function fail with 'borrowed value does not live long enough'? fn process(data: &str) -> &str { let result = data.to_uppercase(); &result }"
Role Simulation:       Software Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                Add "rust", "lifetime", "borrow checker" to CODING_KEYWORDS
```

#### Experiment 53: Microservice Decomposition

```
Iteration:             53
Hypothesis:            "Architecture decomposition requires deep reasoning"
Input:                 "Decompose this monolithic Django application into microservices. Current modules: auth, billing, notifications, inventory, orders, shipping, analytics. Define service boundaries, inter-service communication, and data ownership"
Role Simulation:       Cloud Architect
Expected Route:        ANTHROPIC / claude-opus-4
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:9 / L:6 / C:5 / S:7 / E:8
Composite:             7.35
Action:                Add "decompose", "service boundaries", "data ownership" to REASONING_KEYWORDS
```

#### Experiment 54: WebSocket Authentication

```
Iteration:             54
Hypothesis:            "WebSocket security questions combine coding and security"
Input:                 "Implement WebSocket authentication with JWT token verification on connection, automatic token refresh, and graceful disconnection on auth failure"
Role Simulation:       Backend Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                "websocket" already in CODING_KEYWORDS; verify "authentication" triggers security check
```

#### Experiment 55: OWASP Top 10 Code Audit

```
Iteration:             55
Hypothesis:            "Security audits with OWASP reference should route locally for code privacy"
Input:                 "Audit this Express.js API against the OWASP Top 10. Check for injection, broken auth, sensitive data exposure, XXE, broken access control, misconfig, XSS, insecure deserialization, known vulnerabilities, and insufficient logging"
Role Simulation:       Penetration Tester
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: []  (must be local for code privacy)
Scores:                Q:7 / L:8 / C:10 / S:10 / E:8
Composite:             8.50
Action:                "owasp" already in SECURITY_KEYWORDS; route forced local via privacy cascade
```

#### Experiment 56: React Server Components Migration

```
Iteration:             56
Hypothesis:            "Framework migration tasks route to coding"
Input:                 "Migrate this React client-side rendered app to use React Server Components. Identify which components should be server vs client, handle the serialization boundary, and update data fetching from useEffect to async server components"
Role Simulation:       Frontend Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:8 / L:9 / C:10 / S:10 / E:7
Composite:             8.60
Action:                Add "server component", "client component", "serialization boundary", "use client" to CODING_KEYWORDS
```

#### Experiment 57: Database Sharding Strategy

```
Iteration:             57
Hypothesis:            "Sharding decisions require architectural reasoning"
Input:                 "Design a sharding strategy for a PostgreSQL database with 500M rows in the orders table. Consider hash-based vs range-based sharding, cross-shard queries, and migration plan from single-node"
Role Simulation:       Backend Engineer
Expected Route:        local-ollama / (LOCAL_REASONING model)
Acceptable Alternates: [ANTHROPIC / claude-opus-4]
Scores:                Q:8 / L:8 / C:10 / S:10 / E:7
Composite:             8.50
Action:                Add "sharding", "partition", "cross-shard" to REASONING_KEYWORDS
```

#### Experiment 58: CI Pipeline Optimization

```
Iteration:             58
Hypothesis:            "CI optimization is infrastructure + coding"
Input:                 "Our GitHub Actions CI takes 45 minutes. The pipeline runs lint, typecheck, 3000 unit tests, 200 integration tests, Docker build, and deployment. Optimize for <15 minutes"
Role Simulation:       DevOps Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                "ci/cd" and "github actions" already in CODING_KEYWORDS
```

#### Experiment 59: API Rate Limiting Design

```
Iteration:             59
Hypothesis:            "Rate limiting design combines coding and system design"
Input:                 "Design a distributed rate limiter using Redis with sliding window, token bucket fallback, per-user and per-IP limits, and Lua scripts for atomic operations"
Role Simulation:       Backend Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:8 / L:9 / C:10 / S:10 / E:7
Composite:             8.60
Action:                "rate limit", "redis" already in CODING_KEYWORDS; add "sliding window", "token bucket" to CODING_KEYWORDS
```

#### Experiment 60: Playwright E2E Test Suite

```
Iteration:             60
Hypothesis:            "E2E test generation routes to coding"
Input:                 "Write Playwright E2E tests for a multi-step checkout flow: cart review, shipping address form, payment method selection with Stripe elements, order confirmation, and email verification"
Role Simulation:       QA Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                "playwright" already in CODING_KEYWORDS
```

#### Experiment 61: Memory Leak Investigation

```
Iteration:             61
Hypothesis:            "Memory leak diagnosis requires debugging + reasoning"
Input:                 "Node.js process memory grows from 200MB to 4GB over 24 hours. Heap snapshots show EventEmitter listeners accumulating. How do I identify the leak source, fix it, and prevent regression?"
Role Simulation:       SRE
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4, ANTHROPIC / claude-opus-4]
Scores:                Q:8 / L:8 / C:10 / S:10 / E:7
Composite:             8.50
Action:                Add "memory leak", "heap snapshot", "event emitter" to CODING_KEYWORDS
```

#### Experiment 62: gRPC Service Implementation

```
Iteration:             62
Hypothesis:            "Protocol-specific service implementation is coding"
Input:                 "Implement a gRPC service in Go with protobuf definitions for a user management system. Include server streaming for real-time notifications and bidirectional streaming for chat"
Role Simulation:       Backend Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                Add "grpc", "protobuf", "proto", "streaming" to CODING_KEYWORDS
```

#### Experiment 63: OAuth2 PKCE Flow

```
Iteration:             63
Hypothesis:            "Authentication flow implementation is coding + security"
Input:                 "Implement OAuth2 PKCE flow for a React SPA with code verifier generation, authorization redirect, token exchange, silent refresh, and secure token storage"
Role Simulation:       Security Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:8 / L:9 / C:10 / S:10 / E:8
Composite:             8.70
Action:                Add "oauth", "pkce", "authorization", "token exchange" to SECURITY_KEYWORDS
```

#### Experiment 64: Docker Multi-Stage Build

```
Iteration:             64
Hypothesis:            "Docker build optimization is infrastructure"
Input:                 "Create a multi-stage Dockerfile for a monorepo NestJS app with Prisma. Minimize image size, cache npm install, separate build and runtime stages, and handle prisma generate correctly"
Role Simulation:       DevOps Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                "dockerfile", "docker-compose" already in CODING_KEYWORDS; "docker" in INFRASTRUCTURE_KEYWORDS
```

#### Experiment 65: Observability Stack Design

```
Iteration:             65
Hypothesis:            "Observability architecture requires infrastructure + reasoning"
Input:                 "Design an observability stack for 13 microservices: structured logging with correlation IDs, distributed tracing with OpenTelemetry, metrics with Prometheus, dashboards with Grafana, and alerting with PagerDuty"
Role Simulation:       SRE
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4, ANTHROPIC / claude-opus-4]
Scores:                Q:8 / L:8 / C:10 / S:10 / E:7
Composite:             8.50
Action:                Add "observability", "opentelemetry", "prometheus", "grafana" to INFRASTRUCTURE_KEYWORDS
```

#### Experiment 66: Zero-Downtime Migration

```
Iteration:             66
Hypothesis:            "Zero-downtime database migration is infrastructure + reasoning"
Input:                 "Plan a zero-downtime migration from PostgreSQL 14 to 16 with logical replication. The database has 2TB of data, 50 tables, and serves 500 RPS. Include rollback plan"
Role Simulation:       DBA / Backend Engineer
Expected Route:        local-ollama / (LOCAL_REASONING model)
Acceptable Alternates: [ANTHROPIC / claude-opus-4]
Scores:                Q:8 / L:8 / C:10 / S:10 / E:7
Composite:             8.50
Action:                Add "zero-downtime", "logical replication", "rollback plan" to REASONING_KEYWORDS
```

#### Experiment 67: Feature Flag System

```
Iteration:             67
Hypothesis:            "Feature flag system design is coding"
Input:                 "Build a feature flag system with gradual rollout (1%, 5%, 25%, 50%, 100%), user targeting rules, A/B test integration, and a React SDK for client-side evaluation"
Role Simulation:       Full-Stack Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                Add "feature flag", "gradual rollout", "a/b test" to CODING_KEYWORDS
```

#### Experiment 68: Disaster Recovery Plan

```
Iteration:             68
Hypothesis:            "DR planning is infrastructure + reasoning"
Input:                 "Create a disaster recovery plan for a multi-region AWS deployment. Define RPO <1 hour, RTO <15 minutes. Cover database failover, DNS switching, data replication lag handling, and communication procedures"
Role Simulation:       Cloud Architect
Expected Route:        ANTHROPIC / claude-opus-4
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:9 / L:6 / C:5 / S:7 / E:8
Composite:             7.35
Action:                Add "disaster recovery", "RPO", "RTO", "failover" to INFRASTRUCTURE_KEYWORDS
```

#### Experiment 69: Code Coverage Gap Analysis

```
Iteration:             69
Hypothesis:            "Coverage analysis is coding/QA"
Input:                 "Analyze the code coverage report: overall 67%, auth-service 82%, chat-service 45%, routing-service 71%. Identify the most critical uncovered paths and suggest which tests to write first"
Role Simulation:       QA Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                "coverage" already in CODING_KEYWORDS
```

#### Experiment 70: Event Sourcing Implementation

```
Iteration:             70
Hypothesis:            "Event sourcing is architecture + coding"
Input:                 "Implement event sourcing for the order management system: define domain events, build an event store with PostgreSQL, create projections for read models, handle event versioning, and implement snapshot optimization"
Role Simulation:       Backend Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4, ANTHROPIC / claude-opus-4]
Scores:                Q:8 / L:9 / C:10 / S:10 / E:7
Composite:             8.60
Action:                Add "event sourcing", "event store", "projection", "CQRS" to CODING_KEYWORDS
```

### Data Experiments (71-85)

#### Experiment 71: Time Series Forecasting

```
Iteration:             71
Hypothesis:            "Time series forecasting is data analysis + reasoning"
Input:                 "Build a time series forecasting model for monthly revenue using ARIMA, Prophet, and LSTM. Compare accuracy with MAPE and RMSE. The dataset has 36 months of data with strong seasonality"
Role Simulation:       Data Scientist
Expected Route:        local-ollama / (LOCAL_REASONING model)
Acceptable Alternates: [DEEPSEEK / deepseek-chat, ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:8 / C:10 / S:10 / E:7
Composite:             8.25
Action:                Add "time series", "forecasting", "ARIMA", "Prophet", "LSTM" to DATA_ANALYSIS_KEYWORDS
```

#### Experiment 72: ETL Pipeline Design

```
Iteration:             72
Hypothesis:            "ETL pipeline design is data engineering"
Input:                 "Design an ETL pipeline with Airflow DAGs to extract from 3 PostgreSQL sources, transform with dbt, load into BigQuery, and schedule incremental syncs every 15 minutes"
Role Simulation:       Data Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                "ETL", "pipeline", "Airflow", "dbt", "BigQuery" already in DATA_ANALYSIS_KEYWORDS
```

#### Experiment 73: A/B Test Statistical Significance

```
Iteration:             73
Hypothesis:            "Statistical analysis requires reasoning"
Input:                 "Analyze this A/B test: Control group 10,000 users with 3.2% conversion, Treatment group 10,000 users with 3.8% conversion. Calculate statistical significance, confidence interval, effect size (Cohen's d), and required sample size for 80% power"
Role Simulation:       Data Analyst
Expected Route:        local-ollama / (LOCAL_REASONING model)
Acceptable Alternates: [DEEPSEEK / deepseek-chat]
Scores:                Q:8 / L:8 / C:10 / S:10 / E:7
Composite:             8.50
Action:                Add "statistical significance", "confidence interval", "effect size", "sample size", "power analysis" to REASONING_KEYWORDS
```

#### Experiment 74: Feature Engineering Pipeline

```
Iteration:             74
Hypothesis:            "Feature engineering is coding + data analysis"
Input:                 "Create a feature engineering pipeline for a churn prediction model: handle missing values, encode categoricals (target encoding for high cardinality), create interaction features, apply PCA for dimensionality reduction, and handle class imbalance with SMOTE"
Role Simulation:       ML Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                Add "feature engineering", "PCA", "SMOTE", "target encoding" to DATA_ANALYSIS_KEYWORDS
```

#### Experiment 75: SQL Window Functions

```
Iteration:             75
Hypothesis:            "Complex SQL is coding"
Input:                 "Write a SQL query using window functions to calculate running total of sales, 7-day moving average, rank customers by lifetime value within each region, and identify the top 3 products by revenue per quarter"
Role Simulation:       Data Analyst
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:8 / L:9 / C:10 / S:10 / E:7
Composite:             8.60
Action:                "window function", "SQL" already in DATA_ANALYSIS_KEYWORDS and CODING_KEYWORDS
```

#### Experiment 76: Data Quality Framework

```
Iteration:             76
Hypothesis:            "Data quality monitoring is data analysis + infrastructure"
Input:                 "Design a data quality framework with Great Expectations: define expectations for null rates, uniqueness, referential integrity, value ranges, and freshness. Set up alerts for quality degradation"
Role Simulation:       Data Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                Add "great expectations", "data quality", "data validation" to DATA_ANALYSIS_KEYWORDS
```

#### Experiment 77: NLP Text Classification

```
Iteration:             77
Hypothesis:            "NLP model training is coding + data science"
Input:                 "Fine-tune a BERT model for multi-label text classification on 50K support tickets. Use Hugging Face Transformers, handle label imbalance, implement focal loss, and evaluate with micro/macro F1"
Role Simulation:       ML Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                Add "BERT", "fine-tune", "hugging face", "transformers", "NLP" to CODING_KEYWORDS
```

#### Experiment 78: Real-Time Dashboard

```
Iteration:             78
Hypothesis:            "Dashboard queries are data analysis"
Input:                 "Create a real-time analytics dashboard SQL backend: active users in last 5 minutes, hourly signups trend, conversion funnel per step, revenue by geography (heatmap data), and top 10 error codes"
Role Simulation:       Data Analyst
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [GEMINI / gemini-2.5-flash]
Scores:                Q:7 / L:9 / C:10 / S:10 / E:7
Composite:             8.45
Action:                "dashboard" already in DATA_ANALYSIS_KEYWORDS
```

#### Experiment 79: Bayesian Optimization

```
Iteration:             79
Hypothesis:            "Bayesian methods require mathematical reasoning"
Input:                 "Explain Bayesian optimization for hyperparameter tuning. Derive the acquisition function (Expected Improvement), explain the Gaussian Process surrogate model, and implement a simple BO loop in Python"
Role Simulation:       Research Scientist
Expected Route:        local-ollama / (LOCAL_REASONING model)
Acceptable Alternates: [DEEPSEEK / deepseek-chat, ANTHROPIC / claude-opus-4]
Scores:                Q:8 / L:8 / C:10 / S:10 / E:7
Composite:             8.50
Action:                Add "bayesian", "gaussian process", "acquisition function" to REASONING_KEYWORDS
```

#### Experiment 80: Data Lakehouse Architecture

```
Iteration:             80
Hypothesis:            "Lakehouse architecture design is data + infrastructure"
Input:                 "Design a data lakehouse architecture with Delta Lake on S3, Apache Spark for processing, dbt for transformations, and Unity Catalog for governance. Handle both batch and streaming workloads"
Role Simulation:       Data Engineer
Expected Route:        local-ollama / (LOCAL_CODING model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4, ANTHROPIC / claude-opus-4]
Scores:                Q:7 / L:8 / C:10 / S:10 / E:7
Composite:             8.25
Action:                Add "delta lake", "lakehouse", "unity catalog" to DATA_ANALYSIS_KEYWORDS
```

#### Experiment 81-85: (Prompt Engineering, Vector DB, Data Governance, Streaming Analytics, Model Monitoring)

```
Iteration:             81 | Role: Prompt Engineer | Input: "Design a prompt template for structured JSON extraction from unstructured medical notes" | Expected: OPENAI / gpt-4o-mini | Scores: Q:8/L:8/C:7/S:7/E:7 | Action: No change
Iteration:             82 | Role: ML Engineer | Input: "Implement a vector search pipeline with pgvector: indexing strategy, query optimization, hybrid search with BM25+embedding" | Expected: local-ollama / (LOCAL_CODING) | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: Add "pgvector", "vector search", "embedding" to CODING_KEYWORDS
Iteration:             83 | Role: Data Engineer | Input: "Implement a data governance framework with PII detection, data lineage tracking, access policies, and retention management" | Expected: local-ollama / (LOCAL_REASONING) | Scores: Q:7/L:8/C:10/S:10/E:7 | Action: Add "data governance", "data lineage" to DATA_ANALYSIS_KEYWORDS
Iteration:             84 | Role: Data Engineer | Input: "Build a streaming analytics pipeline with Kafka, Flink, and ClickHouse for real-time click tracking with 100K events/second" | Expected: local-ollama / (LOCAL_CODING) | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: "Kafka" already in DATA_ANALYSIS_KEYWORDS
Iteration:             85 | Role: ML Engineer | Input: "Set up ML model monitoring: data drift detection with KS test, prediction drift, feature importance shift, and automated retraining trigger" | Expected: local-ollama / (LOCAL_CODING) | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: Add "model monitoring", "data drift", "concept drift" to DATA_ANALYSIS_KEYWORDS
```

### Business Experiments (86-100)

#### Experiment 86: Quarterly Business Review

```
Iteration:             86
Hypothesis:            "QBR preparation is business analysis"
Input:                 "Prepare a quarterly business review deck outline: revenue performance vs target, key metrics (MRR, churn, NPS), product milestones achieved, risks and mitigations, next quarter OKRs"
Role Simulation:       Product Manager
Expected Route:        local-ollama / (LOCAL_FILE_GENERATION model)
Acceptable Alternates: [OPENAI / gpt-4o-mini, ANTHROPIC / claude-sonnet-4]
Scores:                Q:7 / L:8 / C:10 / S:10 / E:7
Composite:             8.25
Action:                "quarterly review" already in BUSINESS_KEYWORDS
```

#### Experiment 87: Competitor Analysis Matrix

```
Iteration:             87
Hypothesis:            "Competitor analysis is business + data"
Input:                 "Create a competitor analysis matrix comparing our product vs Cursor, Continue.dev, GitHub Copilot, and Codeium. Compare: pricing, features, model support, privacy, self-hosting, IDE support"
Role Simulation:       Product Manager
Expected Route:        local-ollama / (LOCAL_FILE_GENERATION model)
Acceptable Alternates: [ANTHROPIC / claude-sonnet-4, GEMINI / gemini-2.5-flash]
Scores:                Q:7 / L:8 / C:10 / S:10 / E:7
Composite:             8.25
Action:                "competitor" already in BUSINESS_KEYWORDS
```

#### Experiment 88-100: (Business, Operations, and Multi-Intent Experiments)

```
Iteration:             88 | Role: Growth Marketer | Input: "Write 10 LinkedIn post variations for launching our AI routing feature" | Expected: OPENAI / gpt-4o-mini | Scores: Q:8/L:9/C:7/S:7/E:7 | Action: No change
Iteration:             89 | Role: SEO Specialist | Input: "Generate meta descriptions for 20 product pages targeting long-tail keywords" | Expected: OPENAI / gpt-4o-mini | Scores: Q:8/L:9/C:7/S:7/E:7 | Action: Add "meta description", "SEO", "long-tail" to CREATIVE_WRITING_KEYWORDS
Iteration:             90 | Role: Technical Writer | Input: "Write API documentation for the routing service endpoints with request/response examples and error codes" | Expected: LOCAL_FILE_GENERATION | Scores: Q:7/L:8/C:10/S:10/E:7 | Action: No change
Iteration:             91 | Role: Sales Engineer | Input: "Draft a technical proposal for a healthcare client evaluating our local-first AI platform for HIPAA compliance" | Expected: local-ollama (privacy: healthcare) | Scores: Q:7/L:8/C:10/S:10/E:8 | Action: "HIPAA" triggers privacy enforcement correctly
Iteration:             92 | Role: Support Engineer | Input: "Draft a response to a customer reporting that their chat messages are timing out after 30 seconds" | Expected: local-ollama / gemma3:4b | Scores: Q:6/L:9/C:10/S:10/E:6 | Action: No change
Iteration:             93 | Role: Finance Analyst | Input: "Analyze Q3 revenue breakdown: subscription $450K, usage $120K, professional services $80K. Compare to Q2 and forecast Q4" | Expected: local-ollama (privacy: financial) | Scores: Q:7/L:8/C:10/S:10/E:8 | Action: "revenue" triggers privacy via PRIVACY_KEYWORDS
Iteration:             94 | Role: HR Manager | Input: "Draft a performance improvement plan for an engineer who has missed 3 sprint commitments and 2 code review deadlines" | Expected: local-ollama (privacy: PII) | Scores: Q:7/L:8/C:10/S:10/E:8 | Action: Add "performance improvement plan" to PRIVACY_KEYWORDS
Iteration:             95 | Role: Legal Counsel | Input: "Review this SaaS agreement clause on data processing and identify GDPR compliance gaps" | Expected: local-ollama (privacy: legal) | Scores: Q:7/L:8/C:10/S:10/E:8 | Action: "GDPR", "compliance" already in PRIVACY_KEYWORDS
Iteration:             96 | Role: Project Manager | Input: "Summarize the last 5 sprint retros and identify recurring themes in team blockers" | Expected: local-ollama / gemma3:4b | Scores: Q:6/L:9/C:10/S:10/E:6 | Action: Add "retro", "retrospective", "sprint review" to BUSINESS_KEYWORDS
Iteration:             97 | Role: Executive Assistant | Input: "Create an agenda for the board meeting covering: financial update, product roadmap, hiring plan, competitive landscape, and risk assessment" | Expected: local-ollama / gemma3:4b | Scores: Q:6/L:9/C:10/S:10/E:6 | Action: "board meeting" already in BUSINESS_KEYWORDS
```

### Operations and Edge Case Experiments (101-110)

```
Iteration:             101 | Role: SRE | Input: "Our service is returning 503 errors. Nginx logs show upstream timeout. Check: is it the load balancer, the service, or the database?" | Expected: local-ollama / (LOCAL_CODING) | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: Add "503", "upstream timeout" to INFRASTRUCTURE_KEYWORDS
Iteration:             102 | Role: DBA | Input: "PostgreSQL replication lag is 30 minutes. WAL sender is active but receiver is slow. Diagnose" | Expected: local-ollama / (LOCAL_CODING) | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: Add "replication lag", "WAL" to CODING_KEYWORDS
Iteration:             103 | Role: Support | Input: "How do I reset my password?" | Expected: local-ollama / gemma3:4b | Scores: Q:6/L:10/C:10/S:10/E:5 | Action: No change (short message, local fallback)
Iteration:             104 | Role: User | Input: "Hello!" | Expected: local-ollama / gemma3:4b | Scores: Q:5/L:10/C:10/S:10/E:5 | Action: No change (greeting, local)
Iteration:             105 | Role: User | Input: "Translate 'The meeting is at 3pm' to Arabic, French, and German" | Expected: local-ollama / gemma3:4b | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: "translate" triggers TRANSLATION_KEYWORDS
```

### Multimodal Experiments (111-120)

```
Iteration:             111 | Role: Designer | Input: "Create a cyberpunk city skyline at sunset with neon signs and flying cars" | Expected: IMAGE_GEMINI / gemini-2.5-flash-image | Scores: Q:8/L:7/C:6/S:7/E:8 | Action: "cyberpunk" triggers art style match
Iteration:             112 | Role: Designer | Input: "Generate a minimalist logo for a coffee shop called 'Brew'" | Expected: IMAGE_GEMINI / gemini-2.5-flash-image | Scores: Q:8/L:7/C:6/S:7/E:8 | Action: "logo" already in IMAGE_KEYWORDS
Iteration:             113 | Role: Marketer | Input: "Create a social media banner for our Black Friday sale: 40% off all plans" | Expected: IMAGE_GEMINI / gemini-2.5-flash-image | Scores: Q:8/L:7/C:6/S:7/E:8 | Action: "banner" already in IMAGE_KEYWORDS
Iteration:             114 | Role: Developer | Input: "Generate a PDF report of the Q3 sales data with charts and executive summary" | Expected: FILE_GENERATION / auto | Scores: Q:7/L:8/C:7/S:7/E:8 | Action: verb "generate" + format "pdf" triggers file-gen
Iteration:             115 | Role: Writer | Input: "Export this conversation as a markdown file" | Expected: FILE_GENERATION / auto | Scores: Q:7/L:8/C:7/S:7/E:8 | Action: "export" + "markdown" + "file" triggers file-gen
Iteration:             116 | Role: Designer | Input: "Draw a watercolor painting of a Japanese garden with cherry blossoms and a koi pond" | Expected: IMAGE_GEMINI / gemini-2.5-flash-image | Scores: Q:8/L:7/C:6/S:7/E:8 | Action: "watercolor" triggers art style; "draw" is image verb
Iteration:             117 | Role: User | Input: "What is in this image? [attached: screenshot.png]" | Expected: GEMINI / gemini-2.5-flash (vision) | Scores: Q:8/L:8/C:7/S:7/E:7 | Action: Image attachment triggers vision route, not image generation
Iteration:             118 | Role: Designer | Input: "Make something similar to this [attached: logo.png] but in blue" | Expected: IMAGE_GEMINI / gemini-2.5-flash-image | Scores: Q:8/L:7/C:6/S:7/E:8 | Action: "similar to this" with attachment triggers reference-based image gen
Iteration:             119 | Role: User | Input: "Create a CSV file with 100 rows of mock user data: name, email, age, country, signup_date" | Expected: FILE_GENERATION / auto | Scores: Q:7/L:8/C:7/S:7/E:8 | Action: "create" + "csv" + "file" triggers file-gen
Iteration:             120 | Role: User | Input: "Analyze this spreadsheet and tell me which products are underperforming [attached: sales.xlsx]" | Expected: GEMINI / gemini-2.5-flash | Scores: Q:8/L:8/C:7/S:7/E:7 | Action: "analyze" + file attachment routes to Gemini (large context)
```

### Privacy and Edge Case Experiments (121-130)

```
Iteration:             121 | Role: HR | Input: "Here are the salary bands for our engineering team: Junior $80K-$100K, Mid $100K-$130K, Senior $130K-$170K. Suggest adjustments based on market data" | Expected: local-ollama (privacy: salary) | Scores: Q:7/L:8/C:10/S:10/E:8 | Action: "salary" in PRIVACY_KEYWORDS
Iteration:             122 | Role: Doctor | Input: "Patient John Doe, age 45, presents with chest pain, elevated troponin, and ST elevation in leads II, III, aVF. What is the differential diagnosis?" | Expected: local-ollama (privacy: HIPAA) | Scores: Q:6/L:8/C:10/S:10/E:8 | Action: "patient", "diagnosis" in PRIVACY_KEYWORDS
Iteration:             123 | Role: Lawyer | Input: "Review this employment contract. The non-compete clause seems overly broad for California law. What are our options?" | Expected: local-ollama (privacy: legal) | Scores: Q:7/L:8/C:10/S:10/E:8 | Action: "contract", "non-compete" trigger LEGAL_KEYWORDS + privacy
Iteration:             124 | Role: User | Input: "My social security number is 123-45-6789. Can you help me with my tax return?" | Expected: local-ollama (privacy: PII) | Scores: Q:5/L:8/C:10/S:10/E:9 | Action: "social security" in PRIVACY_KEYWORDS -- HARD BLOCK cloud
Iteration:             125 | Role: User | Input: "My password is hunter2. How secure is it?" | Expected: local-ollama (privacy: credential) | Scores: Q:5/L:9/C:10/S:10/E:8 | Action: "password" in PRIVACY_KEYWORDS
Iteration:             126 | Role: Therapist | Input: "My client has been experiencing anxiety attacks. How should I adjust the CBT treatment plan?" | Expected: local-ollama (privacy: mental health) | Scores: Q:6/L:8/C:10/S:10/E:8 | Action: "therapy", "mental health" in PRIVACY_KEYWORDS
Iteration:             127 | Role: User | Input: "Tell me a secret recipe for chocolate cake" | Expected: local-ollama (privacy: false positive on "secret") | Scores: Q:5/L:9/C:10/S:10/E:5 | Action: Known false positive -- "secret" triggers privacy. Conservative approach: keep enforcing
Iteration:             128 | Role: Engineer | Input: "Store the API key in environment variables, never in source code" | Expected: local-ollama (privacy: might trigger on "key", "secret") | Scores: Q:7/L:9/C:10/S:10/E:6 | Action: No false positive -- "private key" is the keyword, not "key" alone
Iteration:             129 | Role: User | Input: "What is the meaning of confidential in a legal context?" | Expected: local-ollama (privacy: "confidential" match) | Scores: Q:6/L:9/C:10/S:10/E:6 | Action: Conservative enforcement. Educational question but keyword triggers local
Iteration:             130 | Role: User | Input: "Compare public vs private cloud for our startup" | Expected: NOT privacy triggered | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: No false positive -- "private" alone is not in PRIVACY_KEYWORDS ("private key" is)
```

### Multi-Intent Experiments (131-150)

```
Iteration:             131 | Role: Full-Stack | Input: "Write a React component that fetches patient data from the API and displays it in a table" | Expected: local-ollama / (LOCAL_CODING) with privacy enforcement | Scores: Q:7/L:8/C:10/S:10/E:8 | Action: "patient" triggers privacy BEFORE coding detection
Iteration:             132 | Role: DevOps | Input: "Create a Terraform module and write unit tests for it with Terratest" | Expected: local-ollama / (LOCAL_CODING) | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: Coding + Infrastructure -- INFRASTRUCTURE_KEYWORDS wins (priority 7 vs coding 6, but infrastructure maps to LOCAL_CODING too)
Iteration:             133 | Role: Data Scientist | Input: "Write a Python script to analyze this CSV and generate a PDF report with matplotlib charts" | Expected: FILE_GENERATION / auto | Scores: Q:7/L:8/C:7/S:7/E:7 | Action: FILE_GENERATION (priority 2) wins over CODING (6) and DATA_ANALYSIS (8)
Iteration:             134 | Role: Product Manager | Input: "Analyze competitor pricing and create a presentation deck comparing our pricing strategy" | Expected: local-ollama / (LOCAL_FILE_GENERATION) | Scores: Q:7/L:8/C:10/S:10/E:7 | Action: BUSINESS wins, maps to LOCAL_FILE_GENERATION
Iteration:             135 | Role: Engineer | Input: "Draw a system architecture diagram for our microservices" | Expected: IMAGE_GEMINI / gemini-2.5-flash-image | Scores: Q:7/L:7/C:6/S:7/E:7 | Action: "draw" + "diagram" triggers image detection. Correct -- user wants visual output
Iteration:             136 | Role: Engineer | Input: "Explain the system architecture of our microservices" | Expected: local-ollama / gemma3:4b or LOCAL_CODING | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: No image verb; "architecture" triggers REASONING or CODING. Text-only output
Iteration:             137 | Role: Writer | Input: "Write a blog post about our security best practices and generate an image for the header" | Expected: Split intent -- text to OPENAI, image to IMAGE_GEMINI | Scores: Q:7/L:7/C:6/S:7/E:6 | Action: Current system picks ONE route. Image detection (priority 1) wins. Future: support split routing
Iteration:             138 | Role: User | Input: "Research the latest developments in quantum computing and write a summary report" | Expected: local-ollama / (LOCAL_THINKING) or FILE_GENERATION | Scores: Q:7/L:8/C:10/S:10/E:7 | Action: "research" triggers THINKING_KEYWORDS (priority 10), but "report" matches FILE_GENERATION (priority 2). FILE_GENERATION wins
Iteration:             139 | Role: User | Input: "Debug this code and explain why it fails: [code block]" | Expected: local-ollama / (LOCAL_CODING) | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: "debug" triggers CODING. "explain" would trigger REASONING but CODING has higher priority
Iteration:             140 | Role: User | Input: "Calculate the ROI of switching from OpenAI to local models" | Expected: local-ollama / (LOCAL_FILE_GENERATION) via BUSINESS | Scores: Q:7/L:8/C:10/S:10/E:7 | Action: "ROI" triggers BUSINESS_KEYWORDS
Iteration:             141 | Role: User | Input: "Translate this legal contract from German to English" | Expected: local-ollama (privacy: "contract" + "legal") | Scores: Q:6/L:8/C:10/S:10/E:8 | Action: LEGAL (priority 5) wins over TRANSLATION (12). Privacy enforcement
Iteration:             142 | Role: User | Input: "Create a unit test for the encryption service that handles patient data" | Expected: local-ollama / (LOCAL_CODING) with privacy | Scores: Q:7/L:8/C:10/S:10/E:8 | Action: "patient" triggers privacy FIRST. Then coding keywords match. Local enforced
Iteration:             143 | Role: User | Input: "Generate an image of a doctor examining a patient" | Expected: IMAGE_GEMINI / gemini-2.5-flash-image | Scores: Q:7/L:7/C:6/S:5/E:7 | Action: Image detection (priority 1) fires before privacy check. But "patient" in message. Edge case: should privacy override image gen? Decision: image gen is output modality, the image itself has no PII. Allow cloud image gen
Iteration:             144 | Role: User | Input: "Summarize the key findings from the clinical trial results" | Expected: local-ollama (privacy: "clinical") | Scores: Q:6/L:8/C:10/S:10/E:8 | Action: "clinical" triggers MEDICAL_KEYWORDS + privacy
Iteration:             145 | Role: User | Input: "Write a poem about databases" | Expected: local-ollama / gemma3:4b or OPENAI / gpt-4o-mini | Scores: Q:7/L:9/C:10/S:10/E:6 | Action: "poem" triggers CREATIVE_WRITING. Short message + local available = local fallback chat
Iteration:             146 | Role: User | Input: "What is the weather today?" | Expected: local-ollama / gemma3:4b | Scores: Q:4/L:10/C:10/S:10/E:5 | Action: No keyword match. Short message heuristic -> local. Note: AI cannot actually fetch weather
Iteration:             147 | Role: User | Input: "Compare React, Vue, and Angular for a new enterprise project considering performance, ecosystem, hiring pool, and long-term maintenance" | Expected: local-ollama / (LOCAL_THINKING) or ANTHROPIC / claude-sonnet-4 | Scores: Q:8/L:8/C:10/S:10/E:7 | Action: "compare" triggers THINKING_KEYWORDS; "react" triggers CODING. CODING (priority 6) wins over THINKING (10)
Iteration:             148 | Role: User | Input: "Design a REST API for a library management system with CRUD operations for books, members, loans, and reservations" | Expected: local-ollama / (LOCAL_CODING) | Scores: Q:7/L:9/C:10/S:10/E:7 | Action: "REST", "api", "CRUD" all in CODING_KEYWORDS
Iteration:             149 | Role: User | Input: "" (empty message) | Expected: local-ollama / gemma3:4b (fallback) | Scores: Q:3/L:10/C:10/S:10/E:3 | Action: Empty message, no keywords. Heuristic fallback to local. Application layer should reject
Iteration:             150 | Role: User | Input: "Can you help me with something?" | Expected: local-ollama / gemma3:4b | Scores: Q:5/L:10/C:10/S:10/E:5 | Action: No keyword match. Short message, local available -> local. Model will ask for clarification
```

---

## Section 6: Scoring and Observability

### 6.1 Routing Decision Audit Trail

Every routing decision MUST be logged with the following fields for post-hoc analysis and continuous improvement.

**Audit Record Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `decisionId` | UUID | Unique identifier for this routing decision |
| `timestamp` | ISO 8601 | When the decision was made |
| `userId` | UUID | Who sent the message |
| `threadId` | UUID | Conversation context |
| `messageId` | UUID | The message being routed |
| `messageLength` | number | Character count of user message |
| `routingMode` | RoutingMode | User-selected mode (AUTO, MANUAL, etc.) |
| `resolvedMode` | RoutingMode | Actual mode after policy application |
| `policyApplied` | string | null | Policy name if one overrode the mode |
| `modalityDetected` | string | text, image-output, file-output, etc. |
| `categoriesMatched` | string[] | All categories that matched keywords |
| `primaryCategory` | string | The winning category |
| `keywordsMatched` | string[] | Specific keywords that fired |
| `privacyTriggered` | boolean | Whether privacy firewall activated |
| `privacyKeywords` | string[] | Which privacy keywords matched |
| `selectedProvider` | string | Final provider choice |
| `selectedModel` | string | Final model choice |
| `confidence` | number | Confidence score (0-1) |
| `reasonTags` | string[] | Human-readable reason tags |
| `privacyClass` | string | local, cloud, cloud-restricted |
| `costClass` | string | free, low, medium, high |
| `fallbackChainLength` | number | How many fallbacks available |
| `fallbackChain` | FallbackEntry[] | Ordered fallback list |
| `ollamaRouterUsed` | boolean | Whether LLM router was consulted |
| `ollamaRouterConfidence` | number | null | LLM router confidence if used |
| `latencyMs` | number | Time to make routing decision |
| `stageLatencies` | object | Per-stage latency breakdown |

**Current Storage:** Routing decisions are stored in the `RoutingDecision` table in the `claw_routing` PostgreSQL database. Additional audit events are published to `claw.events` exchange with pattern `routing.decision_made` and consumed by `claw-audit-service` for MongoDB storage.

### 6.2 A/B Testing Framework

Test new routing rules against old ones to measure impact before full rollout.

**A/B Test Structure:**

```
type RoutingABTest = {
  testId: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  trafficSplitPercent: number  // % of requests routed with new rules
  controlRules: RoutingConfig  // current production rules
  treatmentRules: RoutingConfig  // new rules being tested
  successMetrics: string[]  // ['accuracy', 'latency_p50', 'cost_per_request']
}
```

**Implementation Approach:**

1. Hash `userId + testId` to deterministically assign users to control/treatment
2. Log the test group assignment in the audit trail
3. Run both routing algorithms but only execute the assigned group's decision
4. After test period, compare metrics:
   - Routing accuracy (did the selected model produce good output?)
   - User feedback (thumbs up/down rate per group)
   - Latency distribution (p50, p95, p99)
   - Cost per request
   - Privacy violations (should be 0 in both groups)

**Minimum Test Duration:** 7 days or 1,000 decisions per group, whichever comes later.

**Guardrails:**
- Privacy enforcement is NEVER A/B tested -- it is always enforced in both groups
- If the treatment group's error rate exceeds 2x the control group, auto-rollback
- A/B tests do not apply to MANUAL_MODEL or PRIVACY_FIRST modes

### 6.3 Confidence Calibration

Ensure that a confidence score of 0.9 actually means the decision is correct 90% of the time.

**Calibration Protocol:**

1. Collect 1,000+ routing decisions with their confidence scores
2. Bin decisions by confidence (0.5-0.6, 0.6-0.7, 0.7-0.8, 0.8-0.9, 0.9-1.0)
3. For each bin, calculate the actual accuracy (using user feedback as ground truth)
4. Plot calibration curve: x-axis = predicted confidence, y-axis = actual accuracy
5. If the curve deviates from the diagonal by >10%, adjust confidence calculations

**Expected Calibration Table:**

| Confidence Bin | Expected Accuracy | Acceptable Range |
|---------------|-------------------|-----------------|
| 0.90 - 1.00 | 90%+ | 85% - 100% |
| 0.80 - 0.89 | 80%+ | 75% - 90% |
| 0.70 - 0.79 | 70%+ | 65% - 80% |
| 0.60 - 0.69 | 60%+ | 55% - 70% |
| 0.50 - 0.59 | 50%+ | 45% - 60% |

**Recalibration Triggers:**
- Weekly automated calibration check
- If any bin deviates by >15%, flag for manual review
- If overall accuracy drops below 85%, trigger keyword expansion sprint

### 6.4 Feedback Loop

User feedback (thumbs up/down on messages) directly improves routing.

**Feedback Processing Pipeline:**

```
User gives thumbs down on a message
  |
  v
Record: { messageId, provider, model, category, confidence, feedback: 'negative' }
  |
  v
Weekly aggregation job:
  1. Group by (category, provider, model)
  2. Calculate negative feedback rate per group
  3. If negative rate > 20% for a (category, provider) pair:
     - Flag for review
     - Consider adjusting quality score for that capability
  4. If negative rate > 40%:
     - Automatically deprioritize that provider for that capability
     - Add alternative provider to primary position
```

**Feedback Signals:**

| Signal | Weight | Interpretation |
|--------|--------|---------------|
| Thumbs up | +1 | Correct routing, good quality |
| Thumbs down | -2 | Possible routing error or quality issue |
| Regenerate (same provider) | -0.5 | Marginal quality, routing likely correct |
| Regenerate (switched provider) | -1 | User disagrees with provider choice |
| No feedback | 0 | Neutral (most common) |

### 6.5 Dashboard Metrics

Key metrics to display on the routing observability dashboard.

**Real-Time Metrics:**

| Metric | Query | Update Frequency |
|--------|-------|-----------------|
| Routing decisions per minute | COUNT(decisions) GROUP BY minute | 1 min |
| Average confidence score | AVG(confidence) | 1 min |
| Provider distribution | COUNT(decisions) GROUP BY selectedProvider | 1 min |
| Privacy enforcement rate | COUNT(privacyTriggered=true) / COUNT(*) | 1 min |
| Average routing latency | AVG(latencyMs) | 1 min |
| Ollama router utilization | COUNT(ollamaRouterUsed=true) / COUNT(*) | 1 min |

**Hourly Aggregates:**

| Metric | Description |
|--------|-------------|
| Routing accuracy by category | % correct decisions per capability class |
| Provider quality score (from feedback) | Weighted feedback score per provider |
| Cost tracking by provider | Estimated cost based on token counts and pricing |
| Latency distribution | p50, p95, p99 per provider |
| Fallback trigger rate | % of requests requiring fallback |
| Keyword hit distribution | Which keywords fire most frequently |

**Daily Reports:**

| Report | Contents |
|--------|----------|
| Routing Summary | Total decisions, accuracy, cost, top categories |
| Provider Health | Uptime per provider, error rates, latency trends |
| Privacy Compliance | Total privacy enforcements, false positive rate |
| Keyword Effectiveness | Keywords with 0 hits (candidates for removal), keywords with high hit rate |
| Confidence Calibration | Predicted vs actual accuracy per bin |

---

## Section 7: Release Readiness Checklist

### 7.1 Capability Detector Checklist

| # | Detector | Status | Keyword Count | Test Coverage |
|---|----------|--------|---------------|---------------|
| 1 | Image Generation | Implemented | 100+ | detectImageRequest tests |
| 2 | File Generation | Implemented | 162 combos + 7 phrases | detectFileGenerationRequest tests |
| 3 | Security | Implemented | 25 | detectSecurityRequest tests |
| 4 | Medical | Implemented | 19 | detectMedicalRequest tests |
| 5 | Legal | Implemented | 21 | detectLegalRequest tests |
| 6 | Coding | Implemented | 120+ | detectCodingRequest tests |
| 7 | Infrastructure | Implemented | 33 | detectInfrastructureRequest tests |
| 8 | Data Analysis | Implemented | 34 | detectDataAnalysisRequest tests |
| 9 | Reasoning | Implemented | 21 | detectReasoningRequest tests |
| 10 | Thinking | Implemented | 15 | detectThinkingRequest tests |
| 11 | Business | Implemented | 30 | detectBusinessRequest tests |
| 12 | Translation | Implemented | 12 | detectTranslationRequest tests |
| 13 | Creative Writing | Implemented | 26 | detectCreativeWritingRequest tests |
| 14 | Privacy | Implemented | 30 | detectPrivacySensitive tests |
| 15 | Summarization | Not yet | 0 | Pending |

**Total keywords in routing.constants.ts: 500+**

### 7.2 Keyword Coverage Targets

| Category | Current Count | Target Count | Gap |
|----------|--------------|-------------|-----|
| IMAGE_KEYWORDS | 100+ | 100+ | Met |
| FILE_GENERATION | 169+ | 170+ | Met |
| CODING_KEYWORDS | 120+ | 150+ | +30 from experiments |
| REASONING_KEYWORDS | 21 | 40+ | +19 from experiments |
| THINKING_KEYWORDS | 15 | 25+ | +10 from experiments |
| INFRASTRUCTURE_KEYWORDS | 33 | 45+ | +12 from experiments |
| DATA_ANALYSIS_KEYWORDS | 34 | 50+ | +16 from experiments |
| BUSINESS_KEYWORDS | 30 | 40+ | +10 from experiments |
| CREATIVE_WRITING_KEYWORDS | 26 | 35+ | +9 from experiments |
| SECURITY_KEYWORDS | 25 | 30+ | +5 from experiments |
| MEDICAL_KEYWORDS | 19 | 25+ | +6 from experiments |
| LEGAL_KEYWORDS | 21 | 25+ | +4 from experiments |
| TRANSLATION_KEYWORDS | 12 | 20+ | +8 from experiments |
| PRIVACY_KEYWORDS | 30 | 35+ | +5 from experiments |

### 7.3 Privacy Enforcement Verification

**Test Protocol: 1,000 Prompt Privacy Test**

Generate 1,000 test prompts:
- 200 prompts with explicit PII (SSN, credit card, medical records)
- 200 prompts with implicit PII (salary discussions, performance reviews)
- 200 prompts with compliance triggers (HIPAA, GDPR, attorney-client)
- 200 prompts with false positive candidates (cooking "secrets", "private" cloud)
- 200 prompts with zero privacy content (coding, math, creative writing)

**Pass Criteria:**
- True positives (PII detected, routed locally): >= 99% (max 2 misses in 600)
- True negatives (no PII, cloud allowed): >= 90% (max 20 false positives in 200)
- False positive rate: <= 10% (acceptable for conservative enforcement)
- False negative rate: 0% for explicit PII, <= 1% for implicit PII
- Zero cloud leaks for HIPAA, attorney-client, or SSN content

### 7.4 Routing Accuracy Targets

| Category | Target Accuracy | Measurement |
|----------|----------------|-------------|
| IMAGE_GENERATION | >= 98% | Image requests route to image provider |
| FILE_GENERATION | >= 95% | File requests route to FILE_GENERATION |
| CODING | >= 93% | Code requests route to coding model |
| REASONING | >= 90% | Reasoning requests route to reasoning model |
| THINKING | >= 88% | Research requests route to thinking model |
| DATA_ANALYSIS | >= 90% | Data requests route to data-capable model |
| PRIVACY_SENSITIVE | >= 99% | Sensitive content stays local |
| GENERAL_CHAT | >= 85% | Simple chat uses local/fast model |
| Overall weighted | >= 93% | Across all categories |

### 7.5 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Stage 1 (Modality) latency | < 10ms | ~5ms |
| Stage 2 (Category) latency | < 50ms | ~15ms |
| Stage 3 (Sensitivity) latency | < 5ms | ~2ms |
| Stage 4 (Selection) latency | < 20ms | ~5ms |
| Stage 5 (Fallback) latency | < 5ms | ~2ms |
| Total pipeline (without LLM) | < 90ms | ~30ms |
| Total pipeline (with LLM) | < 3s | ~1.5s |
| Keyword matching throughput | > 10K msg/sec | Not benchmarked |
| Memory footprint (keyword sets) | < 1MB | ~100KB |

### 7.6 Infrastructure Checklist

| Item | Status | Owner |
|------|--------|-------|
| All 15 capability detectors implemented | 14/15 (Summarization pending) | routing-service |
| 500+ keywords in routing.constants.ts | Met | routing-service |
| CATEGORY_TO_ROLE_MAP complete | Met | routing-service |
| PromptBuilderManager dynamic prompts | Implemented | routing-service |
| Privacy firewall with 0 cloud leaks | Implemented, needs 1K test | routing-service |
| Routing decision audit logging | Implemented | routing-service + audit-service |
| MongoDB audit storage | Implemented | audit-service |
| Health-aware provider selection | Implemented | routing-service |
| Fallback chain assembly | Implemented | routing-service |
| Confidence constants calibrated | Initial values set | routing-service |
| ESLint 0 errors | Required | all services |
| TypeScript 0 errors | Required | all services |
| Pre-commit hooks passing | Required | all services |
| Docker containers healthy | Required | all services |
| Unit tests for all detectors | Required | routing-service |
| Integration tests for routing pipeline | Required | routing-service |
| CLAUDE.md updated | Required | root |
| Architecture docs updated | Required | docs/ |

### 7.7 Documentation Checklist

| Document | Status | Location |
|----------|--------|----------|
| God Mode Routing Spec (roles + capabilities) | Complete | `docs/03-architecture/god-mode-routing-spec.md` |
| God Mode Routing Experiments (50 experiments) | Complete | `docs/03-architecture/god-mode-routing-experiments.md` |
| God Mode Decision Architecture (this document) | Complete | `docs/03-architecture/god-mode-decision-architecture.md` |
| CLAUDE.md routing section | Needs update | `CLAUDE.md` |
| Routing service CLAUDE.md | Needs update | `apps/claw-routing-service/CLAUDE.md` |
| ADR for routing architecture | Pending | `docs/13-adr/` |
| API reference for routing endpoints | Existing | `docs/12-reference/` |

---

## Appendix A: Keyword Additions from 100 Experiments

Keywords identified across experiments 51-150 that should be added to `routing.constants.ts`:

**CODING_KEYWORDS additions:**
```
rust, lifetime, borrow checker, server component, client component,
use client, serialization boundary, memory leak, heap snapshot,
event emitter, grpc, protobuf, proto, sliding window, token bucket,
feature flag, gradual rollout, event sourcing, event store, projection,
CQRS, BERT, fine-tune, hugging face, transformers, NLP, pgvector,
vector search, embedding, replication lag, WAL
```

**REASONING_KEYWORDS additions:**
```
decompose, service boundaries, data ownership, sharding, partition,
cross-shard, zero-downtime, logical replication, rollback plan,
statistical significance, confidence interval, effect size, sample size,
power analysis, bayesian, gaussian process, acquisition function
```

**INFRASTRUCTURE_KEYWORDS additions:**
```
observability, opentelemetry, prometheus, grafana, disaster recovery,
RPO, RTO, failover, 503, upstream timeout
```

**DATA_ANALYSIS_KEYWORDS additions:**
```
time series, forecasting, ARIMA, Prophet, LSTM, feature engineering,
PCA, SMOTE, target encoding, great expectations, data quality,
data validation, delta lake, lakehouse, unity catalog, data governance,
data lineage, model monitoring, data drift, concept drift
```

**SECURITY_KEYWORDS additions:**
```
oauth, pkce, authorization, token exchange
```

**CREATIVE_WRITING_KEYWORDS additions:**
```
meta description, SEO, long-tail
```

**BUSINESS_KEYWORDS additions:**
```
retro, retrospective, sprint review
```

**PRIVACY_KEYWORDS additions:**
```
performance improvement plan
```

---

## Appendix B: Future Enhancements

| Enhancement | Priority | Complexity | Description |
|-------------|----------|-----------|-------------|
| Summarization detector | High | Low | Add SUMMARIZATION_KEYWORDS and detector method |
| Multi-intent split routing | Medium | High | Route different parts of a message to different providers |
| Cost budget enforcement | Medium | Medium | Per-provider monthly spend caps |
| A/B testing framework | Medium | Medium | Test routing rules before full rollout |
| Confidence calibration | Medium | Low | Weekly automated calibration check |
| Thread context bias | Low | Medium | Use thread history to bias category selection |
| File content scanning | Low | High | Scan attached file contents for PII at routing time |
| Audio modality support | Low | High | ElevenLabs integration for TTS/voice |
| Video analysis support | Low | High | Gemini video analysis integration |
| TF-IDF keyword scoring | Low | Medium | Replace binary matching with weighted scoring |
