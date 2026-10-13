# Package: @claw/shared-auth

> **Workspace:** `packages/shared-auth`

## Purpose and ownership

Owner rules: `rules/14-shared-packages.md` and `context/package-boundaries.md`. The package's agent guide (commands, dependencies, what to read before editing) is generated: `packages/shared-auth/AGENTS.md`.

## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **11**
- Internal dependencies: `@claw/shared-types`, `@claw/shared-utilities`

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

- [`packages/shared-auth/AGENTS.md`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/AGENTS.md)
- [`packages/shared-auth/package.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/package.json)
- [`packages/shared-auth/src/__tests__/auth.guard.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/src/__tests__/auth.guard.spec.ts)
- [`packages/shared-auth/src/auth.guard.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/src/auth.guard.ts)
- [`packages/shared-auth/src/decorators.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/src/decorators.ts)
- [`packages/shared-auth/src/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/src/index.ts)
- [`packages/shared-auth/src/roles.guard.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/src/roles.guard.ts)
- [`packages/shared-auth/src/vitest-globals.d.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/src/vitest-globals.d.ts)
- [`packages/shared-auth/tsconfig.build.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/tsconfig.build.json)
- [`packages/shared-auth/tsconfig.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/tsconfig.json)
- [`packages/shared-auth/vitest.config.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/vitest.config.ts)
