# Change - A used-up credit model falls back to an included model

**Why:** a Starter user who spends the plan's connector credit, or a Free user who spends the 10
free credit-model requests, got an error on a picked credit model, and AUTO skipped credit models
without telling anyone. The owner asked that the turn move to a non-credit model and that the
user is told.

**What changed**

- chat-service: a credit refusal (402) on a picked or AUTO turn moves on instead of ending the
  chain. After credit is gone only included (PAYG-exempt) models are tried; a price refusal keeps
  cheaper credit models in play; refusals do not use up the substitute allowance; the answer carries
  `metadata.creditFallback` and no longer also carries the generic "X failed" notice.
- routing-service: the substitute list always ends with an included model when one is eligible; the
  non-chat id pattern now also drops `imagine` and `video` models (a Grok video model had been
  offered as a chat substitute).
- frontend: `CreditFallbackNotice` in the answer bubble, 13 locales, typed in one record.
- Decision recorded in ADR-161; evidence in `docs/qa-evidence/2026-10-07-credit-fallback-plan-rounds.md`.

## Code paths traced

apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts
apps/claw-chat-service/src/modules/chat-messages/utilities/credit-fallback.utility.ts
apps/claw-routing-service/src/modules/routing/utilities/picked-model-substitute.utility.ts
apps/claw-frontend/src/components/chat/credit-fallback-notice.tsx
apps/claw-frontend/src/lib/i18n/locales/credit-fallback-translations.ts
