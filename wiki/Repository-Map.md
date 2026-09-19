# Repository Map

This page maps the **entire repository surface**, including directories that are easy to miss in a normal architecture overview.

| Area         | Current files | Purpose                                                                     |
| ------------ | ------------: | --------------------------------------------------------------------------- |
| `apps/`      |          7153 | 18 backend services, frontend, and the Coding Agent gitlink                 |
| `packages/`  |           343 | Six shared npm workspaces                                                   |
| `docs/`      |           583 | Architecture, product, API, runbook, ADR, audit, risk, AI-context docs      |
| `.ai/`       |            33 | Generated manifests, bootstrap, task packs                                  |
| `rules/`     |            63 | Canonical engineering constraints                                           |
| `skills/`    |            78 | Executable engineering runbooks                                             |
| `context/`   |            22 | Canonical structural/context maps                                           |
| `memory/`    |            13 | Compounded engineering lessons                                              |
| `testing/`   |            16 | Test standards and policies                                                 |
| `agents/`    |            25 | Reviewer-role definitions                                                   |
| `tools/`     |            69 | Knowledge, audit, release, affected-workspace, formatting and other tooling |
| `scripts/`   |            35 | Install, TLS, deployment, local-runtime probes, QA lab                      |
| `docker/`    |            15 | Split compose/runtime definitions                                           |
| `infra/`     |             7 | Nginx and infrastructure configuration                                      |
| `qa/`        |             7 | Routing regression suites and prompts                                       |
| `work/`      |            96 | Extended skills/governance framework                                        |
| `agent-cli/` |            53 | Local desktop/CLI runtime and Tauri shell                                   |
| `.github/`   |            14 | CI, deployment, release, Lighthouse, contribution/security metadata         |

## Workspaces

### Backend services

| Service                                      | Port | Database   | Endpoints | Test files |
| -------------------------------------------- | ---: | ---------- | --------: | ---------: |
| [[Agent\|Service-Agent]]                     | 4015 | postgresql |        87 |         13 |
| [[Audit\|Service-Audit]]                     | 4007 | mongodb    |        15 |         21 |
| [[Auth\|Service-Auth]]                       | 4001 | postgresql |        99 |         96 |
| [[Chat\|Service-Chat]]                       | 4002 | postgresql |        49 |        153 |
| [[Client Logs\|Service-Client-Logs]]         |  env | mongodb    |         6 |          6 |
| [[Connector\|Service-Connector]]             | 4003 | postgresql |        19 |         26 |
| [[File Generation\|Service-File-Generation]] | 4013 | postgresql |         7 |          7 |
| [[File\|Service-File]]                       | 4006 | postgresql |        17 |         20 |
| [[Health\|Service-Health]]                   | 4009 | none       |         1 |          4 |
| [[Image\|Service-Image]]                     | 4012 | postgresql |         9 |         12 |
| [[Llamacpp\|Service-LlamaCpp]]               | 4017 | postgresql |        26 |         17 |
| [[Memory\|Service-Memory]]                   | 4005 | postgresql |        46 |         14 |
| [[Ollama\|Service-Ollama]]                   | 4008 | postgresql |        35 |         18 |
| [[Payment\|Service-Payment]]                 | 4018 | postgresql |        39 |        110 |
| [[Research\|Service-Research]]               | 4016 | postgresql |        17 |         31 |
| [[Service-Routing\|Routing]]                 | 4004 | postgresql |        74 |        101 |
| [[Server Logs\|Service-Server-Logs]]         |  env | mongodb    |         8 |          9 |
| [[Workspace\|Service-Workspace]]             | 4014 | postgresql |       108 |         96 |

### Shared packages

| Package                                                    | Directory                      | Internal dependencies                      |
| ---------------------------------------------------------- | ------------------------------ | ------------------------------------------ |
| [[@claw/shared-auth\|Package-Shared-Auth]]                 | `packages/shared-auth`         | @claw/shared-types, @claw/shared-utilities |
| [[@claw/shared-constants\|Package-Shared-Constants]]       | `packages/shared-constants`    | —                                          |
| [[@claw/shared-entitlements\|Package-Shared-Entitlements]] | `packages/shared-entitlements` | @claw/shared-constants, @claw/shared-types |
| [[@claw/shared-rabbitmq\|Package-Shared-Rabbitmq]]         | `packages/shared-rabbitmq`     | @claw/shared-constants, @claw/shared-types |
| [[@claw/shared-types\|Package-Shared-Types]]               | `packages/shared-types`        | —                                          |
| [[@claw/shared-utilities\|Package-Shared-Utilities]]       | `packages/shared-utilities`    | @claw/shared-constants, @claw/shared-types |

## Other root-level governance and model routers

The root includes `CLAUDE.md`, `AGENTS.md`, `CODEX.md`, `cursor.md`, `.cursorrules`, and provider-oriented router files such as `DEEPSEEK.md`, `GEMINI.md`, `GLM.md`, `KIMI.md`, `MISTRAL.md`, and `QWEN.md`. These are entrypoints into the canonical rules/context layer; they are not independent architectural sources of truth.

See [[AI-Native-Engineering-OS]] for the authority model.
