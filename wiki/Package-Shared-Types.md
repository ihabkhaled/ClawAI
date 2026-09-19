# Package: @claw/shared-types

> **Workspace:** `packages/shared-types`

## Purpose and ownership

# @claw/shared-types — agent guide

**Type:** shared-package · **Path:** `packages/shared-types`

## Canonical owner
- Root policy: `CLAUDE.md` + `rules/00-non-negotiable-rules.md`
- Shared packages: `rules/17-shared-packages.md` + `context/package-boundaries.md`

## Commands (run in this folder only)
```
npm run typecheck
npm run lint
npm run test
npm run build
```

## Before editing
1. `npm run knowledge:context -- --task="<task>" --service=@claw/shared-types`
2. Read `.ai/local/current-context.md`.
3. Never cross this workspace's data boundary; never bypass hooks; never suppress lint/types.

_Generated from source. Edit the renderer, not this file._


## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **160**
- Internal dependencies: none

## Scripts

| Script | Command |
|---|---|
| `typecheck` | `node ../../tools/typescript/run-ts7.mjs --noEmit` |
| `build` | `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json && tsc-alias -p tsconfig.build.json -f` |
| `lint` | `eslint src/ --concurrency=1` |
| `lint:fix` | `eslint src/ --fix` |
| `test` | `vitest run --passWithNoTests` |
| `test:watch` | `vitest` |

## Workspace inventory

