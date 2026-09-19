# Chat Service

**Workspace:** [`apps/claw-chat-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-chat-service)  
**Port:** 4002  
**Database:** postgresql  
**Test runner:** vitest · **153 test files**  
**API endpoints:** 49

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `ChatMessage`
- `ChatMessageContextReceipt`
- `ChatShare`
- `ChatShareMessage`
- `ChatShareMessageAsset`
- `ChatThread`
- `FileDeliveryRecord`
- `MessageAttachment`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `POST` | `/chat-messages` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `GET` | `/chat-messages/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `GET` | `/chat-messages/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `GET` | `/chat-messages/:id/context-receipt` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/context-receipts/controllers/context-receipt.controller.ts) |
| `POST` | `/chat-messages/:id/edit` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `PATCH` | `/chat-messages/:id/feedback` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `GET` | `/chat-messages/:id/file-delivery` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/:id/regenerate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/best-of-n` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/consensus` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/cost-ensemble` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/decompose` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/escalation-chain` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/parallel` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/pipeline` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/repair` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/role-pack` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/runtime/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/runtime-v2-run.controller.ts) |
| `POST` | `/chat-messages/runtime/runs/:runId/cancel` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/runtime-v2-command.controller.ts) |
| `POST` | `/chat-messages/runtime/runs/:runId/results` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/runtime-v2-command.controller.ts) |
| `POST` | `/chat-messages/runtime/runs/:runId/steering` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/runtime-v2-command.controller.ts) |
| `POST` | `/chat-messages/stream/:threadId/cancel` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-stream.controller.ts) |
| `GET` | `/chat-messages/thread/:threadId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `GET` | `/chat-messages/thread/:threadId/search` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `POST` | `/chat-messages/verify` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts) |
| `GET` | `/chat-threads` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads.controller.ts) |
| `POST` | `/chat-threads` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads.controller.ts) |
| `DELETE` | `/chat-threads/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads.controller.ts) |
| `GET` | `/chat-threads/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads.controller.ts) |
| `PATCH` | `/chat-threads/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads.controller.ts) |
| `POST` | `/chat-threads/:id/branch` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads.controller.ts) |
| `POST` | `/chat-threads/:id/preview-context` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/context-preview/controllers/context-preview.controller.ts) |
| `DELETE` | `/chat-threads/:threadId/share` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares.controller.ts) |
| `GET` | `/chat-threads/:threadId/share` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares.controller.ts) |
| `PATCH` | `/chat-threads/:threadId/share` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares.controller.ts) |
| `POST` | `/chat-threads/:threadId/share` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares.controller.ts) |
| `POST` | `/chat-threads/:threadId/share/refresh` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares.controller.ts) |
| `POST` | `/chat-threads/:threadId/share/regenerate-url` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares.controller.ts) |
| `GET` | `/coding-agent-chats` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/coding-agent-chats/controllers/coding-agent-chats.controller.ts) |
| `GET` | `/coding-agent-chats/:id/messages` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/coding-agent-chats/controllers/coding-agent-chats.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/chat-shares/rss-feed` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares-internal.controller.ts) |
| `GET` | `/internal/chat-shares/sitemap-count` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares-internal.controller.ts) |
| `GET` | `/internal/chat-shares/sitemap-feed` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/chat-shares-internal.controller.ts) |
| `POST` | `/internal/chat/generate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-internal.controller.ts) |
| `GET` | `/internal/chat/model-authorization-metrics` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-messages/controllers/chat-internal.controller.ts) |
| `POST` | `/internal/chat/threads/seeded` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads-internal.controller.ts) |
| `GET` | `/public/chat-shares/:publicShareId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/public-chat-shares.controller.ts) |
| `GET` | `/public/chat-shares/:publicShareId/assets/:publicAssetId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/src/modules/chat-shares/controllers/public-chat-shares.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `chat_thread.context_toggled` | — |
| `chat_thread.memory_toggled` | — |
| `context.receipt_written` | — |
| `log.server` | — |
| `message.completed` | `claw-audit-service`, `claw-memory-service`, `claw-routing-service` |
| `message.created` | `claw-routing-service` |
| `message.feedback_set` | — |

## Events consumed

| Pattern | Producers |
|---|---|
| `chat.share.published` | — |
| `chat.share.revoked` | — |
| `chat.share.safety_rejected` | — |
| `chat.share.updated` | — |
| `chat.share.url_regenerated` | — |
| `chat.share.visibility_changed` | — |
| `connector.model_exposure_changed` | `claw-connector-service` |
| `message.routed` | `claw-routing-service` |
| `router.trace.emitted` | `claw-routing-service` |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/AGENTS.md) for generated, service-local agent context.
