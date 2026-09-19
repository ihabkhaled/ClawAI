# claw-research-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-research-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service) |
| Port | 4016 |
| Database | postgresql |
| Endpoints | 17 |
| Tests | 31 |
| Runner | vitest |
| Internal packages | @claw/shared-auth, @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `fetch`
- `health`
- `research`
- `scrape`
- `search`

## Persistence models
- `FetchJob`
- `PageCache`
- `ResearchRun`
- `SearchProvider`
- `SearchRun`

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/health` | [src/modules/health/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/health/health.controller.ts) |
| POST | `/internal/research/runs` | [src/modules/research/controllers/research-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research-internal.controller.ts) |
| POST | `/research/fetch` | [src/modules/fetch/controllers/fetch.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/controllers/fetch.controller.ts) |
| GET | `/research/fetch/jobs` | [src/modules/fetch/controllers/fetch.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/controllers/fetch.controller.ts) |
| GET | `/research/fetch/jobs/:id` | [src/modules/fetch/controllers/fetch.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/controllers/fetch.controller.ts) |
| GET | `/research/runs` | [src/modules/research/controllers/research.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research.controller.ts) |
| POST | `/research/runs` | [src/modules/research/controllers/research.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research.controller.ts) |
| GET | `/research/runs/:id` | [src/modules/research/controllers/research.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research.controller.ts) |
| POST | `/research/search` | [src/modules/search/controllers/search.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search.controller.ts) |
| GET | `/research/search-providers` | [src/modules/search/controllers/search-provider.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| POST | `/research/search-providers` | [src/modules/search/controllers/search-provider.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| DELETE | `/research/search-providers/:id` | [src/modules/search/controllers/search-provider.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| GET | `/research/search-providers/:id` | [src/modules/search/controllers/search-provider.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| PATCH | `/research/search-providers/:id` | [src/modules/search/controllers/search-provider.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| POST | `/research/search-providers/:id/test` | [src/modules/search/controllers/search-provider.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts) |
| GET | `/research/search/runs` | [src/modules/search/controllers/search.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search.controller.ts) |
| GET | `/research/search/runs/:id` | [src/modules/search/controllers/search.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search.controller.ts) |

## File inventory
<details>
<summary>187 tracked files</summary>

- [apps/claw-research-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/AGENTS.md)
- [apps/claw-research-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/CLAUDE.md)
- [apps/claw-research-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/Dockerfile)
- [apps/claw-research-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/Dockerfile.dev)
- [apps/claw-research-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/docker-entrypoint.dev.sh)
- [apps/claw-research-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/eslint.config.mjs)
- [apps/claw-research-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/nest-cli.json)
- [apps/claw-research-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/package.json)
- [apps/claw-research-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/prisma.config.ts)
- [apps/claw-research-service/prisma/migrations/20260420100000_init_search/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/prisma/migrations/20260420100000_init_search/migration.sql)
- [apps/claw-research-service/prisma/migrations/20260420120000_add_fetch_evidence/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/prisma/migrations/20260420120000_add_fetch_evidence/migration.sql)
- [apps/claw-research-service/prisma/migrations/20260423193000_add_research_provider_kinds/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/prisma/migrations/20260423193000_add_research_provider_kinds/migration.sql)
- [apps/claw-research-service/prisma/migrations/20260911194406_add_site_crawl_workflow_kind/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/prisma/migrations/20260911194406_add_site_crawl_workflow_kind/migration.sql)
- [apps/claw-research-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/prisma/migrations/migration_lock.toml)
- [apps/claw-research-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/prisma/schema.prisma)
- [apps/claw-research-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/app/app.module.ts)
- [apps/claw-research-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/app/config/app.config.ts)
- [apps/claw-research-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-research-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-research-service/src/app/guards/service-token.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/app/guards/service-token.guard.ts)
- [apps/claw-research-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-research-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-research-service/src/common/constants/content-safety.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/content-safety.constants.ts)
- [apps/claw-research-service/src/common/constants/crawl.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/crawl.constants.ts)
- [apps/claw-research-service/src/common/constants/crypto.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/crypto.constants.ts)
- [apps/claw-research-service/src/common/constants/evidence.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/evidence.constants.ts)
- [apps/claw-research-service/src/common/constants/feed.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/feed.constants.ts)
- [apps/claw-research-service/src/common/constants/fetch.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/fetch.constants.ts)
- [apps/claw-research-service/src/common/constants/headless-fetch.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/headless-fetch.constants.ts)
- [apps/claw-research-service/src/common/constants/html-extract.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/html-extract.constants.ts)
- [apps/claw-research-service/src/common/constants/search.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/search.constants.ts)
- [apps/claw-research-service/src/common/constants/site-audit.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/site-audit.constants.ts)
- [apps/claw-research-service/src/common/constants/sitemap.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/sitemap.constants.ts)
- [apps/claw-research-service/src/common/constants/url-detection.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/url-detection.constants.ts)
- [apps/claw-research-service/src/common/constants/url-safety.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/constants/url-safety.constants.ts)
- [apps/claw-research-service/src/common/enums/crawl-discovery-method.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/crawl-discovery-method.enum.ts)
- [apps/claw-research-service/src/common/enums/finding-confidence.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/finding-confidence.enum.ts)
- [apps/claw-research-service/src/common/enums/provider-selection-mode.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/provider-selection-mode.enum.ts)
- [apps/claw-research-service/src/common/enums/research-error-code.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/research-error-code.enum.ts)
- [apps/claw-research-service/src/common/enums/research-run-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/research-run-status.enum.ts)
- [apps/claw-research-service/src/common/enums/research-workflow-kind.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/research-workflow-kind.enum.ts)
- [apps/claw-research-service/src/common/enums/search-provider-kind.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/search-provider-kind.enum.ts)
- [apps/claw-research-service/src/common/enums/search-provider-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/search-provider-status.enum.ts)
- [apps/claw-research-service/src/common/enums/search-run-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/enums/search-run-status.enum.ts)
- [apps/claw-research-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/errors/business.exception.ts)
- [apps/claw-research-service/src/common/errors/entity-not-found.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/errors/entity-not-found.exception.ts)
- [apps/claw-research-service/src/common/services/__tests__/research-usage.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/services/__tests__/research-usage.service.spec.ts)
- [apps/claw-research-service/src/common/services/research-usage.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/services/research-usage.module.ts)
- [apps/claw-research-service/src/common/services/research-usage.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/services/research-usage.service.ts)
- [apps/claw-research-service/src/common/types/auth.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/types/auth.types.ts)
- [apps/claw-research-service/src/common/types/content-safety.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/types/content-safety.types.ts)
- [apps/claw-research-service/src/common/types/feed.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/types/feed.types.ts)
- [apps/claw-research-service/src/common/types/html-extract.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/types/html-extract.types.ts)
- [apps/claw-research-service/src/common/types/robots-txt.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/types/robots-txt.types.ts)
- [apps/claw-research-service/src/common/types/sitemap.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/types/sitemap.types.ts)
- [apps/claw-research-service/src/common/types/url-safety.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/types/url-safety.types.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/concurrency-pool.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/concurrency-pool.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/content-safety.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/content-safety.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/feed.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/feed.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/html-extract.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/html-extract.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/robots-txt.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/robots-txt.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/search-query.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/search-query.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/sitemap.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/sitemap.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/url-detection.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/url-detection.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/__tests__/url-safety.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/__tests__/url-safety.utility.spec.ts)
- [apps/claw-research-service/src/common/utilities/concurrency-pool.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/concurrency-pool.utility.ts)
- [apps/claw-research-service/src/common/utilities/constant-time-equal.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/constant-time-equal.utility.ts)
- [apps/claw-research-service/src/common/utilities/content-safety.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/content-safety.utility.ts)
- [apps/claw-research-service/src/common/utilities/crypto.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/crypto.utility.ts)
- [apps/claw-research-service/src/common/utilities/feed.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/feed.utility.ts)
- [apps/claw-research-service/src/common/utilities/hash.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/hash.utility.ts)
- [apps/claw-research-service/src/common/utilities/html-extract.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/html-extract.utility.ts)
- [apps/claw-research-service/src/common/utilities/prisma-json.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/prisma-json.utility.ts)
- [apps/claw-research-service/src/common/utilities/robots-txt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/robots-txt.utility.ts)
- [apps/claw-research-service/src/common/utilities/search-query.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/search-query.utility.ts)
- [apps/claw-research-service/src/common/utilities/sitemap.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/sitemap.utility.ts)
- [apps/claw-research-service/src/common/utilities/url-detection.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/url-detection.utility.ts)
- [apps/claw-research-service/src/common/utilities/url-safety.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/common/utilities/url-safety.utility.ts)
- [apps/claw-research-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-research-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-research-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-research-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-research-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-research-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/main.ts)
- [apps/claw-research-service/src/modules/fetch/adapters/__tests__/headless-fetch.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/adapters/__tests__/headless-fetch.adapter.spec.ts)
- [apps/claw-research-service/src/modules/fetch/adapters/__tests__/http-fetch.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/adapters/__tests__/http-fetch.adapter.spec.ts)
- [apps/claw-research-service/src/modules/fetch/adapters/fetch-adapter.interface.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/adapters/fetch-adapter.interface.ts)
- [apps/claw-research-service/src/modules/fetch/adapters/headless-fetch.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/adapters/headless-fetch.adapter.ts)
- [apps/claw-research-service/src/modules/fetch/adapters/http-fetch.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/adapters/http-fetch.adapter.ts)
- [apps/claw-research-service/src/modules/fetch/controllers/fetch.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/controllers/fetch.controller.ts)
- [apps/claw-research-service/src/modules/fetch/dto/fetch-request.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/dto/fetch-request.dto.ts)
- [apps/claw-research-service/src/modules/fetch/enums/domain-policy-outcome.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/enums/domain-policy-outcome.enum.ts)
- [apps/claw-research-service/src/modules/fetch/fetch.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/fetch.module.ts)
- [apps/claw-research-service/src/modules/fetch/repositories/fetch-job.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/repositories/fetch-job.repository.ts)
- [apps/claw-research-service/src/modules/fetch/repositories/page-cache.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/repositories/page-cache.repository.ts)
- [apps/claw-research-service/src/modules/fetch/services/__tests__/fetch.service.headless-fallback.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/services/__tests__/fetch.service.headless-fallback.spec.ts)
- [apps/claw-research-service/src/modules/fetch/services/__tests__/fetch.service.usage.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/services/__tests__/fetch.service.usage.spec.ts)
- [apps/claw-research-service/src/modules/fetch/services/fetch.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/services/fetch.service.ts)
- [apps/claw-research-service/src/modules/fetch/types/domain-policy.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/types/domain-policy.types.ts)
- [apps/claw-research-service/src/modules/fetch/types/fetch.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/types/fetch.types.ts)
- [apps/claw-research-service/src/modules/fetch/utilities/__tests__/domain-policy.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/utilities/__tests__/domain-policy.utility.spec.ts)
- [apps/claw-research-service/src/modules/fetch/utilities/domain-policy.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/fetch/utilities/domain-policy.utility.ts)
- [apps/claw-research-service/src/modules/health/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/health/health.controller.ts)
- [apps/claw-research-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/health/health.module.ts)
- [apps/claw-research-service/src/modules/research/controllers/research-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research-internal.controller.ts)
- [apps/claw-research-service/src/modules/research/controllers/research.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/controllers/research.controller.ts)
- [apps/claw-research-service/src/modules/research/dto/execute-research.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/dto/execute-research.dto.ts)
- [apps/claw-research-service/src/modules/research/dto/internal-execute-research.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/dto/internal-execute-research.dto.ts)
- [apps/claw-research-service/src/modules/research/managers/__tests__/research-progress-publisher.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/managers/__tests__/research-progress-publisher.service.spec.ts)
- [apps/claw-research-service/src/modules/research/managers/__tests__/research.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/managers/__tests__/research.manager.spec.ts)
- [apps/claw-research-service/src/modules/research/managers/__tests__/site-audit.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/managers/__tests__/site-audit.manager.spec.ts)
- [apps/claw-research-service/src/modules/research/managers/__tests__/site-crawl.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/managers/__tests__/site-crawl.manager.spec.ts)
- [apps/claw-research-service/src/modules/research/managers/research-progress-publisher.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/managers/research-progress-publisher.service.ts)
- [apps/claw-research-service/src/modules/research/managers/research.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/managers/research.manager.ts)
- [apps/claw-research-service/src/modules/research/managers/site-audit.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/managers/site-audit.manager.ts)
- [apps/claw-research-service/src/modules/research/managers/site-crawl.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/managers/site-crawl.manager.ts)
- [apps/claw-research-service/src/modules/research/repositories/research-run.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/repositories/research-run.repository.ts)
- [apps/claw-research-service/src/modules/research/research.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/research.module.ts)
- [apps/claw-research-service/src/modules/research/services/research.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/services/research.service.ts)
- [apps/claw-research-service/src/modules/research/types/audit-finding.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/types/audit-finding.types.ts)
- [apps/claw-research-service/src/modules/research/types/crawl.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/types/crawl.types.ts)
- [apps/claw-research-service/src/modules/research/types/evidence-bundle.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/types/evidence-bundle.types.ts)
- [apps/claw-research-service/src/modules/research/utilities/__tests__/evidence-builder.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/utilities/__tests__/evidence-builder.spec.ts)
- [apps/claw-research-service/src/modules/research/utilities/crawl-ranking.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/utilities/crawl-ranking.utility.ts)
- [apps/claw-research-service/src/modules/research/utilities/evidence-builder.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/utilities/evidence-builder.utility.ts)
- [apps/claw-research-service/src/modules/research/utilities/site-audit.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/research/utilities/site-audit.utility.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/__tests__/article.extractor.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/__tests__/article.extractor.spec.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/__tests__/docs.extractor.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/__tests__/docs.extractor.spec.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/__tests__/scrape-adapter.factory.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/__tests__/scrape-adapter.factory.spec.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/__tests__/table.extractor.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/__tests__/table.extractor.spec.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/article.extractor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/article.extractor.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/docs.extractor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/docs.extractor.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/generic-html.extractor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/generic-html.extractor.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/scrape-adapter.factory.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/scrape-adapter.factory.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/scrape-adapter.interface.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/scrape-adapter.interface.ts)
- [apps/claw-research-service/src/modules/scrape/adapters/table.extractor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/adapters/table.extractor.ts)
- [apps/claw-research-service/src/modules/scrape/constants/scrape-patterns.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/constants/scrape-patterns.constants.ts)
- [apps/claw-research-service/src/modules/scrape/enums/extraction-profile.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/enums/extraction-profile.enum.ts)
- [apps/claw-research-service/src/modules/scrape/scrape.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/scrape.module.ts)
- [apps/claw-research-service/src/modules/scrape/services/scrape.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/services/scrape.service.ts)
- [apps/claw-research-service/src/modules/scrape/types/scrape.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/types/scrape.types.ts)
- [apps/claw-research-service/src/modules/scrape/utilities/scrape-text.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/scrape/utilities/scrape-text.utility.ts)
- [apps/claw-research-service/src/modules/search/adapters/__tests__/ollama-web.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/__tests__/ollama-web.adapter.spec.ts)
- [apps/claw-research-service/src/modules/search/adapters/__tests__/search-adapter-contract.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/__tests__/search-adapter-contract.ts)
- [apps/claw-research-service/src/modules/search/adapters/__tests__/search-adapter.factory.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/__tests__/search-adapter.factory.spec.ts)
- [apps/claw-research-service/src/modules/search/adapters/__tests__/searxng.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/__tests__/searxng.adapter.spec.ts)
- [apps/claw-research-service/src/modules/search/adapters/__tests__/tavily.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/__tests__/tavily.adapter.spec.ts)
- [apps/claw-research-service/src/modules/search/adapters/brave.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/brave.adapter.ts)
- [apps/claw-research-service/src/modules/search/adapters/exa.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/exa.adapter.ts)
- [apps/claw-research-service/src/modules/search/adapters/firecrawl.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/firecrawl.adapter.ts)
- [apps/claw-research-service/src/modules/search/adapters/ollama-web.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/ollama-web.adapter.ts)
- [apps/claw-research-service/src/modules/search/adapters/search-adapter.factory.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/search-adapter.factory.ts)
- [apps/claw-research-service/src/modules/search/adapters/search-adapter.interface.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/search-adapter.interface.ts)
- [apps/claw-research-service/src/modules/search/adapters/searxng.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/searxng.adapter.ts)
- [apps/claw-research-service/src/modules/search/adapters/serpapi.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/serpapi.adapter.ts)
- [apps/claw-research-service/src/modules/search/adapters/tavily.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/adapters/tavily.adapter.ts)
- [apps/claw-research-service/src/modules/search/constants/default-search-provider.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/constants/default-search-provider.constants.ts)
- [apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search-provider.controller.ts)
- [apps/claw-research-service/src/modules/search/controllers/search.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/controllers/search.controller.ts)
- [apps/claw-research-service/src/modules/search/dto/create-search-provider.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/dto/create-search-provider.dto.ts)
- [apps/claw-research-service/src/modules/search/dto/execute-search.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/dto/execute-search.dto.ts)
- [apps/claw-research-service/src/modules/search/dto/update-search-provider.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/dto/update-search-provider.dto.ts)
- [apps/claw-research-service/src/modules/search/repositories/search-provider.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/repositories/search-provider.repository.ts)
- [apps/claw-research-service/src/modules/search/repositories/search-run.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/repositories/search-run.repository.ts)
- [apps/claw-research-service/src/modules/search/search.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/search.module.ts)
- [apps/claw-research-service/src/modules/search/services/__tests__/search-execution.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/services/__tests__/search-execution.service.spec.ts)
- [apps/claw-research-service/src/modules/search/services/__tests__/search-provider-bootstrap.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/services/__tests__/search-provider-bootstrap.service.spec.ts)
- [apps/claw-research-service/src/modules/search/services/search-execution.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/services/search-execution.service.ts)
- [apps/claw-research-service/src/modules/search/services/search-provider-bootstrap.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/services/search-provider-bootstrap.service.ts)
- [apps/claw-research-service/src/modules/search/services/search-provider.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/services/search-provider.service.ts)
- [apps/claw-research-service/src/modules/search/types/brave.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/brave.types.ts)
- [apps/claw-research-service/src/modules/search/types/exa.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/exa.types.ts)
- [apps/claw-research-service/src/modules/search/types/firecrawl.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/firecrawl.types.ts)
- [apps/claw-research-service/src/modules/search/types/ollama-web.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/ollama-web.types.ts)
- [apps/claw-research-service/src/modules/search/types/sanitized-search-provider.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/sanitized-search-provider.types.ts)
- [apps/claw-research-service/src/modules/search/types/search-execution-result.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/search-execution-result.types.ts)
- [apps/claw-research-service/src/modules/search/types/search.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/search.types.ts)
- [apps/claw-research-service/src/modules/search/types/searxng.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/searxng.types.ts)
- [apps/claw-research-service/src/modules/search/types/serpapi.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/serpapi.types.ts)
- [apps/claw-research-service/src/modules/search/types/tavily.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/types/tavily.types.ts)
- [apps/claw-research-service/src/modules/search/utilities/__tests__/merge-provider-results.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/utilities/__tests__/merge-provider-results.utility.spec.ts)
- [apps/claw-research-service/src/modules/search/utilities/merge-provider-results.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/utilities/merge-provider-results.utility.ts)
- [apps/claw-research-service/src/modules/search/utilities/provider-sanitizer.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/modules/search/utilities/provider-sanitizer.utility.ts)
- [apps/claw-research-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/src/vitest-globals.d.ts)
- [apps/claw-research-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/tsconfig.build.json)
- [apps/claw-research-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/tsconfig.json)
- [apps/claw-research-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
