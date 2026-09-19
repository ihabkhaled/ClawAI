# claw-server-logs-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-server-logs-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service) |
| Port | env-only |
| Database | mongodb |
| Endpoints | 7 |
| Tests | 7 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `health`
- `server-logs`

## Persistence models
- `ServerLog`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/server-logs` | [src/modules/server-logs/controllers/server-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| POST | `/server-logs` | [src/modules/server-logs/controllers/server-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| POST | `/server-logs/batch` | [src/modules/server-logs/controllers/server-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| GET | `/server-logs/distinct` | [src/modules/server-logs/controllers/server-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| GET | `/server-logs/stats` | [src/modules/server-logs/controllers/server-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |
| GET | `/server-logs/timeseries` | [src/modules/server-logs/controllers/server-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts) |

## File inventory
<details>
<summary>71 tracked files</summary>

- [apps/claw-server-logs-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/.dockerignore)
- [apps/claw-server-logs-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/.prettierignore)
- [apps/claw-server-logs-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/.prettierrc)
- [apps/claw-server-logs-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/AGENTS.md)
- [apps/claw-server-logs-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/CLAUDE.md)
- [apps/claw-server-logs-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/Dockerfile)
- [apps/claw-server-logs-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/Dockerfile.dev)
- [apps/claw-server-logs-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/docker-entrypoint.dev.sh)
- [apps/claw-server-logs-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/eslint.config.mjs)
- [apps/claw-server-logs-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/nest-cli.json)
- [apps/claw-server-logs-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/package.json)
- [apps/claw-server-logs-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/app.module.ts)
- [apps/claw-server-logs-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/config/app.config.ts)
- [apps/claw-server-logs-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-server-logs-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/decorators/public.decorator.ts)
- [apps/claw-server-logs-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-server-logs-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-server-logs-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-server-logs-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/guards/auth.guard.ts)
- [apps/claw-server-logs-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/guards/roles.guard.ts)
- [apps/claw-server-logs-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-server-logs-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-server-logs-service/src/common/constants/batch.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/constants/batch.constants.ts)
- [apps/claw-server-logs-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/constants/index.ts)
- [apps/claw-server-logs-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/constants/jwt.constants.ts)
- [apps/claw-server-logs-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/constants/pagination.constants.ts)
- [apps/claw-server-logs-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/enums/health-status.enum.ts)
- [apps/claw-server-logs-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/enums/index.ts)
- [apps/claw-server-logs-service/src/common/enums/log-level.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/enums/log-level.enum.ts)
- [apps/claw-server-logs-service/src/common/enums/sort-order.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/enums/sort-order.enum.ts)
- [apps/claw-server-logs-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/enums/user-role.enum.ts)
- [apps/claw-server-logs-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/errors/business.exception.ts)
- [apps/claw-server-logs-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/errors/index.ts)
- [apps/claw-server-logs-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-server-logs-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/types/index.ts)
- [apps/claw-server-logs-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-server-logs-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/types/pagination.type.ts)
- [apps/claw-server-logs-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/utilities/index.ts)
- [apps/claw-server-logs-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-server-logs-service/src/infrastructure/database/mongoose/mongoose.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/infrastructure/database/mongoose/mongoose.module.ts)
- [apps/claw-server-logs-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-server-logs-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-server-logs-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-server-logs-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/main.ts)
- [apps/claw-server-logs-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-server-logs-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-server-logs-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/health.module.ts)
- [apps/claw-server-logs-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/index.ts)
- [apps/claw-server-logs-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-server-logs-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/services/health.service.ts)
- [apps/claw-server-logs-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/health/types/health.types.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/controllers/__tests__/server-logs.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/__tests__/server-logs.controller.spec.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/dtos/__tests__/server-logs.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/dtos/__tests__/server-logs.dto.spec.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/dtos/batch-create-server-logs.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/dtos/batch-create-server-logs.dto.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/dtos/create-server-log.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/dtos/create-server-log.dto.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/dtos/list-server-logs-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/dtos/list-server-logs-query.dto.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/index.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/managers/__tests__/server-log-event.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/managers/__tests__/server-log-event.manager.spec.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/managers/server-log-event.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/managers/server-log-event.manager.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/repositories/__tests__/server-logs.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/repositories/__tests__/server-logs.repository.spec.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/repositories/server-logs.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/repositories/server-logs.repository.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/schemas/server-log.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/schemas/server-log.schema.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/server-logs.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/server-logs.module.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/services/__tests__/server-logs.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/services/__tests__/server-logs.service.spec.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/services/server-logs.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/services/server-logs.service.ts)
- [apps/claw-server-logs-service/src/modules/server-logs/types/server-logs.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/modules/server-logs/types/server-logs.types.ts)
- [apps/claw-server-logs-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/src/vitest-globals.d.ts)
- [apps/claw-server-logs-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/tsconfig.build.json)
- [apps/claw-server-logs-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/tsconfig.json)
- [apps/claw-server-logs-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
