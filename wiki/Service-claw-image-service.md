# claw-image-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-image-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service) |
| Port | 4012 |
| Database | postgresql |
| Endpoints | 9 |
| Tests | 12 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `health`
- `image-generation`
- `runtime-progress`

## Persistence models
- `ImageGeneration`
- `ImageGenerationAsset`
- `ImageGenerationEvent`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/images` | [src/modules/image-generation/controllers/image-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts) |
| GET | `/images/:id` | [src/modules/image-generation/controllers/image-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts) |
| POST | `/images/:id/retry` | [src/modules/image-generation/controllers/image-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts) |
| POST | `/images/:id/retry-alternate` | [src/modules/image-generation/controllers/image-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts) |
| GET | `/internal/images/:generationId` | [src/modules/image-generation/controllers/internal-image.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts) |
| POST | `/internal/images/:generationId/retry` | [src/modules/image-generation/controllers/internal-image.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts) |
| POST | `/internal/images/:generationId/retry-alternate` | [src/modules/image-generation/controllers/internal-image.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts) |
| POST | `/internal/images/generate` | [src/modules/image-generation/controllers/internal-image.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts) |

## File inventory
<details>
<summary>99 tracked files</summary>

- [apps/claw-image-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/.prettierignore)
- [apps/claw-image-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/.prettierrc)
- [apps/claw-image-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/AGENTS.md)
- [apps/claw-image-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/CLAUDE.md)
- [apps/claw-image-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/Dockerfile)
- [apps/claw-image-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/Dockerfile.dev)
- [apps/claw-image-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/docker-entrypoint.dev.sh)
- [apps/claw-image-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/eslint.config.mjs)
- [apps/claw-image-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/nest-cli.json)
- [apps/claw-image-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/package.json)
- [apps/claw-image-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/prisma.config.ts)
- [apps/claw-image-service/prisma/migrations/20260409102253_init/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/prisma/migrations/20260409102253_init/migration.sql)
- [apps/claw-image-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/prisma/migrations/migration_lock.toml)
- [apps/claw-image-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/prisma/schema.prisma)
- [apps/claw-image-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/__tests__/app.spec.ts)
- [apps/claw-image-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/app.module.ts)
- [apps/claw-image-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/config/app.config.ts)
- [apps/claw-image-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-image-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/decorators/public.decorator.ts)
- [apps/claw-image-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-image-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-image-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-image-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/guards/auth.guard.ts)
- [apps/claw-image-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/guards/roles.guard.ts)
- [apps/claw-image-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-image-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-image-service/src/common/constants/http.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/constants/http.constants.ts)
- [apps/claw-image-service/src/common/constants/image.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/constants/image.constants.ts)
- [apps/claw-image-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/constants/index.ts)
- [apps/claw-image-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/constants/jwt.constants.ts)
- [apps/claw-image-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/constants/pagination.constants.ts)
- [apps/claw-image-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/enums/health-status.enum.ts)
- [apps/claw-image-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/enums/index.ts)
- [apps/claw-image-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/enums/user-role.enum.ts)
- [apps/claw-image-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/errors/business.exception.ts)
- [apps/claw-image-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/errors/index.ts)
- [apps/claw-image-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-image-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/types/index.ts)
- [apps/claw-image-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-image-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/types/pagination.type.ts)
- [apps/claw-image-service/src/common/utilities/__tests__/inter-service-auth.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/utilities/__tests__/inter-service-auth.utility.spec.ts)
- [apps/claw-image-service/src/common/utilities/http-client.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/utilities/http-client.utility.ts)
- [apps/claw-image-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/utilities/index.ts)
- [apps/claw-image-service/src/common/utilities/inter-service-auth.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/utilities/inter-service-auth.utility.ts)
- [apps/claw-image-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-image-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-image-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-image-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-image-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-image-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-image-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/main.ts)
- [apps/claw-image-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-image-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-image-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/health.module.ts)
- [apps/claw-image-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/index.ts)
- [apps/claw-image-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-image-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/services/health.service.ts)
- [apps/claw-image-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/health/types/health.types.ts)
- [apps/claw-image-service/src/modules/image-generation/__tests__/image-generation-payg.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/__tests__/image-generation-payg.service.spec.ts)
- [apps/claw-image-service/src/modules/image-generation/__tests__/image-generation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/__tests__/image-generation.service.spec.ts)
- [apps/claw-image-service/src/modules/image-generation/adapter.utilities/openai-error.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/adapter.utilities/openai-error.utility.ts)
- [apps/claw-image-service/src/modules/image-generation/adapters/__tests__/openai-image.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/adapters/__tests__/openai-image.adapter.spec.ts)
- [apps/claw-image-service/src/modules/image-generation/adapters/gemini-image.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/adapters/gemini-image.adapter.ts)
- [apps/claw-image-service/src/modules/image-generation/adapters/openai-image.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/adapters/openai-image.adapter.ts)
- [apps/claw-image-service/src/modules/image-generation/adapters/stable-diffusion.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/adapters/stable-diffusion.adapter.ts)
- [apps/claw-image-service/src/modules/image-generation/constants/gemini-image.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/constants/gemini-image.constants.ts)
- [apps/claw-image-service/src/modules/image-generation/constants/image-payg.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/constants/image-payg.constants.ts)
- [apps/claw-image-service/src/modules/image-generation/constants/stable-diffusion.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/constants/stable-diffusion.constants.ts)
- [apps/claw-image-service/src/modules/image-generation/controllers/__tests__/image-generation.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/__tests__/image-generation.controller.spec.ts)
- [apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts)
- [apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts)
- [apps/claw-image-service/src/modules/image-generation/dto/generate-image.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/dto/generate-image.dto.ts)
- [apps/claw-image-service/src/modules/image-generation/image-generation.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/image-generation.module.ts)
- [apps/claw-image-service/src/modules/image-generation/managers/__tests__/image-execution.manager.payg.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/managers/__tests__/image-execution.manager.payg.spec.ts)
- [apps/claw-image-service/src/modules/image-generation/managers/image-execution.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/managers/image-execution.manager.ts)
- [apps/claw-image-service/src/modules/image-generation/repositories/__tests__/image-generation.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/repositories/__tests__/image-generation.repository.spec.ts)
- [apps/claw-image-service/src/modules/image-generation/repositories/image-generation.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/repositories/image-generation.repository.ts)
- [apps/claw-image-service/src/modules/image-generation/services/image-generation-events.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/services/image-generation-events.service.ts)
- [apps/claw-image-service/src/modules/image-generation/services/image-generation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/services/image-generation.service.ts)
- [apps/claw-image-service/src/modules/image-generation/types/gemini-image.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/types/gemini-image.types.ts)
- [apps/claw-image-service/src/modules/image-generation/types/image-generation.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/types/image-generation.types.ts)
- [apps/claw-image-service/src/modules/image-generation/types/image-progress.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/types/image-progress.types.ts)
- [apps/claw-image-service/src/modules/image-generation/types/openai-image.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/types/openai-image.types.ts)
- [apps/claw-image-service/src/modules/image-generation/types/stable-diffusion.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/types/stable-diffusion.types.ts)
- [apps/claw-image-service/src/modules/image-generation/utilities/image-failure.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/image-generation/utilities/image-failure.utility.ts)
- [apps/claw-image-service/src/modules/runtime-progress/__tests__/comfyui-progress.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/__tests__/comfyui-progress.adapter.spec.ts)
- [apps/claw-image-service/src/modules/runtime-progress/__tests__/stable-diffusion-webui-progress.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/__tests__/stable-diffusion-webui-progress.adapter.spec.ts)
- [apps/claw-image-service/src/modules/runtime-progress/adapters/comfyui-progress.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/adapters/comfyui-progress.adapter.ts)
- [apps/claw-image-service/src/modules/runtime-progress/adapters/stable-diffusion-webui-progress.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/adapters/stable-diffusion-webui-progress.adapter.ts)
- [apps/claw-image-service/src/modules/runtime-progress/constants/comfyui.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/constants/comfyui.constants.ts)
- [apps/claw-image-service/src/modules/runtime-progress/constants/sd-webui-progress.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/constants/sd-webui-progress.constants.ts)
- [apps/claw-image-service/src/modules/runtime-progress/types/comfyui.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/types/comfyui.types.ts)
- [apps/claw-image-service/src/modules/runtime-progress/types/sd-webui-progress.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/types/sd-webui-progress.types.ts)
- [apps/claw-image-service/src/modules/runtime-progress/workflows/comfyui-workflow-node.mapper.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/workflows/comfyui-workflow-node.mapper.ts)
- [apps/claw-image-service/src/modules/runtime-progress/workflows/sd15-minimal.workflow.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/modules/runtime-progress/workflows/sd15-minimal.workflow.ts)
- [apps/claw-image-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/src/vitest-globals.d.ts)
- [apps/claw-image-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/tsconfig.build.json)
- [apps/claw-image-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/tsconfig.json)
- [apps/claw-image-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
