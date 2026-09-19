# claw-ollama-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-ollama-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service) |
| Port | 4008 |
| Database | postgresql |
| Endpoints | 35 |
| Tests | 18 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `health`
- `ollama`
- `runtime-progress`

## Persistence models
- `DiscoverySource`
- `LocalModel`
- `LocalModelRoleAssignment`
- `ModelCatalogEntry`
- `ModelDiscoveryCandidate`
- `ModelDiscoveryRun`
- `PullJob`
- `RuntimeConfig`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/internal/ollama/installed-models` | [src/modules/ollama/ollama-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts) |
| GET | `/internal/ollama/installed-snapshot` | [src/modules/ollama/ollama-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts) |
| GET | `/internal/ollama/router-model` | [src/modules/ollama/ollama-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts) |
| POST | `/ollama/assign-role` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| GET | `/ollama/catalog` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| GET | `/ollama/catalog/:id` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| POST | `/ollama/catalog/:id/pull` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| POST | `/ollama/catalog/admin` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| DELETE | `/ollama/catalog/admin/:id` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| PUT | `/ollama/catalog/admin/:id` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/catalog/reclassify` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/chat` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| GET | `/ollama/discovery/candidates` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/discovery/candidates/:id/approve` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/discovery/candidates/:id/reject` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/discovery/candidates/bulk-approve` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/discovery/refresh` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| GET | `/ollama/discovery/runs` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| GET | `/ollama/discovery/runs/:id` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| GET | `/ollama/discovery/sources` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/discovery/sources` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| DELETE | `/ollama/discovery/sources/:id` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| PUT | `/ollama/discovery/sources/:id` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/generate` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| GET | `/ollama/health` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| GET | `/ollama/models` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| DELETE | `/ollama/models/:id` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| GET | `/ollama/packs` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/packs/:profile/install` | [src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts) |
| POST | `/ollama/pull` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| GET | `/ollama/pull-jobs` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| DELETE | `/ollama/pull-jobs/:id` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |
| GET | `/ollama/runtime-progress/probe` | [src/modules/runtime-progress/controllers/runtime-progress.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/controllers/runtime-progress.controller.ts) |
| GET | `/ollama/runtimes` | [src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts) |

## File inventory
<details>
<summary>172 tracked files</summary>

