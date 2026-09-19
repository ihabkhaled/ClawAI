# Package: @claw/shared-entitlements

> **Workspace:** `packages/shared-entitlements`

## Purpose and ownership

# @claw/shared-entitlements — agent guide

**Type:** shared-package · **Path:** `packages/shared-entitlements`

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
1. `npm run knowledge:context -- --task="<task>" --service=@claw/shared-entitlements`
2. Read `.ai/local/current-context.md`.
3. Never cross this workspace's data boundary; never bypass hooks; never suppress lint/types.

_Generated from source. Edit the renderer, not this file._


## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **28**
- Internal dependencies: `@claw/shared-types`, `@claw/shared-constants`

## Scripts

| Script | Command |
|---|---|
| `typecheck` | `node ../../tools/typescript/run-ts7.mjs --noEmit` |
| `build` | `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json && tsc-alias -p tsconfig.build.json -f` |
| `lint` | `eslint src/ --concurrency=4` |
| `lint:fix` | `eslint src/ --fix` |
| `test` | `vitest run --passWithNoTests` |
| `test:watch` | `vitest` |

## Workspace inventory

- [`packages/shared-entitlements/AGENTS.md`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/AGENTS.md)
- [`packages/shared-entitlements/package.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/package.json)
- [`packages/shared-entitlements/src/__tests__/describe-failure.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/__tests__/describe-failure.spec.ts)
- [`packages/shared-entitlements/src/__tests__/entitlements-adapter.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/__tests__/entitlements-adapter.spec.ts)
- [`packages/shared-entitlements/src/__tests__/helpers.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/__tests__/helpers.spec.ts)
- [`packages/shared-entitlements/src/__tests__/model-authorization.matrix.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/__tests__/model-authorization.matrix.spec.ts)
- [`packages/shared-entitlements/src/__tests__/payg-meter-boundary.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/__tests__/payg-meter-boundary.spec.ts)
- [`packages/shared-entitlements/src/__tests__/payg-meter-wire.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/__tests__/payg-meter-wire.spec.ts)
- [`packages/shared-entitlements/src/__tests__/permission.guard.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/__tests__/permission.guard.spec.ts)
- [`packages/shared-entitlements/src/__tests__/resolve-plan-limit.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/__tests__/resolve-plan-limit.spec.ts)
- [`packages/shared-entitlements/src/describe-failure.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/describe-failure.ts)
- [`packages/shared-entitlements/src/entitlements-adapter.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/entitlements-adapter.ts)
- [`packages/shared-entitlements/src/entitlements-lookup.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/entitlements-lookup.types.ts)
- [`packages/shared-entitlements/src/entitlements.module.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/entitlements.module.ts)
- [`packages/shared-entitlements/src/entitlements.tokens.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/entitlements.tokens.ts)
- [`packages/shared-entitlements/src/helpers.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/helpers.ts)
- [`packages/shared-entitlements/src/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/index.ts)
- [`packages/shared-entitlements/src/model-authorization.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/model-authorization.ts)
- [`packages/shared-entitlements/src/payg-credit-exhausted.error.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/payg-credit-exhausted.error.ts)
- [`packages/shared-entitlements/src/payg-meter.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/payg-meter.ts)
- [`packages/shared-entitlements/src/payg-meter.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/payg-meter.types.ts)
- [`packages/shared-entitlements/src/permission.guard.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/permission.guard.ts)
- [`packages/shared-entitlements/src/require-permissions.decorator.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/require-permissions.decorator.ts)
- [`packages/shared-entitlements/src/types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/types.ts)
- [`packages/shared-entitlements/src/vitest-globals.d.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/src/vitest-globals.d.ts)
- [`packages/shared-entitlements/tsconfig.build.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/tsconfig.build.json)
- [`packages/shared-entitlements/tsconfig.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/tsconfig.json)
- [`packages/shared-entitlements/vitest.config.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/vitest.config.ts)
