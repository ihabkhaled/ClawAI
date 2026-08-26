# ClawAI — Agent Entrypoint (canonical router)

This is the compact router every AI coding agent reads first. It does **not**
copy policy — it points at the canonical sources. If a tool-specific file
(`CODEX.md`, `cursor.md`, `KIMI.md`, …) disagrees with this file or the sources
below, the canonical source wins.

## Repository identity

ClawAI — a local-first AI orchestration platform. 18 NestJS microservices + a
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
- **NEVER** add user-facing text without i18n in all 13 locales.
- **NEVER** add code without a test.
- **DO NOT invent repository facts** — derive them from `.ai/manifests/` and the
- NEVER ship a change with no knowledge delta — docs/skills/rules/context ship in the SAME commit (rules/33).
- NEVER gate per-commit or all-workspace; gate once at the end, scoped. Never re-prove an unchanged tree (rules/34).
  real code. If a fact is missing, run `knowledge:context` or read the source.

## Real code & tests

The tooling that powers this system is real and tested: `tools/audit/`,
`tools/knowledge/`, `tools/affected/`, with `tools/__tests__/*.test.mjs`
(`npm run knowledge:test`). The knowledge layer is generated — never hand-edit
anything under `.ai/` except `.ai/local/` (gitignored).

_This router is intentionally short. Detail lives in the canonical sources above._

## Generated artifacts are a HARD GATE (never optional)

`.ai/**`, every workspace `AGENTS.md`, and
`docs/features/ai-native-engineering-os/inventory.snapshot.json` are
**generated from the tree**. CI verifies them on every push:

| CI job              | Command                    | Fails when                                                           |
| ------------------- | -------------------------- | -------------------------------------------------------------------- |
| Knowledge freshness | `npm run knowledge:check`  | a generated file's hash no longer matches the tree                   |
| Knowledge integrity | `npm run knowledge:verify` | stale file, broken link, orphan reviewer, hook-bypass, contradiction |
| Inventory audit     | `npm run audit:check`      | the inventory snapshot hash has drifted                              |

**A stale artifact turns the build red on every subsequent push**, for everyone,
until someone regenerates it. It is not a warning and it is not deferrable.

### The rule

Any commit that touches `packages/**`, `apps/**`, `infra/**`, `docker/**`,
`docs/**`, `scripts/**`, `rules/**`, `skills/**`, `tools/**` or `.env.example`
MUST regenerate and stage:

```bash
npm run knowledge:build      # rewrites .ai/** + workspace AGENTS.md
npm run audit                # rewrites the inventory snapshot
git add .ai docs/features/ai-native-engineering-os/inventory.snapshot.json
git add apps/*/AGENTS.md packages/*/AGENTS.md 2>/dev/null
npm run knowledge:verify     # what CI runs
npm run audit:check          # what CI runs
```

The pre-commit hook now does all of this **automatically**, so in normal use
there is nothing to remember. The rule is written down because the hook can be
skipped (it must not be) and because a red CI needs a documented fix.

### Order matters — regenerate AFTER formatting, never before

This is the mistake that actually caused a red build:

1. `npm run knowledge:build` — hashes the current bytes
2. `git add` / commit — **lint-staged reformats the staged files**
3. the reformatted bytes no longer match the hashes recorded in step 1
4. `knowledge:check` passes locally (it ran before the reformat) but
   `knowledge:verify` fails in CI

Generators must run **after** prettier and `eslint --fix` have settled. The
pre-commit hook is ordered that way deliberately: lint-staged is step 1,
regeneration is step 2.

### Never hand-edit a generated artifact

If a generated file is wrong, fix the **generator or its input**, then
regenerate. Editing `.ai/manifests/*.json` or a workspace `AGENTS.md` by hand is
overwritten on the next build and hides the real problem.

## Prompt packs and execution prompts (MANDATORY before any code)

When work arrives as a document — prompt pack, execution prompt, plan pack,
implementation brief — the full protocol in
[`rules/26-prompt-pack-intake-protocol.md`](rules/26-prompt-pack-intake-protocol.md)
runs BEFORE the first line of code. Runbook:
[`skills/execute-prompt-pack.md`](skills/execute-prompt-pack.md). Summary:
[`context/prompt-pack-intake.md`](context/prompt-pack-intake.md).

1. **Read the pack end to end** before acting on any of it. Section 30 routinely
   contradicts section 3.
2. **`npm run knowledge:context -- --task="…"`**, then read
   `.ai/local/current-context.md`.
3. **Read the governing docs in authority order** — root policy → non-negotiables
   → architecture/stack maps → numbered rules for the touched layers → matching
   skills → context ownership maps → per-workspace `CLAUDE.md`/`AGENTS.md` →
   `docs/` for the feature area.
4. **Audit every deliverable against the code**: done / partial / missing. A pack
   is usually handed over mid-flight, so the deliverable is the remainder. Present
   is not wired — a repository method with no callers is scaffolding.
5. **Review the constraint surface first**: ESLint flat config (banned syntax,
   inline-declaration bans, size ceilings, import order), TypeScript strict,
   Prettier, coverage floors, security (secrets/authz/IDOR/validation/redaction/CSP),
   i18n × 13 locales + `i18n.types.ts`, the `CLAUDE.md` delivery checklist (env,
   installers, every compose file, nginx, shared packages, health service, CI
   matrix, TLS SANs, docs), and the FULL gate topology: pre-commit (lint-staged →
   generated-artifact regeneration → affected typecheck), pre-push, the CI matrix
   (lint/typecheck/test/build), knowledge-freshness + inventory-audit checks,
   **Lighthouse CI** (performance/SEO/best-practices AND accessibility assertions
   such as `color-contrast` over every public marketing URL).
   **Every GitHub gate must be green before a push counts as done.** Lighthouse is
   the one most often forgotten because it fails on things that compile fine — a
   colour pair under 4.5:1, a missing landmark, an unlabelled control.
6. **Write the plan and state every deviation.** The pack does NOT outrank
   repository policy: where they conflict, policy wins and the deviation is stated
   explicitly, never applied silently.
7. **Then implement** — scoped gates per touched workspace, one gated commit per
   coherent change, each pushed before the next begins.

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
