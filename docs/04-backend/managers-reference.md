# ClawAI — Managers Reference

> Managers handle complex orchestration logic that exceeds a service's 30-line method limit. Each manager owns one domain of complexity. This document catalogs all managers by service.

---

## Manager Pattern

```
Service (owns business rules, max 30 lines/method)
  └── Manager (complex orchestration, max 80 lines/method)
        ├── Repository (data access)
        ├── External API calls
        ├── Event publishing
        └── Error handling + SSE emission
```

Rules for every manager:

- Max 80 lines per public method
- Private helpers max 30 lines each
- Fire-and-forget paths: `emitError()` → `storeErrorMessage()` in nested try-catch
- Log every significant step with `this.logger.log()`

---

## claw-chat-service Managers (14 managers)

The chat service has the richest manager layer — it implements a full AI execution pipeline.

### `context-assembly.manager.ts`

**Purpose**: Assembles the full prompt context before LLM call.  
**Inputs**: threadId, userId, fileIds, contextPackIds  
**Output**: Ordered prompt array (system → memories → packs → files → history)  
**Steps**:

1. Fetch memories from `claw-memory-service` (HTTP, limit 20, user-scoped)
2. Fetch context pack items from `claw-memory-service` (HTTP, per attached pack)
3. Fetch file chunks from `claw-file-service` (HTTP, per attached file)
4. Build prompt sequence with token budget truncation (head-preserving, tail-dropping)

### `chat-execution.manager.ts`

**Purpose**: Calls the selected LLM provider with fallback chain.  
**Provider routing**:

```
provider === 'local-ollama' || 'OLLAMA' → callOllama()
provider === 'ANTHROPIC'               → callAnthropic()
provider === 'OPENAI'                  → callOpenAI()
provider === 'GEMINI'                  → callGemini()
provider === 'DEEPSEEK'                → callDeepSeek()
provider === 'GROK'                    → callGrok()
provider === 'AWS_BEDROCK'             → callBedrock()
```

**Fallback chain**: primary → OLLAMA_PROVIDER → throws  
**Output**: Stores ASSISTANT message, emits SSE completion event

### `parallel-execution.manager.ts`

**Purpose**: Fires 2-5 LLM calls simultaneously via `Promise.allSettled()`.  
**Used by**: `/chat-messages/parallel` endpoint  
**Output**: All fulfilled results stored as separate ASSISTANT messages with per-model metadata

### `pipeline.manager.ts`

**Purpose**: Orchestrates the full chat pipeline for complex queries.  
**Pipeline stages**: task-decomposition → parallel execution → quality check → best-of-n selection

### `task-decomposition.manager.ts`

**Purpose**: Breaks complex multi-part queries into sub-tasks. Each sub-task runs independently then results are synthesized.

### `quality-check.manager.ts`

**Purpose**: Evaluates LLM response quality (coherence, completeness, factual consistency). Returns a quality score and flags low-quality responses for re-routing.

### `best-of-n.manager.ts`

**Purpose**: From N parallel responses, selects the best one using a judge model. Scores candidates on clarity, correctness, and completeness.

### `judge-referee.manager.ts`

**Purpose**: Runs a "judge" LLM over competing model responses. Used when `judgeEnabled=true` in thread settings. The judge evaluates responses against quality threshold and can trigger regeneration.

### `consensus-execution.manager.ts`

**Purpose**: Runs the same query against multiple models and returns the majority-consensus answer. Used for high-stakes questions requiring agreement across providers.

### `escalation-chain.manager.ts`

**Purpose**: Escalates failed requests up a model capability hierarchy (cheap → expensive → most capable). If the primary model fails, tries the next tier.

### `cost-ensemble.manager.ts`

**Purpose**: Selects the cheapest model that can satisfy the query's complexity. Balances quality and cost using routing metadata.

### `answer-repair.manager.ts`

**Purpose**: Repairs truncated or malformed LLM responses. Detects incomplete JSON, cut-off markdown, or abrupt sentence endings and prompts a continuation.

### `role-pack.manager.ts`

**Purpose**: Injects role-specific system prompts from context packs. Maps role assignments (e.g., "senior engineer") to pre-built system prompt templates.

### `verifier.manager.ts`

**Purpose**: Fact-checks LLM responses by running verification queries against the original context. Flags unverified claims.

---

## claw-routing-service Managers (7 managers)

### `routing.manager.ts`

**Purpose**: Main routing orchestration — 5-stage pipeline.  
**Pipeline**: Privacy check → Image detection → File detection → Category detection → Ollama/Heuristic

### `capability-router.manager.ts`

**Purpose**: Routes based on 33 capability classes and 1650+ keywords. Returns `selectedProvider`, `selectedModel`, `confidence`, `reasonTags[]`.

### `prompt-builder.manager.ts`

**Purpose**: Builds the dynamic router prompt using installed models from `claw-ollama-service`. Fetches model list via HTTP (internal), groups by category, builds classification prompt.  
**Cache**: 5-minute TTL, invalidated on `MODEL_PULLED` / `MODEL_DELETED` events.

### `ollama-router.manager.ts`

**Purpose**: Sends the routing decision query to Ollama (qwen3:1.7b or configured `OLLAMA_ROUTER_MODEL`). Parses Zod-validated JSON response. Falls back to heuristic on failure.

### `complexity-classifier.manager.ts`

**Purpose**: Classifies query complexity (SIMPLE / MODERATE / COMPLEX / EXPERT) using keyword + structural analysis. Influences model tier selection.

### `adaptive-learning.manager.ts`

