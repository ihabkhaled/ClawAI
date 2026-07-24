# Stack & Toolchain (CANONICAL)

> Authority level 4 — this is the **single source for "what command do I run"**.
> If another doc shows a different command, this file and the per-workspace
> `package.json` scripts win. Commands below are copied from the real
> `package.json` files, not from memory.

## The stack

| Layer    | Choice                                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime  | Node **>= 22.13.0** (Docker images run `node:26-bookworm-slim` — glibc, NOT Alpine)                                                                         |
| Backend  | NestJS **11.1**, Prisma **7.8** (Postgres) / Mongoose (Mongo), Zod **4.4**                                                                                  |
| Frontend | Next.js **16.2**, React **19.2**, TanStack Query, Zustand, Tailwind, shadcn/ui                                                                              |
| Language | TypeScript compiled by **tsgo** (`@typescript/native-preview`, the Go-native TS compiler) + **tsc-alias** for path rewriting — **NOT `tsc` / `nest build`** |
| Lint     | ESLint **9** flat config, Prettier **3.8**                                                                                                                  |
| Tests    | **jest** (backend, ts-jest), **vitest** (frontend), **playwright** (E2E)                                                                                    |
| Packages | npm workspaces (`packages/*`, `apps/*`)                                                                                                                     |

`typescript` is **aliased** to `@typescript/native-preview@beta`. Real `tsc` 6.x
still resolves transitively (ts-jest uses it). CI links the native binary with
`npm rebuild @typescript/native-preview`.

## Per-workspace scripts (the real ones)

Every backend service and shared package uses the **tsgo** toolchain. Frontend
uses Next + vitest.

### Backend service / shared package

```bash
npm run typecheck   # tsgo --noEmit
npm run lint        # eslint src/ --concurrency=4   (lint:strict adds --max-warnings 0)
npm run build       # tsgo -p tsconfig.build.json && tsc-alias -p tsconfig.build.json
npm test            # jest --passWithNoTests   (test:cov adds --coverage)
npm run dev         # tsgo build then concurrent tsgo --watch + tsc-alias --watch + nodemon dist/main.js
npm start           # node dist/main.js
```

Shared packages (`packages/shared-*`) build with `tsgo -p tsconfig.build.json`
only (no tsc-alias needed for most; see each package.json).

### Frontend (`apps/claw-frontend`)

```bash
npm run typecheck   # tsgo --noEmit
npm run lint        # eslint src/ --concurrency=4   (lint:strict adds `next lint`)
npm run build       # clear-cache then next build --turbopack
npm test            # vitest run   (test:cov adds --coverage)
npm run test:e2e    # playwright test
npm run dev         # clear-cache then next dev --turbopack --port 3000
```

> **Why tsgo, not tsc:** tsgo does not rewrite path aliases (`@app/*`,
> `@common/*`, `@modules/*`), so `tsc-alias` runs after compile to convert them
> to relative paths in `dist/`. Never substitute `tsc` or `nest build`.

## The per-folder gate lane (MANDATORY before commit)

Run the gates **only in the folder(s) you actually touched**. **Never** run the
all-workspace lint/typecheck/test/build — it regenerates 13 Prisma clients,
compiles every service, and false-fails on unchanged siblings in a fresh
worktree. Cost is the primary reason; the worktree footgun is secondary.

```bash
cd apps/claw-<service>        # or apps/claw-frontend, or packages/<pkg>
npm run typecheck             # 0 errors  (tsgo --noEmit)
npm run lint                  # 0 errors on touched files
npm test                      # all pass; coverage may not drop
npm run build                 # success
```

Multi-folder change → run the gates for **each** touched folder, never the
untouched ones. Non-workspace files (`scripts/**`, `infra/**`, plain `.mjs`) →
cheapest equivalent (`node --check <file>`, JSON validate).

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
npm run knowledge:verify    # docs/governance verification (also `npm run docs:check`)
npm run knowledge:test      # node --test over tools/__tests__/*.test.mjs
```

## Affected-workspace commands

Scope validation to what your diff actually touches (backs the per-folder lane).

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

`.github/workflows/ci.yml` runs 4 jobs — **lint → typecheck → test → build** —
with a per-package matrix. Adding a **new `packages/<name>` workspace** requires
TWO edits per job × 4 jobs: the "Build shared packages" `tsgo` line **and** the
`strategy.matrix.include` entry. Missing the matrix entry means the package is
silently never lint/typecheck/tested in CI.

## What to never do (toolchain blockers)

- Never run the all-workspace gate for a scoped change — use the per-folder lane.
- Never `--no-verify` to bypass a real failure.
- Never `eslint-disable` / `@ts-ignore` / `any` / `as unknown as`.
- Never substitute `tsc` or `nest build` for `tsgo` + `tsc-alias`.
- Never start the stack with raw `docker compose -f …` — use `scripts/claw.sh`.
