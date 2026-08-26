# ClawAI — root policy

Canonical entry point for every agent. **This file is an index, not a mirror**: it
carries only what you need before you know what you are doing, plus links to the
canonical body for everything else. Rule bodies live in `rules/`, runbooks in
`skills/`, structural maps in `context/`, narrative in `docs/`.

It was 2,595 lines and 167 kB, which spent a large slice of every agent's context
window on every task and drifted out of step with the `rules/` files it duplicated.
Nothing was deleted — each section below links to the canonical home its content
moved to.

## Identity

Local-first AI orchestration platform. 18 NestJS services + Next.js 16 frontend +
6 shared packages (npm workspaces). 14 PostgreSQL (pgvector) + MongoDB + Redis +
RabbitMQ (`claw.events`, topic exchange) + Ollama. Nginx terminates TLS on 443 and
proxies `/api/v1/*` to services on 4001–4018.

Details: [`context/architecture-map.md`](context/architecture-map.md) ·
[`context/service-catalog.md`](context/service-catalog.md) ·
[`context/workspace-map.md`](context/workspace-map.md) ·
[`context/port-and-service-map.md`](context/port-and-service-map.md)

## Authority hierarchy (higher wins on conflict)

1. This file
2. [`rules/00-non-negotiable-rules.md`](rules/00-non-negotiable-rules.md) — the blockers
3. [`context/architecture-map.md`](context/architecture-map.md) + [`context/stack-and-toolchain.md`](context/stack-and-toolchain.md)
4. Numbered [`rules/*`](rules/) → [`skills/*`](skills/) → [`context/*`](context/) + `memory/*`
5. Generated `.ai/manifests/*`
6. Compact per-tool routers (`CODEX.md`, `cursor.md`, `GEMINI.md`, `KIMI.md`, `GLM.md`, `QWEN.md`, `DEEPSEEK.md`, `MISTRAL.md`, `AGENTS.md`, `.cursorrules`)

See [ADR-055](docs/13-adr/adr-055-canonical-ai-authority-hierarchy.md) and
[ADR-058](docs/13-adr/adr-058-compact-ai-routers-not-mirrors.md).

## First command, always

```bash
npm run knowledge:context -- --task="<what you are doing>"
```

Then read `.ai/local/current-context.md`. It resolves the affected workspaces,
governing rules, matching skills, reviewers, related events/permissions/env vars,
and known pitfalls for your specific task. Compact bootstrap: `.ai/BOOTSTRAP.md`.

## Work arriving as a document

A prompt pack, execution prompt, plan pack or implementation brief runs the **full
intake protocol before any code**:
[`rules/26-prompt-pack-intake-protocol.md`](rules/26-prompt-pack-intake-protocol.md).
Runbook: [`skills/execute-prompt-pack.md`](skills/execute-prompt-pack.md).

Seven steps: read the pack end to end → `knowledge:context` → read governing docs
in authority order → **audit every deliverable against the code**
(done/partial/missing; _present is not wired_ — a repository method with no callers
is scaffolding) → **review the constraint surface up front** (ESLint, TypeScript,
Prettier, coverage, security, i18n × 13, the delivery checklist, and every gate) →
write the plan and state deviations → implement.

**Policy outranks the pack.** Where they conflict, policy wins and the deviation is
stated explicitly, never applied silently.

## Absolute prohibitions

