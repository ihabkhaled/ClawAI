# Stream 06 — R.5 Operator Playground + Transparency

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/06_R5_operator_playground_transparency.md`

## Mission

Give operators and end users transparency into routing decisions. Add a "Try a message" playground for operators, surface "Why this model?" explanations in chat, and add the missing admin pages (taxonomy CRUD, circuit-breaker dashboard, category drill-down).

## Surfaces to ship

| Surface | Type | Path | Status today | New file paths |
|---------|------|------|--------------|----------------|
| Playground | FE page | `/routing/playground` | missing | `apps/claw-frontend/src/app/(portal)/routing/playground/page.tsx` |
| "Why this model?" | FE component | inline in chat message | missing | `apps/claw-frontend/src/components/chat/why-this-model.tsx` |
| Category drill-down | FE filter | `/routing` recent list | missing | extend `use-routing-decisions.ts` + add filter to existing page |
| Circuit-breaker dashboard | FE page | `/routing/circuit-breakers` | missing (BE exists) | `apps/claw-frontend/src/app/(portal)/routing/circuit-breakers/page.tsx` |
| Taxonomy admin UI | FE page | `/routing/taxonomy` | missing (BE exists) | `apps/claw-frontend/src/app/(portal)/routing/taxonomy/page.tsx` |
| Per-user routing history | FE page | `/settings/routing-history` | missing | `apps/claw-frontend/src/app/(portal)/settings/routing-history/page.tsx` |
| "Rerun decision" button | FE button on recent decision row | existing | missing | extend `routing-decision-row.tsx` |
| "Save playground case as fixture" | FE button on playground | new | missing | inside playground page |
| "Compare policies on sample prompt" | FE page | `/routing/policy-compare` | missing | `apps/claw-frontend/src/app/(portal)/routing/policy-compare/page.tsx` |

## Playground API contract

```http
POST /api/v1/routing/playground/evaluate
{
  "message": "Write a Python function to sort a list",
  "attachments": [],
  "userMode": "AUTO",
  "compareWithV2": true,
  "compareWithOllamaRouter": true
}

Response 200:
{
  "v1Decision": { /* full RoutingDecision */ },
  "v2Decision": { /* full RoutingDecisionV2 */ },
  "ollamaRouterDecision": { /* OllamaRouter raw output */ },
  "scoreBreakdown": [
    { "provider": "Anthropic", "model": "claude-sonnet-4",
      "scores": { "quality": 0.92, "cost": 0.6, "latency": 0.75, "privacy": 0.5, "familiarity": 0.8 },
      "totalScore": 0.74, "wasChosen": true },
    { "provider": "OpenAI", "model": "gpt-4o-mini",
      "scores": { "quality": 0.7, "cost": 0.95, "latency": 0.9, "privacy": 0.5, "familiarity": 0.6 },
      "totalScore": 0.71, "wasChosen": false }
  ],
  "candidateList": [...full ranked list...],
  "modalityResult": {...},
  "workflowChoice": {...}
}
```

## "Why this model?" inline

For every chat message, add a small `ⓘ` button that expands to:

```
Routed to claude-sonnet-4 (Anthropic) because:
• Category: Coding (CONFIDENCE_EXACT_KEYWORD: "function", "sort", "list")
• Workflow: DIRECT_LLM (no special workflow triggered)
• Learned bias: +0.05 (you positively rated claude-sonnet-4 on coding 8/10 times)
• Cost class: STANDARD ($0.003 estimated)
• Privacy: PUBLIC_OK (no PII detected)
[ Rerun decision ]  [ See full reasoning ]
```

## Files to add (no scaffold this round — frontend skeletons + BE playground module)

Backend scaffold:

```
apps/claw-routing-service/src/modules/playground/         (NEW MODULE)
├── playground.module.ts
├── controllers/
│   └── playground.controller.ts                          (POST /routing/playground/evaluate)
├── services/
│   └── playground.service.ts
├── dto/
│   └── playground-evaluate.dto.ts
└── types/
    └── playground.types.ts
