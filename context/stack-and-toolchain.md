# Stack & Toolchain (CANONICAL)

> Authority level 4 — this is the **single source for "what command do I run"**.
> If another doc shows a different command, this file and the per-workspace
> `package.json` scripts win. Commands below are copied from the real
> `package.json` files, not from memory.

## The stack

| Layer    | Choice                                                                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime  | Node **>= 22.13.0** (Docker images run `node:26-bookworm-slim` — glibc, NOT Alpine)                                                                                                             |
| Backend  | NestJS **11.1**, Prisma **7.8** (Postgres) / Mongoose (Mongo), Zod **4.4**                                                                                                                      |
| Frontend | Next.js **16.2**, React **19.2**, TanStack Query, Zustand, Tailwind, shadcn/ui                                                                                                                  |
| Language | TypeScript compiled by **TypeScript 7** (the Go-native compiler: the `typescript7` alias, run through `tools/typescript/run-ts7.mjs`) + **tsc-alias** for path rewriting — **NOT `nest build`** |
| Lint     | ESLint **9** flat config, Prettier **3.8**                                                                                                                                                      |
| Tests    | **vitest** (every workspace, backend via `unplugin-swc`), **playwright** (E2E) — ADR-099                                                                                                        |
| Packages | npm workspaces (`packages/*`, `apps/*`)                                                                                                                                                         |

Root `overrides` pins audited transitive dependencies across the workspace.
`multer` is pinned to `^2.5.0`, the fixed release for the pending-file-filter
denial-of-service advisory; verify with `node tools/security/npm-audit.mjs`.

Two TypeScript versions coexist on purpose: `typescript7` (`npm:typescript@7.x`,
a root devDependency) is the compiler every build and typecheck runs, through
`tools/typescript/run-ts7.mjs`; `typescript` 6.x stays for tools that import the
TypeScript JS API (typescript-eslint, editors). CI's setup job checks the
compiler with `node tools/typescript/run-ts7.mjs --version`. Full reference:
[docs/08-runtime-devops/build-system.md](../docs/08-runtime-devops/build-system.md).

## Per-workspace scripts (the real ones)

Every backend service and shared package compiles with **TypeScript 7**
(`run-ts7.mjs`) + `tsc-alias`. Frontend uses Next + vitest.

### Backend service / shared package

```bash
npm run typecheck   # node ../../tools/typescript/run-ts7.mjs --noEmit --incremental …
npm run lint        # eslint src/ --concurrency=4 --cache   (lint:strict adds --max-warnings 0)
npm run build       # run-ts7.mjs -p tsconfig.build.json [&& copy-generated-prisma.mjs] && tsc-alias -p tsconfig.build.json -f
npm test            # vitest run — an empty suite fails   (test:cov = vitest run --coverage)
npm run dev         # nodemon: on every src/ change, npm run build && node dist/main.js
npm start           # node dist/main.js
```

Shared packages (`packages/shared-*`) build with
`run-ts7.mjs -p tsconfig.build.json && tsc-alias -p tsconfig.build.json -f`
(see each package.json).

### Frontend (`apps/claw-frontend`)

```bash
npm run typecheck   # apps/claw-frontend/scripts/typecheck-ts7.mjs --noEmit … (TypeScript 7)
npm run lint        # eslint src/ --concurrency=4 --cache   (lint:strict adds `next lint`)
npm run build       # clear-cache then next build --turbopack
npm test            # vitest run   (test:cov adds --coverage)
npm run test:e2e    # playwright test
npm run dev         # clear-cache then next dev --turbopack --port 3000
```

> **Why tsc-alias:** the compiler does not rewrite path aliases (`@app/*`,
> `@common/*`, `@modules/*`), so `tsc-alias -f` runs after compile to convert them
> to relative paths (with `.js` extensions) in `dist/`. Never substitute `nest build`.

## Landing a change — the hooks are the gate lane

Do not run lint, typecheck, test and build by hand. Commit and push; the hooks
run the gates the change type needs, scoped to what changed, and CI runs the
rest:

```bash
npm run affected:list                    # what your diff touches, and why
git add <explicit paths>                 # never -A, never .
git commit -m "<type>(<scope>): <subject>" -m "Docs: updated <what>"   # pre-commit + commit-msg
git push origin <branch>                 # pre-push; then CI
```

