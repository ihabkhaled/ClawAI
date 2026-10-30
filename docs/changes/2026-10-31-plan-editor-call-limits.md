# Plan editor: per-call limits (ADR-197)

Admins can now set the three per-call limits of a plan in the plan editor
(`/admin/plans`, create and edit):

- Max input tokens per call (`maxInputTokensPerCall`)
- Max output tokens per call (`maxOutputTokensPerCall`)
- Max cost per call in USD (`maxCostPerCallMicroUsd`; typed in dollars, stored as micro-USD)

Blank means no limit and is sent as an explicit `null`, so an edit can lift a cap. `0` refuses
every platform-paid call. Tokens are whole numbers 0..10,000,000; cost has up to 6 decimals.

Where: `plan-form.tsx`, `use-plan-form.ts`, `plan.schema.ts` (frontend); `create-plan.dto.ts`,
`update-plan.dto.ts`, `plans.service.ts` `toView` (auth-service). Labels exist in all 13 locales.
Tests: `use-plan-form-call-limits.test.ts`, `plan-call-limits.dto.spec.ts`,
`plans.service.call-limits.spec.ts`.

No migration (the columns exist). Deploy: restart auth-service and rebuild/restart the frontend.
