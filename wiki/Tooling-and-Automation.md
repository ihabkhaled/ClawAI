# Tooling and Automation

`tools/` is a production part of the engineering system, not a miscellaneous scripts folder. It currently contains **69 files**.

## Major tool families

- **Affected workspace engine** — calculates which npm workspaces a change actually touches and powers scoped CI.
- **Knowledge system** — builds manifests/packs/workspace agent files, classifies tasks, resolves context, checks coverage, verifies links and freshness.
- **Audit system** — produces and verifies repository inventory snapshots.
- **Release tooling** — preflight checks, migration orchestration, release notes, versioning, workspace gates and versioned seeding.
- **Gate receipts** — avoids paying twice for the same already-proven staged tree.
- **Format ratchet** — prevents formatting debt from silently expanding.
- **TypeScript tooling** — wraps the repository's TypeScript 7/tsgo execution and Prisma-generated type copies.
- **IndexNow** — search-engine submission support.
- **AI runner** — repository-aware AI execution entrypoint.
- **Tool tests** — dozens of tests cover CI selection, Docker contracts, releases, generated knowledge, deployment, runtime V2, package boundaries and security assumptions.

## Root commands

| Command | Implementation |
|---|---|
| `npm run affected:build` | `node tools/affected/index.mjs build` |
| `npm run affected:lint` | `node tools/affected/index.mjs lint` |
| `npm run affected:list` | `node tools/affected/index.mjs list` |
| `npm run affected:test` | `node tools/affected/index.mjs test` |
| `npm run affected:typecheck` | `node tools/affected/index.mjs typecheck` |
| `npm run ai:benchmark` | `node tools/knowledge/benchmark.mjs` |
| `npm run ai:check` | `node tools/ai/run.mjs --` |
| `npm run ai:context` | `node tools/knowledge/context.mjs` |
| `npm run ai:doctor` | `node tools/knowledge/doctor.mjs` |
| `npm run architecture:check` | `node --test "eslint/architecture-plugin/__tests__/*.test.mjs"` |
| `npm run audit` | `node tools/audit/index.mjs` |
| `npm run audit:check` | `node tools/audit/index.mjs --check` |
| `npm run build` | `npm run build --workspaces --if-present` |
| `npm run build:frontend` | `npm run build --workspace=claw-frontend` |
| `npm run dev:frontend` | `npm run dev --workspace=claw-frontend` |
| `npm run docker:build` | `docker compose build` |
| `npm run docker:dev` | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` |
| `npm run docker:dev:down` | `docker compose -f docker-compose.yml -f docker-compose.dev.yml down` |
| `npm run docker:down` | `docker compose down` |
| `npm run docker:logs` | `docker compose logs -f` |
| `npm run docker:ps` | `docker compose ps` |
| `npm run docker:up` | `docker compose up -d` |
| `npm run docker:up:full` | `docker compose --profile local-ai up -d` |
| `npm run docker:up:gpu` | `docker compose --profile gpu up -d` |
| `npm run docs:check` | `node tools/knowledge/verify.mjs` |
| `npm run format` | `prettier --write "**/*.{ts,tsx,json,md,css}"` |
| `npm run format:baseline` | `node tools/format/ratchet.mjs baseline` |
| `npm run format:check` | `node tools/format/ratchet.mjs check` |
| `npm run gates:receipt` | `node tools/gates/receipt.mjs record` |
| `npm run gates:receipt:check` | `node tools/gates/receipt.mjs check` |
| `npm run gates:receipt:clear` | `node tools/gates/receipt.mjs clear` |
| `npm run knowledge:build` | `node tools/knowledge/build.mjs` |
| `npm run knowledge:check` | `node tools/knowledge/build.mjs --check` |
| `npm run knowledge:context` | `node tools/knowledge/context.mjs` |
| `npm run knowledge:coverage` | `node tools/knowledge/coverage.mjs` |
| `npm run knowledge:test` | `node --test "tools/__tests__/*.test.mjs"` |
| `npm run knowledge:verify` | `node tools/knowledge/verify.mjs` |
| `npm run lighthouse` | `cd apps/claw-frontend && npx --yes @lhci/cli@0.15.x autorun --config=lighthouserc.json` |
| `npm run lint` | `npm run lint --workspaces --if-present` |
| `npm run lint-staged` | `lint-staged` |
| `npm run lint:fix` | `npm run lint:fix --workspaces --if-present` |
| `npm run lint:frontend` | `npm run lint --workspace=claw-frontend` |
| `npm run migrate:all` | `node tools/release/migrate-all.mjs` |
| `npm run prepare` | `node .husky/install.mjs \|\| exit 0` |
| `npm run release:preflight` | `node tools/release/preflight.mjs` |
| `npm run release:prepare` | `npm run migrate:all && npm run seed:versioned` |
| `npm run seed:versioned` | `node tools/release/seed-versioned.mjs` |
| `npm run test` | `npm run test --workspaces --if-present` |
| `npm run test:frontend` | `npm run test --workspace=claw-frontend` |
| `npm run typecheck` | `npm run typecheck --workspaces --if-present` |
| `npm run validate:affected` | `node tools/affected/index.mjs lint && node tools/affected/index.mjs typecheck && node tools/affected/index.mjs test` |

The canonical command guide is [[Stack-and-Toolchain]].
