# AI-Native Engineering OS

A governance + engineering-quality layer that makes ClawAI understandable and
safely modifiable by any human or AI coding agent — without loading the whole
repo, guessing architecture, inventing facts, or bypassing gates.

## Start here

- **Agents:** `AGENTS.md` (root router) → run `npm run knowledge:context -- --task="..."` → read `.ai/local/current-context.md`.
- **Humans:** this folder's [`00-current-state-audit.md`](00-current-state-audit.md) for the grounded baseline.

## The system

| Layer                   | Where                                                                                                                          | What it does                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Canonical policy        | `CLAUDE.md`                                                                                                                    | long-form operating policy (authority tier 1)      |
| Non-negotiables         | `rules/00-non-negotiable-rules.md`                                                                                             | hard blockers (tier 2)                             |
| Architecture / commands | `context/architecture-map.md`, `context/stack-and-toolchain.md`                                                                | structural truth + command truth (tiers 3–4)       |
| Rules                   | `rules/`                                                                                                                       | numbered domain rules, each naming its enforcement |
| Skills                  | `skills/`                                                                                                                      | bounded operational runbooks                       |
| Reviewer roles          | `agents/`                                                                                                                      | specialist review checklists                       |
| Context                 | `context/`                                                                                                                     | maps, catalogs, navigation                         |
| Memory                  | `memory/`                                                                                                                      | durable dated lessons + pitfalls                   |
| Generated facts         | `.ai/manifests/`                                                                                                               | machine-readable, derived from source              |
| Compact routers         | `AGENTS.md`, `CODEX.md`, `cursor.md`, `KIMI.md`, `GEMINI.md`, `GLM.md`, `QWEN.md`, `DEEPSEEK.md`, `MISTRAL.md`, `.cursorrules` | per-tool entrypoints that route, never mirror      |

## The tooling (real, tested, deterministic)

| Command                                           | Tool                          | Purpose                                                                      |
| ------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `npm run audit` / `audit:check`                   | `tools/audit/`                | baseline inventory + drift gate                                              |
| `npm run knowledge:build` / `:check`              | `tools/knowledge/`            | generate/verify `.ai/` (manifests, BOOTSTRAP, packs, 24 workspace AGENTS.md) |
| `npm run knowledge:context`                       | `tools/knowledge/context.mjs` | deterministic task-scoped context bundle (no external AI)                    |
| `npm run knowledge:verify` / `docs:check`         | `tools/knowledge/verify.mjs`  | freshness + links + hook-bypass + contradictions                             |
| `npm run knowledge:test`                          | `tools/__tests__/`            | tooling unit tests (determinism, extraction, resolver)                       |
| `npm run affected:list/lint/typecheck/test/build` | `tools/affected/`             | dependency-aware impact + scoped gates                                       |
| `npm run architecture:check`                      | `eslint/architecture-plugin/` | custom architecture rule tests                                               |
| `npm run release:preflight`                       | `tools/release/`              | full release gate in dependency order                                        |

Determinism: every generated file is byte-identical across runs (locale-
independent sorting, stable JSON). `knowledge:check` fails if source changed and
`.ai/` was not regenerated — so the knowledge layer cannot silently rot.

## Enforcement, not aspiration

Each rule names how it is enforced (ESLint / TS config / unit test / architecture
test / knowledge check / CI job / git hook / review checklist). The
`.github/workflows/ai-native-os.yml` CI job runs the SAME scripts developers run
locally. Git hooks (`.husky/`) run scoped, affected-aware checks and are never
bypassed — `knowledge:verify` fails on any `--no-verify` recommendation in policy.

## Delivered vs tracked

See [`00-current-state-audit.md` §10](00-current-state-audit.md). Delivered: the
full tooling layer, the generated `.ai` layer, rules/skills/agents/context/memory,
compact routers, the split-ESLint architecture module + tested plugin, hooks, CI,
SDLC/ADR/exceptions scaffolding. Tracked for later slices: the long tail of
manifests/graphs, optional semantic retrieval, repo-wide coverage ratcheting to
≥95%, and the visual/load test suites (need the running stack).
