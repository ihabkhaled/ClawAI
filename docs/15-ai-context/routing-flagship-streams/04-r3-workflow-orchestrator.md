# Stream 04 — R.3 Workflow Orchestrator Goes Live

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/04_R3_workflow_orchestrator_goes_live.md`

## Mission

Make all 13 `WorkflowKind` values mean real executable behavior. Today `RoutingManager.handleAuto()` always returns `DIRECT_LLM` implicitly; this stream lights up the other 12 workflows behind per-workflow feature flags.

## The 13 workflows

| Workflow             | Trigger                                                                       | Status today | Activation flag                                          |
| -------------------- | ----------------------------------------------------------------------------- | ------------ | -------------------------------------------------------- |
| `DIRECT_LLM`         | Default — fallthrough when no other workflow matches                          | wired        | always on                                                |
| `SEARCH_FIRST`       | Time-sensitive verbs (latest, today, current, news, regulation, pricing)      | not wired    | `ROUTING_R3_WORKFLOW_SEARCH_FIRST_ENABLED`               |
| `EXTRACT_FIRST`      | Attachment with structured-data intent (spreadsheet/CSV/JSON)                 | not wired    | `ROUTING_R3_WORKFLOW_EXTRACT_FIRST_ENABLED`              |
| `PDF_EXTRACTION`     | `PDF_INPUT` modality + summarize/explain/extract verb                         | not wired    | `ROUTING_R3_WORKFLOW_PDF_EXTRACTION_ENABLED`             |
| `YOUTUBE_TRANSCRIPT` | `YOUTUBE_INPUT` modality                                                      | not wired    | `ROUTING_R3_WORKFLOW_YOUTUBE_TRANSCRIPT_ENABLED`         |
| `IMAGE_ANALYSIS`     | `IMAGE_INPUT` modality                                                        | not wired    | `ROUTING_R3_WORKFLOW_IMAGE_ANALYSIS_ENABLED`             |
| `IMAGE_GENERATION`   | Image generation keywords detected (Stage 2 of v1 pipeline)                  | wired today  | `ROUTING_R3_WORKFLOW_IMAGE_GENERATION_ENABLED` (on)      |
| `VIDEO_ANALYSIS`     | `VIDEO_INPUT` modality                                                        | not wired    | `ROUTING_R3_WORKFLOW_VIDEO_ANALYSIS_ENABLED`             |
| `AUDIO_TRANSCRIBE`   | `AUDIO_INPUT` modality                                                        | not wired    | `ROUTING_R3_WORKFLOW_AUDIO_TRANSCRIBE_ENABLED`           |
| `FILE_GENERATION`    | File generation verb+format detected (Stage 3 of v1 pipeline)                | wired today  | `ROUTING_R3_WORKFLOW_FILE_GENERATION_ENABLED` (on)       |
| `CODE_REVIEW`        | Code-block in message + `review/refactor/debug` verb                          | not wired    | `ROUTING_R3_WORKFLOW_CODE_REVIEW_ENABLED`                |
| `COMPARE_ENSEMBLE`   | Explicit "compare" mode OR high-uncertainty (confidence < 0.5)                | not wired    | `ROUTING_R3_WORKFLOW_COMPARE_ENSEMBLE_ENABLED`           |
| `JUDGE_PIPELINE`     | Medical/Legal/high-risk domain detected                                       | not wired    | `ROUTING_R3_WORKFLOW_JUDGE_PIPELINE_ENABLED`             |

## Per-workflow contract

Every workflow handler implements:

```typescript
export interface IWorkflowHandler {
  readonly kind: WorkflowKind;

  /** Validate that this workflow CAN run with the given context (deps healthy, attachments present, etc.) */
  canHandle(context: WorkflowExecutionContext): boolean;

  /** Return the workflow plan: an ordered list of steps. Each step = a model call OR external service call. */
  plan(context: WorkflowExecutionContext): WorkflowPlan;

  /** Confidence score for whether this workflow is the right choice for this context (0..1) */
  confidence(context: WorkflowExecutionContext): number;
}

export type WorkflowExecutionContext = {
  message: string;
  threadId?: string;
  userId: string;
  modalityResult: ModalityDetectionResult;
  routingDecision: RoutingDecision;
  attachments: AttachmentMeta[];
  urls: DetectedUrl[];
};

export type WorkflowPlan = {
  kind: WorkflowKind;
  steps: WorkflowStep[];
  estimatedDurationMs: number;
  estimatedCostUsd: number;
};

export type WorkflowStep =
  | { type: 'llm_call'; provider: string; model: string; promptTemplate: string; inputFromStepId?: string }
  | { type: 'extract'; extractor: 'pdf' | 'spreadsheet' | 'youtube_transcript' | 'web_scrape' | 'audio_transcribe' | 'video_extract'; sourceFileId?: string; sourceUrl?: string }
  | { type: 'search'; query: string }
  | { type: 'judge'; primaryStepId: string; criticStepId: string };
```

## Files to add (scaffold included)

```
apps/claw-routing-service/src/modules/workflows/
├── managers/
│   ├── workflow-orchestrator.manager.ts                   (NEW — top-level coordinator)
│   └── handlers/                                          (NEW directory — 13 workflow handlers)
│       ├── direct-llm.handler.ts
│       ├── search-first.handler.ts
│       ├── extract-first.handler.ts
│       ├── pdf-extraction.handler.ts
│       ├── youtube-transcript.handler.ts
│       ├── image-analysis.handler.ts
│       ├── image-generation.handler.ts
│       ├── video-analysis.handler.ts
│       ├── audio-transcribe.handler.ts
│       ├── file-generation.handler.ts
│       ├── code-review.handler.ts
│       ├── compare-ensemble.handler.ts
│       └── judge-pipeline.handler.ts
├── types/
│   ├── workflow-execution.types.ts
│   ├── workflow-plan.types.ts
│   └── workflow-handler.interface.ts
└── constants/
    └── workflow-priority.constants.ts                      (NEW)
