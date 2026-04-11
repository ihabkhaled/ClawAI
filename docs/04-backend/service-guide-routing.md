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

AUTO mode is the most complex. It follows this pipeline:

1. **Image detection** -- checks message against 100+ image generation keywords
2. **File generation detection** -- regex matching action verbs + format words
3. **Category detection** -- 64 keywords across coding (28), reasoning (21), thinking (15)
4. **Dynamic prompt building** -- `PromptBuilderManager` fetches installed models from ollama-service and builds a prompt that only includes healthy, installed models
5. **Ollama router call** -- sends the prompt to the configured router model (default: gemma3:4b) with temperature 0 and Zod-validated JSON response
6. **Heuristic fallback** -- if Ollama fails or returns an invalid response, falls back to keyword-based routing

## Dynamic Prompt Builder

The `PromptBuilderManager` builds the router prompt dynamically:

1. Fetches installed models from ollama-service internal API (`/api/v1/ollama/internal/installed-models`)
2. Groups models by category (CODING, REASONING, THINKING, etc.)
3. Only includes healthy and installed models in the prompt
4. Prompt is cached with 5-minute TTL (`PROMPT_CACHE_TTL_MS`)
5. Cache is invalidated on `MODEL_PULLED` and `MODEL_DELETED` events

## Category-Aware Routing

When LOCAL_ONLY mode is used, the service detects task category from message content:

| Category  | Keywords (samples)                                    | Routes To          |
| --------- | ----------------------------------------------------- | ------------------ |
| Coding    | code, debug, function, refactor, typescript, react    | LOCAL_CODING model |
| Reasoning | prove, solve, calculate, theorem, probability         | LOCAL_REASONING    |
| Thinking  | research, investigate, compare, deep dive, trade-offs | LOCAL_THINKING     |
| Default   | Everything else                                       | gemma3:4b          |

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