- **NEVER** bypass a git hook (`--no-verify` or any equivalent) — [ADR-061](docs/13-adr/adr-061-git-hook-policy-no-bypass.md).
- **NEVER** suppress a finding: no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `any`, `as unknown as`.
- **NEVER** cross a service database boundary — HTTP or RabbitMQ only. Each service owns its data.
- **NEVER** put business logic in a controller, a Prisma/Mongoose call outside a repository, or `process.env` outside AppConfig.
- **NEVER** use `console.log`, `==`/`!=`, `var`, or a non-null `!`.
- **NEVER** log or expose a secret, token, password, refresh token, or API key.
- **NEVER** add user-facing text without i18n in all 13 locales, as real translations.
- **NEVER** add code without a test.
- **NEVER** declare a `type`/`interface`/`enum`/module-`const` inline in a logic file — extract per [`rules/12-types-enums-constants-and-declaration-ownership.md`](rules/12-types-enums-constants-and-declaration-ownership.md).
- **NEVER** ship a change with no knowledge delta. Code alone is half a change: the
  skills, rules, docs, `context/` and `.ai/` that let the next agent act in seconds
  ship in the **same commit** — [`rules/33-knowledge-compounding-and-context-velocity.md`](rules/33-knowledge-compounding-and-context-velocity.md).
- **NEVER** re-run a gate you have already proven green over an unchanged tree, and
  never run all-workspace gates. Gate once, at the end, scoped — [`rules/34-gate-economy-and-machine-resources.md`](rules/34-gate-economy-and-machine-resources.md).

Full list with rationale: [`rules/00-non-negotiable-rules.md`](rules/00-non-negotiable-rules.md).

## Load-bearing facts that surprise people

- **TypeScript compiles with `tsgo`** (`@typescript/native-preview`) + `tsc-alias`, NOT `tsc`/`nest build`. `npm run build/typecheck/dev` already wrap it per workspace.
- **Docker images are `node:26-bookworm-slim`** (glibc), not Alpine — tsgo and llama.cpp release binaries are not musl-compatible.
- **`./scripts/claw.sh up` is the only supported way to start the stack.** It stitches the split compose files and auto-applies the right GPU overlay. Never `docker compose -f …` to bring the stack up.
- **Prices are never environment variables.** They live in `PlanPriceVersion` rows; a price change creates a new immutable version.
- **Money is integer minor units**; provider cost is integer micro-USD. Floating point is banned in every billing path.
- **`null` means unlimited, `0` means disabled.** They are not interchangeable.
- **A gateway is enabled only when its WHOLE credential set is present.** A partial set does not half-enable it. A blank value in `.env` means unset, not empty-string.
- **`t()` is not type-safe against `TranslationDictionary`.** A wrong key compiles and renders the raw key string to the user — verify the key chain exists in `i18n.types.ts` when you add a `t()` call.
- **Generated artifacts are a hard gate.** `.ai/**`, workspace `AGENTS.md`, and the inventory snapshot are generated from the tree; a stale one turns CI red for everyone. The pre-commit hook regenerates and stages them.
- **A dev container's `dist/generated/prisma` is copied, not compiled.** After a schema change, the entrypoint refreshes it; a stale copy shows up as `z.nativeEnum(undefined)` at boot.

## Validation and landing a change

```bash
npm run affected:list                    # which workspaces your change touches
cd <touched-workspace>
npx tsgo --noEmit && npm run lint && npm test && npm run build
```

Run the gates **only in the folders you touched** — never all-workspace, which is
prohibitively expensive (13 Prisma clients, every service compiled) and false-fails
on unchanged siblings.

Gate **once, at the end of a batch** — not per edit, not per commit. If those scoped
gates just proved this exact tree green, record it with `npm run gates:receipt` and the
hooks skip the duplicate pass for that tree only. The receipt is the sanctioned way
to avoid paying for the same proof twice; bypassing a hook remains prohibited under
[ADR-061](docs/13-adr/adr-061-git-hook-policy-no-bypass.md).

Then:

```bash
git add <explicit paths>                 # never -A, never .
git commit -m "<conventional commit>"    # hooks always run
git push origin <branch>                 # immediately, before the next commit
```

**One commit, one push.** `git log --oneline origin/<branch>..HEAD` must be empty
before you start the next commit.

**Large flagship work must ship in batches.** Split a gigantic feature into
coherent, independently reviewable and independently gated changes. Finish the
scoped validation lane, commit, and push each batch before continuing to code the
next batch; never accumulate an entire flagship feature as one unpushed worktree.