- [apps/claw-ollama-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/.dockerignore)
- [apps/claw-ollama-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/.prettierignore)
- [apps/claw-ollama-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/.prettierrc)
- [apps/claw-ollama-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/AGENTS.md)
- [apps/claw-ollama-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/CLAUDE.md)
- [apps/claw-ollama-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/Dockerfile)
- [apps/claw-ollama-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/Dockerfile.dev)
- [apps/claw-ollama-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/docker-entrypoint.dev.sh)
- [apps/claw-ollama-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/eslint.config.mjs)
- [apps/claw-ollama-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/nest-cli.json)
- [apps/claw-ollama-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/package.json)
- [apps/claw-ollama-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma.config.ts)
- [apps/claw-ollama-service/prisma/migrations/20260404223702_init/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/migrations/20260404223702_init/migration.sql)
- [apps/claw-ollama-service/prisma/migrations/20260411195009_add_model_catalog_and_schema_updates/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/migrations/20260411195009_add_model_catalog_and_schema_updates/migration.sql)
- [apps/claw-ollama-service/prisma/migrations/20260415183500_add_catalog_source_url/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/migrations/20260415183500_add_catalog_source_url/migration.sql)
- [apps/claw-ollama-service/prisma/migrations/20260419155106_ollama_dynamic_discovery/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/migrations/20260419155106_ollama_dynamic_discovery/migration.sql)
- [apps/claw-ollama-service/prisma/migrations/20260420215831_add_search_browser_score/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/migrations/20260420215831_add_search_browser_score/migration.sql)
- [apps/claw-ollama-service/prisma/migrations/20260527000000_pull_job_resilience/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/migrations/20260527000000_pull_job_resilience/migration.sql)
- [apps/claw-ollama-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/migrations/migration_lock.toml)
- [apps/claw-ollama-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/schema.prisma)
- [apps/claw-ollama-service/prisma/seed-catalog.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/seed-catalog.ts)
- [apps/claw-ollama-service/prisma/tsconfig.seed.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/prisma/tsconfig.seed.json)
- [apps/claw-ollama-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/__tests__/app.spec.ts)
- [apps/claw-ollama-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/app.module.ts)
- [apps/claw-ollama-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/config/app.config.ts)
- [apps/claw-ollama-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-ollama-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/decorators/public.decorator.ts)
- [apps/claw-ollama-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-ollama-service/src/app/decorators/skip-logging.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/decorators/skip-logging.decorator.ts)
- [apps/claw-ollama-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-ollama-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-ollama-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/guards/auth.guard.ts)
- [apps/claw-ollama-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/guards/roles.guard.ts)
- [apps/claw-ollama-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-ollama-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-ollama-service/src/common/constants/http.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/constants/http.constants.ts)
- [apps/claw-ollama-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/constants/index.ts)
- [apps/claw-ollama-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/constants/jwt.constants.ts)
- [apps/claw-ollama-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/constants/pagination.constants.ts)
- [apps/claw-ollama-service/src/common/enums/business-category.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/enums/business-category.enum.ts)
- [apps/claw-ollama-service/src/common/enums/comfyui-model-type.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/enums/comfyui-model-type.enum.ts)
- [apps/claw-ollama-service/src/common/enums/hardware-profile.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/enums/hardware-profile.enum.ts)
- [apps/claw-ollama-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/enums/health-status.enum.ts)
- [apps/claw-ollama-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/enums/index.ts)
- [apps/claw-ollama-service/src/common/enums/model-capability.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/enums/model-capability.enum.ts)
- [apps/claw-ollama-service/src/common/enums/pull-job-phase.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/enums/pull-job-phase.enum.ts)
- [apps/claw-ollama-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/enums/user-role.enum.ts)
- [apps/claw-ollama-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/errors/business.exception.ts)
- [apps/claw-ollama-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/errors/index.ts)
- [apps/claw-ollama-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-ollama-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/types/index.ts)
- [apps/claw-ollama-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-ollama-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/types/pagination.type.ts)
- [apps/claw-ollama-service/src/common/utilities/http-client.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/utilities/http-client.utility.ts)
- [apps/claw-ollama-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/utilities/index.ts)
- [apps/claw-ollama-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-ollama-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-ollama-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-ollama-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-ollama-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-ollama-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-ollama-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/main.ts)
- [apps/claw-ollama-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-ollama-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/health/health.module.ts)
- [apps/claw-ollama-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/health/index.ts)
- [apps/claw-ollama-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/health/services/health.service.ts)
- [apps/claw-ollama-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/health/types/health.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/__tests__/ollama-chat.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/__tests__/ollama-chat.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/__tests__/ollama.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/__tests__/ollama.manager.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/__tests__/ollama.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/__tests__/ollama.service.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/__tests__/comfyui-downloads.constants.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/__tests__/comfyui-downloads.constants.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/capability-mapping.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/capability-mapping.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/catalog-entries.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/catalog-entries.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/catalog.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/catalog.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/comfyui-downloads.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/comfyui-downloads.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/comfyui.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/comfyui.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/default-models.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/default-models.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/discovery.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/discovery.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/hardware-profile.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/hardware-profile.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/model-family-taxonomy.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/model-family-taxonomy.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/pull-resilience.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/pull-resilience.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/registry-catalog-entries.generated.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/registry-catalog-entries.generated.ts)
- [apps/claw-ollama-service/src/modules/ollama/constants/search-browser-classifier.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/constants/search-browser-classifier.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/approve-candidate.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/approve-candidate.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/assign-role.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/assign-role.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/catalog-admin.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/catalog-admin.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/chat.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/chat.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/discovery-source.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/discovery-source.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/discovery-trigger.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/discovery-trigger.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/generate.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/generate.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/list-candidates-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/list-candidates-query.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/list-catalog-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/list-catalog-query.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/list-models-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/list-models-query.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/dto/pull-model.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/dto/pull-model.dto.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/__tests__/routing-snapshot.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/__tests__/routing-snapshot.manager.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/adapters/comfyui-runtime.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/adapters/comfyui-runtime.adapter.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/adapters/comfyui-runtime.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/adapters/comfyui-runtime.adapter.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/adapters/llamacpp-runtime.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/adapters/llamacpp-runtime.adapter.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/adapters/localai-runtime.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/adapters/localai-runtime.adapter.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/adapters/ollama-runtime.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/adapters/ollama-runtime.adapter.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/adapters/ollama-runtime.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/adapters/ollama-runtime.adapter.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/adapters/runtime-adapter-factory.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/adapters/runtime-adapter-factory.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/adapters/vllm-runtime.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/adapters/vllm-runtime.adapter.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/candidate-import.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/candidate-import.manager.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/discovery.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/discovery.manager.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/model-enrichment.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/model-enrichment.manager.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/ollama-library-discovery.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/ollama-library-discovery.manager.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/ollama.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/ollama.manager.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/pull-job-resume.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/pull-job-resume.manager.ts)
- [apps/claw-ollama-service/src/modules/ollama/managers/routing-snapshot.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/managers/routing-snapshot.manager.ts)
- [apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-discovery.controller.ts)
- [apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts)
- [apps/claw-ollama-service/src/modules/ollama/ollama.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.constants.ts)
- [apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts)
- [apps/claw-ollama-service/src/modules/ollama/ollama.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.module.ts)
- [apps/claw-ollama-service/src/modules/ollama/ollama.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/ollama.service.ts)
- [apps/claw-ollama-service/src/modules/ollama/repositories/discovery-candidate.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/repositories/discovery-candidate.repository.ts)
- [apps/claw-ollama-service/src/modules/ollama/repositories/discovery-run.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/repositories/discovery-run.repository.ts)
- [apps/claw-ollama-service/src/modules/ollama/repositories/discovery-source.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/repositories/discovery-source.repository.ts)
- [apps/claw-ollama-service/src/modules/ollama/repositories/local-models.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/repositories/local-models.repository.ts)
- [apps/claw-ollama-service/src/modules/ollama/repositories/model-catalog.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/repositories/model-catalog.repository.ts)
- [apps/claw-ollama-service/src/modules/ollama/repositories/pull-jobs.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/repositories/pull-jobs.repository.ts)
- [apps/claw-ollama-service/src/modules/ollama/repositories/role-assignments.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/repositories/role-assignments.repository.ts)
- [apps/claw-ollama-service/src/modules/ollama/repositories/runtime-configs.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/repositories/runtime-configs.repository.ts)
- [apps/claw-ollama-service/src/modules/ollama/services/__tests__/catalog-remote-metadata.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/services/__tests__/catalog-remote-metadata.service.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/services/catalog-classification.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/services/catalog-classification.service.ts)
- [apps/claw-ollama-service/src/modules/ollama/services/catalog-remote-metadata.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/services/catalog-remote-metadata.service.ts)
- [apps/claw-ollama-service/src/modules/ollama/services/catalog-seed.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/services/catalog-seed.service.ts)
- [apps/claw-ollama-service/src/modules/ollama/services/catalog-sync.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/services/catalog-sync.service.ts)
- [apps/claw-ollama-service/src/modules/ollama/services/discovery-job.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/services/discovery-job.service.ts)
- [apps/claw-ollama-service/src/modules/ollama/services/discovery-source.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/services/discovery-source.service.ts)
- [apps/claw-ollama-service/src/modules/ollama/services/hardware-pack.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/services/hardware-pack.service.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/catalog-reference.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/catalog-reference.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/catalog.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/catalog.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/comfyui.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/comfyui.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/discovery.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/discovery.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/download-stats.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/download-stats.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/ollama-adapters.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/ollama-adapters.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/ollama-chat.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/ollama-chat.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/ollama-registry.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/ollama-registry.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/ollama.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/ollama.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/pull-progress.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/pull-progress.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/search-browser-classifier.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/search-browser-classifier.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/types/search-browser-reclassify.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/types/search-browser-reclassify.types.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/catalog-reference.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/catalog-reference.utility.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/hardware-profile.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/hardware-profile.utility.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-classifier.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-classifier.utility.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-deduplicator.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-deduplicator.utility.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-normalizer.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-normalizer.utility.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-ranker.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/model-ranker.utility.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/search-browser-classifier.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/__tests__/search-browser-classifier.utility.spec.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/catalog-reference.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/catalog-reference.utility.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/catalog-seed-entry.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/catalog-seed-entry.utility.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/download-stats.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/download-stats.utility.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/hardware-profile.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/hardware-profile.utility.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/model-classifier.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/model-classifier.utility.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/model-deduplicator.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/model-deduplicator.utility.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/model-normalizer.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/model-normalizer.utility.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/model-ranker.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/model-ranker.utility.ts)
- [apps/claw-ollama-service/src/modules/ollama/utilities/search-browser-classifier.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/ollama/utilities/search-browser-classifier.utility.ts)
- [apps/claw-ollama-service/src/modules/runtime-progress/__tests__/ollama-probe.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/__tests__/ollama-probe.service.spec.ts)
- [apps/claw-ollama-service/src/modules/runtime-progress/__tests__/runtime-progress.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/__tests__/runtime-progress.controller.spec.ts)
- [apps/claw-ollama-service/src/modules/runtime-progress/constants/runtime-probe.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/constants/runtime-probe.constants.ts)
- [apps/claw-ollama-service/src/modules/runtime-progress/controllers/runtime-progress.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/controllers/runtime-progress.controller.ts)
- [apps/claw-ollama-service/src/modules/runtime-progress/dto/runtime-probe-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/dto/runtime-probe-query.dto.ts)
- [apps/claw-ollama-service/src/modules/runtime-progress/runtime-progress.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/runtime-progress.module.ts)
- [apps/claw-ollama-service/src/modules/runtime-progress/services/ollama-probe.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/services/ollama-probe.service.ts)
- [apps/claw-ollama-service/src/modules/runtime-progress/types/ollama-probe.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/modules/runtime-progress/types/ollama-probe.types.ts)
- [apps/claw-ollama-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/src/vitest-globals.d.ts)
- [apps/claw-ollama-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/tsconfig.build.json)
- [apps/claw-ollama-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/tsconfig.json)
- [apps/claw-ollama-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
