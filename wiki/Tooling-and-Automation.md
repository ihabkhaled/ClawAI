# Tooling and Automation

`tools/` is a production part of the engineering system, not a miscellaneous scripts folder.

## Major tool families

- **Affected workspace engine** — calculates which npm workspaces a change actually touches and powers scoped CI.
- **Knowledge system** — builds manifests/packs/workspace agent files, classifies tasks, resolves context, checks coverage, verifies links and freshness.
- **Audit system** — produces and verifies repository inventory snapshots.
- **Release tooling** — preflight checks, migration orchestration, release notes, versioning, workspace gates and versioned seeding.
- **Gate receipts** — avoids paying twice for the same already-proven staged tree.
- **Format ratchet** — prevents formatting debt from silently expanding.
- **TypeScript tooling** — runs the TypeScript 7 compiler (the `typescript7` alias, through `tools/typescript/run-ts7.mjs`) and copies Prisma-generated clients into `dist/`.
- **IndexNow** — search-engine submission support.
- **AI runner** — repository-aware AI execution entrypoint.
- **Tool tests** — dozens of tests cover CI selection, Docker contracts, releases, generated knowledge, deployment, runtime V2, package boundaries and security assumptions.

## Root commands

Every root `npm run` script, from the root `package.json`:

| Command                            | Implementation                                                                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run affected:build`           | `node tools/affected/index.mjs build`                                                                                                                     |
| `npm run affected:lint`            | `node tools/affected/index.mjs lint`                                                                                                                      |
| `npm run affected:list`            | `node tools/affected/index.mjs list`                                                                                                                      |
| `npm run affected:root-checks`     | `node tools/affected/index.mjs root-checks`                                                                                                               |
| `npm run affected:shared-build`    | `node tools/affected/index.mjs shared-build`                                                                                                              |
| `npm run affected:test`            | `node tools/affected/index.mjs test`                                                                                                                      |
| `npm run affected:typecheck`       | `node tools/affected/index.mjs typecheck`                                                                                                                 |
| `npm run ai:benchmark`             | `node tools/knowledge/benchmark.mjs`                                                                                                                      |
| `npm run ai:check`                 | `node tools/ai/run.mjs --`                                                                                                                                |
| `npm run ai:context`               | `node tools/knowledge/context.mjs`                                                                                                                        |
| `npm run ai:doctor`                | `node tools/knowledge/doctor.mjs`                                                                                                                         |
| `npm run architecture:check`       | `node --test "eslint/architecture-plugin/__tests__/*.test.mjs"`                                                                                           |
| `npm run audit`                    | `node tools/audit/index.mjs`                                                                                                                              |
| `npm run audit:check`              | `node tools/audit/index.mjs --check`                                                                                                                      |
| `npm run build`                    | `npm run build --workspaces --if-present`                                                                                                                 |
| `npm run build:frontend`           | `npm run build --workspace=claw-frontend`                                                                                                                 |
| `npm run dev:frontend`             | `npm run dev --workspace=claw-frontend`                                                                                                                   |
| `npm run docs:check`               | `node tools/knowledge/verify.mjs`                                                                                                                         |
| `npm run docs:checks`              | `node tools/knowledge/docs-checks.mjs all`                                                                                                                |
| `npm run docs:impact`              | `node tools/knowledge/docs-impact.mjs`                                                                                                                    |
| `npm run docs:refs`                | `node tools/knowledge/docs-checks.mjs refs`                                                                                                               |
| `npm run wiki:render`              | `node tools/knowledge/render-wiki.mjs`                                                                                                                    |
| `npm run coverage:changed-lines`   | `node tools/coverage/changed-lines.mjs`                                                                                                                   |
| `npm run coverage:measure`         | `node tools/coverage/measure.mjs`                                                                                                                         |
| `npm run coverage:raise-floors`    | `node tools/coverage/thresholds.mjs raise-floors`                                                                                                         |
| `npm run coverage:thresholds`      | `node tools/coverage/thresholds.mjs check`                                                                                                                |
| `npm run format`                   | `prettier --write "**/*.{ts,tsx,json,md,css}"`                                                                                                            |
| `npm run format:baseline`          | `node tools/format/ratchet.mjs baseline`                                                                                                                  |
| `npm run format:check`             | `node tools/format/ratchet.mjs check`                                                                                                                     |
| `npm run qa:evidence:new`          | `node tools/qa/evidence.mjs new`                                                                                                                          |
| `npm run qa:evidence:check`        | `node tools/qa/evidence.mjs check`                                                                                                                        |
| `npm run qa:evidence:lanes`        | `node tools/qa/evidence.mjs lanes`                                                                                                                        |
| `npm run gates:receipt`            | `node tools/affected/index.mjs gates`                                                                                                                     |
| `npm run gates:receipt:show`       | `node tools/gates/receipt.mjs show`                                                                                                                       |
| `npm run gates:receipt:clear`      | `node tools/gates/receipt.mjs clear`                                                                                                                      |
| `npm run knowledge:build`          | `node tools/knowledge/build.mjs`                                                                                                                          |
| `npm run knowledge:check`          | `node tools/knowledge/build.mjs --check`                                                                                                                  |
| `npm run knowledge:context`        | `node tools/knowledge/context.mjs`                                                                                                                        |
| `npm run knowledge:coverage`       | `node tools/knowledge/coverage.mjs`                                                                                                                       |
| `npm run knowledge:test`           | `node --test "tools/__tests__/*.test.mjs"`                                                                                                                |
| `npm run knowledge:test:fast`      | `node --test --test-skip-pattern="^end-to-end rehearsal:" "tools/__tests__/*.test.mjs"`                                                                   |
| `npm run knowledge:test:rehearsal` | `node --test --test-name-pattern="^end-to-end rehearsal:" tools/__tests__/deploy-prod.test.mjs`                                                           |
| `npm run knowledge:verify`         | `node tools/knowledge/verify.mjs`                                                                                                                         |
| `npm run lighthouse`               | Lighthouse CI (`@lhci/cli` 0.15.x) with `apps/claw-frontend/lighthouserc.json` — CI runs the same version, sharded, in `.github/workflows/lighthouse.yml` |
| `npm run lint`                     | `npm run lint --workspaces --if-present`                                                                                                                  |
| `npm run lint-staged`              | `lint-staged`                                                                                                                                             |
| `npm run lint:fix`                 | `npm run lint:fix --workspaces --if-present`                                                                                                              |
| `npm run lint:baseline`            | `node tools/lint/ratchet.mjs baseline`                                                                                                                    |
| `npm run lint:frontend`            | `npm run lint --workspace=claw-frontend`                                                                                                                  |
| `npm run lint:ratchet`             | `node tools/lint/ratchet.mjs check`                                                                                                                       |
| `npm run security:audit`           | `node tools/security/npm-audit.mjs`                                                                                                                       |
| `npm run security:secrets`         | `node tools/gates/secret-scan.mjs`                                                                                                                        |
| `npm run migrate:all`              | `node tools/release/migrate-all.mjs`                                                                                                                      |
| `npm run prepare`                  | `node .husky/install.mjs \|\| exit 0`                                                                                                                     |
| `npm run release:preflight`        | `node tools/release/preflight.mjs`                                                                                                                        |
| `npm run release:prepare`          | `npm run migrate:all && npm run seed:versioned`                                                                                                           |
| `npm run seed:versioned`           | `node tools/release/seed-versioned.mjs`                                                                                                                   |
| `npm run test`                     | `npm run test --workspaces --if-present`                                                                                                                  |
| `npm run test:frontend`            | `npm run test --workspace=claw-frontend`                                                                                                                  |
| `npm run typecheck`                | `npm run typecheck --workspaces --if-present`                                                                                                             |
| `npm run validate:affected`        | `node tools/affected/index.mjs lint && node tools/affected/index.mjs typecheck && node tools/affected/index.mjs test`                                     |

The `docker:*` scripts in the root `package.json` call `docker compose` against a root `docker-compose.yml` that no longer exists, so they are left out. Start, stop and inspect the stack with `./scripts/claw.sh` — see [[Docker and Containers|Docker-and-Containers]].

The canonical command guide is [[Stack-and-Toolchain]].