**Every GitHub gate must be green before a push counts as done**: CI matrix
(lint → typecheck → test → build), knowledge freshness, inventory audit,
**Lighthouse CI** (including accessibility assertions such as `color-contrast` over
every public marketing URL), and CodeQL. Release lane:
`npm run release:preflight`.

Full policy: [`rules/07-commit-rules.md`](rules/07-commit-rules.md) ·
[`rules/23-git-commits-hooks-and-release-gates.md`](rules/23-git-commits-hooks-and-release-gates.md) ·
[`skills/commit-and-push-each-change.md`](skills/commit-and-push-each-change.md)

## Delivery checklist — a feature is incomplete without these

When a change adds or renames anything, the propagation is not optional:

`.env.example` · `.env` · `scripts/install.sh` · `scripts/install.ps1` · every split
compose file (`docker/docker-compose.{dev,prod}.{databases,services,ollama}.yml`
plus the per-vendor GPU overlays) · `infra/nginx/nginx.conf` ·
`packages/shared-constants` · `packages/shared-types` ·
`apps/claw-health-service` · `.github/workflows/ci.yml` (the build step **and** the
per-package matrix, in all 4 jobs) · `scripts/install-tls.{sh,ps1}` HOSTS array ·
all 13 i18n locales + `i18n.types.ts` in the same commit · Prisma migration · seeds ·
tests · frontend types · `docs/` · this file only when a canonical rule genuinely
changes.

**And the knowledge layer, in the same commit.** A repeatable new procedure gets a
`skills/*.md`; a new constraint gets a numbered `rules/*.md`; a service change updates
its `CLAUDE.md` and `docs/04-backend/service-guide-<name>.md`; a cross-cutting decision
gets an ADR. Anything new must be reachable from its index — `npm run knowledge:coverage`
fails otherwise. Full rule:
[`rules/33-knowledge-compounding-and-context-velocity.md`](rules/33-knowledge-compounding-and-context-velocity.md).

Full checklist with rationale: [`rules/05-infra-rules.md`](rules/05-infra-rules.md) ·
[`context/environment-ownership-map.md`](context/environment-ownership-map.md) ·
[`docs/16-quality-engineering/DOCS_ENV_DOCKER_NGINX_CI_CHECKLIST.md`](docs/16-quality-engineering/DOCS_ENV_DOCKER_NGINX_CI_CHECKLIST.md)

## Where everything lives