```

Frontend pages (NOT scaffolded — needs i18n + auth wiring):

```
apps/claw-frontend/src/app/(portal)/routing/playground/page.tsx
apps/claw-frontend/src/app/(portal)/routing/circuit-breakers/page.tsx
apps/claw-frontend/src/app/(portal)/routing/taxonomy/page.tsx
apps/claw-frontend/src/app/(portal)/routing/policy-compare/page.tsx
apps/claw-frontend/src/app/(portal)/settings/routing-history/page.tsx
apps/claw-frontend/src/components/chat/why-this-model.tsx
apps/claw-frontend/src/hooks/routing/use-playground.ts
apps/claw-frontend/src/hooks/routing/use-circuit-breakers.ts
apps/claw-frontend/src/hooks/routing/use-taxonomy-admin.ts
apps/claw-frontend/src/hooks/routing/use-routing-history-mine.ts
```

## Acceptance criteria

| # | Test | Expected |
|---|------|----------|
| 1 | Playground happy path: type message → submit | v1+v2+ollama all return; score breakdown visible |
| 2 | Playground does NOT actually execute the chat model | only the routing decision; no token spend |
| 3 | "Why this model?" expands in chat | shows reasonTags + cost estimate + workflow |
| 4 | Category filter on `/routing` | filtering to "Coding" shows only Coding-routed decisions |
| 5 | Circuit-breaker dashboard shows current state | OPEN/HALF_OPEN/CLOSED + recent failures + manual reset button |
| 6 | Taxonomy CRUD | admin can create/edit/delete TaxonomyRole entries via UI |
| 7 | Per-user routing history at `/settings/routing-history` | user sees their own decisions, with override option |
| 8 | Rerun decision button | hits `POST /routing/evaluate` with same context, shows new decision side-by-side |
| 9 | Save playground case as fixture | converts the playground decision into a replay-fixture row |
| 10 | Dark mode / mobile / RTL | all surfaces pass |

## i18n keys (need real translations in all 8 locales)

```typescript
{
  routing: {
    playground: {
      title: 'Routing Playground',
      messageLabel: 'Message',
      compareV2Label: 'Compare with v2 evaluator',
      compareOllamaLabel: 'Compare with Ollama router',
      submitButton: 'Evaluate routing',
      v1Heading: 'v1 decision (current production)',
      v2Heading: 'v2 decision (shadow / canary)',
      ollamaHeading: 'Ollama-router decision',
      scoreBreakdownHeading: 'Score breakdown',
      candidateListHeading: 'All candidates',
      saveAsFixtureButton: 'Save as regression fixture',
      reasonTagsLabel: 'Reason tags',
    },
    whyThisModel: {
      heading: 'Why this model?',
      categoryLabel: 'Category',
      workflowLabel: 'Workflow',
      learnedBiasLabel: 'Learned bias',
      costEstimateLabel: 'Cost estimate',
      privacyLabel: 'Privacy class',
      rerunButton: 'Rerun decision',
      fullReasoningButton: 'See full reasoning',
    },
    circuitBreakers: {
      title: 'Circuit Breakers',
      stateColumn: 'State',
      providerColumn: 'Provider',
      failureCountColumn: 'Failures',
      lastFailureAtColumn: 'Last failure',
      opensUntilColumn: 'Opens until',
      manualResetButton: 'Reset manually',
      states: { CLOSED: 'Closed', OPEN: 'Open', HALF_OPEN: 'Half-open' },
    },
    taxonomy: {
      title: 'Taxonomy Admin',
      roles: { /* ... */ },
      domains: { /* ... */ },
    },
    routingHistoryMine: {
      title: 'My Routing History',
      empty: 'No routing decisions yet',
      overrideButton: 'Always route X to Y for me',
    },
  },
}
```

## Tests

```
apps/claw-routing-service/src/modules/playground/services/__tests__/playground.service.spec.ts
qa/test-routing-r5-playground.sh
apps/claw-frontend/e2e/routing-playground.spec.ts (Playwright)
apps/claw-frontend/e2e/routing-circuit-breakers.spec.ts
apps/claw-frontend/e2e/why-this-model.spec.ts
```

## Rollback

Per-surface flag: `ROUTING_R5_PLAYGROUND_ENABLED`, `ROUTING_R5_EXPLANATION_IN_CHAT_ENABLED`, etc. Each surface can be hidden via flag without touching code.
