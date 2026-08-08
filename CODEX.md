# ClawAI — Codex router

Compact router for OpenAI Codex. This file does not duplicate policy — it routes you
to canonical sources. **Canonical wins on conflict** (see below).

## Identity

ClawAI: 17 NestJS services + Next.js 16 frontend + 6 shared packages (npm
workspaces). RabbitMQ `claw.events`; nginx proxies `/api/v1/*`.

## Canonical authority (higher wins)

1. `CLAUDE.md` 2. `rules/00-non-negotiable-rules.md` 3. `context/architecture-map.md`
2. `context/stack-and-toolchain.md` 5. numbered `rules/*` → `skills/*` → `context/*` + `memory/*`
3. generated `.ai/manifests/*` 7. compact routers (this file)

## First command (always)

```bash
npm run knowledge:context -- --task="<your task>"
```

Then read `.ai/local/current-context.md`. Compact bootstrap: `.ai/BOOTSTRAP.md`.

## Validation (touched folders only)

```bash
npm run affected:list
cd <workspace> && npm run typecheck && npm run lint && npm test && npm run build
```

Release: `npm run release:preflight`.

## Absolute prohibitions

- NEVER bypass git hooks (`--no-verify`). NEVER suppress lint/types
  (`eslint-disable`, `@ts-ignore`, `any`, `as unknown as`).
- NEVER cross a service DB boundary (use HTTP/RabbitMQ); no logic in controllers;
  no DB calls outside repositories; no `process.env` outside AppConfig; no `console.log`.
- NEVER log/expose secrets. NEVER add text without i18n (13 locales). NEVER add code without a test.
- Do NOT invent repository facts — derive them from `.ai/manifests/` and real code.

## Codex emphasis

- Prefer **small, scoped diffs** over broad rewrites: the gate lane is per-workspace,
  and a diff spanning six workspaces forfeits that and takes minutes per iteration.
- The repository is strict by configuration, not by convention. Read the touched
  workspace`s `eslint.config.mjs` before writing — banned syntax, inline-declaration
  bans, and file/method size ceilings are enforced, and discovering them after the
  fact means reshaping working code.
- Extend the existing seam rather than adding a parallel one. When a concern is
  already solved somewhere (auth pipeline, event bus, SSE progress, repository
  pattern), the answer is almost always to widen it.

_This file was 127 kB of duplicated policy. It is now a router; canonical bodies
live in `rules/`, `skills/`, `context/` and `docs/`, with `CLAUDE.md` as the index._

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