| You need                                                        | Go to                                                                                                                                                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The blockers, in one page                                       | [`rules/00-non-negotiable-rules.md`](rules/00-non-negotiable-rules.md)                                                                                                                                |
| Rule index                                                      | [`rules/00-master-rules.md`](rules/00-master-rules.md) · [`rules/README.md`](rules/README.md)                                                                                                         |
| The 26 engineering mindsets                                     | [`rules/27-engineering-mindsets.md`](rules/27-engineering-mindsets.md)                                                                                                                                |
| Knowledge, docs and skills that ship with the code              | [`rules/33-knowledge-compounding-and-context-velocity.md`](rules/33-knowledge-compounding-and-context-velocity.md) · [`skills/grow-the-knowledge-layer.md`](skills/grow-the-knowledge-layer.md)       |
| Gate economy and machine resources                              | [`rules/34-gate-economy-and-machine-resources.md`](rules/34-gate-economy-and-machine-resources.md) · [`skills/run-gates-once-and-land.md`](skills/run-gates-once-and-land.md)                         |
| Planning gate (Phase 0 / 0g)                                    | [`rules/01-planning-rules.md`](rules/01-planning-rules.md) · [`rules/01-task-intake-and-planning.md`](rules/01-task-intake-and-planning.md)                                                           |
| Backend layering: controllers, services, managers, repositories | [`rules/02-backend-rules.md`](rules/02-backend-rules.md), [`rules/07`](rules/07-backend-controllers-and-transport.md)–[`rules/11`](rules/11-dtos-and-validation.md)                                   |
| Frontend pages, hooks, components, queries                      | [`rules/03-frontend-rules.md`](rules/03-frontend-rules.md), [`rules/04`](rules/04-nextjs-app-router.md)–[`rules/06`](rules/06-frontend-queries-and-cache.md)                                          |
| Declaration ownership (types/enums/constants)                   | [`rules/12-types-enums-constants-and-declaration-ownership.md`](rules/12-types-enums-constants-and-declaration-ownership.md)                                                                          |
| Library wrappers and adapters                                   | [`rules/13-external-library-wrappers-and-adapters.md`](rules/13-external-library-wrappers-and-adapters.md)                                                                                            |
| Shared packages and boundaries                                  | [`rules/14-shared-packages.md`](rules/14-shared-packages.md) · [`context/package-boundaries.md`](context/package-boundaries.md)                                                                       |
| Config and environment                                          | [`rules/15-configuration-and-environment.md`](rules/15-configuration-and-environment.md) · [`docs/06-data/environment-variables.md`](docs/06-data/environment-variables.md)                           |
| Auth, permissions, IDOR                                         | [`rules/16-authentication-and-authorization.md`](rules/16-authentication-and-authorization.md) · [`context/permission-map.md`](context/permission-map.md)                                             |
| Events and jobs                                                 | [`rules/17-rabbitmq-events-and-jobs.md`](rules/17-rabbitmq-events-and-jobs.md) · [`context/event-flow-map.md`](context/event-flow-map.md)                                                             |
| Billing integrity and API contracts                             | [`rules/28-billing-integrity-and-api-contracts.md`](rules/28-billing-integrity-and-api-contracts.md) · [`docs/03-architecture/billing-threat-model.md`](docs/03-architecture/billing-threat-model.md) |
| Errors, logging, redaction                                      | [`rules/18-error-handling-and-reliability.md`](rules/18-error-handling-and-reliability.md) · [`rules/19-logging-observability-and-redaction.md`](rules/19-logging-observability-and-redaction.md)     |
| i18n                                                            | [`rules/20-i18n-and-user-facing-messages.md`](rules/20-i18n-and-user-facing-messages.md)                                                                                                              |
| Security and secrets                                            | [`rules/08-security-rules.md`](rules/08-security-rules.md) · [`rules/21-security-and-secrets.md`](rules/21-security-and-secrets.md)                                                                   |
| Testing and coverage                                            | [`rules/04-testing-rules.md`](rules/04-testing-rules.md) · [`rules/22-testing-and-coverage.md`](rules/22-testing-and-coverage.md) · [`context/testing-map.md`](context/testing-map.md)                |
| Generated files and freshness                                   | [`rules/24-generated-files-and-knowledge-freshness.md`](rules/24-generated-files-and-knowledge-freshness.md) · [`context/generated-file-map.md`](context/generated-file-map.md)                       |
| Exceptions and waivers                                          | [`rules/25-exceptions-and-waivers.md`](rules/25-exceptions-and-waivers.md) · [`docs/exceptions/README.md`](docs/exceptions/README.md)                                                                 |
| Refactor discipline                                             | [`rules/09-refactor-rules.md`](rules/09-refactor-rules.md) · [`skills/09-refactor-toolkit.md`](skills/09-refactor-toolkit.md)                                                                         |
| Exact commands (build, test, prisma, docker, release)           | [`context/stack-and-toolchain.md`](context/stack-and-toolchain.md)                                                                                                                                    |
| Which task → which rules/skills/reviewers                       | [`context/task-router.md`](context/task-router.md)                                                                                                                                                    |
| Where a kind of code lives                                      | [`context/codebase-navigation.md`](context/codebase-navigation.md)                                                                                                                                    |
| Who owns which table                                            | [`context/database-ownership-map.md`](context/database-ownership-map.md)                                                                                                                              |
| Request and data flow across services                           | [`docs/03-architecture/end-to-end-data-flow.md`](docs/03-architecture/end-to-end-data-flow.md)                                                                                                        |
| Routing modes and capability classes                            | [`docs/03-architecture/routing-engine.md`](docs/03-architecture/routing-engine.md)                                                                                                                    |
| Model catalog                                                   | [`docs/03-architecture/model-catalog-architecture.md`](docs/03-architecture/model-catalog-architecture.md)                                                                                            |
| Runtime progress / SSE                                          | [`docs/03-architecture/runtime-progress.md`](docs/03-architecture/runtime-progress.md)                                                                                                                |
| Billing, subscriptions, quotas, threat model                    | [`docs/03-architecture/billing-threat-model.md`](docs/03-architecture/billing-threat-model.md)                                                                                                        |
| Nginx reference                                                 | [`docs/08-runtime-devops/nginx-reference.md`](docs/08-runtime-devops/nginx-reference.md)                                                                                                              |
| Docker, GPU overlays, rebuild procedure                         | [`docs/08-runtime-devops/docker-guide.md`](docs/08-runtime-devops/docker-guide.md) · [`skills/06-docker-toolkit.md`](skills/06-docker-toolkit.md)                                                     |
| Build system (tsgo, tsc-alias, CI)                              | [`docs/08-runtime-devops/build-system.md`](docs/08-runtime-devops/build-system.md)                                                                                                                    |
| TLS / mkcert                                                    | [`docs/08-runtime-devops/tls-setup.md`](docs/08-runtime-devops/tls-setup.md)                                                                                                                          |
| Quality-engineering lifecycle and standards                     | [`docs/16-quality-engineering/`](docs/16-quality-engineering/)                                                                                                                                        |
| Something is broken — runbooks                                  | [`docs/11-runbooks/README.md`](docs/11-runbooks/README.md)                                                                                                                                            |
| Architecture decisions                                          | [`docs/13-adr/adr-index.md`](docs/13-adr/adr-index.md)                                                                                                                                                |
| Per-service deep dive                                           | `docs/04-backend/service-guide-<name>.md` · `apps/claw-<name>/CLAUDE.md`                                                                                                                              |
| Skill runbooks (scaffold, debug, QA, DB, events)                | [`skills/00-index.md`](skills/00-index.md)                                                                                                                                                            |

