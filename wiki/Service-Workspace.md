# Workspace Service

**Workspace:** [`apps/claw-workspace-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-workspace-service)  
**Port:** 4014  
**Database:** postgresql  
**Test runner:** vitest · **96 test files**  
**API endpoints:** 108

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-auth`
- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `AiActionApprovalQueue`
- `AiActionPolicy`
- `AutoSuggestRun`
- `DigestSnapshot`
- `ImplPromptHandoff`
- `SuggestionDeduplication`
- `SuggestionTriggerRule`
- `SyncCadenceDefault`
- `UserAutomationPreference`
- `UserDigestPreference`
- `UserEmailSignature`
- `UserEmailTemplate`
- `WebhookDelivery`
- `WorkspaceAction`
- `WorkspaceChain`
- `WorkspaceChainRun`
- `WorkspaceChainRunStep`
- `WorkspaceChainTemplate`
- `WorkspaceConnector`
- `WorkspaceConnectorGrant`
- `WorkspaceConnectorGrantAuditLog`
- `WorkspaceEvent`
- `WorkspaceHealthEvent`
- `WorkspaceObject`
- `WorkspaceObjectLink`
- `WorkspaceProviderAppConfig`
- `WorkspaceProviderDefinition`
- `WorkspaceSyncRun`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/health/health.controller.ts) |
| `POST` | `/internal/workspace/search` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-search-internal.controller.ts) |
| `GET` | `/internal/workspace/sync/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/sync-health-internal.controller.ts) |
| `GET` | `/workspace/actions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/actions/controllers/workspace-action.controller.ts) |
| `POST` | `/workspace/actions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/actions/controllers/workspace-action.controller.ts) |
| `GET` | `/workspace/actions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/actions/controllers/workspace-action.controller.ts) |
| `PATCH` | `/workspace/actions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/actions/controllers/workspace-action.controller.ts) |
| `POST` | `/workspace/actions/:id/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/actions/controllers/workspace-action.controller.ts) |
| `POST` | `/workspace/actions/:id/reject` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/actions/controllers/workspace-action.controller.ts) |
| `POST` | `/workspace/actions/bulk-approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/actions/controllers/workspace-action.controller.ts) |
| `POST` | `/workspace/ai-actions/multi-model-review` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action.controller.ts) |
| `POST` | `/workspace/ai-actions/multi-model-review/bundle` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action.controller.ts) |
| `GET` | `/workspace/ai-actions/policies` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-policy.controller.ts) |
| `POST` | `/workspace/ai-actions/policies` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-policy.controller.ts) |
| `DELETE` | `/workspace/ai-actions/policies/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-policy.controller.ts) |
| `GET` | `/workspace/ai-actions/policies/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-policy.controller.ts) |
| `PATCH` | `/workspace/ai-actions/policies/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-policy.controller.ts) |
| `GET` | `/workspace/ai-actions/queue` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-approval-queue.controller.ts) |
| `GET` | `/workspace/ai-actions/queue/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-approval-queue.controller.ts) |
| `POST` | `/workspace/ai-actions/queue/:id/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-approval-queue.controller.ts) |
| `POST` | `/workspace/ai-actions/queue/:id/edit-and-approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-approval-queue.controller.ts) |
| `POST` | `/workspace/ai-actions/queue/:id/reject` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-approval-queue.controller.ts) |
| `POST` | `/workspace/ai-actions/queue/bulk-approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action-approval-queue.controller.ts) |
| `POST` | `/workspace/ai-actions/resolve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action.controller.ts) |
| `POST` | `/workspace/ai-actions/run` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/ai-action.controller.ts) |
| `POST` | `/workspace/auto-suggest/jobs/:jobType/trigger-now` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/auto-suggest/controllers/auto-suggest.controller.ts) |
| `GET` | `/workspace/auto-suggest/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/auto-suggest/controllers/auto-suggest.controller.ts) |
| `GET` | `/workspace/automation-preferences` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/automation-preference.controller.ts) |
| `PUT` | `/workspace/automation-preferences/:actionKind` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/automation-preference.controller.ts) |
| `GET` | `/workspace/automation-preferences/learned` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ai-actions/controllers/automation-preference.controller.ts) |
| `GET` | `/workspace/chain-templates` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain-template.controller.ts) |
| `POST` | `/workspace/chain-templates/:key/instantiate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain-template.controller.ts) |
| `GET` | `/workspace/chains` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `POST` | `/workspace/chains` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `DELETE` | `/workspace/chains/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `GET` | `/workspace/chains/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `PATCH` | `/workspace/chains/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `POST` | `/workspace/chains/:id/run` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `GET` | `/workspace/chains/:id/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `POST` | `/workspace/chains/:id/runs/:runId/resume` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `POST` | `/workspace/chains/draft-from-nl` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/chains/controllers/chain.controller.ts) |
| `GET` | `/workspace/connectors` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `POST` | `/workspace/connectors` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `GET` | `/workspace/connectors/:connectorId/grants` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/connector-access/controllers/connector-grant.controller.ts) |
| `POST` | `/workspace/connectors/:connectorId/grants` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/connector-access/controllers/connector-grant.controller.ts) |
| `DELETE` | `/workspace/connectors/:connectorId/grants/:granteeUserId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/connector-access/controllers/connector-grant.controller.ts) |
| `DELETE` | `/workspace/connectors/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `GET` | `/workspace/connectors/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `PATCH` | `/workspace/connectors/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `PATCH` | `/workspace/connectors/:id/cadence` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `POST` | `/workspace/connectors/:id/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `GET` | `/workspace/connectors/:id/health-events` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `POST` | `/workspace/connectors/:id/pause` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `POST` | `/workspace/connectors/:id/resume` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `POST` | `/workspace/connectors/:id/sync` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `GET` | `/workspace/connectors/:id/sync-runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-connector.controller.ts) |
| `GET` | `/workspace/connectors/shared-with-me` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/connector-access/controllers/connector-grant-inbox.controller.ts) |
| `POST` | `/workspace/decompose-fanout/queue/:queueId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ticket-planning/controllers/decompose-fanout.controller.ts) |
| `GET` | `/workspace/digests` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/digest/controllers/digest.controller.ts) |
| `GET` | `/workspace/digests/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/digest/controllers/digest.controller.ts) |
| `GET` | `/workspace/digests/preferences` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/digest/controllers/digest.controller.ts) |
| `PATCH` | `/workspace/digests/preferences` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/digest/controllers/digest.controller.ts) |
| `POST` | `/workspace/digests/regenerate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/digest/controllers/digest.controller.ts) |
| `GET` | `/workspace/digests/today` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/digest/controllers/digest.controller.ts) |
| `POST` | `/workspace/digests/trigger-mine` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/digest/controllers/digest.controller.ts) |
| `GET` | `/workspace/email-signatures` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-signatures/controllers/email-signature.controller.ts) |
| `POST` | `/workspace/email-signatures` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-signatures/controllers/email-signature.controller.ts) |
| `DELETE` | `/workspace/email-signatures/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-signatures/controllers/email-signature.controller.ts) |
| `GET` | `/workspace/email-signatures/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-signatures/controllers/email-signature.controller.ts) |
| `PATCH` | `/workspace/email-signatures/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-signatures/controllers/email-signature.controller.ts) |
| `GET` | `/workspace/email-signatures/default` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-signatures/controllers/email-signature.controller.ts) |
| `GET` | `/workspace/email-templates` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-templates/controllers/email-template.controller.ts) |
| `POST` | `/workspace/email-templates` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-templates/controllers/email-template.controller.ts) |
| `DELETE` | `/workspace/email-templates/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-templates/controllers/email-template.controller.ts) |
| `GET` | `/workspace/email-templates/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-templates/controllers/email-template.controller.ts) |
| `PATCH` | `/workspace/email-templates/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-templates/controllers/email-template.controller.ts) |
| `GET` | `/workspace/email-templates/default` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/email-templates/controllers/email-template.controller.ts) |
| `GET` | `/workspace/figma/:connectorId/files/:fileKey/analysis` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/figma-design.controller.ts) |
| `GET` | `/workspace/impl-handoffs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ticket-planning/controllers/impl-handoff.controller.ts) |
| `GET` | `/workspace/impl-handoffs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ticket-planning/controllers/impl-handoff.controller.ts) |
| `POST` | `/workspace/impl-handoffs/queue/:queueId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/ticket-planning/controllers/impl-handoff.controller.ts) |
| `GET` | `/workspace/inbox` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/inbox/controllers/inbox.controller.ts) |
| `PATCH` | `/workspace/inbox/objects/:id/needs-attention` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/inbox/controllers/inbox.controller.ts) |
| `POST` | `/workspace/inbox/search` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/inbox/controllers/inbox.controller.ts) |
| `GET` | `/workspace/oauth/callback` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-oauth.controller.ts) |
| `POST` | `/workspace/oauth/init` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-oauth.controller.ts) |
| `POST` | `/workspace/oauth/test-connection` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-oauth.controller.ts) |
| `POST` | `/workspace/oauth/test-pat` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-oauth.controller.ts) |
| `GET` | `/workspace/objects` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-object.controller.ts) |
| `GET` | `/workspace/objects/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-object.controller.ts) |
| `GET` | `/workspace/objects/:id/content` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-object.controller.ts) |
| `POST` | `/workspace/objects/:id/refresh` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-object.controller.ts) |
| `GET` | `/workspace/provider-app-configs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-provider-registry.controller.ts) |
| `POST` | `/workspace/provider-app-configs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-provider-registry.controller.ts) |
| `DELETE` | `/workspace/provider-app-configs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-provider-registry.controller.ts) |
| `GET` | `/workspace/provider-app-configs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-provider-registry.controller.ts) |
| `PUT` | `/workspace/provider-app-configs/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-provider-registry.controller.ts) |
| `GET` | `/workspace/providers` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-provider-registry.controller.ts) |
| `GET` | `/workspace/providers/:provider` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-provider-registry.controller.ts) |
| `POST` | `/workspace/search` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/workspace-search.controller.ts) |
| `GET` | `/workspace/suggestion-rules` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/suggestion-factory/controllers/trigger-rule.controller.ts) |
| `POST` | `/workspace/suggestion-rules` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/suggestion-factory/controllers/trigger-rule.controller.ts) |
| `DELETE` | `/workspace/suggestion-rules/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/suggestion-factory/controllers/trigger-rule.controller.ts) |
| `PATCH` | `/workspace/suggestion-rules/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/suggestion-factory/controllers/trigger-rule.controller.ts) |
| `GET` | `/workspace/sync/dashboard` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/workspace/controllers/sync-health.controller.ts) |
| `POST` | `/workspace/webhooks/:provider/:connectorId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/webhooks/controllers/webhook-receiver.controller.ts) |
| `GET` | `/workspace/webhooks/deliveries` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/webhooks/controllers/webhook-receiver.controller.ts) |
| `POST` | `/workspace/webhooks/deliveries/:id/replay` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/src/modules/webhooks/controllers/webhook-receiver.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `ai_action.approved` | `claw-audit-service` |
| `ai_action.auto_approved` | `claw-audit-service` |
| `ai_action.denied` | `claw-audit-service` |
| `ai_action.edited` | `claw-audit-service` |
| `ai_action.expired` | `claw-audit-service` |
| `ai_action.pending_approval` | `claw-audit-service` |
| `ai_action.policy.created` | `claw-audit-service` |
| `ai_action.policy.deleted` | `claw-audit-service` |
| `ai_action.policy.updated` | `claw-audit-service` |
| `ai_action.rejected` | `claw-audit-service` |
| `ai_action.suggestion_created` | `claw-audit-service` |
| `log.server` | — |
| `memory.preference.upserted` | — |
| `workspace.auto_suggest.tick.completed` | — |
| `workspace.auto_suggest.tick.failed` | — |
| `workspace.auto_suggest.tick.started` | — |
| `workspace.event.ingested` | — |
| `workspace.suggestion.factory_processed` | — |
| `workspace.sync.dlq_sent` | `claw-audit-service` |
| `workspace.sync.manual_triggered` | `claw-audit-service` |
| `workspace.sync.paused` | `claw-audit-service` |
| `workspace.sync.resumed` | `claw-audit-service` |
| `workspace.sync.run_completed` | `claw-audit-service` |
| `workspace.sync.run_failed` | `claw-audit-service` |
| `workspace.sync.run_started` | `claw-audit-service` |
| `workspace.sync.stale_detected` | `claw-audit-service` |
| `workspace.webhook.received` | — |
| `workspace.webhook.rejected` | — |
| `workspace.webhook.replayed` | — |
| `workspace_action.approved` | — |
| `workspace_action.bulk_approved` | `claw-audit-service` |
| `workspace_action.drafted` | — |
| `workspace_action.edited` | `claw-audit-service` |
| `workspace_action.executed` | — |
| `workspace_action.failed` | — |
| `workspace_action.rejected` | — |
| `workspace_action.stale_blocked` | `claw-audit-service` |
| `workspace_connector.created` | — |
| `workspace_connector.deleted` | — |
| `workspace_connector.updated` | — |
| `workspace_object.synced` | — |

## Events consumed

| Pattern | Producers |
|---|---|
| — | — |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/AGENTS.md) for generated, service-local agent context.
