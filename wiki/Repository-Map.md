# Repository Map

This page maps the **entire repository surface**, including directories that are easy to miss in a normal architecture overview.

| Area | Current files | Purpose |
|---|---:|---|
| `apps/` | 7153 | 18 backend services, frontend, and the Coding Agent gitlink |
| `packages/` | 343 | Six shared npm workspaces |
| `docs/` | 583 | Architecture, product, API, runbook, ADR, audit, risk, AI-context docs |
| `.ai/` | 33 | Generated manifests, bootstrap, task packs |
| `rules/` | 63 | Canonical engineering constraints |
| `skills/` | 78 | Executable engineering runbooks |
| `context/` | 22 | Canonical structural/context maps |
| `memory/` | 13 | Compounded engineering lessons |
| `testing/` | 16 | Test standards and policies |
| `agents/` | 25 | Reviewer-role definitions |
| `tools/` | 69 | Knowledge, audit, release, affected-workspace, formatting and other tooling |
| `scripts/` | 35 | Install, TLS, deployment, local-runtime probes, QA lab |
| `docker/` | 15 | Split compose/runtime definitions |
| `infra/` | 7 | Nginx and infrastructure configuration |
| `qa/` | 7 | Routing regression suites and prompts |
| `work/` | 96 | Extended skills/governance framework |
| `agent-cli/` | 53 | Local desktop/CLI runtime and Tauri shell |
| `.github/` | 14 | CI, deployment, release, Lighthouse, contribution/security metadata |

## Workspaces

### Backend services

| Service | Port | Database | Endpoints | Test files |
|---|---:|---|---:|---:|
| [[Service-Agent|Agent]] | 4015 | postgresql | 87 | 13 |
| [[Service-Audit|Audit]] | 4007 | mongodb | 15 | 21 |
| [[Service-Auth|Auth]] | 4001 | postgresql | 99 | 96 |
| [[Service-Chat|Chat]] | 4002 | postgresql | 49 | 153 |
| [[Service-Client-Logs|Client Logs]] | env | mongodb | 6 | 6 |
| [[Service-Connector|Connector]] | 4003 | postgresql | 19 | 26 |
| [[Service-File-Generation|File Generation]] | 4013 | postgresql | 7 | 7 |
| [[Service-File|File]] | 4006 | postgresql | 17 | 20 |
| [[Service-Health|Health]] | 4009 | none | 1 | 4 |
| [[Service-Image|Image]] | 4012 | postgresql | 9 | 12 |
| [[Service-Llamacpp|Llamacpp]] | 4017 | postgresql | 26 | 17 |
| [[Service-Memory|Memory]] | 4005 | postgresql | 46 | 14 |
| [[Service-Ollama|Ollama]] | 4008 | postgresql | 35 | 18 |
| [[Service-Payment|Payment]] | 4018 | postgresql | 39 | 110 |
| [[Service-Research|Research]] | 4016 | postgresql | 17 | 31 |
| [[Service-Routing|Routing]] | 4004 | postgresql | 74 | 101 |
| [[Service-Server-Logs|Server Logs]] | env | mongodb | 8 | 9 |
| [[Service-Workspace|Workspace]] | 4014 | postgresql | 108 | 96 |

### Shared packages

| Package | Directory | Internal dependencies |
|---|---|---|
| [[Package-shared-auth|@claw/shared-auth]] | `packages/shared-auth` | @claw/shared-types, @claw/shared-utilities |
| [[Package-shared-constants|@claw/shared-constants]] | `packages/shared-constants` | — |
| [[Package-shared-entitlements|@claw/shared-entitlements]] | `packages/shared-entitlements` | @claw/shared-constants, @claw/shared-types |
| [[Package-shared-rabbitmq|@claw/shared-rabbitmq]] | `packages/shared-rabbitmq` | @claw/shared-constants, @claw/shared-types |
| [[Package-shared-types|@claw/shared-types]] | `packages/shared-types` | — |
| [[Package-shared-utilities|@claw/shared-utilities]] | `packages/shared-utilities` | @claw/shared-constants, @claw/shared-types |

## Other root-level governance and model routers

The root includes `CLAUDE.md`, `AGENTS.md`, `CODEX.md`, `cursor.md`, `.cursorrules`, and provider-oriented router files such as `DEEPSEEK.md`, `GEMINI.md`, `GLM.md`, `KIMI.md`, `MISTRAL.md`, and `QWEN.md`. These are entrypoints into the canonical rules/context layer; they are not independent architectural sources of truth.

See [[AI-Native-Engineering-OS]] for the authority model.
