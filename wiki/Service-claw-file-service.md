# claw-file-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-file-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service) |
| Port | 4006 |
| Database | postgresql |
| Endpoints | 17 |
| Tests | 20 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `files`
- `health`

## Persistence models
- `File`
- `FileChunk`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/files` | [src/modules/files/controllers/files.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| DELETE | `/files/:id` | [src/modules/files/controllers/files.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| GET | `/files/:id` | [src/modules/files/controllers/files.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| GET | `/files/:id/chunks` | [src/modules/files/controllers/files.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| GET | `/files/download/:id` | [src/modules/files/controllers/files.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| POST | `/files/upload` | [src/modules/files/controllers/files.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts) |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/internal/files/:id/chunks` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| GET | `/internal/files/:id/content` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| GET | `/internal/files/:id/ingestion-state` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| GET | `/internal/files/download-internal/:id` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| GET | `/internal/files/download/:id` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| GET | `/internal/files/metadata-internal/:id` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| POST | `/internal/files/publish-copy` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| DELETE | `/internal/files/published-copy/:id` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| POST | `/internal/files/store-image` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |
| POST | `/internal/files/upload-internal` | [src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts) |

## File inventory
<details>
<summary>118 tracked files</summary>

- [apps/claw-file-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/.dockerignore)
- [apps/claw-file-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/.prettierignore)
- [apps/claw-file-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/.prettierrc)
- [apps/claw-file-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/AGENTS.md)
- [apps/claw-file-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/CLAUDE.md)
- [apps/claw-file-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/Dockerfile)
- [apps/claw-file-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/Dockerfile.dev)
- [apps/claw-file-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/docker-entrypoint.dev.sh)
- [apps/claw-file-service/docker-entrypoint.prod.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/docker-entrypoint.prod.sh)
- [apps/claw-file-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/eslint.config.mjs)
- [apps/claw-file-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/nest-cli.json)
- [apps/claw-file-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/package.json)
- [apps/claw-file-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/prisma.config.ts)
- [apps/claw-file-service/prisma/migrations/20260404145312_init/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/prisma/migrations/20260404145312_init/migration.sql)
- [apps/claw-file-service/prisma/migrations/20260408230501_add_file_content_column/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/prisma/migrations/20260408230501_add_file_content_column/migration.sql)
- [apps/claw-file-service/prisma/migrations/20260530230043_add_file_retention_and_archive/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/prisma/migrations/20260530230043_add_file_retention_and_archive/migration.sql)
- [apps/claw-file-service/prisma/migrations/20260912120000_add_extracted_text_and_pending_default/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/prisma/migrations/20260912120000_add_extracted_text_and_pending_default/migration.sql)
- [apps/claw-file-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/prisma/migrations/migration_lock.toml)
- [apps/claw-file-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/prisma/schema.prisma)
- [apps/claw-file-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/__tests__/app.spec.ts)
- [apps/claw-file-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/app.module.ts)
- [apps/claw-file-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/config/app.config.ts)
- [apps/claw-file-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-file-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/decorators/public.decorator.ts)
- [apps/claw-file-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-file-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-file-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-file-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/guards/auth.guard.ts)
- [apps/claw-file-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/guards/roles.guard.ts)
- [apps/claw-file-service/src/app/guards/service-token.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/guards/service-token.guard.ts)
- [apps/claw-file-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-file-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-file-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/constants/index.ts)
- [apps/claw-file-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/constants/jwt.constants.ts)
- [apps/claw-file-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/constants/pagination.constants.ts)
- [apps/claw-file-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/enums/health-status.enum.ts)
- [apps/claw-file-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/enums/index.ts)
- [apps/claw-file-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/enums/user-role.enum.ts)
- [apps/claw-file-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/errors/business.exception.ts)
- [apps/claw-file-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/errors/index.ts)
- [apps/claw-file-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-file-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/types/index.ts)
- [apps/claw-file-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-file-service/src/common/types/ocr.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/types/ocr.types.ts)
- [apps/claw-file-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/types/pagination.type.ts)
- [apps/claw-file-service/src/common/utilities/__tests__/file-validator.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/__tests__/file-validator.utility.spec.ts)
- [apps/claw-file-service/src/common/utilities/__tests__/ocr-parser.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/__tests__/ocr-parser.utility.spec.ts)
- [apps/claw-file-service/src/common/utilities/__tests__/ooxml-parser.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/__tests__/ooxml-parser.utility.spec.ts)
- [apps/claw-file-service/src/common/utilities/__tests__/rtf-parser.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/__tests__/rtf-parser.utility.spec.ts)
- [apps/claw-file-service/src/common/utilities/__tests__/zip-extraction.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/__tests__/zip-extraction.utility.spec.ts)
- [apps/claw-file-service/src/common/utilities/clamav-scanner.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/clamav-scanner.utility.ts)
- [apps/claw-file-service/src/common/utilities/constant-time-equal.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/constant-time-equal.utility.ts)
- [apps/claw-file-service/src/common/utilities/docx-parser.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/docx-parser.utility.ts)
- [apps/claw-file-service/src/common/utilities/file-storage.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/file-storage.utility.ts)
- [apps/claw-file-service/src/common/utilities/file-validator.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/file-validator.utility.ts)
- [apps/claw-file-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/index.ts)
- [apps/claw-file-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-file-service/src/common/utilities/ocr-parser.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/ocr-parser.utility.ts)
- [apps/claw-file-service/src/common/utilities/ooxml-parser.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/ooxml-parser.utility.ts)
- [apps/claw-file-service/src/common/utilities/pdf-parser.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/pdf-parser.utility.ts)
- [apps/claw-file-service/src/common/utilities/rtf-parser.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/rtf-parser.utility.ts)
- [apps/claw-file-service/src/common/utilities/zip-extraction.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/common/utilities/zip-extraction.utility.ts)
- [apps/claw-file-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-file-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-file-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-file-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-file-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-file-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/main.ts)
- [apps/claw-file-service/src/modules/files/__tests__/file-processing.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/__tests__/file-processing.manager.spec.ts)
- [apps/claw-file-service/src/modules/files/__tests__/files-permission-guard.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/__tests__/files-permission-guard.spec.ts)
- [apps/claw-file-service/src/modules/files/__tests__/files.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/__tests__/files.service.spec.ts)
- [apps/claw-file-service/src/modules/files/constants/file-processing.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/constants/file-processing.constants.ts)
- [apps/claw-file-service/src/modules/files/constants/file-security.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/constants/file-security.constants.ts)
- [apps/claw-file-service/src/modules/files/constants/ocr.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/constants/ocr.constants.ts)
- [apps/claw-file-service/src/modules/files/constants/ooxml.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/constants/ooxml.constants.ts)
- [apps/claw-file-service/src/modules/files/constants/published-copy.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/constants/published-copy.constants.ts)
- [apps/claw-file-service/src/modules/files/constants/rtf.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/constants/rtf.constants.ts)
- [apps/claw-file-service/src/modules/files/constants/zip-expansion.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/constants/zip-expansion.constants.ts)
- [apps/claw-file-service/src/modules/files/controllers/__tests__/files-internal.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/__tests__/files-internal.controller.spec.ts)
- [apps/claw-file-service/src/modules/files/controllers/__tests__/files.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/__tests__/files.controller.spec.ts)
- [apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts)
- [apps/claw-file-service/src/modules/files/controllers/files.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/controllers/files.controller.ts)
- [apps/claw-file-service/src/modules/files/dto/__tests__/internal-file-content-query.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/dto/__tests__/internal-file-content-query.dto.spec.ts)
- [apps/claw-file-service/src/modules/files/dto/internal-file-content-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/dto/internal-file-content-query.dto.ts)
- [apps/claw-file-service/src/modules/files/dto/list-files-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/dto/list-files-query.dto.ts)
- [apps/claw-file-service/src/modules/files/dto/publish-copy.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/dto/publish-copy.dto.ts)
- [apps/claw-file-service/src/modules/files/dto/upload-file.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/dto/upload-file.dto.ts)
- [apps/claw-file-service/src/modules/files/files.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/files.module.ts)
- [apps/claw-file-service/src/modules/files/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/index.ts)
- [apps/claw-file-service/src/modules/files/managers/__tests__/file-retention-sweeper.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/managers/__tests__/file-retention-sweeper.manager.spec.ts)
- [apps/claw-file-service/src/modules/files/managers/__tests__/zip-expansion.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/managers/__tests__/zip-expansion.manager.spec.ts)
- [apps/claw-file-service/src/modules/files/managers/file-processing.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/managers/file-processing.manager.ts)
- [apps/claw-file-service/src/modules/files/managers/file-retention-sweeper.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/managers/file-retention-sweeper.manager.ts)
- [apps/claw-file-service/src/modules/files/managers/file-security.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/managers/file-security.manager.ts)
- [apps/claw-file-service/src/modules/files/managers/zip-expansion.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/managers/zip-expansion.manager.ts)
- [apps/claw-file-service/src/modules/files/repositories/__tests__/file-chunks.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/repositories/__tests__/file-chunks.repository.spec.ts)
- [apps/claw-file-service/src/modules/files/repositories/__tests__/files.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/repositories/__tests__/files.repository.spec.ts)
- [apps/claw-file-service/src/modules/files/repositories/file-chunks.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/repositories/file-chunks.repository.ts)
- [apps/claw-file-service/src/modules/files/repositories/files.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/repositories/files.repository.ts)
- [apps/claw-file-service/src/modules/files/services/__tests__/files.service-extraction.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/services/__tests__/files.service-extraction.spec.ts)
- [apps/claw-file-service/src/modules/files/services/__tests__/files.service-lifecycle.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/services/__tests__/files.service-lifecycle.spec.ts)
- [apps/claw-file-service/src/modules/files/services/files.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/services/files.service.ts)
- [apps/claw-file-service/src/modules/files/types/file-security.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/types/file-security.types.ts)
- [apps/claw-file-service/src/modules/files/types/files.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/types/files.types.ts)
- [apps/claw-file-service/src/modules/files/types/internal-file.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/types/internal-file.types.ts)
- [apps/claw-file-service/src/modules/files/types/published-copy.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/types/published-copy.types.ts)
- [apps/claw-file-service/src/modules/files/types/zip-expansion.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/files/types/zip-expansion.types.ts)
- [apps/claw-file-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-file-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-file-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/health.module.ts)
- [apps/claw-file-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/index.ts)
- [apps/claw-file-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-file-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/services/health.service.ts)
- [apps/claw-file-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/modules/health/types/health.types.ts)
- [apps/claw-file-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/src/vitest-globals.d.ts)
- [apps/claw-file-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/tsconfig.build.json)
- [apps/claw-file-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/tsconfig.json)
- [apps/claw-file-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
