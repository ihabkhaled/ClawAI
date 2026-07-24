# ClawAI — DeepSeek router

Compact router for DeepSeek. This file does not duplicate policy — it routes you
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
- NEVER log/expose secrets. NEVER add text without i18n (9 locales). NEVER add code without a test.
- Do NOT invent repository facts — derive them from `.ai/manifests/` and real code.

## DeepSeek emphasis

- Prefer small, responsibility-based changes; validate each slice. Keep to the
  layer you're in (controller/service/repository) — the layering rules are in
  `rules/07-backend-controllers-and-transport.md` … `rules/10-repositories-and-persistence.md`.

_See `AGENTS.md` for the full router. Detail lives in the canonical sources._
