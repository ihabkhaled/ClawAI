# claw-health-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-health-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service) |
| Port | 4009 |
| Database | none |
| Endpoints | 1 |
| Tests | 4 |
| Runner | vitest |
| Internal packages | @claw/shared-utilities |

## Modules
- `health`

## Persistence models
- None recorded

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/controllers/health.controller.ts) |

## File inventory
<details>
<summary>32 tracked files</summary>

- [apps/claw-health-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/.dockerignore)
- [apps/claw-health-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/.prettierignore)
- [apps/claw-health-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/.prettierrc)
- [apps/claw-health-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/AGENTS.md)
- [apps/claw-health-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/CLAUDE.md)
- [apps/claw-health-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/Dockerfile)
- [apps/claw-health-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/Dockerfile.dev)
- [apps/claw-health-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/docker-entrypoint.dev.sh)
- [apps/claw-health-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/eslint.config.mjs)
- [apps/claw-health-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/nest-cli.json)
- [apps/claw-health-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/package.json)
- [apps/claw-health-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/__tests__/app.spec.ts)
- [apps/claw-health-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/app/app.module.ts)
- [apps/claw-health-service/src/common/constants/http.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/common/constants/http.constants.ts)
- [apps/claw-health-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/common/constants/index.ts)
- [apps/claw-health-service/src/common/utilities/__tests__/http-client.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/common/utilities/__tests__/http-client.utility.spec.ts)
- [apps/claw-health-service/src/common/utilities/http-client.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/common/utilities/http-client.utility.ts)
- [apps/claw-health-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/common/utilities/index.ts)
- [apps/claw-health-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/main.ts)
- [apps/claw-health-service/src/modules/health/constants/health.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/constants/health.constants.ts)
- [apps/claw-health-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-health-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-health-service/src/modules/health/enums/aggregated-health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/enums/aggregated-health-status.enum.ts)
- [apps/claw-health-service/src/modules/health/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/enums/index.ts)
- [apps/claw-health-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/health.module.ts)
- [apps/claw-health-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-health-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/services/health.service.ts)
- [apps/claw-health-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/modules/health/types/health.types.ts)
- [apps/claw-health-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/src/vitest-globals.d.ts)
- [apps/claw-health-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/tsconfig.build.json)
- [apps/claw-health-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/tsconfig.json)
- [apps/claw-health-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
