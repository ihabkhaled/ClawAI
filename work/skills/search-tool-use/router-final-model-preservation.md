---
id: router-final-model-preservation
title: Router final-model preservation
category: search-tool-use
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - ai-platform-team
---

# Router final-model preservation

## Purpose

When the user explicitly names a model to answer ("ask GLM 4.7 to search this online"), the router MUST preserve that model as the final answerer — even though search/fetch/scrape workflows run first. This is model-agnostic: it applies to ANY user-requested model.

## Strict rules

- **MUST** detect explicit "ask `<model>` to …" patterns in the user message.
- **MUST** run search/fetch/scrape/clone workflows first to gather evidence.
- **MUST** pass the grounding package to the user-requested model for the final answer. **BLOCKER** if a different model is used.
- **MUST NOT** hardcode this to one vendor.
- **MUST NOT** drop back to the default router model just because tool-use was needed.

## Workflow

1. Detect fresh-info intent + explicit model request in the incoming message.
2. Record the requested model as the "final answerer" on the routing decision.
3. Run the appropriate tool chain (search → fetch → scrape → normalize).
4. Build the grounding package (see `grounding-package.md`).
5. Invoke the final answerer with system prompt + grounding package + user question.
6. Return the answer with citations.

## Validation checklist

- [ ] Explicit model detection works for multiple vendors
- [ ] Tool workflow runs before final answer
- [ ] Final answer produced by the requested model
- [ ] Citations present

## Quality gate

| Check                                           | Blocker? | Evidence             |
| ----------------------------------------------- | -------- | -------------------- |
| Final answer from requested model               | yes      | Routing decision log |
| Works for at least 3 different requested models | yes      | Test fixtures        |

## Definition of done

1. Detection works.
2. Final model preserved.
3. Tests pass.