```

## Workflow priority (when multiple match)

```
1. JUDGE_PIPELINE   (highest — safety wins)
2. COMPARE_ENSEMBLE
3. PDF_EXTRACTION
4. YOUTUBE_TRANSCRIPT
5. VIDEO_ANALYSIS
6. AUDIO_TRANSCRIBE
7. IMAGE_ANALYSIS
8. CODE_REVIEW
9. SEARCH_FIRST
10. EXTRACT_FIRST
11. FILE_GENERATION
12. IMAGE_GENERATION
13. DIRECT_LLM      (lowest — fallthrough)
```

## High-priority workflow specs

### `JUDGE_PIPELINE`

For medical/legal/high-risk:
```
Step 1: llm_call to PRIMARY (e.g. claude-opus-4)
Step 2: llm_call to CRITIC (different family, e.g. gpt-4o) — asked "is the primary answer correct? cite issues"
Step 3: judge — if critic agrees → finalize; if disagrees → escalate to a third "judge" model OR human review queue
```

Records `judgeOutcome` on `RoutingOutcomeRecord`.

### `COMPARE_ENSEMBLE`

```
Step 1..N: parallel llm_call to N candidate models
Step N+1: judge — score the N responses (criteria: completeness, correctness, format adherence)
Step N+2: return winner + comparison summary
```

### `SEARCH_FIRST`

```
Step 1: search → research-service /search/run with query
Step 2: extract — pull top-K results as context
Step 3: llm_call with context-augmented prompt
```

### `PDF_EXTRACTION`

```
Step 1: extract — pdf via file-service chunking
Step 2: llm_call with chunks + summarize/extract/qa system prompt
```

### `YOUTUBE_TRANSCRIPT`

```
Step 1: extract — youtube_transcript via new extractor service (or research-service extension)
Step 2: llm_call with transcript chunks + user verb
```

### `CODE_REVIEW`

```
Step 1: extract code block(s) from message
Step 2: llm_call to coding-tuned model (claude-sonnet-4 / LOCAL_CODING) with code-review system prompt
Step 3 (optional): lint via local tool integration
Step 4: critic LLM verifies the review's suggestions
```

## Acceptance criteria

| # | Test                                                                                                     | Expected                                                                                |
|---|----------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| 1 | `RoutingDecision` includes `selectedWorkflow` field                                                      | All decisions have non-null workflow (default: DIRECT_LLM)                              |
| 2 | Medical question + JUDGE_PIPELINE enabled                                                                | Decision has `selectedWorkflow=JUDGE_PIPELINE`, response goes through primary+critic    |
| 3 | "Compare claude and gpt-4 on this question" + COMPARE_ENSEMBLE enabled                                   | Decision has `COMPARE_ENSEMBLE`, response includes both answers + winner               |
| 4 | "What's the latest news on the EU AI Act" + SEARCH_FIRST enabled                                         | Decision has `SEARCH_FIRST`, response cites recent web sources                          |
| 5 | PDF attachment + "summarize" + PDF_EXTRACTION disabled                                                   | Decision falls back to `DIRECT_LLM`, reasonTag `workflow_disabled_fallthrough`         |
| 6 | Unsupported workflow advertised in UI                                                                    | NOT advertised — UI reads per-flag state                                                |
| 7 | Workflow fails (e.g. YouTube transcript extractor down)                                                  | Falls back to `DIRECT_LLM` with reasonTag `workflow_extraction_failed`                  |

## Frontend surfacing

Each routing decision in `/routing` recent list shows a workflow badge:

```
[ JUDGE_PIPELINE ] [ COMPARE_ENSEMBLE ] [ SEARCH_FIRST ] [ DIRECT_LLM ] [ disabled — not yet wired ]
```

Disabled workflows greyed out with tooltip "Activate ROUTING_R3_WORKFLOW_X_ENABLED in .env".

## Tests

```
apps/claw-routing-service/src/modules/workflows/managers/__tests__/workflow-orchestrator.manager.spec.ts
  - picks JUDGE_PIPELINE over DIRECT_LLM for medical domain
  - picks COMPARE_ENSEMBLE for explicit "compare" intent
  - picks PDF_EXTRACTION when PDF + summarize verb
  - falls back to DIRECT_LLM when chosen workflow disabled
  - falls back to DIRECT_LLM when chosen workflow's deps unhealthy
  - respects priority order when multiple match

apps/claw-routing-service/src/modules/workflows/managers/handlers/__tests__/*.handler.spec.ts
  - one spec per handler (13 specs)
  - each verifies canHandle + plan + confidence

qa/test-routing-r3-workflows.sh
  - fire 13 fixture messages, one per workflow
  - assert decision.selectedWorkflow matches expected
```

## Wiring

Once activated, `RoutingManager.handleAuto()`:

```typescript
async handleAuto(context: RoutingContext): Promise<RoutingDecisionResult> {
  // ... existing stages 1-4 ...

  const modalityResult = await this.modalityDetectionService.detect({ /* ... */ });

  const workflowChoice = await this.workflowOrchestratorManager.pickWorkflow({
    context,
    modalityResult,
    baseDecision: existingV1Decision,
  });

  return {
    ...existingV1Decision,
    selectedWorkflow: workflowChoice.kind,
    workflowConfidence: workflowChoice.confidence,
    workflowPlan: workflowChoice.plan,
  };
}
```

## Rollback

Per-workflow flag — disable one without affecting others. Master flag `ROUTING_R3_WORKFLOWS_ENABLED=false` → all back to DIRECT_LLM-only behavior.
