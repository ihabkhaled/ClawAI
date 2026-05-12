# ADR-048 — Workflow vs. Model Is a Routing-Level Decision

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 9
- **Related:** ADR-040 (registry), ADR-042 (RoutingDecisionV2)

## Context

Some user prompts cannot be answered by a single LLM call:

- "Summarize this PDF" → extract text first, then summarize
- YouTube URL → fetch transcript first, then summarize
- "Compare X and Y" → run two LLMs in parallel, then merge
- "Generate an image of..." → diffusion model, not chat
- Medical/legal HIGH-risk → primary LLM + judge model

We could push this logic into chat-service, but then routing-service would
have no view of whether the user's request is "model-shaped" or
"workflow-shaped" — affecting scoring (workflow choice may need a
different quality tier than direct LLM).

## Decision

Workflow selection is **inside** the router. After classification, the
`WorkflowSelectorManager` returns a `WorkflowDecision` containing
`workflowKind`, `judgeRecommended`, `searchRecommended`,
`compareRecommended`, and `reasonTags`. The router output
(`RoutingDecisionV2`) embeds this so chat-service can dispatch the right
runner.

Selection priority (highest first):

1. **Modality-driven** — attached files / URLs (PDF, YouTube, audio, video, image, spreadsheet)
2. **Output-intent-driven** — "generate an image of...", "produce a CSV table"
3. **Intent-driven text patterns** — "compare X and Y", "review this code", "find latest"
4. **Risk-driven** — HIGH/CRITICAL risk in MEDICAL/LEGAL/FINANCE/MENTAL_HEALTH → JUDGE_PIPELINE
5. **Default** — DIRECT_LLM

`RouterWorkflow` table (Phase 9) stores the 13 default workflow definitions
(each with `steps` JSON listing the multi-step pipeline) plus any admin-
custom workflows.

## Consequences

- chat-service is dumber: it reads `decision.workflowKind` and routes to
  the right runner (file-service for PDF extraction, research-service for
  search, image-service for diffusion, etc.).
- The simulator (Phase 13) can preview the workflow choice without
  executing it.
- Adding a new workflow kind = (a) add to `WorkflowKind` enum, (b) seed
  a default row, (c) update the selector priority chain, (d) add a
  runner in chat-service. The boundaries are sharp.

## Alternatives considered

- **Workflow selection in chat-service** — rejected: chat-service loses
  the classification context; would duplicate keyword detection.
- **Single mega-workflow** — rejected: ambiguity (PDF vs. text) decided at
  runtime per request.
