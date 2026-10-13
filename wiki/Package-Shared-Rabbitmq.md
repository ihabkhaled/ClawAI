# Package: @claw/shared-rabbitmq

> **Workspace:** `packages/shared-rabbitmq`

## Purpose and ownership

Owner rules: `rules/14-shared-packages.md` and `context/package-boundaries.md`. The package's agent guide (commands, dependencies, what to read before editing) is generated: `packages/shared-rabbitmq/AGENTS.md`.

## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **12**
- Internal dependencies: `@claw/shared-constants`, `@claw/shared-types`

## Scripts

| Script       | Command                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `typecheck`  | `node ../../tools/typescript/run-ts7.mjs --noEmit`                                                      |
| `build`      | `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json && tsc-alias -p tsconfig.build.json -f` |
| `lint`       | `eslint src/ --concurrency=1`                                                                           |
| `lint:fix`   | `eslint src/ --fix`                                                                                     |
| `test`       | `vitest run` (an empty suite fails)                                                                     |
| `test:watch` | `vitest`                                                                                                |

## Workspace inventory

- [`packages/shared-rabbitmq/AGENTS.md`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/AGENTS.md)
- [`packages/shared-rabbitmq/package.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/package.json)
- [`packages/shared-rabbitmq/src/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/src/index.ts)
- [`packages/shared-rabbitmq/src/rabbitmq-logger.service.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/src/rabbitmq-logger.service.ts)
- [`packages/shared-rabbitmq/src/rabbitmq.module.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/src/rabbitmq.module.ts)
- [`packages/shared-rabbitmq/src/rabbitmq.service.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/src/rabbitmq.service.ts)
- [`packages/shared-rabbitmq/src/rabbitmq.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/src/rabbitmq.types.ts)
- [`packages/shared-rabbitmq/src/structured-logger.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/src/structured-logger.ts)
- [`packages/shared-rabbitmq/src/vitest-globals.d.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/src/vitest-globals.d.ts)
- [`packages/shared-rabbitmq/tsconfig.build.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/tsconfig.build.json)
- [`packages/shared-rabbitmq/tsconfig.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/tsconfig.json)
- [`packages/shared-rabbitmq/vitest.config.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/vitest.config.ts)