**Purpose**: Learns from routing decision outcomes. Adjusts capability class weights based on user feedback and re-routing events.

### `replay.manager.ts`

**Purpose**: Re-runs historical routing decisions against current router configuration. Produces old-vs-new comparison, suspicious case detection, and outcome labels.

---

## claw-connector-service Managers (1 manager)

### `connectors.manager.ts`

**Purpose**: Orchestrates connector lifecycle: creates encrypted config, fires health checks, manages sync runs.  
**Delegates to**: `AdapterFactory` → provider-specific `ProviderAdapter`

**AdapterFactory** (not a manager but key pattern):

```typescript
// Returns the correct adapter based on ConnectorProvider enum:
OPENAI     → OpenAIAdapter
ANTHROPIC  → AnthropicAdapter
GEMINI     → GeminiAdapter
AWS_BEDROCK → BedrockAdapter
DEEPSEEK   → DeepSeekAdapter
OLLAMA     → OllamaAdapter
GROK       → GrokAdapter
```

---

## claw-ollama-service Managers (5 managers)

### `ollama.manager.ts`

**Purpose**: Main Ollama orchestration — pull jobs, model lifecycle, role assignments.

### `discovery.manager.ts`

**Purpose**: Discovers available models from Ollama runtime API (`/api/tags`).

### `ollama-library-discovery.manager.ts`

**Purpose**: Scrapes ollama.com library and popular pages to build the public model catalog (250 models max).

### `model-enrichment.manager.ts`

**Purpose**: Enriches raw model data with parameter counts, size categories, capability classifications, and hardware requirements.

### `candidate-import.manager.ts`

**Purpose**: Imports new models into the catalog DB from a discovery run, skipping duplicates.

---

## claw-research-service Managers (1 manager)

### `research.manager.ts`

**Purpose**: Orchestrates a full research run: search → fetch → scrape → evidence assembly.  
**Adapters used**: Tavily, SearXNG, Ollama Web (search); HTTP fetch (content retrieval)  
**Output**: `ResearchRun` with evidence array, source citations, relevance scores

---

## claw-workspace-service Managers (7 managers)

### `workspace-sync.manager.ts`

**Purpose**: Syncs workspace connector data (GitHub repos, Jira issues, Slack channels, etc.) into the `WorkspaceObject` table.

### `workspace-search.manager.ts`

**Purpose**: Searches across all synced workspace objects using full-text + metadata filters.

### `oauth-token.manager.ts`

**Purpose**: Manages OAuth2 access/refresh token lifecycle: refresh on expiry, revoke on disconnect.

### `connector-activation.manager.ts`

**Purpose**: Activates a new workspace connector: runs OAuth2/PKCE flow, verifies credentials, stores encrypted tokens, fires initial sync.

### `workspace-health.manager.ts`

**Purpose**: Checks health of each active workspace connector by making a lightweight API call to the provider.

### `workspace-object.manager.ts`

**Purpose**: CRUD operations for `WorkspaceObject` records — creates/updates/deletes objects during sync runs.

### `action-execution.manager.ts`

**Purpose**: Executes workspace actions triggered by AI (e.g., "create a GitHub issue", "send a Slack message"). Routes to the appropriate adapter.

---

## claw-agent-service Managers (5 managers)

### `agent-session.manager.ts`

**Purpose**: Manages desktop agent session lifecycle: pair device, create session, maintain heartbeat, handle disconnect.

### `agent-command.manager.ts`

**Purpose**: Evaluates terminal commands against security policies, routes to AUTO_APPROVE / REQUIRE_HUMAN / BLOCK.

### `pairing-cleanup.manager.ts`

**Purpose**: Scheduled cleanup of expired device pairing requests.

### `refresh-cleanup.manager.ts`

**Purpose**: Scheduled cleanup of expired agent token refresh records.

### `scheduler.manager.ts`

**Purpose**: Coordinates scheduled tasks for the agent service (cron-like, NestJS `@Cron` based).

---

## claw-file-service Managers (2 managers)

### `file-security.manager.ts`

**Purpose**: Runs the 4-check security pipeline: ClamAV antivirus → magic byte validation → filename validation → ZIP bomb detection. Returns pass/fail with reason code.

### `file-processing.manager.ts`

**Purpose**: Orchestrates file upload: security check → storage → chunking → DB record creation → event publish.

---

## claw-memory-service Managers (1 manager)

### `memory-extraction.manager.ts`

**Purpose**: On `message.completed` event, sends conversation to Ollama (`gemma3:4b`) for FACT/PREFERENCE/INSTRUCTION/SUMMARY extraction. Deduplicates against existing memories before storing.

---

## claw-image-service Managers (1 manager)

### `image-execution.manager.ts`

**Purpose**: Routes image generation to correct adapter (DALL-E / Gemini / Stable Diffusion / ComfyUI). Handles async generation with polling, stores result URL.

---

## claw-file-generation-service Managers (1 manager)

### `file-execution.manager.ts`

**Purpose**: Routes file generation to correct format adapter (PDF/DOCX/CSV/HTML/MD/TXT/JSON). Handles LLM-structured output parsing and file writing.

---

## claw-audit-service Managers (1 manager)

### `audit-event.manager.ts`

**Purpose**: Processes all incoming audit events from RabbitMQ. Routes to correct audit log collection, updates usage ledger.

---

## claw-server-logs-service Managers (1 manager)

### `server-log-event.manager.ts`

**Purpose**: Processes `log.server` events from all backend services. Normalizes and stores with TTL 30 days.
