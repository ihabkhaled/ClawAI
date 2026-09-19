# claw-connector-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-connector-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service) |
| Port | 4003 |
| Database | postgresql |
| Endpoints | 19 |
| Tests | 25 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `connectors`
- `health`

## Persistence models
- `Connector`
- `ConnectorHealthEvent`
- `ConnectorModel`
- `ModelSyncRun`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/connectors` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| POST | `/connectors` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| DELETE | `/connectors/:id` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| GET | `/connectors/:id` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| GET | `/connectors/:id` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| PATCH | `/connectors/:id` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| GET | `/connectors/:id/models` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| POST | `/connectors/:id/models/:modelKey/probe-tools` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| PUT | `/connectors/:id/models/exposure` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| POST | `/connectors/:id/sync` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| POST | `/connectors/:id/test` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| GET | `/connectors/available-models` | [src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts) |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/internal/connectors/config` | [src/modules/connectors/controllers/connectors-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| GET | `/internal/connectors/health-snapshot` | [src/modules/connectors/controllers/connectors-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| GET | `/internal/connectors/models-snapshot` | [src/modules/connectors/controllers/connectors-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| POST | `/internal/connectors/models/validate-exposed` | [src/modules/connectors/controllers/connectors-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| GET | `/internal/connectors/payg-policy` | [src/modules/connectors/controllers/connectors-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts) |
| GET | `/internal/connectors/public-catalog` | [src/modules/connectors/controllers/public-model-catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/public-model-catalog.controller.ts) |

## File inventory
<details>
<summary>142 tracked files</summary>

- [apps/claw-connector-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/.dockerignore)
- [apps/claw-connector-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/.prettierignore)
- [apps/claw-connector-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/.prettierrc)
- [apps/claw-connector-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/AGENTS.md)
- [apps/claw-connector-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/CLAUDE.md)
- [apps/claw-connector-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/Dockerfile)
- [apps/claw-connector-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/Dockerfile.dev)
- [apps/claw-connector-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/docker-entrypoint.dev.sh)
- [apps/claw-connector-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/eslint.config.mjs)
- [apps/claw-connector-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/nest-cli.json)
- [apps/claw-connector-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/package.json)
- [apps/claw-connector-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma.config.ts)
- [apps/claw-connector-service/prisma/migrations/20260404145306_init/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/20260404145306_init/migration.sql)
- [apps/claw-connector-service/prisma/migrations/20260414011759_add_grok_provider/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/20260414011759_add_grok_provider/migration.sql)
- [apps/claw-connector-service/prisma/migrations/20260501000000_add_llamacpp_provider/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/20260501000000_add_llamacpp_provider/migration.sql)
- [apps/claw-connector-service/prisma/migrations/20260731003000_add_model_usage_metadata/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/20260731003000_add_model_usage_metadata/migration.sql)
- [apps/claw-connector-service/prisma/migrations/20260822232000_add_model_exposure_and_kind/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/20260822232000_add_model_exposure_and_kind/migration.sql)
- [apps/claw-connector-service/prisma/migrations/20260823093000_backfill_existing_model_exposure/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/20260823093000_backfill_existing_model_exposure/migration.sql)
- [apps/claw-connector-service/prisma/migrations/20260828120000_add_connector_workspace_id/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/20260828120000_add_connector_workspace_id/migration.sql)
- [apps/claw-connector-service/prisma/migrations/20260829120100_add_connector_payg_flag/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/20260829120100_add_connector_payg_flag/migration.sql)
- [apps/claw-connector-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/migrations/migration_lock.toml)
- [apps/claw-connector-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/prisma/schema.prisma)
- [apps/claw-connector-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/__tests__/app.spec.ts)
- [apps/claw-connector-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/app.module.ts)
- [apps/claw-connector-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/config/app.config.ts)
- [apps/claw-connector-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-connector-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/decorators/public.decorator.ts)
- [apps/claw-connector-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-connector-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-connector-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-connector-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/guards/auth.guard.ts)
- [apps/claw-connector-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/guards/roles.guard.ts)
- [apps/claw-connector-service/src/app/guards/service-token.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/guards/service-token.guard.ts)
- [apps/claw-connector-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-connector-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-connector-service/src/common/constants/crypto.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/constants/crypto.constants.ts)
- [apps/claw-connector-service/src/common/constants/http.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/constants/http.constants.ts)
- [apps/claw-connector-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/constants/index.ts)
- [apps/claw-connector-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/constants/jwt.constants.ts)
- [apps/claw-connector-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/constants/pagination.constants.ts)
- [apps/claw-connector-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/enums/health-status.enum.ts)
- [apps/claw-connector-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/enums/index.ts)
- [apps/claw-connector-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/enums/user-role.enum.ts)
- [apps/claw-connector-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/errors/business.exception.ts)
- [apps/claw-connector-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/errors/index.ts)
- [apps/claw-connector-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-connector-service/src/common/types/http.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/types/http.types.ts)
- [apps/claw-connector-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/types/index.ts)
- [apps/claw-connector-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-connector-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/types/pagination.type.ts)
- [apps/claw-connector-service/src/common/utilities/__tests__/http.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/utilities/__tests__/http.utility.spec.ts)
- [apps/claw-connector-service/src/common/utilities/constant-time-equal.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/utilities/constant-time-equal.utility.ts)
- [apps/claw-connector-service/src/common/utilities/crypto.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/utilities/crypto.utility.ts)
- [apps/claw-connector-service/src/common/utilities/http.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/utilities/http.utility.ts)
- [apps/claw-connector-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/utilities/index.ts)
- [apps/claw-connector-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-connector-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-connector-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-connector-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-connector-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-connector-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-connector-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/main.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/anthropic.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/anthropic.adapter.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/connector-provider.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/connector-provider.utility.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/connectors.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/connectors.manager.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/connectors.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/connectors.service.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/grok.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/grok.adapter.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/llamacpp.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/llamacpp.adapter.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/ollama-tool-heuristics.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/ollama-tool-heuristics.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/ollama-tool-probe.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/ollama-tool-probe.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/ollama-vision-heuristics.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/ollama-vision-heuristics.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/ollama.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/ollama.adapter.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/__tests__/payg-policy.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/__tests__/payg-policy.utility.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/connectors.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/connectors.module.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/anthropic.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/anthropic.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/deepseek.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/deepseek.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/gemini.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/gemini.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/grok.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/grok.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/llamacpp.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/llamacpp.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/model-display-name.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/model-display-name.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/ollama-cloud-models.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/ollama-cloud-models.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/ollama-tool-heuristics.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/ollama-tool-heuristics.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/ollama-tool-probe.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/ollama-tool-probe.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/ollama-vision-heuristics.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/ollama-vision-heuristics.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/ollama.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/ollama.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/openai.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/openai.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/constants/public-model-catalog.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/constants/public-model-catalog.constants.ts)
- [apps/claw-connector-service/src/modules/connectors/controllers/__tests__/connectors-internal.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/__tests__/connectors-internal.controller.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/controllers/__tests__/connectors.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/__tests__/connectors.controller.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts)
- [apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts)
- [apps/claw-connector-service/src/modules/connectors/controllers/public-model-catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/controllers/public-model-catalog.controller.ts)
- [apps/claw-connector-service/src/modules/connectors/dto/__tests__/create-connector.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/dto/__tests__/create-connector.dto.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/dto/create-connector.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/dto/create-connector.dto.ts)
- [apps/claw-connector-service/src/modules/connectors/dto/list-connectors-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/dto/list-connectors-query.dto.ts)
- [apps/claw-connector-service/src/modules/connectors/dto/set-model-exposure.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/dto/set-model-exposure.dto.ts)
- [apps/claw-connector-service/src/modules/connectors/dto/sync-models.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/dto/sync-models.dto.ts)
- [apps/claw-connector-service/src/modules/connectors/dto/test-connector.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/dto/test-connector.dto.ts)
- [apps/claw-connector-service/src/modules/connectors/dto/update-connector.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/dto/update-connector.dto.ts)
- [apps/claw-connector-service/src/modules/connectors/dto/validate-exposed-models.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/dto/validate-exposed-models.dto.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/__tests__/models-snapshot.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/__tests__/models-snapshot.manager.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/adapter-factory.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/adapter-factory.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/anthropic.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/anthropic.adapter.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/bedrock.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/bedrock.adapter.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/deepseek.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/deepseek.adapter.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/gemini.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/gemini.adapter.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/grok.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/grok.adapter.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/llamacpp.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/llamacpp.adapter.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/ollama.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/ollama.adapter.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/adapters/openai.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/adapters/openai.adapter.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/connectors.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/connectors.manager.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/models-snapshot.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/models-snapshot.manager.ts)
- [apps/claw-connector-service/src/modules/connectors/managers/provider-adapter.interface.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/managers/provider-adapter.interface.ts)
- [apps/claw-connector-service/src/modules/connectors/repositories/__tests__/connector-models.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/repositories/__tests__/connector-models.repository.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/repositories/__tests__/connectors.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/repositories/__tests__/connectors.repository.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/repositories/__tests__/health-events.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/repositories/__tests__/health-events.repository.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/repositories/__tests__/sync-runs.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/repositories/__tests__/sync-runs.repository.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/repositories/connector-models.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/repositories/connector-models.repository.ts)
- [apps/claw-connector-service/src/modules/connectors/repositories/connectors.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/repositories/connectors.repository.ts)
- [apps/claw-connector-service/src/modules/connectors/repositories/health-events.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/repositories/health-events.repository.ts)
- [apps/claw-connector-service/src/modules/connectors/repositories/sync-runs.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/repositories/sync-runs.repository.ts)
- [apps/claw-connector-service/src/modules/connectors/services/__tests__/public-model-catalog.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/services/__tests__/public-model-catalog.service.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/services/connectors.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/services/connectors.service.ts)
- [apps/claw-connector-service/src/modules/connectors/services/public-model-catalog.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/services/public-model-catalog.service.ts)
- [apps/claw-connector-service/src/modules/connectors/types/connectors.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/types/connectors.types.ts)
- [apps/claw-connector-service/src/modules/connectors/types/llamacpp-api.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/types/llamacpp-api.types.ts)
- [apps/claw-connector-service/src/modules/connectors/types/provider-api.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/types/provider-api.types.ts)
- [apps/claw-connector-service/src/modules/connectors/types/public-model-catalog.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/types/public-model-catalog.types.ts)
- [apps/claw-connector-service/src/modules/connectors/utilities/__tests__/model-display-name.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/utilities/__tests__/model-display-name.utility.spec.ts)
- [apps/claw-connector-service/src/modules/connectors/utilities/connector-provider.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/utilities/connector-provider.utility.ts)
- [apps/claw-connector-service/src/modules/connectors/utilities/model-display-name.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/utilities/model-display-name.utility.ts)
- [apps/claw-connector-service/src/modules/connectors/utilities/payg-policy.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/connectors/utilities/payg-policy.utility.ts)
- [apps/claw-connector-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-connector-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-connector-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/health/health.module.ts)
- [apps/claw-connector-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-connector-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/health/services/health.service.ts)
- [apps/claw-connector-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/modules/health/types/health.types.ts)
- [apps/claw-connector-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/src/vitest-globals.d.ts)
- [apps/claw-connector-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/tsconfig.build.json)
- [apps/claw-connector-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/tsconfig.json)
- [apps/claw-connector-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
