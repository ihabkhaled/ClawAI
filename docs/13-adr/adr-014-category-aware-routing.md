# ADR-014: Category-Aware Routing with Keyword Detection

## Status

Accepted (2025-Q4)

## Context

ClawAI's AUTO routing mode uses a local Ollama model (gemma3:4b) to classify user messages and select the best provider/model. While the LLM-based router works well for most messages, it has limitations:

- **Latency**: The router model adds 1-3 seconds of latency to every message. For obvious cases (e.g., "write a Python function"), this delay is wasteful.
- **Reliability**: Small local models (4B parameters) occasionally misclassify messages, routing coding tasks to general chat models or reasoning tasks to fast models.
- **Availability**: If Ollama is down or the router model is not loaded, routing fails entirely without a fallback.

The team needed a fast, reliable heuristic layer that could handle obvious cases without calling the LLM, while still falling back to the LLM for ambiguous messages.

## Decision

Implement a keyword-based category detection system with 64 keywords across 3 categories. This heuristic runs before the LLM router and short-circuits obvious cases.

### Keyword Categories

| Category  | Count | Example Keywords                                                |
| --------- | ----- | --------------------------------------------------------------- |
| Coding    | 28    | function, class, debug, compile, refactor, API, regex, SQL, git |
| Reasoning | 21    | analyze, evaluate, compare, logic, proof, theorem, hypothesis   |
| Thinking  | 15    | research, investigate, explore, brainstorm, strategy, plan      |

### Routing Flow

```
1. User message arrives
2. Keyword detection scans message for category matches
3. If strong match (2+ keywords from one category):
   a. CODING → route to LOCAL_CODING model (or Anthropic claude-sonnet-4 if no local coding model)
   b. REASONING → route to LOCAL_REASONING model (or Anthropic claude-opus-4)
   c. THINKING → route to LOCAL_THINKING model (or cloud fallback)
4. If weak/no match:
   → Fall through to LLM-based routing (Ollama gemma3:4b)
5. If LLM routing fails:
   → Fall through to heuristic defaults (cost/latency/privacy based)
```

### Integration with Dynamic Prompt

The keyword detection system complements the dynamic router prompt (ADR-011). When the LLM router is invoked, the prompt includes category hints from the keyword detection to improve accuracy.

## Consequences

### Positive

- **Fast**: Keyword detection runs in <1ms. Obvious coding tasks skip the 1-3 second LLM router call entirely.
- **Reliable**: Keyword matching is deterministic. "Write a Python function" always routes to a coding model.
- **Fallback chain**: Three-layer routing (keywords → LLM → heuristic) ensures routing always produces a result, even if Ollama is completely down.
- **Category-aware model selection**: Users who install specialized models (e.g., qwen2.5-coder for coding) get them automatically used for the right tasks.
- **Tunable**: Adding or removing keywords is a constant change, not a code change.

### Negative

- **Keyword maintenance**: The keyword list must be maintained as new domains emerge. If users frequently discuss "quantum computing" and it is not in any keyword list, it goes to the LLM router (which is fine, but not fast).
- **False positives**: A message like "I have a class tomorrow" would match the "class" coding keyword. Mitigated by requiring 2+ keyword matches for a strong match.
- **Language-dependent**: Keywords are English-only. Non-English messages always fall through to the LLM router. This is acceptable because the LLM router handles multilingual input well.
- **Overlap potential**: Some keywords could match multiple categories. The system uses priority ordering (coding > reasoning > thinking) to break ties.

## Alternatives Considered

### LLM-Only Routing

Route every message through the LLM without any heuristic pre-filter. Simpler architecture but adds 1-3 seconds to every message and fails when Ollama is down. Rejected for latency and reliability concerns.

### Embedding-Based Classification

Embed the user message and compare cosine similarity to category centroids. More accurate than keyword matching but requires an embedding model to be loaded, adding memory usage and latency. Rejected as over-engineering for the current accuracy requirements.

### Fine-Tuned Classifier Model

Train a small classifier (e.g., distilbert) specifically for category detection. Would be more accurate than keywords but requires training data, model hosting, and maintenance. Rejected for operational complexity disproportionate to the benefit.

### User-Selected Category

Let users tag their messages with a category (e.g., "coding", "reasoning"). Accurate but adds friction to every message. Rejected because users should not need to think about routing. The system should be invisible.