- [`packages/shared-types/AGENTS.md`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/AGENTS.md)
- [`packages/shared-types/__tests__/runtime-progress/runtime-progress.types.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/__tests__/runtime-progress/runtime-progress.types.spec.ts)
- [`packages/shared-types/package.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/package.json)
- [`packages/shared-types/src/deployment/__tests__/deployment-status.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/__tests__/deployment-status.spec.ts)
- [`packages/shared-types/src/deployment/deployment-credential-source.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-credential-source.enum.ts)
- [`packages/shared-types/src/deployment/deployment-credential.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-credential.types.ts)
- [`packages/shared-types/src/deployment/deployment-phase.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-phase.enum.ts)
- [`packages/shared-types/src/deployment/deployment-run-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-run-status.enum.ts)
- [`packages/shared-types/src/deployment/deployment-run.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-run.types.ts)
- [`packages/shared-types/src/deployment/deployment-state.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-state.enum.ts)
- [`packages/shared-types/src/deployment/deployment-status.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-status.types.ts)
- [`packages/shared-types/src/deployment/deployment-trigger-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-trigger-mode.enum.ts)
- [`packages/shared-types/src/deployment/deployment-trigger.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/deployment-trigger.types.ts)
- [`packages/shared-types/src/deployment/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/deployment/index.ts)
- [`packages/shared-types/src/enums/admin-user-trial-state.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/admin-user-trial-state.enum.ts)
- [`packages/shared-types/src/enums/api-error-code.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/api-error-code.enum.ts)
- [`packages/shared-types/src/enums/audit-action.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/audit-action.enum.ts)
- [`packages/shared-types/src/enums/audit-severity.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/audit-severity.enum.ts)
- [`packages/shared-types/src/enums/billing-customer-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/billing-customer-status.enum.ts)
- [`packages/shared-types/src/enums/billing-error-code.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/billing-error-code.enum.ts)
- [`packages/shared-types/src/enums/billing-gateway.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/billing-gateway.enum.ts)
- [`packages/shared-types/src/enums/billing-interval.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/billing-interval.enum.ts)
- [`packages/shared-types/src/enums/cancellation-settlement-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/cancellation-settlement-mode.enum.ts)
- [`packages/shared-types/src/enums/capability-confidence.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/capability-confidence.enum.ts)
- [`packages/shared-types/src/enums/capability-evidence-source.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/capability-evidence-source.enum.ts)
- [`packages/shared-types/src/enums/checkout-purpose.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/checkout-purpose.enum.ts)
- [`packages/shared-types/src/enums/checkout-session-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/checkout-session-status.enum.ts)
- [`packages/shared-types/src/enums/claw-effort-profile.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/claw-effort-profile.enum.ts)
- [`packages/shared-types/src/enums/claw-speed-profile.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/claw-speed-profile.enum.ts)
- [`packages/shared-types/src/enums/compare-result-view-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/compare-result-view-mode.enum.ts)
- [`packages/shared-types/src/enums/connector-auth-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/connector-auth-type.enum.ts)
- [`packages/shared-types/src/enums/connector-provider.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/connector-provider.enum.ts)
- [`packages/shared-types/src/enums/connector-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/connector-status.enum.ts)
- [`packages/shared-types/src/enums/context-pack-item-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/context-pack-item-type.enum.ts)
- [`packages/shared-types/src/enums/context-pack-scope.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/context-pack-scope.enum.ts)
- [`packages/shared-types/src/enums/context-pack-visibility.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/context-pack-visibility.enum.ts)
- [`packages/shared-types/src/enums/credit-bucket.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/credit-bucket.enum.ts)
- [`packages/shared-types/src/enums/credit-ledger-kind.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/credit-ledger-kind.enum.ts)
- [`packages/shared-types/src/enums/currency-preference-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/currency-preference-mode.enum.ts)
- [`packages/shared-types/src/enums/display-fx-source.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/display-fx-source.enum.ts)
- [`packages/shared-types/src/enums/display-rounding-policy.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/display-rounding-policy.enum.ts)
- [`packages/shared-types/src/enums/entitlement-grant-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/entitlement-grant-type.enum.ts)
- [`packages/shared-types/src/enums/feedback-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/feedback-status.enum.ts)
- [`packages/shared-types/src/enums/feedback-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/feedback-type.enum.ts)
- [`packages/shared-types/src/enums/file-ingestion-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/file-ingestion-status.enum.ts)
- [`packages/shared-types/src/enums/geo-country-source.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/geo-country-source.enum.ts)
- [`packages/shared-types/src/enums/health-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/health-status.enum.ts)
- [`packages/shared-types/src/enums/http-method.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/http-method.enum.ts)
- [`packages/shared-types/src/enums/inbox-event-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/inbox-event-status.enum.ts)
- [`packages/shared-types/src/enums/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/index.ts)
- [`packages/shared-types/src/enums/invoice-line-kind.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/invoice-line-kind.enum.ts)
- [`packages/shared-types/src/enums/invoice-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/invoice-status.enum.ts)
- [`packages/shared-types/src/enums/judge-criterion-key.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/judge-criterion-key.enum.ts)
- [`packages/shared-types/src/enums/judge-execution-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/judge-execution-mode.enum.ts)
- [`packages/shared-types/src/enums/local-model-role.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/local-model-role.enum.ts)
- [`packages/shared-types/src/enums/locale.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/locale.enum.ts)
- [`packages/shared-types/src/enums/log-level.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/log-level.enum.ts)
- [`packages/shared-types/src/enums/memory-audit-action.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/memory-audit-action.enum.ts)
- [`packages/shared-types/src/enums/memory-retention.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/memory-retention.enum.ts)
- [`packages/shared-types/src/enums/memory-scope.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/memory-scope.enum.ts)
- [`packages/shared-types/src/enums/memory-sensitivity.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/memory-sensitivity.enum.ts)
- [`packages/shared-types/src/enums/memory-source.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/memory-source.enum.ts)
- [`packages/shared-types/src/enums/memory-suggestion-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/memory-suggestion-status.enum.ts)
- [`packages/shared-types/src/enums/memory-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/memory-type.enum.ts)
- [`packages/shared-types/src/enums/message-role.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/message-role.enum.ts)
- [`packages/shared-types/src/enums/model-availability-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/model-availability-status.enum.ts)
- [`packages/shared-types/src/enums/model-capability.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/model-capability.enum.ts)
- [`packages/shared-types/src/enums/model-cost-class.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/model-cost-class.enum.ts)
- [`packages/shared-types/src/enums/model-lifecycle.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/model-lifecycle.enum.ts)
- [`packages/shared-types/src/enums/model-runtime.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/model-runtime.enum.ts)
- [`packages/shared-types/src/enums/model-selector-context.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/model-selector-context.enum.ts)
- [`packages/shared-types/src/enums/outbox-event-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/outbox-event-status.enum.ts)
- [`packages/shared-types/src/enums/payg-surface.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/payg-surface.enum.ts)
- [`packages/shared-types/src/enums/payment-method-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/payment-method-status.enum.ts)
- [`packages/shared-types/src/enums/payment-transaction-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/payment-transaction-status.enum.ts)
- [`packages/shared-types/src/enums/payment-transaction-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/payment-transaction-type.enum.ts)
- [`packages/shared-types/src/enums/permission.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/permission.enum.ts)
- [`packages/shared-types/src/enums/plan-feature-access-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/plan-feature-access-mode.enum.ts)
- [`packages/shared-types/src/enums/plan-feature-window.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/plan-feature-window.enum.ts)
- [`packages/shared-types/src/enums/plan-feature.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/plan-feature.enum.ts)
- [`packages/shared-types/src/enums/plan-model-access-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/plan-model-access-mode.enum.ts)
- [`packages/shared-types/src/enums/proration-line-item-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/proration-line-item-type.enum.ts)
- [`packages/shared-types/src/enums/proration-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/proration-mode.enum.ts)
- [`packages/shared-types/src/enums/proration-quote-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/proration-quote-status.enum.ts)
- [`packages/shared-types/src/enums/quota-window.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/quota-window.enum.ts)
- [`packages/shared-types/src/enums/refund-settlement-kind.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/refund-settlement-kind.enum.ts)
- [`packages/shared-types/src/enums/refund-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/refund-status.enum.ts)
- [`packages/shared-types/src/enums/retrieval-reason.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/retrieval-reason.enum.ts)
- [`packages/shared-types/src/enums/routing-mode.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/routing-mode.enum.ts)
- [`packages/shared-types/src/enums/seed-execution-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/seed-execution-status.enum.ts)
- [`packages/shared-types/src/enums/subscription-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/subscription-status.enum.ts)
- [`packages/shared-types/src/enums/token-estimator-kind.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/token-estimator-kind.enum.ts)
- [`packages/shared-types/src/enums/token-ledger-context.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/token-ledger-context.enum.ts)
- [`packages/shared-types/src/enums/token-usage-source.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/token-usage-source.enum.ts)
- [`packages/shared-types/src/enums/user-appearance-preference.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/user-appearance-preference.enum.ts)
- [`packages/shared-types/src/enums/user-language-preference.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/user-language-preference.enum.ts)
- [`packages/shared-types/src/enums/user-role.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/user-role.enum.ts)
- [`packages/shared-types/src/enums/user-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/user-status.enum.ts)
- [`packages/shared-types/src/enums/webhook-event-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/webhook-event-status.enum.ts)
- [`packages/shared-types/src/enums/workspace-connector-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/workspace-connector-status.enum.ts)
- [`packages/shared-types/src/enums/workspace-provider.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/enums/workspace-provider.enum.ts)
- [`packages/shared-types/src/events/__tests__/user-temporary-password-issued.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/events/__tests__/user-temporary-password-issued.spec.ts)
- [`packages/shared-types/src/events/agent-lifecycle-events.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/events/agent-lifecycle-events.types.ts)
- [`packages/shared-types/src/events/billing-events.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/events/billing-events.types.ts)
- [`packages/shared-types/src/events/capability-events.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/events/capability-events.types.ts)
- [`packages/shared-types/src/events/chat-share-events.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/events/chat-share-events.types.ts)
- [`packages/shared-types/src/events/event-patterns.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/events/event-patterns.ts)
- [`packages/shared-types/src/events/event-payloads.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/events/event-payloads.type.ts)
- [`packages/shared-types/src/events/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/events/index.ts)
- [`packages/shared-types/src/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/index.ts)
- [`packages/shared-types/src/router-trace/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/router-trace/index.ts)
- [`packages/shared-types/src/router-trace/router-trace.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/router-trace/router-trace.types.ts)
- [`packages/shared-types/src/runtime-progress/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/index.ts)
- [`packages/shared-types/src/runtime-progress/runtime-execution-profile.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-execution-profile.enum.ts)
- [`packages/shared-types/src/runtime-progress/runtime-modality.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-modality.enum.ts)
- [`packages/shared-types/src/runtime-progress/runtime-probe-report.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-probe-report.types.ts)
- [`packages/shared-types/src/runtime-progress/runtime-probe-status.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-probe-status.enum.ts)
- [`packages/shared-types/src/runtime-progress/runtime-progress-confidence.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-progress-confidence.enum.ts)
- [`packages/shared-types/src/runtime-progress/runtime-progress-event-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-progress-event-type.enum.ts)
- [`packages/shared-types/src/runtime-progress/runtime-progress-stage.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-progress-stage.enum.ts)
- [`packages/shared-types/src/runtime-progress/runtime-progress.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-progress.types.ts)
- [`packages/shared-types/src/runtime-progress/runtime-provider.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/runtime-provider.enum.ts)
- [`packages/shared-types/src/runtime-progress/streaming-error-type.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/streaming-error-type.enum.ts)
- [`packages/shared-types/src/runtime-progress/visible-reasoning-source.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/runtime-progress/visible-reasoning-source.enum.ts)
- [`packages/shared-types/src/types/admin-user-plan.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/admin-user-plan.type.ts)
- [`packages/shared-types/src/types/admin-user-subscription.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/admin-user-subscription.type.ts)
- [`packages/shared-types/src/types/admin-user-usage.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/admin-user-usage.type.ts)
- [`packages/shared-types/src/types/authenticated-request.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/authenticated-request.type.ts)
- [`packages/shared-types/src/types/checkout.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/checkout.type.ts)
- [`packages/shared-types/src/types/compare-result.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/compare-result.type.ts)
- [`packages/shared-types/src/types/display-currency.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/display-currency.type.ts)
- [`packages/shared-types/src/types/effort-resolution.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/effort-resolution.type.ts)
- [`packages/shared-types/src/types/http-client.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/http-client.type.ts)
- [`packages/shared-types/src/types/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/index.ts)
- [`packages/shared-types/src/types/internal-payment.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/internal-payment.type.ts)
- [`packages/shared-types/src/types/invoice.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/invoice.type.ts)
- [`packages/shared-types/src/types/judge.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/judge.type.ts)
- [`packages/shared-types/src/types/jwt-payload.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/jwt-payload.type.ts)
- [`packages/shared-types/src/types/model-capability-evidence.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/model-capability-evidence.type.ts)
- [`packages/shared-types/src/types/model-option.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/model-option.type.ts)
- [`packages/shared-types/src/types/money.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/money.type.ts)
- [`packages/shared-types/src/types/pagination.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/pagination.type.ts)
- [`packages/shared-types/src/types/payg-credit.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/payg-credit.type.ts)
- [`packages/shared-types/src/types/payment-method.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/payment-method.type.ts)
- [`packages/shared-types/src/types/plan-billing.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/plan-billing.type.ts)
- [`packages/shared-types/src/types/proration-breakdown.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/proration-breakdown.type.ts)
- [`packages/shared-types/src/types/proration.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/proration.type.ts)
- [`packages/shared-types/src/types/refund-settlement.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/refund-settlement.type.ts)
- [`packages/shared-types/src/types/refund.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/refund.type.ts)
- [`packages/shared-types/src/types/research-crawl-progress.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/research-crawl-progress.type.ts)
- [`packages/shared-types/src/types/retrieval.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/retrieval.type.ts)
- [`packages/shared-types/src/types/speed-resolution.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/speed-resolution.type.ts)
- [`packages/shared-types/src/types/subscription.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/subscription.type.ts)
- [`packages/shared-types/src/types/token-usage.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/token-usage.type.ts)
- [`packages/shared-types/src/types/user-access-token-payload.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/user-access-token-payload.type.ts)
- [`packages/shared-types/src/types/weighted-usage.type.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/types/weighted-usage.type.ts)
- [`packages/shared-types/src/vitest-globals.d.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/src/vitest-globals.d.ts)
- [`packages/shared-types/tsconfig.build.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/tsconfig.build.json)
- [`packages/shared-types/tsconfig.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/tsconfig.json)
- [`packages/shared-types/vitest.config.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/vitest.config.ts)