## Per-workspace rules still apply

Every service carries its own `CLAUDE.md` plus a generated `AGENTS.md` with
service-local constraints — chat-service's universal token-deduction chokepoint,
payment-service's card-data prohibitions, llamacpp's Debian requirement, and so on.
Read the one for the service you are touching. It is not duplicated here.

## Honest status

Where something is partially built, the docs say so rather than implying
completeness. Report the same way: if a step was skipped, say it was skipped; if a
test fails, show the output. "Done" means gated, committed, pushed, and green.

## Communication style (MANDATORY)

**Short. Plain. Concrete.** A few lines max.

- Blocked? One line: `Blocked: <the actual thing>.`
- Working? `Working — <what>.` Progress? `~70/100.`
- Name the concrete cause: file, symbol, exact error. Never circle the problem.
- Easy words over complex ones. Cut every reply in half before sending.

Full rule: [`rules/29-communication-style.md`](rules/29-communication-style.md) ·
Runbook: [`skills/communicate-briefly.md`](skills/communicate-briefly.md)

**Stay foreground / keep streaming.** Do not go silent — silence reads as stopped.
Foreground commands by default; background only for long jobs, announced in one line.

**Show every step.** One short line per action as it happens — file changed, patch applied,
test run, trial failed. Never batch and report at the end.

**Granularity:** report every file touched, every patch (including failures), every command and
its result, every test count, every retry, every mini-operation, every wait. One line each.
