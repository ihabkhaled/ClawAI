# Package: @claw/shared-constants

> **Workspace:** `packages/shared-constants`

## Purpose and ownership

# @claw/shared-constants — agent guide

**Type:** shared-package · **Path:** `packages/shared-constants`

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

## Before editing
1. `npm run knowledge:context -- --task="<task>" --service=@claw/shared-constants`
2. Read `.ai/local/current-context.md`.
3. Never cross this workspace's data boundary; never bypass hooks; never suppress lint/types.

_Generated from source. Edit the renderer, not this file._


## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **19**
- Internal dependencies: none

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

- [`packages/shared-constants/AGENTS.md`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/AGENTS.md)
- [`packages/shared-constants/package.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/package.json)
- [`packages/shared-constants/src/billing.constants.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/billing.constants.spec.ts)
- [`packages/shared-constants/src/billing.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/billing.constants.ts)
- [`packages/shared-constants/src/country-currency.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/country-currency.constants.ts)
- [`packages/shared-constants/src/display-currency.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/display-currency.constants.ts)
- [`packages/shared-constants/src/feedback.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/feedback.constants.ts)
- [`packages/shared-constants/src/index.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/index.spec.ts)
- [`packages/shared-constants/src/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/index.ts)
- [`packages/shared-constants/src/payg-credit.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/payg-credit.constants.ts)
- [`packages/shared-constants/src/research-progress.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/research-progress.constants.ts)
- [`packages/shared-constants/src/router-trace-events.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/router-trace-events.constants.ts)
- [`packages/shared-constants/src/runtime-progress-events.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/runtime-progress-events.constants.ts)
- [`packages/shared-constants/src/timezone-country.constants.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/timezone-country.constants.spec.ts)
- [`packages/shared-constants/src/timezone-country.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/timezone-country.constants.ts)
- [`packages/shared-constants/src/vitest-globals.d.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/src/vitest-globals.d.ts)
- [`packages/shared-constants/tsconfig.build.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/tsconfig.build.json)
- [`packages/shared-constants/tsconfig.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/tsconfig.json)
- [`packages/shared-constants/vitest.config.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/vitest.config.ts)
