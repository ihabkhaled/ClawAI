# claw-memory-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-memory-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service) |
| Port | 4005 |
| Database | postgresql |
| Endpoints | 46 |
| Tests | 14 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `context-pack-portable`
- `context-pack-templates`
- `context-pack-versions`
- `context-packs`
- `embeddings`
- `health`
- `memory`
- `memory-audit`
- `memory-portable`
- `memory-preferences`
- `memory-suggestions`
- `memory-usage`

## Persistence models
- `ContextPack`
- `ContextPackAttachment`
- `ContextPackItem`
- `ContextPackTemplate`
- `ContextPackUsage`
- `ContextPackVersion`
- `MemoryAuditLog`
- `MemoryPreference`
- `MemoryRecord`
- `MemorySuggestion`
- `MemoryUsage`
- `WorkspaceObjectEmbedding`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/context-pack-templates` | [src/modules/context-pack-templates/controllers/context-pack-templates.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/controllers/context-pack-templates.controller.ts) |
| POST | `/context-pack-templates/:id/clone` | [src/modules/context-pack-templates/controllers/context-pack-templates.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/controllers/context-pack-templates.controller.ts) |
| GET | `/context-packs` | [src/modules/context-packs/controllers/context-packs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| POST | `/context-packs` | [src/modules/context-packs/controllers/context-packs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| DELETE | `/context-packs/:id` | [src/modules/context-packs/controllers/context-packs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| GET | `/context-packs/:id` | [src/modules/context-packs/controllers/context-packs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| PATCH | `/context-packs/:id` | [src/modules/context-packs/controllers/context-packs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| GET | `/context-packs/:id/export` | [src/modules/context-pack-portable/controllers/context-pack-portable.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-portable/controllers/context-pack-portable.controller.ts) |
| POST | `/context-packs/:id/items` | [src/modules/context-packs/controllers/context-packs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| DELETE | `/context-packs/:id/items/:itemId` | [src/modules/context-packs/controllers/context-packs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts) |
| GET | `/context-packs/:id/versions` | [src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| GET | `/context-packs/:id/versions/:from/diff/:to` | [src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| GET | `/context-packs/:id/versions/:version` | [src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| POST | `/context-packs/:id/versions/:version/revert` | [src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| POST | `/context-packs/:id/versions/snapshot` | [src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts) |
| POST | `/context-packs/import` | [src/modules/context-pack-portable/controllers/context-pack-portable.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-portable/controllers/context-pack-portable.controller.ts) |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/internal/context-packs/:id/items` | [src/modules/context-packs/controllers/context-packs-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs-internal.controller.ts) |
| POST | `/internal/embeddings/delete-by-object-id` | [src/modules/embeddings/controllers/embeddings.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/controllers/embeddings.controller.ts) |
| POST | `/internal/embeddings/search-workspace-objects` | [src/modules/embeddings/controllers/embeddings.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/controllers/embeddings.controller.ts) |
| POST | `/internal/embeddings/upsert-workspace-object` | [src/modules/embeddings/controllers/embeddings.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/controllers/embeddings.controller.ts) |
| POST | `/internal/memories/automation-preference` | [src/modules/memory/controllers/memory-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts) |
| GET | `/internal/memories/for-context` | [src/modules/memory/controllers/memory-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts) |
| GET | `/internal/memories/learned-preferences` | [src/modules/memory/controllers/memory-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts) |
| POST | `/internal/memories/record-usage` | [src/modules/memory/controllers/memory-retrieval.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-retrieval.controller.ts) |
| POST | `/internal/memories/retrieve` | [src/modules/memory/controllers/memory-retrieval.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-retrieval.controller.ts) |
| GET | `/memories` | [src/modules/memory/controllers/memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| POST | `/memories` | [src/modules/memory/controllers/memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| GET | `/memories-portable/export` | [src/modules/memory-portable/controllers/memory-portable.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-portable/controllers/memory-portable.controller.ts) |
| POST | `/memories-portable/import` | [src/modules/memory-portable/controllers/memory-portable.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-portable/controllers/memory-portable.controller.ts) |
| DELETE | `/memories/:id` | [src/modules/memory/controllers/memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| GET | `/memories/:id` | [src/modules/memory/controllers/memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| PATCH | `/memories/:id` | [src/modules/memory/controllers/memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| PATCH | `/memories/:id/toggle` | [src/modules/memory/controllers/memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| POST | `/memories/search` | [src/modules/memory/controllers/memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts) |
| GET | `/memory-audit` | [src/modules/memory-audit/controllers/memory-audit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-audit/controllers/memory-audit.controller.ts) |
| GET | `/memory-audit/:memoryId` | [src/modules/memory-audit/controllers/memory-audit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-audit/controllers/memory-audit.controller.ts) |
| GET | `/memory-preferences` | [src/modules/memory-preferences/controllers/memory-preferences.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/controllers/memory-preferences.controller.ts) |
| PUT | `/memory-preferences` | [src/modules/memory-preferences/controllers/memory-preferences.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/controllers/memory-preferences.controller.ts) |
| GET | `/memory-suggestions` | [src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| DELETE | `/memory-suggestions/:id` | [src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| POST | `/memory-suggestions/:id/approve` | [src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| POST | `/memory-suggestions/:id/reject` | [src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| POST | `/memory-suggestions/bulk-approve` | [src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts) |
| GET | `/memory-usage/by-memory/:memoryId` | [src/modules/memory-usage/controllers/memory-usage.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-usage/controllers/memory-usage.controller.ts) |
| GET | `/memory-usage/by-message/:messageId` | [src/modules/memory-usage/controllers/memory-usage.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-usage/controllers/memory-usage.controller.ts) |

## File inventory
<details>
<summary>184 tracked files</summary>

- [apps/claw-memory-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/.dockerignore)
- [apps/claw-memory-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/.prettierignore)
- [apps/claw-memory-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/.prettierrc)
- [apps/claw-memory-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/AGENTS.md)
- [apps/claw-memory-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/CLAUDE.md)
- [apps/claw-memory-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/Dockerfile)
- [apps/claw-memory-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/Dockerfile.dev)
- [apps/claw-memory-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/docker-entrypoint.dev.sh)
- [apps/claw-memory-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/eslint.config.mjs)
- [apps/claw-memory-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/nest-cli.json)
- [apps/claw-memory-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/package.json)
- [apps/claw-memory-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/prisma.config.ts)
- [apps/claw-memory-service/prisma/migrations/20260404145310_init/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/prisma/migrations/20260404145310_init/migration.sql)
- [apps/claw-memory-service/prisma/migrations/20260501300000_workspace_object_embeddings/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/prisma/migrations/20260501300000_workspace_object_embeddings/migration.sql)
- [apps/claw-memory-service/prisma/migrations/20260524000000_memory_context_v2/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/prisma/migrations/20260524000000_memory_context_v2/migration.sql)
- [apps/claw-memory-service/prisma/migrations/20260524100000_memory_context_v2_embeddings/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/prisma/migrations/20260524100000_memory_context_v2_embeddings/migration.sql)
- [apps/claw-memory-service/prisma/migrations/20260528000000_fix_legacy_type_nullable/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/prisma/migrations/20260528000000_fix_legacy_type_nullable/migration.sql)
- [apps/claw-memory-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/prisma/migrations/migration_lock.toml)
- [apps/claw-memory-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/prisma/schema.prisma)
- [apps/claw-memory-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/__tests__/app.spec.ts)
- [apps/claw-memory-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/app.module.ts)
- [apps/claw-memory-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/config/app.config.ts)
- [apps/claw-memory-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-memory-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/decorators/public.decorator.ts)
- [apps/claw-memory-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-memory-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-memory-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-memory-service/src/app/guards/__tests__/service-token.guard.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/guards/__tests__/service-token.guard.spec.ts)
- [apps/claw-memory-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/guards/auth.guard.ts)
- [apps/claw-memory-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/guards/roles.guard.ts)
- [apps/claw-memory-service/src/app/guards/service-token.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/guards/service-token.guard.ts)
- [apps/claw-memory-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-memory-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-memory-service/src/common/constants/dependency-circuit.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/dependency-circuit.constants.ts)
- [apps/claw-memory-service/src/common/constants/entitlements.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/entitlements.constants.ts)
- [apps/claw-memory-service/src/common/constants/extraction.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/extraction.constants.ts)
- [apps/claw-memory-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/index.ts)
- [apps/claw-memory-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/jwt.constants.ts)
- [apps/claw-memory-service/src/common/constants/memory-retrieval.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/memory-retrieval.constants.ts)
- [apps/claw-memory-service/src/common/constants/memory-sensitivity.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/memory-sensitivity.constants.ts)
- [apps/claw-memory-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/pagination.constants.ts)
- [apps/claw-memory-service/src/common/constants/sensitivity-classifier.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/constants/sensitivity-classifier.constants.ts)
- [apps/claw-memory-service/src/common/enums/context-pack-item-type.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/context-pack-item-type.enum.ts)
- [apps/claw-memory-service/src/common/enums/context-pack-scope.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/context-pack-scope.enum.ts)
- [apps/claw-memory-service/src/common/enums/context-pack-visibility.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/context-pack-visibility.enum.ts)
- [apps/claw-memory-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/health-status.enum.ts)
- [apps/claw-memory-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/index.ts)
- [apps/claw-memory-service/src/common/enums/memory-audit-action.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/memory-audit-action.enum.ts)
- [apps/claw-memory-service/src/common/enums/memory-retention.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/memory-retention.enum.ts)
- [apps/claw-memory-service/src/common/enums/memory-scope.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/memory-scope.enum.ts)
- [apps/claw-memory-service/src/common/enums/memory-sensitivity.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/memory-sensitivity.enum.ts)
- [apps/claw-memory-service/src/common/enums/memory-source.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/memory-source.enum.ts)
- [apps/claw-memory-service/src/common/enums/memory-suggestion-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/memory-suggestion-status.enum.ts)
- [apps/claw-memory-service/src/common/enums/retrieval-reason.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/retrieval-reason.enum.ts)
- [apps/claw-memory-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/enums/user-role.enum.ts)
- [apps/claw-memory-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/errors/business.exception.ts)
- [apps/claw-memory-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/errors/index.ts)
- [apps/claw-memory-service/src/common/services/resource-entitlement.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/services/resource-entitlement.service.ts)
- [apps/claw-memory-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-memory-service/src/common/types/dependency-circuit.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/types/dependency-circuit.types.ts)
- [apps/claw-memory-service/src/common/types/http-client.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/types/http-client.type.ts)
- [apps/claw-memory-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/types/index.ts)
- [apps/claw-memory-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-memory-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/types/pagination.type.ts)
- [apps/claw-memory-service/src/common/utilities/__tests__/dependency-circuit.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/__tests__/dependency-circuit.utility.spec.ts)
- [apps/claw-memory-service/src/common/utilities/__tests__/parse-int.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/__tests__/parse-int.utility.spec.ts)
- [apps/claw-memory-service/src/common/utilities/constant-time-equal.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/constant-time-equal.utility.ts)
- [apps/claw-memory-service/src/common/utilities/date-coerce.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/date-coerce.utility.ts)
- [apps/claw-memory-service/src/common/utilities/dependency-circuit.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/dependency-circuit.utility.ts)
- [apps/claw-memory-service/src/common/utilities/http-client.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/http-client.utility.ts)
- [apps/claw-memory-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/index.ts)
- [apps/claw-memory-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-memory-service/src/common/utilities/parse-int.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/parse-int.utility.ts)
- [apps/claw-memory-service/src/common/utilities/prisma-json.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/common/utilities/prisma-json.utility.ts)
- [apps/claw-memory-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-memory-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-memory-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-memory-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-memory-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-memory-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/main.ts)
- [apps/claw-memory-service/src/modules/context-pack-portable/context-pack-portable.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-portable/context-pack-portable.module.ts)
- [apps/claw-memory-service/src/modules/context-pack-portable/controllers/context-pack-portable.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-portable/controllers/context-pack-portable.controller.ts)
- [apps/claw-memory-service/src/modules/context-pack-portable/services/context-pack-portable.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-portable/services/context-pack-portable.service.ts)
- [apps/claw-memory-service/src/modules/context-pack-portable/types/context-pack-portable.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-portable/types/context-pack-portable.types.ts)
- [apps/claw-memory-service/src/modules/context-pack-templates/constants/system-templates.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/constants/system-templates.constants.ts)
- [apps/claw-memory-service/src/modules/context-pack-templates/context-pack-templates.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/context-pack-templates.module.ts)
- [apps/claw-memory-service/src/modules/context-pack-templates/controllers/context-pack-templates.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/controllers/context-pack-templates.controller.ts)
- [apps/claw-memory-service/src/modules/context-pack-templates/dto/clone-template.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/dto/clone-template.dto.ts)
- [apps/claw-memory-service/src/modules/context-pack-templates/repositories/context-pack-template.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/repositories/context-pack-template.repository.ts)
- [apps/claw-memory-service/src/modules/context-pack-templates/services/context-pack-template.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/services/context-pack-template.service.ts)
- [apps/claw-memory-service/src/modules/context-pack-templates/types/context-pack-template.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-templates/types/context-pack-template.types.ts)
- [apps/claw-memory-service/src/modules/context-pack-versions/context-pack-versions.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/context-pack-versions.module.ts)
- [apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/controllers/context-pack-versions.controller.ts)
- [apps/claw-memory-service/src/modules/context-pack-versions/dto/snapshot-version.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/dto/snapshot-version.dto.ts)
- [apps/claw-memory-service/src/modules/context-pack-versions/repositories/context-pack-version.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/repositories/context-pack-version.repository.ts)
- [apps/claw-memory-service/src/modules/context-pack-versions/services/context-pack-version.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/services/context-pack-version.service.ts)
- [apps/claw-memory-service/src/modules/context-pack-versions/types/context-pack-version.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-pack-versions/types/context-pack-version.types.ts)
- [apps/claw-memory-service/src/modules/context-packs/__tests__/context-packs.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/__tests__/context-packs.service.spec.ts)
- [apps/claw-memory-service/src/modules/context-packs/constants/context-packs.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/constants/context-packs.constants.ts)
- [apps/claw-memory-service/src/modules/context-packs/context-packs.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/context-packs.module.ts)
- [apps/claw-memory-service/src/modules/context-packs/controllers/__tests__/context-packs.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/__tests__/context-packs.controller.spec.ts)
- [apps/claw-memory-service/src/modules/context-packs/controllers/context-packs-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs-internal.controller.ts)
- [apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts)
- [apps/claw-memory-service/src/modules/context-packs/dto/add-context-pack-item.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/dto/add-context-pack-item.dto.ts)
- [apps/claw-memory-service/src/modules/context-packs/dto/create-context-pack.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/dto/create-context-pack.dto.ts)
- [apps/claw-memory-service/src/modules/context-packs/dto/update-context-pack.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/dto/update-context-pack.dto.ts)
- [apps/claw-memory-service/src/modules/context-packs/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/index.ts)
- [apps/claw-memory-service/src/modules/context-packs/managers/context-pack-embedding.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/managers/context-pack-embedding.manager.ts)
- [apps/claw-memory-service/src/modules/context-packs/repositories/__tests__/context-packs.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/repositories/__tests__/context-packs.repository.spec.ts)
- [apps/claw-memory-service/src/modules/context-packs/repositories/context-packs.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/repositories/context-packs.repository.ts)
- [apps/claw-memory-service/src/modules/context-packs/services/context-packs.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/services/context-packs.service.ts)
- [apps/claw-memory-service/src/modules/context-packs/types/context-pack-embedding.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/types/context-pack-embedding.types.ts)
- [apps/claw-memory-service/src/modules/context-packs/types/context-packs.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/context-packs/types/context-packs.types.ts)
- [apps/claw-memory-service/src/modules/embeddings/constants/embeddings.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/constants/embeddings.constants.ts)
- [apps/claw-memory-service/src/modules/embeddings/controllers/embeddings.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/controllers/embeddings.controller.ts)
- [apps/claw-memory-service/src/modules/embeddings/embeddings.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/embeddings.module.ts)
- [apps/claw-memory-service/src/modules/embeddings/repositories/workspace-object-embedding.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/repositories/workspace-object-embedding.repository.ts)
- [apps/claw-memory-service/src/modules/embeddings/services/embeddings.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/services/embeddings.service.ts)
- [apps/claw-memory-service/src/modules/embeddings/types/embeddings.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/types/embeddings.types.ts)
- [apps/claw-memory-service/src/modules/embeddings/utilities/ollama-embeddings.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/embeddings/utilities/ollama-embeddings.utility.ts)
- [apps/claw-memory-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-memory-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-memory-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/health.module.ts)
- [apps/claw-memory-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/index.ts)
- [apps/claw-memory-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-memory-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/services/health.service.ts)
- [apps/claw-memory-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/health/types/health.types.ts)
- [apps/claw-memory-service/src/modules/memory-audit/controllers/memory-audit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-audit/controllers/memory-audit.controller.ts)
- [apps/claw-memory-service/src/modules/memory-audit/repositories/memory-audit-log.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-audit/repositories/memory-audit-log.repository.ts)
- [apps/claw-memory-service/src/modules/memory-audit/services/memory-audit.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-audit/services/memory-audit.service.ts)
- [apps/claw-memory-service/src/modules/memory-audit/types/memory-audit.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-audit/types/memory-audit.types.ts)
- [apps/claw-memory-service/src/modules/memory-portable/controllers/memory-portable.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-portable/controllers/memory-portable.controller.ts)
- [apps/claw-memory-service/src/modules/memory-portable/memory-portable.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-portable/memory-portable.module.ts)
- [apps/claw-memory-service/src/modules/memory-portable/services/memory-portable.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-portable/services/memory-portable.service.ts)
- [apps/claw-memory-service/src/modules/memory-portable/types/memory-portable.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-portable/types/memory-portable.types.ts)
- [apps/claw-memory-service/src/modules/memory-preferences/constants/memory-preference.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/constants/memory-preference.constants.ts)
- [apps/claw-memory-service/src/modules/memory-preferences/controllers/memory-preferences.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/controllers/memory-preferences.controller.ts)
- [apps/claw-memory-service/src/modules/memory-preferences/dto/upsert-memory-preference.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/dto/upsert-memory-preference.dto.ts)
- [apps/claw-memory-service/src/modules/memory-preferences/repositories/memory-preference.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/repositories/memory-preference.repository.ts)
- [apps/claw-memory-service/src/modules/memory-preferences/services/memory-preference.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/services/memory-preference.service.ts)
- [apps/claw-memory-service/src/modules/memory-preferences/types/memory-preference.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-preferences/types/memory-preference.types.ts)
- [apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/controllers/memory-suggestions.controller.ts)
- [apps/claw-memory-service/src/modules/memory-suggestions/dto/approve-suggestion.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/dto/approve-suggestion.dto.ts)
- [apps/claw-memory-service/src/modules/memory-suggestions/dto/bulk-approve-suggestions.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/dto/bulk-approve-suggestions.dto.ts)
- [apps/claw-memory-service/src/modules/memory-suggestions/dto/list-memory-suggestions-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/dto/list-memory-suggestions-query.dto.ts)
- [apps/claw-memory-service/src/modules/memory-suggestions/dto/reject-suggestion.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/dto/reject-suggestion.dto.ts)
- [apps/claw-memory-service/src/modules/memory-suggestions/repositories/memory-suggestion.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/repositories/memory-suggestion.repository.ts)
- [apps/claw-memory-service/src/modules/memory-suggestions/services/memory-suggestion.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/services/memory-suggestion.service.ts)
- [apps/claw-memory-service/src/modules/memory-suggestions/types/memory-suggestion.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-suggestions/types/memory-suggestion.types.ts)
- [apps/claw-memory-service/src/modules/memory-usage/controllers/memory-usage.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-usage/controllers/memory-usage.controller.ts)
- [apps/claw-memory-service/src/modules/memory-usage/repositories/memory-usage.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-usage/repositories/memory-usage.repository.ts)
- [apps/claw-memory-service/src/modules/memory-usage/services/memory-usage.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-usage/services/memory-usage.service.ts)
- [apps/claw-memory-service/src/modules/memory-usage/types/memory-usage.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory-usage/types/memory-usage.types.ts)
- [apps/claw-memory-service/src/modules/memory/__tests__/memory.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/__tests__/memory.service.spec.ts)
- [apps/claw-memory-service/src/modules/memory/constants/memory-extraction.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/constants/memory-extraction.constants.ts)
- [apps/claw-memory-service/src/modules/memory/constants/sensitivity-classifier.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/constants/sensitivity-classifier.constants.ts)
- [apps/claw-memory-service/src/modules/memory/controllers/__tests__/memory-internal.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/__tests__/memory-internal.controller.spec.ts)
- [apps/claw-memory-service/src/modules/memory/controllers/__tests__/memory.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/__tests__/memory.controller.spec.ts)
- [apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts)
- [apps/claw-memory-service/src/modules/memory/controllers/memory-retrieval.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory-retrieval.controller.ts)
- [apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts)
- [apps/claw-memory-service/src/modules/memory/dto/__tests__/create-memory.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/dto/__tests__/create-memory.dto.spec.ts)
- [apps/claw-memory-service/src/modules/memory/dto/create-memory.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/dto/create-memory.dto.ts)
- [apps/claw-memory-service/src/modules/memory/dto/list-memories-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/dto/list-memories-query.dto.ts)
- [apps/claw-memory-service/src/modules/memory/dto/retrieve.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/dto/retrieve.dto.ts)
- [apps/claw-memory-service/src/modules/memory/dto/search-memories.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/dto/search-memories.dto.ts)
- [apps/claw-memory-service/src/modules/memory/dto/update-memory.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/dto/update-memory.dto.ts)
- [apps/claw-memory-service/src/modules/memory/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/index.ts)
- [apps/claw-memory-service/src/modules/memory/managers/memory-embedding.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/managers/memory-embedding.manager.ts)
- [apps/claw-memory-service/src/modules/memory/managers/memory-extraction.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/managers/memory-extraction.manager.ts)
- [apps/claw-memory-service/src/modules/memory/managers/memory-sensitivity.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/managers/memory-sensitivity.manager.ts)
- [apps/claw-memory-service/src/modules/memory/memory.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/memory.module.ts)
- [apps/claw-memory-service/src/modules/memory/repositories/__tests__/memory.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/repositories/__tests__/memory.repository.spec.ts)
- [apps/claw-memory-service/src/modules/memory/repositories/memory.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/repositories/memory.repository.ts)
- [apps/claw-memory-service/src/modules/memory/services/memory-retrieval.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/services/memory-retrieval.service.ts)
- [apps/claw-memory-service/src/modules/memory/services/memory.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/services/memory.service.ts)
- [apps/claw-memory-service/src/modules/memory/types/automation-preference.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/types/automation-preference.types.ts)
- [apps/claw-memory-service/src/modules/memory/types/memory-embedding.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/types/memory-embedding.types.ts)
- [apps/claw-memory-service/src/modules/memory/types/memory-sensitivity.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/types/memory-sensitivity.types.ts)
- [apps/claw-memory-service/src/modules/memory/types/memory.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/modules/memory/types/memory.types.ts)
- [apps/claw-memory-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/src/vitest-globals.d.ts)
- [apps/claw-memory-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/tsconfig.build.json)
- [apps/claw-memory-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/tsconfig.json)
- [apps/claw-memory-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
