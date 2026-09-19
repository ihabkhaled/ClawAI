# ClawAI Coding Agent

The Coding Agent is a separate repository mounted into the monorepo as the `apps/claw-coding-agent` Git submodule.

Current extension version: **1.72.0**  
Tracked files: **1422**  
Source files: **515**  
Test files: **352**  
Documentation files: **68**

## Role

The extension is intentionally a thin, security-sensitive VS Code client. The ClawAI backend owns authentication/session rotation, entitlements, quotas, provider credentials, routing, inference, persistence and audit history. The extension owns editor UX, bounded context, safe tool execution, response rendering and reviewable/atomic edits.

## Source architecture
- `src/core/` — pure contracts, policies and runtime value logic.
- `src/services/` — application orchestration.
- `src/infrastructure/` — VS Code, Git, terminal, browser, database, container, quality and runtime adapters/tool executors.
- `src/backend/` — backend clients and contracts.
- `src/views/` + `src/webview/` — editor UI.
- `src/headless/` — headless agent surface.
- `src/sdk/` — SDK-facing surface.

## Runtime foundation

Runtime Protocol V2 provides a model-neutral, ordered and policy-controlled execution loop across workspace, commands/processes, Git, containers, databases, browser, planning, quality, journals and evidence.

## Distribution

| Area | Files |
| --- | --- |
| src | 515 |
| builds | 401 |
| tests | 352 |
| docs | 68 |
| scripts | 17 |
| l10n | 14 |
| resources | 6 |
| skills | 4 |
| .vscode | 3 |
| .github | 2 |
| media | 2 |
| schemas | 2 |
| .gitattributes | 1 |
| .gitignore | 1 |
| .prettierignore | 1 |
| .prettierrc.json | 1 |
| .superpowers | 1 |
| .vscodeignore | 1 |
| AGENTS.md | 1 |
| CHANGELOG.md | 1 |
| CLAUDE.md | 1 |
| CODE_OF_CONDUCT.md | 1 |
| CONTRIBUTING.md | 1 |
| LICENSE | 1 |
| README.md | 1 |
| SECURITY.md | 1 |
| browsers.json | 1 |
| esbuild.mjs | 1 |
| eslint.config.mjs | 1 |
| package-lock.json | 1 |
| package.json | 1 |
| package.nls.ar.json | 1 |
| package.nls.de.json | 1 |
| package.nls.es.json | 1 |
| package.nls.fa.json | 1 |
| package.nls.fr.json | 1 |
| package.nls.hi.json | 1 |
| package.nls.it.json | 1 |
| package.nls.ja.json | 1 |
| package.nls.json | 1 |
| package.nls.pt.json | 1 |
| package.nls.ru.json | 1 |
| package.nls.th.json | 1 |
| package.nls.zh.json | 1 |
| playwright.config.ts | 1 |
| playwright.vscode.config.ts | 1 |
| tsconfig.json | 1 |
| vitest.config.ts | 1 |

Source: [README.md](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/README.md) · [CLAUDE.md](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/CLAUDE.md) · [AGENTS.md](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/AGENTS.md).
