# Change - Model pickers dim what the plan excludes

Date: 2026-10-30. Decision: [ADR-198](../13-adr/adr-198-model-pickers-show-the-plan-decision-and-dim-what-it-excludes.md).
Evidence: [QA record](../qa-evidence/2026-10-30-model-picker-plan-dimming.md).

## Why

On a cost-class plan a user could choose a model the plan excludes (Grok 4.7 on Free) and only learn on send. A model
from another provider (Ollama) worked, so the list looked random. Owner request: dim what the plan excludes, show
every exposed model on paid plans.

## What changed

- Before: every exposed model was selectable in every picker. Now: the server says which a user may choose, the picker
  shows the rest dimmed with "Not on your plan" and refuses the click.
- The decision is the send gate's own function, so a dimmed model is exactly one a send would refuse.
- Local models are never locked. A failed lookup locks nothing (the send still refuses).

## Files

- `apps/claw-routing-service/src/modules/router-models/` (bulk `costs/classes`: controller, service, dto, constants, types, spec)
- `apps/claw-routing-service/CLAUDE.md`
- `apps/claw-chat-service/src/modules/chat-messages/` (`model-access` controller and dto, `isPrimaryModelAllowed`,
  `listModelAccess`, `ModelExposureClient.getCostClasses`, constants, types, module, specs)
- `apps/claw-chat-service/CLAUDE.md`
- `apps/claw-frontend/src/hooks/chat/` (`use-model-plan-access`, `use-available-models`, `use-judge-model-options`,
  `use-model-selector`, `use-parallel-model-list`, their tests)
- `apps/claw-frontend/src/components/chat/` and `apps/claw-frontend/src/components/ai/ai-action-dialog.tsx` (picker item,
  picker, Compare row and selector, escalation builder, judge and critic controls, orchestration and advanced selectors)
- `apps/claw-frontend/src/utilities/` (`model-plan-access`, `model-selector`, `picked-model-fallback`, tests, `plan-cache`)
- `apps/claw-frontend/src/repositories/` (`chat.repository` `getModelAccess`, query keys), `src/constants/model-picker.constants.ts`
- `apps/claw-frontend/src/types/` (`model-access.types`, `component.types`, `chat.types`, `i18n.types`, `index`)
- `apps/claw-frontend/src/lib/i18n/locales/` (`chat.modelSelector.notOnPlan` in 13 locales)
- `apps/claw-frontend/CLAUDE.md`, `docs/features/paid-model-access/README.md`
- `docs/13-adr/adr-198-model-pickers-show-the-plan-decision-and-dim-what-it-excludes.md`, `docs/13-adr/adr-index.md`
- `docs/qa-evidence/2026-10-30-model-picker-plan-dimming.md`, `docs/qa-evidence/screenshots/2026-10-30-model-picker-dimmed-free.png`

## Not done

- Threads and Workspace model lists (same helper, no cost class).
- 525 unpriced aggregator models are dimmed on every plan until priced.
- Compare, judge, escalation and AI-action pickers were not opened in a browser; phone width and RTL not looked at.

knowledge delta: `apps/claw-frontend/next-env.d.ts`, `apps/claw-auth-service/src/modules/plans/`,
`apps/claw-frontend/src/hooks/plans/use-plan-form.ts`, `src/lib/validation/plan.schema.ts`, `src/types/plan.types.ts`,
`src/constants/plan.constants.ts` are the unfinished plan-editor call-limit fields and a generated file, not part of this
change, and are not in this commit.
