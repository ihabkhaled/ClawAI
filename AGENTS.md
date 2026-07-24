# ClawAI — Agent Entrypoint (canonical router)

This is the compact router every AI coding agent reads first. It does **not**
copy policy — it points at the canonical sources. If a tool-specific file
(`CODEX.md`, `cursor.md`, `KIMI.md`, …) disagrees with this file or the sources
below, the canonical source wins.

## Repository identity

ClawAI — a local-first AI orchestration platform. 17 NestJS microservices + a
Next.js 16 frontend + 6 shared packages, in an npm-workspace monorepo. Events
flow over RabbitMQ (`claw.events`); nginx reverse-proxies `/api/v1/*`.

## Canonical authority (higher wins on conflict)

1. `CLAUDE.md` — long-form operating policy
2. `rules/00-non-negotiable-rules.md` — engineering blockers
3. `context/architecture-map.md` — structural architecture
4. `context/stack-and-toolchain.md` — commands + toolchain
5. Numbered `rules/*` → `skills/*` → `context/*` + `memory/*`
6. Generated `.ai/manifests/*` — machine-readable facts
7. This file and the other compact routers

## First command (before touching code)

```bash
npm run knowledge:context -- --task="<what you are about to do>"
```

Then read **`.ai/local/current-context.md`** — it names the affected
workspaces, governing rules, matching skills, reviewers, related events/env/
permissions, files to inspect, the validation lane, and known pitfalls.

Full compact bootstrap: **`.ai/BOOTSTRAP.md`** (generated, ~800 tokens).

## Where things live

- Architecture → `context/architecture-map.md` · Commands → `context/stack-and-toolchain.md`
- Service catalog → `context/service-catalog.md` (data: `.ai/manifests/services.json`)
- Rules → `rules/` · Skills → `skills/` · Reviewer roles → `agents/`
- Durable pitfalls/lessons → `memory/` · Task packs → `.ai/packs/`
- SDLC templates → `docs/features/_template/` · ADRs → `docs/13-adr/`

## Validation (touched folders only — never all 24 workspaces)

```bash
npm run affected:list                                   # what your diff touches + why
cd <workspace> && npm run typecheck && npm run lint && npm test && npm run build
```

Before release: `npm run release:preflight`.

## Absolute prohibitions (blockers)

- **NEVER** `--no-verify` or otherwise bypass git hooks.
- **NEVER** suppress lint/type errors (`eslint-disable`, `@ts-ignore`,
  `@ts-expect-error` without a documented waiver, `any`, `as unknown as`).
- **NEVER** cross a service's database boundary — use HTTP or RabbitMQ.
- **NEVER** put business logic in controllers or DB calls outside repositories.
- **NEVER** use `process.env` outside `AppConfig`; **NEVER** `console.log`.
- **NEVER** log or expose secrets/tokens/passwords.
- **NEVER** add user-facing text without i18n in all 9 locales.
- **NEVER** add code without a test.
- **DO NOT invent repository facts** — derive them from `.ai/manifests/` and the
  real code. If a fact is missing, run `knowledge:context` or read the source.

## Real code & tests

The tooling that powers this system is real and tested: `tools/audit/`,
`tools/knowledge/`, `tools/affected/`, with `tools/__tests__/*.test.mjs`
(`npm run knowledge:test`). The knowledge layer is generated — never hand-edit
anything under `.ai/` except `.ai/local/` (gitignored).

_This router is intentionally short. Detail lives in the canonical sources above._