Which gate runs for which change type:
[rules/23 — gate matrix](../rules/23-git-commits-hooks-and-release-gates.md#gate-matrix-by-change-type).
**Never** run the all-workspace lint/typecheck/test/build for a scoped change —
it regenerates <!-- count:prismaClients -->17<!-- /count --> Prisma clients and compiles every service
([rules/34](../rules/34-gate-economy-and-machine-resources.md)). Want one proof up
front instead of two hook runs? `npm run gates:receipt` after staging.

**Never `--no-verify` to bypass a real failure**, and never suppress errors
(`eslint-disable`, `@ts-ignore`, `any`, `as unknown as`). These are blockers
(`.ai/BOOTSTRAP.md`, `rules/00-non-negotiable-rules.md`).

## Knowledge OS commands

The AI-native engineering OS. Run the context resolver **before touching code**.

```bash
# 1. Classify your task and write .ai/local/current-context.md (gitignored)
npm run knowledge:context -- --task="<what you are doing>"
#    then READ .ai/local/current-context.md

# Other knowledge tools
npm run knowledge:build     # regenerate .ai/ manifests + BOOTSTRAP + packs
npm run knowledge:check     # verify generated knowledge is up to date
npm run knowledge:verify    # docs and governance verification (also `npm run docs:check`)
npm run knowledge:test      # node --test over tools/__tests__/*.test.mjs
```

## Affected-workspace commands

Scope validation to what your diff actually touches (the hooks use the same engine).

```bash
npm run affected:list        # what your diff touches + why
npm run affected:lint
npm run affected:typecheck
npm run affected:test
npm run affected:build
npm run validate:affected    # affected lint + typecheck + test in sequence
```

## Release preflight

```bash
npm run release:preflight    # full pre-release validation (tools/release/preflight.mjs)
```

## Audit

```bash
npm run audit                # node tools/audit/index.mjs
npm run audit:check          # --check mode
```

## Prisma (per PostgreSQL service)

Run inside the service directory (e.g. `apps/claw-chat-service`):

```bash
npm run prisma:generate      # prisma generate
npm run migrate:dev          # prisma migrate dev   (creates a migration)
npm run migrate              # prisma migrate deploy (applies in entrypoint)
npm run db:reset             # prisma migrate reset --force
```

Schema changes require a **container rebuild** (migration runs in the
entrypoint). See [database-ownership-map.md](database-ownership-map.md).

## Docker — `scripts/claw.sh` is THE entrypoint

Do **not** invoke `docker compose -f …` directly. `claw.sh` stitches the split
compose files and auto-applies the right GPU overlay.

```bash
./scripts/claw.sh up                 # dev (default), API-only, auto-GPU
./scripts/claw.sh --local-ai up      # dev + full local-AI runtime (Ollama/llama.cpp/ComfyUI/SD)
./scripts/claw.sh --prod up          # production
./scripts/claw.sh down               # stop all
./scripts/claw.sh status             # health of all groups
./scripts/claw.sh logs chat-service  # follow one service's logs
./scripts/claw.sh services:rebuild   # full stop → rm → rmi → build cycle
./scripts/claw.sh gpu                 # probe GPU detection only
```

The `local-ai` compose **profile** gates the heavy runtimes (ollama-service,
llamacpp-service, Ollama, ComfyUI, Stable Diffusion, pg-ollama, pg-llamacpp).
Default is API-only. Split compose files are enumerated in
`.ai/manifests/docker-services.json`.

> **Rebuild procedure (never skip a step):** stop → `rm -f` → `docker rmi` →
> `up -d --build`. Restarting or `--build` alone leaves stale compiled code and
> node_modules. When a shared package changes, every dependent container needs
> the full cycle.

## CI

`.github/workflows/ci.yml`: a `changes` job computes the **affected** matrix
(`node tools/affected/index.mjs ci-matrix`); a `setup` job installs once, builds
the shared packages in dependency order (`node tools/affected/index.mjs shared-build`,
order derived from each `package.json`) and generates every Prisma client; then
`static` (lint ratchet + typecheck), `test` (+ coverage floors), `build`,
`policy`, `secrets`, `codeql` and the rest run per affected workspace. A new
workspace needs no hand-edited matrix entry — it joins once it is an npm
workspace. Job by job:
[docs/08-runtime-devops/ci-cd-pipeline.md](../docs/08-runtime-devops/ci-cd-pipeline.md).

## What to never do (toolchain blockers)

- Never run the all-workspace gate for a scoped change — let the hooks gate it.
- Never `--no-verify` to bypass a real failure.
- Never `eslint-disable` / `@ts-ignore` / `any` / `as unknown as`.
- Never substitute `nest build` for `run-ts7.mjs` + `tsc-alias`.
- Never start the stack with raw `docker compose -f …` — use `scripts/claw.sh`.
