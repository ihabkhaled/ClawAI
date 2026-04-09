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

### Ollama Router Request

When a message arrives in AUTO mode, the routing service sends a structured prompt to the Ollama router model:

```
System: You are an AI routing assistant. Analyze the user's message and select
the best provider and model. Consider: task type, complexity, required capabilities
(vision, code, math, creative), privacy sensitivity, and cost.

Available providers: [list from active healthy connectors + local-ollama]
Available models: [list from synced connector models + local models]

Respond with JSON matching this exact schema.

User: <the user's message content>
```

### Zod Validation Schema

The router's response is validated against a strict Zod schema:

```
{
  selectedProvider: enum(provider list),
  selectedModel: string,
  confidence: number (0-1),
  reasonTags: array of strings (max 5),
  privacyClass: enum("LOW", "MEDIUM", "HIGH"),
  costClass: enum("LOW", "MEDIUM", "HIGH"),
  fallbackProvider: enum(provider list) | null,
  fallbackModel: string | null
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

## Heuristic Fallback Rules

When the Ollama router is unavailable or returns an invalid response, the system applies deterministic heuristic rules based on message content analysis.

### Task Detection Heuristics

| Task Signal                    | Detection Method                                                        | Routes To                                  |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------ |
| Coding, debugging, code review | Keywords: code, debug, function, class, bug, error, implement, refactor | `anthropic` / `claude-sonnet-4`            |
| Deep reasoning, architecture   | Keywords: explain why, analyze, design, architecture, compare, evaluate | `anthropic` / `claude-opus-4`              |
| Image/video/web content        | Keywords: image, picture, video, YouTube, website, visual, screenshot   | `google` / `gemini-2.5-flash`              |
| Math, algorithms               | Keywords: calculate, equation, algorithm, prove, mathematical, formula  | `deepseek` or `local-ollama` / `phi3:mini` |
| Creative writing               | Keywords: write, story, poem, creative, essay, blog, draft              | `openai` / `gpt-4o-mini`                   |
| Simple Q&A, translations       | Short messages (< 50 words), keywords: translate, what is, define       | `local-ollama` / `gemma3:4b`               |
| File/data analysis             | Attached files present, keywords: analyze, data, CSV, chart             | `google` / `gemini-2.5-flash`              |
| Privacy-sensitive              | Keywords: personal, private, confidential, secret, password, medical    | `local-ollama` / `gemma3:4b`               |

### Heuristic Priority

When multiple signals match, the system uses this priority order:

1. Privacy-sensitive (always overrides, forces local)
2. File/data analysis (if files attached)
3. Image/video/web (if media-related)
4. Coding (if code-related keywords detected)
5. Math/algorithms
6. Deep reasoning
7. Creative writing
8. Simple Q&A (default fallback)

### Confidence Scores

| Source                     | Confidence Range |
| -------------------------- | ---------------- |
| Ollama router (high match) | 0.80 - 0.99      |
| Ollama router (uncertain)  | 0.50 - 0.79      |
| Heuristic (strong signal)  | 0.60 - 0.75      |
| Heuristic (weak signal)    | 0.30 - 0.59      |
| Default fallback           | 0.20             |

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
