# claw-file-generation-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-file-generation-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service) |
| Port | 4013 |
| Database | postgresql |
| Endpoints | 7 |
| Tests | 7 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `file-generation`
- `health`

## Persistence models
- `FileGeneration`
- `FileGenerationAsset`
- `FileGenerationEvent`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/file-generations` | [src/modules/file-generation/controllers/file-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts) |
| GET | `/file-generations/:id` | [src/modules/file-generation/controllers/file-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts) |
| POST | `/file-generations/:id/retry` | [src/modules/file-generation/controllers/file-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts) |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/internal/file-generations/:generationId` | [src/modules/file-generation/controllers/internal-file-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts) |
| POST | `/internal/file-generations/:generationId/retry` | [src/modules/file-generation/controllers/internal-file-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts) |
| POST | `/internal/file-generations/generate` | [src/modules/file-generation/controllers/internal-file-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts) |

## File inventory
<details>
<summary>78 tracked files</summary>

- [apps/claw-file-generation-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/AGENTS.md)
- [apps/claw-file-generation-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/CLAUDE.md)
- [apps/claw-file-generation-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/Dockerfile)
- [apps/claw-file-generation-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/Dockerfile.dev)
- [apps/claw-file-generation-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/docker-entrypoint.dev.sh)
- [apps/claw-file-generation-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/eslint.config.mjs)
- [apps/claw-file-generation-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/nest-cli.json)
- [apps/claw-file-generation-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/package.json)
- [apps/claw-file-generation-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/prisma.config.ts)
- [apps/claw-file-generation-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/prisma/schema.prisma)
- [apps/claw-file-generation-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/__tests__/app.spec.ts)
- [apps/claw-file-generation-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/app.module.ts)
- [apps/claw-file-generation-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/config/app.config.ts)
- [apps/claw-file-generation-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-file-generation-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/decorators/public.decorator.ts)
- [apps/claw-file-generation-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-file-generation-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-file-generation-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-file-generation-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/guards/auth.guard.ts)
- [apps/claw-file-generation-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/guards/roles.guard.ts)
- [apps/claw-file-generation-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-file-generation-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-file-generation-service/src/common/constants/file-generation.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/constants/file-generation.constants.ts)
- [apps/claw-file-generation-service/src/common/constants/http.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/constants/http.constants.ts)
- [apps/claw-file-generation-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/constants/index.ts)
- [apps/claw-file-generation-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/constants/jwt.constants.ts)
- [apps/claw-file-generation-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/constants/pagination.constants.ts)
- [apps/claw-file-generation-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/enums/health-status.enum.ts)
- [apps/claw-file-generation-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/enums/index.ts)
- [apps/claw-file-generation-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/enums/user-role.enum.ts)
- [apps/claw-file-generation-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/errors/business.exception.ts)
- [apps/claw-file-generation-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/errors/index.ts)
- [apps/claw-file-generation-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-file-generation-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/types/index.ts)
- [apps/claw-file-generation-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-file-generation-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/types/pagination.type.ts)
- [apps/claw-file-generation-service/src/common/utilities/__tests__/inter-service-auth.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/utilities/__tests__/inter-service-auth.utility.spec.ts)
- [apps/claw-file-generation-service/src/common/utilities/http-client.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/utilities/http-client.utility.ts)
- [apps/claw-file-generation-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/utilities/index.ts)
- [apps/claw-file-generation-service/src/common/utilities/inter-service-auth.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/utilities/inter-service-auth.utility.ts)
- [apps/claw-file-generation-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-file-generation-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-file-generation-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-file-generation-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-file-generation-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-file-generation-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-file-generation-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/main.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/__tests__/file-generation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/__tests__/file-generation.service.spec.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/adapters/csv.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/adapters/csv.adapter.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/adapters/docx.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/adapters/docx.adapter.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/adapters/html.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/adapters/html.adapter.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/adapters/json.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/adapters/json.adapter.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/adapters/md.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/adapters/md.adapter.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/adapters/pdf.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/adapters/pdf.adapter.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/adapters/txt.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/adapters/txt.adapter.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/controllers/__tests__/file-generation.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/__tests__/file-generation.controller.spec.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/dto/generate-file.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/dto/generate-file.dto.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/file-generation.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/file-generation.module.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/managers/file-execution.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/managers/file-execution.manager.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/repositories/__tests__/file-generation.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/repositories/__tests__/file-generation.repository.spec.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/repositories/file-generation.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/repositories/file-generation.repository.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/services/file-generation-events.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/services/file-generation-events.service.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/services/file-generation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/services/file-generation.service.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/types/docx.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/types/docx.types.ts)
- [apps/claw-file-generation-service/src/modules/file-generation/types/file-generation.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/file-generation/types/file-generation.types.ts)
- [apps/claw-file-generation-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-file-generation-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-file-generation-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/health.module.ts)
- [apps/claw-file-generation-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/index.ts)
- [apps/claw-file-generation-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-file-generation-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/services/health.service.ts)
- [apps/claw-file-generation-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/modules/health/types/health.types.ts)
- [apps/claw-file-generation-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/src/vitest-globals.d.ts)
- [apps/claw-file-generation-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/tsconfig.build.json)
- [apps/claw-file-generation-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/tsconfig.json)
- [apps/claw-file-generation-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
