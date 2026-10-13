# Package: @claw/shared-constants

> **Workspace:** `packages/shared-constants`

## Purpose and ownership

Owner rules: `rules/14-shared-packages.md` and `context/package-boundaries.md`. The package's agent guide (commands, dependencies, what to read before editing) is generated: `packages/shared-constants/AGENTS.md`.

## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **19**
- Internal dependencies: none

## Scripts

| Script       | Command                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `typecheck`  | `node ../../tools/typescript/run-ts7.mjs --noEmit`                                                      |
| `build`      | `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json && tsc-alias -p tsconfig.build.json -f` |
| `lint`       | `eslint src/ --concurrency=4`                                                                           |
| `lint:fix`   | `eslint src/ --fix`                                                                                     |
| `test`       | `vitest run` (an empty suite fails)                                                                     |
| `test:watch` | `vitest`                                                                                                |

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
