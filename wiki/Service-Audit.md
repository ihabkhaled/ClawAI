# Audit Service

**Workspace:** [`apps/claw-audit-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-audit-service)  
**Port:** 4007  
**Database:** mongodb  
**Test runner:** vitest · **21 test files**  
**API endpoints:** 15

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `AuditLog`
- `FeedbackCounter`
- `FeedbackTicket`
- `UsageLedger`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/audits` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| `GET` | `/audits/stats` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| `POST` | `/feedback` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback.controller.ts) |
| `GET` | `/feedback/admin` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| `GET` | `/feedback/admin/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| `GET` | `/feedback/admin/:id/attachments/:fileId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| `PATCH` | `/feedback/admin/:id/status` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| `GET` | `/feedback/admin/stats` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| `GET` | `/feedback/mine` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback.controller.ts) |
| `GET` | `/feedback/mine/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/usage` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| `GET` | `/usage/cost` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| `GET` | `/usage/latency` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| `GET` | `/usage/summary` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `log.server` | — |

## Events consumed

| Pattern | Producers |
|---|---|
| `agent.capability.approved` | `claw-agent-service` |
| `agent.capability.auto_approved` | `claw-agent-service` |
| `agent.capability.cancelled` | `claw-agent-service` |
| `agent.capability.denied` | `claw-agent-service` |
| `agent.capability.executed` | `claw-agent-service` |
| `agent.capability.executing` | — |
| `agent.capability.expired` | `claw-agent-service` |
| `agent.capability.failed` | `claw-agent-service` |
| `agent.capability.policy_matched` | `claw-agent-service` |
| `agent.capability.proposed` | `claw-agent-service` |
| `agent.capability.rejected` | `claw-agent-service` |
| `agent.capability.rolled_back` | `claw-agent-service` |
| `agent.device_paired` | `claw-agent-service` |
| `agent.device_revoked` | `claw-agent-service` |
| `agent.policy_violated` | `claw-agent-service` |
| `agent.session_connected` | `claw-agent-service` |
| `agent.session_disconnected` | `claw-agent-service` |
| `agent.token_reuse_detected` | `claw-agent-service` |
| `agent.token_rotated` | `claw-agent-service` |
| `ai_action.approved` | `claw-workspace-service` |
| `ai_action.auto_approved` | `claw-workspace-service` |
| `ai_action.denied` | `claw-workspace-service` |
| `ai_action.edited` | `claw-workspace-service` |
| `ai_action.executed` | — |
| `ai_action.expired` | `claw-workspace-service` |
| `ai_action.pending_approval` | `claw-workspace-service` |
| `ai_action.policy.created` | `claw-workspace-service` |
| `ai_action.policy.deleted` | `claw-workspace-service` |
| `ai_action.policy.updated` | `claw-workspace-service` |
| `ai_action.rejected` | `claw-workspace-service` |
| `ai_action.suggestion_created` | `claw-workspace-service` |
| `billing.credit.topup_reversed` | — |
| `billing.credit.topup_succeeded` | — |
| `billing.entitlement.reconcile_requested` | — |
| `billing.payment.chargeback` | — |
| `billing.payment.refunded` | — |
| `billing.subscription.activated` | — |
| `billing.subscription.cancelled` | — |
| `billing.subscription.downgrade_scheduled` | — |
| `billing.subscription.downgraded` | — |
| `billing.subscription.expired` | — |
| `billing.subscription.past_due` | — |
| `billing.subscription.renewed` | — |
| `billing.subscription.suspended` | — |
| `billing.subscription.upgraded` | — |
| `chat.share.published` | — |
| `chat.share.revoked` | — |
| `chat.share.safety_rejected` | — |
| `chat.share.updated` | — |
| `chat.share.url_regenerated` | — |
| `chat.share.visibility_changed` | — |
| `connector.created` | `claw-connector-service` |
| `connector.deleted` | `claw-connector-service` |
| `connector.health_checked` | `claw-connector-service` |
| `connector.synced` | `claw-connector-service`, `claw-ollama-service` |
| `connector.updated` | `claw-connector-service`, `claw-ollama-service` |
| `file.archive_expanded` | `claw-file-service` |
| `file.chunked` | `claw-file-service` |
| `file.deleted` | `claw-file-service` |
| `file.downloaded` | `claw-file-service` |
| `file.extraction_failed` | `claw-file-service` |
| `file.failed` | `claw-file-service` |
| `file.ocr_completed` | `claw-file-service` |
| `file.ocr_failed` | `claw-file-service` |
| `file.ocr_started` | `claw-file-service` |
| `file.retention_expired` | `claw-file-service` |
| `file.upload_completed` | `claw-file-service` |
| `file.upload_started` | `claw-file-service` |
| `file.uploaded` | `claw-file-service` |
| `llamacpp.binary.installed` | `claw-llamacpp-service` |
| `llamacpp.binary.updated` | `claw-llamacpp-service` |
| `llamacpp.model.crashed` | `claw-llamacpp-service` |
| `llamacpp.model.loaded` | `claw-llamacpp-service` |
| `llamacpp.model.unloaded` | `claw-llamacpp-service` |
| `llamacpp.preflight.overridden` | `claw-llamacpp-service` |
| `llamacpp.pull.completed` | `claw-llamacpp-service` |
| `llamacpp.pull.failed` | `claw-llamacpp-service` |
| `llamacpp.pull.progress` | `claw-llamacpp-service` |
| `llamacpp.pull.started` | `claw-llamacpp-service` |
| `llamacpp.weights.deleted` | `claw-llamacpp-service` |
| `memory.extracted` | `claw-memory-service` |
| `message.completed` | `claw-chat-service` |
| `routing.circuit_breaker.closed` | — |
| `routing.circuit_breaker.half_open` | — |
| `routing.circuit_breaker.opened` | — |
| `routing.decision_made` | — |
| `routing.learned_score.updated` | — |
| `routing.models.synced` | `claw-routing-service` |
| `routing.no_execution_model` | — |
| `routing.policy.changed` | — |
| `routing.profile.created` | — |
| `routing.profile.lifecycle_changed` | — |
| `routing.profile.updated` | — |
| `user.activated` | `claw-auth-service` |
| `user.login` | `claw-auth-service` |
| `user.logout` | `claw-auth-service` |
| `user.temporary_password_issued` | `claw-auth-service` |
| `workspace.sync.dlq_sent` | `claw-workspace-service` |
| `workspace.sync.manual_triggered` | `claw-workspace-service` |
| `workspace.sync.paused` | `claw-workspace-service` |
| `workspace.sync.rate_limited` | — |
| `workspace.sync.resumed` | `claw-workspace-service` |
| `workspace.sync.run_completed` | `claw-workspace-service` |
| `workspace.sync.run_failed` | `claw-workspace-service` |
| `workspace.sync.run_started` | `claw-workspace-service` |
| `workspace.sync.stale_detected` | `claw-workspace-service` |
| `workspace_action.bulk_approved` | `claw-workspace-service` |
| `workspace_action.edited` | `claw-workspace-service` |
| `workspace_action.stale_blocked` | `claw-workspace-service` |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/AGENTS.md) for generated, service-local agent context.
