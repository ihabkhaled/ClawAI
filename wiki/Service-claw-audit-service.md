# claw-audit-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-audit-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service) |
| Port | 4007 |
| Database | mongodb |
| Endpoints | 15 |
| Tests | 21 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `audits`
- `feedback`
- `health`

## Persistence models
- `AuditLog`
- `FeedbackCounter`
- `FeedbackTicket`
- `UsageLedger`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/audits` | [src/modules/audits/controllers/audits.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| GET | `/audits/stats` | [src/modules/audits/controllers/audits.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| POST | `/feedback` | [src/modules/feedback/controllers/feedback.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback.controller.ts) |
| GET | `/feedback/admin` | [src/modules/feedback/controllers/feedback-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| GET | `/feedback/admin/:id` | [src/modules/feedback/controllers/feedback-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| GET | `/feedback/admin/:id/attachments/:fileId` | [src/modules/feedback/controllers/feedback-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| PATCH | `/feedback/admin/:id/status` | [src/modules/feedback/controllers/feedback-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| GET | `/feedback/admin/stats` | [src/modules/feedback/controllers/feedback-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts) |
| GET | `/feedback/mine` | [src/modules/feedback/controllers/feedback.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback.controller.ts) |
| GET | `/feedback/mine/:id` | [src/modules/feedback/controllers/feedback.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback.controller.ts) |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/usage` | [src/modules/audits/controllers/audits.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| GET | `/usage/cost` | [src/modules/audits/controllers/audits.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| GET | `/usage/latency` | [src/modules/audits/controllers/audits.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |
| GET | `/usage/summary` | [src/modules/audits/controllers/audits.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts) |

## File inventory
<details>
<summary>114 tracked files</summary>

- [apps/claw-audit-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/.dockerignore)
- [apps/claw-audit-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/.prettierignore)
- [apps/claw-audit-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/.prettierrc)
- [apps/claw-audit-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/AGENTS.md)
- [apps/claw-audit-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/CLAUDE.md)
- [apps/claw-audit-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/Dockerfile)
- [apps/claw-audit-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/Dockerfile.dev)
- [apps/claw-audit-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/docker-entrypoint.dev.sh)
- [apps/claw-audit-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/eslint.config.mjs)
- [apps/claw-audit-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/nest-cli.json)
- [apps/claw-audit-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/package.json)
- [apps/claw-audit-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/__tests__/app.spec.ts)
- [apps/claw-audit-service/src/__tests__/audit-event.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/__tests__/audit-event.manager.spec.ts)
- [apps/claw-audit-service/src/__tests__/audits.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/__tests__/audits.service.spec.ts)
- [apps/claw-audit-service/src/__tests__/usage.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/__tests__/usage.service.spec.ts)
- [apps/claw-audit-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/app.module.ts)
- [apps/claw-audit-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/config/app.config.ts)
- [apps/claw-audit-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-audit-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/decorators/public.decorator.ts)
- [apps/claw-audit-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-audit-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-audit-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-audit-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/guards/auth.guard.ts)
- [apps/claw-audit-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/guards/roles.guard.ts)
- [apps/claw-audit-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-audit-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-audit-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/constants/index.ts)
- [apps/claw-audit-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/constants/jwt.constants.ts)
- [apps/claw-audit-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/constants/pagination.constants.ts)
- [apps/claw-audit-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/enums/health-status.enum.ts)
- [apps/claw-audit-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/enums/index.ts)
- [apps/claw-audit-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/enums/user-role.enum.ts)
- [apps/claw-audit-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/errors/business.exception.ts)
- [apps/claw-audit-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/errors/index.ts)
- [apps/claw-audit-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-audit-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/types/index.ts)
- [apps/claw-audit-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-audit-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/types/pagination.type.ts)
- [apps/claw-audit-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/utilities/index.ts)
- [apps/claw-audit-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-audit-service/src/infrastructure/database/mongoose/mongoose.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/infrastructure/database/mongoose/mongoose.module.ts)
- [apps/claw-audit-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-audit-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-audit-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-audit-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/main.ts)
- [apps/claw-audit-service/src/modules/audits/__tests__/llamacpp.consumer.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/__tests__/llamacpp.consumer.spec.ts)
- [apps/claw-audit-service/src/modules/audits/audits.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/audits.module.ts)
- [apps/claw-audit-service/src/modules/audits/constants/ai-action-audit.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/constants/ai-action-audit.constants.ts)
- [apps/claw-audit-service/src/modules/audits/constants/billing-audit.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/constants/billing-audit.constants.ts)
- [apps/claw-audit-service/src/modules/audits/constants/chat-share-audit.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/constants/chat-share-audit.constants.ts)
- [apps/claw-audit-service/src/modules/audits/constants/llamacpp-audit.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/constants/llamacpp-audit.constants.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/__tests__/billing.consumer.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/__tests__/billing.consumer.spec.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/__tests__/chat-share.consumer.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/__tests__/chat-share.consumer.spec.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/ai-action.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/ai-action.consumer.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/billing.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/billing.consumer.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/chat-share.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/chat-share.consumer.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/llamacpp.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/llamacpp.consumer.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/routing.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/routing.consumer.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/workspace-action.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/workspace-action.consumer.ts)
- [apps/claw-audit-service/src/modules/audits/consumers/workspace-sync.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/consumers/workspace-sync.consumer.ts)
- [apps/claw-audit-service/src/modules/audits/controllers/__tests__/audits.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/__tests__/audits.controller.spec.ts)
- [apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts)
- [apps/claw-audit-service/src/modules/audits/dtos/__tests__/audits.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/dtos/__tests__/audits.dto.spec.ts)
- [apps/claw-audit-service/src/modules/audits/dtos/list-audits-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/dtos/list-audits-query.dto.ts)
- [apps/claw-audit-service/src/modules/audits/dtos/list-usage-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/dtos/list-usage-query.dto.ts)
- [apps/claw-audit-service/src/modules/audits/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/index.ts)
- [apps/claw-audit-service/src/modules/audits/managers/__tests__/audit-event-slice-d.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/managers/__tests__/audit-event-slice-d.spec.ts)
- [apps/claw-audit-service/src/modules/audits/managers/__tests__/audit-event.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/managers/__tests__/audit-event.manager.spec.ts)
- [apps/claw-audit-service/src/modules/audits/managers/audit-event.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/managers/audit-event.manager.ts)
- [apps/claw-audit-service/src/modules/audits/repositories/__tests__/audits.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/repositories/__tests__/audits.repository.spec.ts)
- [apps/claw-audit-service/src/modules/audits/repositories/__tests__/usage-ledger.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/repositories/__tests__/usage-ledger.repository.spec.ts)
- [apps/claw-audit-service/src/modules/audits/repositories/audits.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/repositories/audits.repository.ts)
- [apps/claw-audit-service/src/modules/audits/repositories/usage-ledger.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/repositories/usage-ledger.repository.ts)
- [apps/claw-audit-service/src/modules/audits/schemas/audit-log.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/schemas/audit-log.schema.ts)
- [apps/claw-audit-service/src/modules/audits/schemas/billing-audit-event.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/schemas/billing-audit-event.schema.ts)
- [apps/claw-audit-service/src/modules/audits/schemas/usage-ledger.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/schemas/usage-ledger.schema.ts)
- [apps/claw-audit-service/src/modules/audits/services/audits.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/services/audits.service.ts)
- [apps/claw-audit-service/src/modules/audits/services/usage.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/services/usage.service.ts)
- [apps/claw-audit-service/src/modules/audits/types/ai-action-audit.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/types/ai-action-audit.types.ts)
- [apps/claw-audit-service/src/modules/audits/types/audits.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/types/audits.types.ts)
- [apps/claw-audit-service/src/modules/audits/types/chat-share-event.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/types/chat-share-event.types.ts)
- [apps/claw-audit-service/src/modules/audits/types/llamacpp-event.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/audits/types/llamacpp-event.types.ts)
- [apps/claw-audit-service/src/modules/feedback/constants/feedback-sanitizer.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/constants/feedback-sanitizer.constants.ts)
- [apps/claw-audit-service/src/modules/feedback/controllers/__tests__/feedback-rbac.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/__tests__/feedback-rbac.spec.ts)
- [apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback-admin.controller.ts)
- [apps/claw-audit-service/src/modules/feedback/controllers/feedback.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/controllers/feedback.controller.ts)
- [apps/claw-audit-service/src/modules/feedback/dto/__tests__/create-feedback.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/dto/__tests__/create-feedback.dto.spec.ts)
- [apps/claw-audit-service/src/modules/feedback/dto/create-feedback.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/dto/create-feedback.dto.ts)
- [apps/claw-audit-service/src/modules/feedback/dto/file-metadata-response.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/dto/file-metadata-response.dto.ts)
- [apps/claw-audit-service/src/modules/feedback/dto/list-feedback-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/dto/list-feedback-query.dto.ts)
- [apps/claw-audit-service/src/modules/feedback/dto/update-feedback-status.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/dto/update-feedback-status.dto.ts)
- [apps/claw-audit-service/src/modules/feedback/feedback.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/feedback.module.ts)
- [apps/claw-audit-service/src/modules/feedback/managers/__tests__/feedback-security.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/managers/__tests__/feedback-security.manager.spec.ts)
- [apps/claw-audit-service/src/modules/feedback/managers/feedback.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/managers/feedback.manager.ts)
- [apps/claw-audit-service/src/modules/feedback/repositories/__tests__/feedback.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/repositories/__tests__/feedback.repository.spec.ts)
- [apps/claw-audit-service/src/modules/feedback/repositories/feedback.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/repositories/feedback.repository.ts)
- [apps/claw-audit-service/src/modules/feedback/sanitizers/__tests__/feedback-markdown.sanitizer.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/sanitizers/__tests__/feedback-markdown.sanitizer.spec.ts)
- [apps/claw-audit-service/src/modules/feedback/sanitizers/feedback-markdown.sanitizer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/sanitizers/feedback-markdown.sanitizer.ts)
- [apps/claw-audit-service/src/modules/feedback/schemas/__tests__/feedback-ticket.schema.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/schemas/__tests__/feedback-ticket.schema.spec.ts)
- [apps/claw-audit-service/src/modules/feedback/schemas/feedback-counter.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/schemas/feedback-counter.schema.ts)
- [apps/claw-audit-service/src/modules/feedback/schemas/feedback-ticket.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/schemas/feedback-ticket.schema.ts)
- [apps/claw-audit-service/src/modules/feedback/services/feedback.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/services/feedback.service.ts)
- [apps/claw-audit-service/src/modules/feedback/types/feedback.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/feedback/types/feedback.types.ts)
- [apps/claw-audit-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-audit-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-audit-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/health.module.ts)
- [apps/claw-audit-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/index.ts)
- [apps/claw-audit-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-audit-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/services/health.service.ts)
- [apps/claw-audit-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/modules/health/types/health.types.ts)
- [apps/claw-audit-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/src/vitest-globals.d.ts)
- [apps/claw-audit-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/tsconfig.build.json)
- [apps/claw-audit-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/tsconfig.json)
- [apps/claw-audit-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
