# Auto Re-Routing on Weak Answer — Feature Specification

## Overview

Automatically detects weak AI responses (too short, repetitive, error/refusal patterns, echoed prompts) and re-routes the request to the next provider in the fallback chain. The user receives the best available response without manual intervention.

## Business Value

- **Quality assurance**: Weak or broken responses are caught before reaching the user
- **Transparent escalation**: Users see a badge when re-routing occurred, building trust
- **Hands-free recovery**: No need to manually click "Regenerate" — the system tries the next provider automatically
- **Cost awareness**: Starts with the cheapest provider, only escalates when quality is insufficient

## How It Works

1. User sends a message, routing selects a provider (e.g., local Ollama)
2. The provider responds
3. `QualityCheckManager` scores the response (0.0 to 1.0)
4. If score < 0.4 ("weak") and re-route attempts < 2:
   - Skip the weak response (not stored)
   - Try the next candidate in the fallback chain
   - Increment attempt counter
5. If the next candidate also fails quality, try the next one (up to 2 re-routes)
6. The final response is stored with re-routing metadata
7. Frontend shows an amber badge: "Re-routed from {originalProvider}/{originalModel} ({score}%)"

## Quality Checks (5 signals)

| Check                 | Threshold                  | Penalty | Description                            |
| --------------------- | -------------------------- | ------- | -------------------------------------- |
| Response too short    | < 20 characters            | -0.40   | Content is trivially short             |
| Too few words         | < 5 words                  | -0.30   | Near-empty response                    |
| Error/refusal pattern | 9 patterns                 | -0.50   | "I cannot", "As an AI", "Error:", etc. |
| Excessive repetition  | > 60% trigram overlap      | -0.30   | Repetitive/looping text                |
| Echo response         | > 80% similarity to prompt | -0.50   | Model parroted back the user's input   |

### Score Calculation

```
score = 1.0
score -= penalty for each triggered check
score = clamp(score, 0.0, 1.0)
isWeak = score < 0.4
```

### Error/Refusal Patterns

```
"I cannot"
"I am unable"
"As an AI"
"I apologize, but I"
"I do not have the ability"
"Sorry, I cannot"
"I am not able to"
"Error:"
"Failed to"
```

## Architecture

### Backend (claw-chat-service)

**Key Files**:

- `src/modules/chat-messages/managers/quality-check.manager.ts` — Injectable NestJS service with 5 quality checks
- `src/modules/chat-messages/types/quality-check.types.ts` — QualityCheckResult, ReRoutingDecision
- `src/modules/chat-messages/constants/quality-thresholds.constants.ts` — All thresholds extracted as constants

**Integration Point**: `ChatExecutionManager.execute()`

```
1. Build candidate chain: [primary, fallback, cloud1, cloud2, ...]
2. For each candidate:
   a. Call the provider
   b. If image/file generation → return immediately (skip quality check)
   c. QualityCheckManager.checkResponseQuality(content, userPrompt)
   d. QualityCheckManager.shouldReRoute(result, attemptCount)
   e. If shouldReRoute && more candidates → increment attempt, continue loop
   f. If quality OK or max attempts reached → return response
3. Attach re-routing metadata if escalation occurred
```

**LlmResponse extended fields**:

```typescript
reRouted?: boolean;
originalProvider?: string;
originalModel?: string;
originalScore?: number;
reRouteAttempts?: number;
```

**Message metadata stored**:

```json
{
  "reRouted": true,
  "originalProvider": "local-ollama",
  "originalModel": "gemma3:4b",
  "originalScore": 0.2,
  "reRouteAttempts": 1
}
```

### Frontend

**Component**: `message-bubble.tsx`

- Extracts `reRouted`, `originalProvider`, `originalModel`, `originalScore` from message metadata
- Renders an amber badge with `RotateCcw` icon when re-routing occurred:
  ```
  ↺ Re-routed from local-ollama/gemma3:4b (20%)
  ```

**i18n**: 4 keys in all 8 locales (`reRouted`, `reRoutedFrom`, `weakResponse`, `qualityScore`)

## Constraints

- Maximum 2 re-route attempts per message (prevents infinite loops)
- Image and file generation responses are exempt from quality checks (they return placeholder text)
- Weak responses are NOT stored — only the final accepted response is persisted
- Re-routing uses the existing fallback chain, not a separate escalation path
- Quality check adds negligible latency (string operations only, no external calls)

## Repetition Detection Algorithm

Uses trigram analysis:

1. Split response into lowercase words
2. Skip if fewer than 10 words
3. Generate all trigrams (3-word sequences)
4. Count how many trigrams appear more than once
5. Ratio = repeated / total trigrams
6. If ratio > 0.6, flag as excessive repetition

## Echo Detection Algorithm

Uses substring containment:

1. Lowercase both content and user prompt
2. Check if the shorter string is contained in the longer string
3. Similarity = shorter.length / longer.length
4. If similarity > 0.8, flag as echo response

## Tests

14 unit tests in `quality-check.manager.spec.ts`:

- Normal response passes quality check
- Too-short response detected
- Error pattern detection (all 9 patterns)
- Echo response detection
- Repetition detection
- Score clamping to [0, 1]
- Re-route decision respects max attempts
- Quality-acceptable responses skip re-routing
