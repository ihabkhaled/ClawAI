# Package: @claw/shared-auth

> **Workspace:** `packages/shared-auth`

## Purpose and ownership

# @claw/shared-auth — agent guide

**Type:** shared-package · **Path:** `packages/shared-auth`

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
- Depends on: @claw/shared-types, @claw/shared-utilities

## Before editing
1. `npm run knowledge:context -- --task="<task>" --service=@claw/shared-auth`
2. Read `.ai/local/current-context.md`.
3. Never cross this workspace's data boundary; never bypass hooks; never suppress lint/types.

_Generated from source. Edit the renderer, not this file._


## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **11**
- Internal dependencies: `@claw/shared-types`, `@claw/shared-utilities`

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
