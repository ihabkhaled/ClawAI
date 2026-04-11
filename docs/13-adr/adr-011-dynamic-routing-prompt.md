# ADR-011: Dynamic Router Prompt

## Status

Accepted (2025-Q4)

## Context

ClawAI's AUTO routing mode uses a local Ollama model to classify user messages and select the best AI provider/model. Initially, the router prompt was a static template listing all available models and their capabilities.

This static approach broke down as the model catalog grew:

- When a user installed a new coding model, the router did not know about it
- When a model was deleted, the router still tried to route to it, causing failures
- Adding a new model category required updating the prompt template manually
- The prompt listed models that were not installed, wasting tokens and confusing the router

## Decision

Build the router prompt dynamically at runtime based on the currently installed and healthy models. The `PromptBuilderManager` in the routing service fetches installed models from the ollama-service internal API, groups them by category, and constructs the routing prompt.

### Architecture

```
User message arrives
  → PromptBuilderManager.buildPrompt()
    → Fetch installed models from ollama-service (HTTP, cached 5 min)
    → Group by category (CODING, REASONING, THINKING, etc.)
    → Only include healthy + installed models
    → Construct prompt with model options and routing rules
  → Send to Ollama router model (gemma3:4b)
  → Parse structured response (Zod-validated)
  → Return routing decision
```

### Cache Strategy

- Installed models are cached with a 5-minute TTL
- Cache is invalidated when `MODEL_PULLED` or `MODEL_DELETED` events are received via RabbitMQ
- If the cache is empty or expired, a fresh fetch is made synchronously

### Prompt Structure

```
You are a routing assistant. Based on the user's message, select the best provider and model.

Available local models by category:
- CODING: qwen2.5-coder:32b, deepseek-coder-v2:16b
- REASONING: deepseek-r1:14b, qwq:32b
- THINKING: glm-4.7-thinking, deepseek-v3.2

Available cloud providers:
- OpenAI: gpt-4o, gpt-4o-mini
- Anthropic: claude-sonnet-4, claude-opus-4
...

Respond with JSON: { provider, model, confidence, reasons }
```

## Consequences

### Positive

- **Always current**: The router prompt reflects the actual installed models. No stale references.
- **Self-updating**: Installing a new model automatically makes it available for routing without code changes.
- **Token efficient**: Only installed models appear in the prompt, reducing token count and improving router accuracy.
- **Category-aware**: The prompt groups models by category, helping the router match task type to model specialization.

### Negative

- **HTTP dependency**: The routing service depends on ollama-service being available to build the prompt. If ollama-service is down, routing falls back to heuristic mode.
- **Cache staleness window**: There is a 5-minute window where the prompt might not reflect a just-installed or just-deleted model. Mitigated by event-driven cache invalidation.
- **Prompt instability**: The prompt changes as models are installed/removed, which could cause inconsistent routing behavior. Mitigated by stable prompt structure (only the model list changes, not the instructions).

## Alternatives Considered

### Static Prompt Template

A handcrafted prompt listing all possible models. Simple and deterministic but becomes stale as models change. Rejected because it was the source of the problem this ADR addresses.

### Model Registry Service

A dedicated service maintaining the model registry that both routing and ollama services consume. Would provide a single source of truth but adds another service to the already large service count. Rejected as over-engineering when an internal HTTP endpoint on ollama-service suffices.

### LLM-Only Routing (No Category Hints)

Let the router model figure out the best model without category grouping. Simpler prompt but lower routing accuracy because small router models (4B parameters) struggle to reason about model capabilities without explicit hints. Rejected for inferior routing quality.
