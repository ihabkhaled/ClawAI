# Routing Replay Lab — Feature Specification

## Overview

The Routing Replay Lab allows users and administrators to re-run historical routing decisions against the current routing logic. This enables measuring routing improvement over time, validating new keyword additions, and benchmarking the router continuously.

## Business Value

- **Measurable improvement**: Compare old routing decisions vs current logic quantitatively
- **Regression detection**: Catch routing regressions before they impact users
- **Confidence tracking**: Monitor average confidence scores over time
- **Cost optimization**: See if new routing rules reduce cloud API costs

## User Flow

1. Navigate to `/routing/replay` from the sidebar (under Routing)
2. Set filters: routing mode, limit (10-500 decisions to replay)
3. Click "Run Replay"
4. View summary: total replayed, changed count, unchanged count, avg confidence old vs new
5. Browse individual results: old route vs new route, improvement score, detected category

## Architecture

### Backend (claw-routing-service)

**Endpoint**: `POST /api/v1/routing/replay`

**Request Body** (Zod validated):
```json
{
  "threadId": "optional-thread-filter",
  "routingMode": "AUTO",
  "startDate": "2026-04-01",
  "endDate": "2026-04-12",
  "limit": 50
}
```

**Response**:
```json
{
  "totalReplayed": 50,
  "changed": 12,
  "unchanged": 38,
  "averageConfidenceOld": 0.72,
  "averageConfidenceNew": 0.89,
  "results": [
    {
      "originalDecision": {
        "selectedProvider": "ANTHROPIC",
        "selectedModel": "claude-sonnet-4",
        "confidence": 0.75,
        "reasonTags": ["auto", "ollama_router"],
        "costClass": "medium"
      },
      "replayDecision": {
        "selectedProvider": "local-ollama",
        "selectedModel": "gemma3:4b",
        "confidence": 0.85,
        "reasonTags": ["auto", "category_detected", "role_LOCAL_CODING"],
        "costClass": "free",
        "detectedCategory": "coding",
        "estimatedCostPer1M": 0,
        "latencySlaMs": 5000
      },
      "changed": true,
      "improvementScore": 0.65
    }
  ]
}
```

**Key Files**:
- `src/modules/routing/managers/replay.manager.ts` — ReplayManager with `replayDecisions()` and `calculateImprovementScore()`
- `src/modules/routing/types/replay.types.ts` — ReplayResult, ReplayBatchResult, ReplayFilters
- `src/modules/routing/dto/replay-routing.dto.ts` — Zod schema
- `src/modules/routing/repositories/routing-decisions.repository.ts` — `findRecent()` method

### Frontend

**Page**: `/routing/replay`

**Components**:
- `ReplayFilters` — routing mode selector, limit selector, Run Replay button
- `ReplaySummaryCard` — total/changed/unchanged/confidence stats
- `ReplayResultRow` — old vs new route with improvement badge

**Hooks**:
- `useReplayRouting` — useMutation for triggering replay
- `useReplayLabPage` — controller hook orchestrating filters + mutation + results

**i18n**: 15 keys in all 8 locales (replay.title, replay.runReplay, replay.changed, etc.)

## Improvement Score

Calculated as:
- +0.5 if new confidence > old confidence
- +0.5 if new cost class is lower (free > low > medium > high)
- -0.5 if new confidence < old confidence
- Clamped to [-1, 1]

## Tests

- 8 unit tests in `replay.manager.spec.ts`
- 2 service-level tests in `routing.service.spec.ts`
- 125 total routing tests passing
