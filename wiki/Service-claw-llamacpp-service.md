# claw-llamacpp-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-llamacpp-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service) |
| Port | 4017 |
| Database | postgresql |
| Endpoints | 26 |
| Tests | 17 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `binary`
- `catalog`
- `hardware`
- `health`
- `inference`
- `models-lifecycle`
- `pull-jobs`
- `runtime-progress`

## Persistence models
- `BinaryRelease`
- `FrontierCatalogEntry`
- `HardwareSnapshot`
- `ModelLoadEvent`
- `PreflightOverrideAudit`
- `PullJob`
- `RuntimeConfig`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/catalog` | [src/modules/catalog/controllers/catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| GET | `/catalog/:id` | [src/modules/catalog/controllers/catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| POST | `/catalog/:id/pull` | [src/modules/pull-jobs/controllers/pull-jobs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| POST | `/catalog/hf-auto-sync` | [src/modules/catalog/controllers/catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| POST | `/catalog/hf-import` | [src/modules/catalog/controllers/catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| GET | `/catalog/hf-models/:author/:name` | [src/modules/catalog/controllers/catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| GET | `/catalog/hf-search` | [src/modules/catalog/controllers/catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| POST | `/catalog/refresh` | [src/modules/catalog/controllers/catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts) |
| GET | `/hardware` | [src/modules/hardware/controllers/hardware.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/controllers/hardware.controller.ts) |
| POST | `/hardware/refresh` | [src/modules/hardware/controllers/hardware.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/controllers/hardware.controller.ts) |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/internal/llamacpp/loaded-snapshot` | [src/modules/catalog/controllers/catalog-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog-internal.controller.ts) |
| PUT | `/models/:id/config` | [src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| POST | `/models/:id/load` | [src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| POST | `/models/:id/unload` | [src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| DELETE | `/models/:id/weights` | [src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| GET | `/models/loaded` | [src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts) |
| GET | `/pull-jobs` | [src/modules/pull-jobs/controllers/pull-jobs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| DELETE | `/pull-jobs/:id` | [src/modules/pull-jobs/controllers/pull-jobs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| GET | `/pull-jobs/:id` | [src/modules/pull-jobs/controllers/pull-jobs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| POST | `/pull-jobs/:id/retry` | [src/modules/pull-jobs/controllers/pull-jobs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts) |
| GET | `/runtime-progress/probe` | [src/modules/runtime-progress/controllers/runtime-progress.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/runtime-progress/controllers/runtime-progress.controller.ts) |
| GET | `/runtime/info` | [src/modules/binary/controllers/binary.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/controllers/binary.controller.ts) |
| POST | `/runtime/update` | [src/modules/binary/controllers/binary.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/controllers/binary.controller.ts) |
| POST | `/v1/chat/completions` | [src/modules/inference/controllers/inference.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/controllers/inference.controller.ts) |
| POST | `/v1/completions` | [src/modules/inference/controllers/inference.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/controllers/inference.controller.ts) |

## File inventory
<details>
<summary>177 tracked files</summary>

- [apps/claw-llamacpp-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/.dockerignore)
- [apps/claw-llamacpp-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/.prettierignore)
- [apps/claw-llamacpp-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/.prettierrc)
- [apps/claw-llamacpp-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/AGENTS.md)
- [apps/claw-llamacpp-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/CLAUDE.md)
- [apps/claw-llamacpp-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/Dockerfile)
- [apps/claw-llamacpp-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/Dockerfile.dev)
- [apps/claw-llamacpp-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/docker-entrypoint.dev.sh)
- [apps/claw-llamacpp-service/docker-entrypoint.prod.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/docker-entrypoint.prod.sh)
- [apps/claw-llamacpp-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/eslint.config.mjs)
- [apps/claw-llamacpp-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/nest-cli.json)
- [apps/claw-llamacpp-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/package.json)
- [apps/claw-llamacpp-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/prisma.config.ts)
- [apps/claw-llamacpp-service/prisma/migrations/20260501000000_init/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/prisma/migrations/20260501000000_init/migration.sql)
- [apps/claw-llamacpp-service/prisma/migrations/20260527000000_pull_job_resilience/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/prisma/migrations/20260527000000_pull_job_resilience/migration.sql)
- [apps/claw-llamacpp-service/prisma/migrations/20260531000000_raise_ctx_size_default_32k/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/prisma/migrations/20260531000000_raise_ctx_size_default_32k/migration.sql)
- [apps/claw-llamacpp-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/prisma/migrations/migration_lock.toml)
- [apps/claw-llamacpp-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/prisma/schema.prisma)
- [apps/claw-llamacpp-service/prisma/seed-catalog.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/prisma/seed-catalog.ts)
- [apps/claw-llamacpp-service/prisma/tsconfig.seed.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/prisma/tsconfig.seed.json)
- [apps/claw-llamacpp-service/src/__tests__/app-config.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/__tests__/app-config.spec.ts)
- [apps/claw-llamacpp-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/app.module.ts)
- [apps/claw-llamacpp-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/config/app.config.ts)
- [apps/claw-llamacpp-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-llamacpp-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/decorators/public.decorator.ts)
- [apps/claw-llamacpp-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-llamacpp-service/src/app/decorators/skip-logging.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/decorators/skip-logging.decorator.ts)
- [apps/claw-llamacpp-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-llamacpp-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-llamacpp-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/guards/auth.guard.ts)
- [apps/claw-llamacpp-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/guards/roles.guard.ts)
- [apps/claw-llamacpp-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-llamacpp-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-llamacpp-service/src/common/constants/hardware-detect.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/constants/hardware-detect.constants.ts)
- [apps/claw-llamacpp-service/src/common/constants/path-safety.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/constants/path-safety.constants.ts)
- [apps/claw-llamacpp-service/src/common/constants/redact-keys.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/constants/redact-keys.constants.ts)
- [apps/claw-llamacpp-service/src/common/enums/download-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/download-status.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/gpu-backend.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/gpu-backend.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/health-status.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/hf-auto-sync-trigger.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/hf-auto-sync-trigger.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/index.ts)
- [apps/claw-llamacpp-service/src/common/enums/load-event-type.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/load-event-type.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/load-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/load-status.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/model-category.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/model-category.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/preflight-reason.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/preflight-reason.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/pull-job-cancel-outcome.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/pull-job-cancel-outcome.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/pull-job-phase.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/pull-job-phase.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/pull-job-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/pull-job-status.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/pull-reason-code.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/pull-reason-code.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/quality-tier.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/quality-tier.enum.ts)
- [apps/claw-llamacpp-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/enums/user-role.enum.ts)
- [apps/claw-llamacpp-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/errors/business.exception.ts)
- [apps/claw-llamacpp-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/errors/index.ts)
- [apps/claw-llamacpp-service/src/common/events/__tests__/llamacpp-events.publisher.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/events/__tests__/llamacpp-events.publisher.spec.ts)
- [apps/claw-llamacpp-service/src/common/events/llamacpp-events.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/events/llamacpp-events.module.ts)
- [apps/claw-llamacpp-service/src/common/events/llamacpp-events.publisher.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/events/llamacpp-events.publisher.ts)
- [apps/claw-llamacpp-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-llamacpp-service/src/common/types/disk-space.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/disk-space.type.ts)
- [apps/claw-llamacpp-service/src/common/types/exec-result.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/exec-result.type.ts)
- [apps/claw-llamacpp-service/src/common/types/huggingface.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/huggingface.type.ts)
- [apps/claw-llamacpp-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/index.ts)
- [apps/claw-llamacpp-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-llamacpp-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/pagination.type.ts)
- [apps/claw-llamacpp-service/src/common/types/platform.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/platform.type.ts)
- [apps/claw-llamacpp-service/src/common/types/sse-event.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/types/sse-event.type.ts)
- [apps/claw-llamacpp-service/src/common/utilities/__tests__/path-safety.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/__tests__/path-safety.utility.spec.ts)
- [apps/claw-llamacpp-service/src/common/utilities/__tests__/sha256.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/__tests__/sha256.utility.spec.ts)
- [apps/claw-llamacpp-service/src/common/utilities/archive.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/archive.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/disk-space.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/disk-space.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/dri.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/dri.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/huggingface-client.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/huggingface-client.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/index.ts)
- [apps/claw-llamacpp-service/src/common/utilities/nvidia-smi.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/nvidia-smi.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/path-safety.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/path-safety.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/platform.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/platform.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/process-runner.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/process-runner.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/rocm-smi.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/rocm-smi.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/safe-stringify.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/safe-stringify.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/sha256.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/sha256.utility.ts)
- [apps/claw-llamacpp-service/src/common/utilities/sse.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/common/utilities/sse.utility.ts)
- [apps/claw-llamacpp-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-llamacpp-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-llamacpp-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/main.ts)
- [apps/claw-llamacpp-service/src/modules/binary/__tests__/binary-installer.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/__tests__/binary-installer.manager.spec.ts)
- [apps/claw-llamacpp-service/src/modules/binary/__tests__/binary-resolver.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/__tests__/binary-resolver.spec.ts)
- [apps/claw-llamacpp-service/src/modules/binary/binary.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/binary.module.ts)
- [apps/claw-llamacpp-service/src/modules/binary/constants/binary-releases.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/constants/binary-releases.constants.ts)
- [apps/claw-llamacpp-service/src/modules/binary/controllers/binary.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/controllers/binary.controller.ts)
- [apps/claw-llamacpp-service/src/modules/binary/dto/update-binary.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/dto/update-binary.dto.ts)
- [apps/claw-llamacpp-service/src/modules/binary/managers/binary-installer.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/managers/binary-installer.manager.ts)
- [apps/claw-llamacpp-service/src/modules/binary/repositories/binary-release.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/repositories/binary-release.repository.ts)
- [apps/claw-llamacpp-service/src/modules/binary/services/binary.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/services/binary.service.ts)
- [apps/claw-llamacpp-service/src/modules/binary/types/binary.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/binary/types/binary.types.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/catalog.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/catalog.module.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/constants/catalog-search.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/constants/catalog-search.constants.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/constants/frontier-catalog-entries.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/constants/frontier-catalog-entries.constants.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/constants/hf-discovery.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/constants/hf-discovery.constants.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog-internal.controller.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/controllers/catalog.controller.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/dto/catalog-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/dto/catalog-query.dto.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/dto/hf-search.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/dto/hf-search.dto.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/managers/__tests__/routing-snapshot.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/managers/__tests__/routing-snapshot.manager.spec.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/managers/catalog-refresh.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/managers/catalog-refresh.manager.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/managers/hf-auto-sync.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/managers/hf-auto-sync.manager.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/managers/hf-discovery.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/managers/hf-discovery.manager.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/managers/routing-snapshot.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/managers/routing-snapshot.manager.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/repositories/catalog.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/repositories/catalog.repository.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/services/catalog-bootstrap.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/services/catalog-bootstrap.service.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/services/catalog.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/services/catalog.service.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/types/catalog.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/types/catalog.types.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/types/hf-api.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/types/hf-api.types.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/types/hf-auto-sync.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/types/hf-auto-sync.types.ts)
- [apps/claw-llamacpp-service/src/modules/catalog/types/hf-search.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/catalog/types/hf-search.types.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/__tests__/preflight-validator.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/__tests__/preflight-validator.manager.spec.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/constants/hardware.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/constants/hardware.constants.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/controllers/hardware.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/controllers/hardware.controller.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/hardware.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/hardware.module.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/managers/hardware-detector.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/managers/hardware-detector.manager.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/managers/preflight-validator.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/managers/preflight-validator.manager.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/repositories/hardware-snapshot.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/repositories/hardware-snapshot.repository.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/services/hardware.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/services/hardware.service.ts)
- [apps/claw-llamacpp-service/src/modules/hardware/types/hardware.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/hardware/types/hardware.types.ts)
- [apps/claw-llamacpp-service/src/modules/health/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/health/__tests__/health.service.spec.ts)
- [apps/claw-llamacpp-service/src/modules/health/constants/service-version.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/health/constants/service-version.constants.ts)
- [apps/claw-llamacpp-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-llamacpp-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/health/health.module.ts)
- [apps/claw-llamacpp-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/health/services/health.service.ts)
- [apps/claw-llamacpp-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/health/types/health.types.ts)
- [apps/claw-llamacpp-service/src/modules/inference/__tests__/chat-completion.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/__tests__/chat-completion.dto.spec.ts)
- [apps/claw-llamacpp-service/src/modules/inference/__tests__/inference.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/__tests__/inference.service.spec.ts)
- [apps/claw-llamacpp-service/src/modules/inference/__tests__/reasoning-leak-fix.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/__tests__/reasoning-leak-fix.spec.ts)
- [apps/claw-llamacpp-service/src/modules/inference/constants/sse.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/constants/sse.constants.ts)
- [apps/claw-llamacpp-service/src/modules/inference/controllers/inference.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/controllers/inference.controller.ts)
- [apps/claw-llamacpp-service/src/modules/inference/dto/chat-completion.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/dto/chat-completion.dto.ts)
- [apps/claw-llamacpp-service/src/modules/inference/inference.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/inference.module.ts)
- [apps/claw-llamacpp-service/src/modules/inference/managers/inference-proxy.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/managers/inference-proxy.manager.ts)
- [apps/claw-llamacpp-service/src/modules/inference/services/inference.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/services/inference.service.ts)
- [apps/claw-llamacpp-service/src/modules/inference/types/inference-proxy.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/types/inference-proxy.types.ts)
- [apps/claw-llamacpp-service/src/modules/inference/utilities/think-tag-rewriter.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/inference/utilities/think-tag-rewriter.utility.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/__tests__/llama-server-launcher.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/__tests__/llama-server-launcher.manager.spec.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/constants/launcher.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/constants/launcher.constants.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/controllers/models-lifecycle.controller.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/dto/runtime-config.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/dto/runtime-config.dto.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/managers/llama-server-launcher.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/managers/llama-server-launcher.manager.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/managers/process-supervisor.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/managers/process-supervisor.manager.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/managers/runtime-config.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/managers/runtime-config.manager.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/models-lifecycle.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/models-lifecycle.module.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/repositories/load-events.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/repositories/load-events.repository.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/services/models-lifecycle.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/services/models-lifecycle.service.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/types/load-events.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/types/load-events.types.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/types/process.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/types/process.types.ts)
- [apps/claw-llamacpp-service/src/modules/models-lifecycle/types/supervisor.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/models-lifecycle/types/supervisor.types.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/__tests__/pull-job-progress-emitter.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/__tests__/pull-job-progress-emitter.manager.spec.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/__tests__/pull-job-resume.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/__tests__/pull-job-resume.manager.spec.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/constants/pull-job.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/constants/pull-job.constants.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/controllers/pull-jobs.controller.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/dto/initiate-pull.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/dto/initiate-pull.dto.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/managers/pull-job-progress-emitter.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/managers/pull-job-progress-emitter.manager.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/managers/pull-job-resume.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/managers/pull-job-resume.manager.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/managers/pull-job-runner.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/managers/pull-job-runner.manager.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/pull-jobs.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/pull-jobs.module.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/repositories/pull-jobs.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/repositories/pull-jobs.repository.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/services/pull-jobs.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/services/pull-jobs.service.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/types/download-stats.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/types/download-stats.types.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/types/pull-job.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/types/pull-job.types.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/utilities/__tests__/download-stats.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/utilities/__tests__/download-stats.utility.spec.ts)
- [apps/claw-llamacpp-service/src/modules/pull-jobs/utilities/download-stats.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/pull-jobs/utilities/download-stats.utility.ts)
- [apps/claw-llamacpp-service/src/modules/runtime-progress/__tests__/llamacpp-probe.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/runtime-progress/__tests__/llamacpp-probe.service.spec.ts)
- [apps/claw-llamacpp-service/src/modules/runtime-progress/constants/runtime-progress.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/runtime-progress/constants/runtime-progress.constants.ts)
- [apps/claw-llamacpp-service/src/modules/runtime-progress/controllers/runtime-progress.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/runtime-progress/controllers/runtime-progress.controller.ts)
- [apps/claw-llamacpp-service/src/modules/runtime-progress/dto/runtime-probe-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/runtime-progress/dto/runtime-probe-query.dto.ts)
- [apps/claw-llamacpp-service/src/modules/runtime-progress/runtime-progress.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/runtime-progress/runtime-progress.module.ts)
- [apps/claw-llamacpp-service/src/modules/runtime-progress/services/llamacpp-probe.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/modules/runtime-progress/services/llamacpp-probe.service.ts)
- [apps/claw-llamacpp-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/src/vitest-globals.d.ts)
- [apps/claw-llamacpp-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/tsconfig.build.json)
- [apps/claw-llamacpp-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/tsconfig.json)
- [apps/claw-llamacpp-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
