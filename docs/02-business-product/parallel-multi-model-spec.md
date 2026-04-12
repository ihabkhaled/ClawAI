# Parallel Multi-Model Response Mode — Feature Specification

## Overview

Send one prompt to 2-5 AI models simultaneously and see their responses side by side. Enables model comparison, quality benchmarking, and informed model selection.

## Business Value

- **Model comparison**: Users can evaluate which model gives the best answer for their use case
- **Benchmarking**: Operators can benchmark local vs cloud models on real prompts
- **Quality assurance**: Compare model outputs before committing to a routing rule
- **Cost optimization**: See if cheaper models produce comparable quality

## User Flow

1. Navigate to `/chat/compare` from the sidebar (under Chat)
2. Select 2-5 models from the grouped model picker (local + cloud)
3. Type a prompt in the textarea
4. Click "Compare Models"
5. See loading skeletons for each selected model
6. View results side by side in a responsive grid:
   - Each card shows: provider badge, model name, latency, token count, content (markdown)
   - Fastest model gets a highlighted badge
   - Failed models show error state
7. Summary bar shows: total latency, completed/failed counts, fastest model

## Architecture

### Backend (claw-chat-service)

**Endpoint**: `POST /api/v1/chat-messages/parallel`

**Request Body** (Zod validated):
```json
{
  "threadId": "cmnrhvexf0000mwd5cs84x2vk",
  "content": "Explain the CAP theorem in simple terms",
  "models": [
    { "provider": "local-ollama", "model": "gemma3:4b" },
    { "provider": "ANTHROPIC", "model": "claude-sonnet-4" },
    { "provider": "OPENAI", "model": "gpt-4o-mini" }
  ],
  "fileIds": []
}
```

**Response**:
```json
{
  "messageId": "cmns...",
  "threadId": "cmnrhvexf0000mwd5cs84x2vk",
  "prompt": "Explain the CAP theorem in simple terms",
  "responses": [
    {
      "provider": "local-ollama",
      "model": "gemma3:4b",
      "content": "The CAP theorem states that...",
      "latencyMs": 2340,
      "inputTokens": 45,
      "outputTokens": 312,
      "status": "completed",
      "errorMessage": null
    },
    {
      "provider": "ANTHROPIC",
      "model": "claude-sonnet-4",
      "content": "CAP theorem, also known as Brewer's theorem...",
      "latencyMs": 1890,
      "inputTokens": 45,
      "outputTokens": 456,
      "status": "completed",
      "errorMessage": null
    },
    {
      "provider": "OPENAI",
      "model": "gpt-4o-mini",
      "content": "The CAP theorem is a concept in distributed systems...",
      "latencyMs": 1230,
      "inputTokens": 45,
      "outputTokens": 278,
      "status": "completed",
      "errorMessage": null
    }
  ],
  "totalLatencyMs": 2340,
  "completedCount": 3,
  "failedCount": 0
}
```

**Key Files**:
- `src/modules/chat-messages/managers/parallel-execution.manager.ts` — Uses `Promise.allSettled` to call all models simultaneously
- `src/modules/chat-messages/types/parallel.types.ts` — ParallelModelResponse, ParallelResponse
- `src/modules/chat-messages/dto/parallel-message.dto.ts` — Zod schema (2-5 models, max 10 files)

### Execution Flow

```
1. User sends parallel request with 3 models
2. Controller validates via Zod (2-5 models required)
3. Service verifies thread ownership
4. ParallelExecutionManager:
   a. Stores USER message in DB
   b. Assembles context (thread history, memories, files)
   c. Creates Promise for each model using callProvider()
   d. Runs Promise.allSettled (all models in parallel)
   e. Stores each response as ASSISTANT message with metadata
   f. Returns aggregated ParallelResponse
5. Frontend displays results in responsive grid
```

### Frontend

**Page**: `/chat/compare`

**Components**:
- `ParallelModelSelector` — Multi-select grouped by provider, 2-5 models, excludes image-only models
- `ParallelResponseCard` — Single model response with provider badge, latency, tokens, markdown content, fastest badge
- `ParallelResultsGrid` — Responsive grid (1 col mobile, 2 col tablet, 3+ col desktop)
- `ParallelSummaryBar` — Total latency, completed/failed counts, fastest model highlight

**Hooks**:
- `useParallelCompare` — useMutation wrapping chatRepository.sendParallel()
- `useParallelComparePage` — controller hook: model selection, prompt state, validation, send

**i18n**: 16 keys in all 8 locales (compare.title, compare.selectModels, compare.fastest, etc.)

## Constraints

- Minimum 2 models, maximum 5
- Maximum 10 file attachments
- Content max 100,000 characters
- Each model has independent timeout (30s default)
- Failed models don't block successful ones (Promise.allSettled)
- Total latency = max of individual latencies (parallel execution)

## Privacy Considerations

- If any selected model is a cloud provider and the prompt contains privacy-sensitive content, the user should be warned (future enhancement)
- All responses are stored as regular ASSISTANT messages in the thread
- Parallel metadata is stored in message.metadata for audit

## Tests

- Backend: TypeScript clean, integrated with existing chat-messages.service.spec.ts
- Frontend: TypeScript clean, all component prop types in component.types.ts
