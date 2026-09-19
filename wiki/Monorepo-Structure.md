# Monorepo Structure

| Top-level path | Tracked files |
| --- | --- |
| `apps` | 7134 |
| `docs` | 582 |
| `packages` | 338 |
| `work` | 96 |
| `skills` | 77 |
| `tools` | 69 |
| `rules` | 62 |
| `agent-cli` | 53 |
| `scripts` | 35 |
| `.ai` | 33 |
| `agents` | 25 |
| `context` | 22 |
| `testing` | 16 |
| `docker` | 15 |
| `.github` | 14 |
| `memory` | 13 |
| `eslint` | 8 |
| `infra` | 7 |
| `qa` | 7 |
| `.husky` | 4 |
| `.aiignore` | 1 |
| `.cursorrules` | 1 |
| `.dockerignore` | 1 |
| `.env.example` | 1 |
| `.gitattributes` | 1 |
| `.gitignore` | 1 |
| `.gitmodules` | 1 |
| `.lintstagedrc.cjs` | 1 |
| `.npmrc` | 1 |
| `.prettierignore` | 1 |
| `.prettierrc` | 1 |
| `AGENTS.md` | 1 |
| `CLAUDE.md` | 1 |
| `CODEX.md` | 1 |
| `DEEPSEEK.md` | 1 |
| `GEMINI.md` | 1 |
| `GLM.md` | 1 |
| `KIMI.md` | 1 |
| `LICENSE` | 1 |
| `MISTRAL.md` | 1 |
| `QWEN.md` | 1 |
| `README.md` | 1 |
| `RUNTIME-AGENT-FIXES.md` | 1 |
| `STREAMING_AUDIT.md` | 1 |
| `commitlint.config.cjs` | 1 |
| `cursor.md` | 1 |
| `eslint.config.mjs` | 1 |
| `package-lock.json` | 1 |
| `package.json` | 1 |

## Major areas
- `apps/` — frontend + backend services + Coding Agent submodule mount point.
- `packages/` — shared packages.
- `docs/` — architecture, product, ADRs, runbooks, QA and reference.
- `rules/`, `skills/`, `agents/`, `context/`, `memory/` — AI-native engineering governance.
- `.ai/` — generated manifests/bootstrap/packs.
- `work/skills/` — portable skills framework.
- `tools/` + `scripts/` — automation, release, knowledge, QA and operations.
- `docker/` + `infra/nginx/` — local/production runtime definitions.
- `testing/` + `qa/` — cross-repository standards and regression assets.
