# Package: @claw/shared-rabbitmq

> **Workspace:** `packages/shared-rabbitmq`

## Purpose and ownership

# @claw/shared-rabbitmq — agent guide

**Type:** shared-package · **Path:** `packages/shared-rabbitmq`

## Canonical owner
- Root policy: `CLAUDE.md` + `rules/00-non-negotiable-rules.md`
- Shared packages: `rules/17-shared-packages.md` + `context/package-boundaries.md`

## Commands (run in this folder only)
```
npm run typecheck
npm run lint
npm run test
npm run build
```

## Dependencies (generated)
- Depends on: @claw/shared-constants, @claw/shared-types

## Before editing
1. `npm run knowledge:context -- --task="<task>" --service=@claw/shared-rabbitmq`
2. Read `.ai/local/current-context.md`.
3. Never cross this workspace's data boundary; never bypass hooks; never suppress lint/types.

_Generated from source. Edit the renderer, not this file._


## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **12**
- Internal dependencies: `@claw/shared-constants`, `@claw/shared-types`

## Scripts

| Script | Command |
|---|---|
| `typecheck` | `node ../../tools/typescript/run-ts7.mjs --noEmit` |
| `build` | `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json && tsc-alias -p tsconfig.build.json -f` |
| `lint` | `eslint src/ --concurrency=1` |
| `lint:fix` | `eslint src/ --fix` |
| `test` | `vitest run --passWithNoTests` |
| `test:watch` | `vitest` |

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
