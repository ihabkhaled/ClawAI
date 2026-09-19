# claw-client-logs-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-client-logs-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service) |
| Port | env-only |
| Database | mongodb |
| Endpoints | 6 |
| Tests | 6 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `client-logs`
- `health`

## Persistence models
- `ClientLog`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/client-logs` | [src/modules/client-logs/controllers/client-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| POST | `/client-logs` | [src/modules/client-logs/controllers/client-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| POST | `/client-logs/batch` | [src/modules/client-logs/controllers/client-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| GET | `/client-logs/distinct` | [src/modules/client-logs/controllers/client-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| GET | `/client-logs/stats` | [src/modules/client-logs/controllers/client-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts) |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/controllers/health.controller.ts) |

## File inventory
<details>
<summary>64 tracked files</summary>

- [apps/claw-client-logs-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/AGENTS.md)
- [apps/claw-client-logs-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/CLAUDE.md)
- [apps/claw-client-logs-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/Dockerfile)
- [apps/claw-client-logs-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/Dockerfile.dev)
- [apps/claw-client-logs-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/docker-entrypoint.dev.sh)
- [apps/claw-client-logs-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/eslint.config.mjs)
- [apps/claw-client-logs-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/nest-cli.json)
- [apps/claw-client-logs-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/package.json)
- [apps/claw-client-logs-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/app.module.ts)
- [apps/claw-client-logs-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/config/app.config.ts)
- [apps/claw-client-logs-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-client-logs-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/decorators/public.decorator.ts)
- [apps/claw-client-logs-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-client-logs-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-client-logs-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-client-logs-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/guards/auth.guard.ts)
- [apps/claw-client-logs-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/guards/roles.guard.ts)
- [apps/claw-client-logs-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-client-logs-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-client-logs-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/constants/index.ts)
- [apps/claw-client-logs-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/constants/jwt.constants.ts)
- [apps/claw-client-logs-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/constants/pagination.constants.ts)
- [apps/claw-client-logs-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/enums/health-status.enum.ts)
- [apps/claw-client-logs-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/enums/index.ts)
- [apps/claw-client-logs-service/src/common/enums/sort-order.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/enums/sort-order.enum.ts)
- [apps/claw-client-logs-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/enums/user-role.enum.ts)
- [apps/claw-client-logs-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/errors/business.exception.ts)
- [apps/claw-client-logs-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/errors/index.ts)
- [apps/claw-client-logs-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-client-logs-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/types/index.ts)
- [apps/claw-client-logs-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-client-logs-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/types/pagination.type.ts)
- [apps/claw-client-logs-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/utilities/index.ts)
- [apps/claw-client-logs-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-client-logs-service/src/infrastructure/database/mongoose/mongoose.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/infrastructure/database/mongoose/mongoose.module.ts)
- [apps/claw-client-logs-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-client-logs-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-client-logs-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-client-logs-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/main.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/client-logs.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/client-logs.module.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/constants/client-logs.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/constants/client-logs.constants.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/controllers/__tests__/client-logs.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/__tests__/client-logs.controller.spec.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/dto/__tests__/client-logs.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/dto/__tests__/client-logs.dto.spec.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/dto/create-client-log-batch.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/dto/create-client-log-batch.dto.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/dto/create-client-log.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/dto/create-client-log.dto.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/dto/search-client-logs.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/dto/search-client-logs.dto.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/repositories/__tests__/client-logs.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/repositories/__tests__/client-logs.repository.spec.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/repositories/client-logs.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/repositories/client-logs.repository.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/schemas/client-log.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/schemas/client-log.schema.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/services/__tests__/client-logs.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/services/__tests__/client-logs.service.spec.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/services/client-logs.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/services/client-logs.service.ts)
- [apps/claw-client-logs-service/src/modules/client-logs/types/client-logs.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/client-logs/types/client-logs.types.ts)
- [apps/claw-client-logs-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-client-logs-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-client-logs-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/health.module.ts)
- [apps/claw-client-logs-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/index.ts)
- [apps/claw-client-logs-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-client-logs-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/services/health.service.ts)
- [apps/claw-client-logs-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/modules/health/types/health.types.ts)
- [apps/claw-client-logs-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/src/vitest-globals.d.ts)
- [apps/claw-client-logs-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/tsconfig.build.json)
- [apps/claw-client-logs-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/tsconfig.json)
- [apps/claw-client-logs-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
