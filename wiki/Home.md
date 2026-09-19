# ClawAI Wiki

Welcome to the **ClawAI engineering and product Wiki**. This Wiki is generated from the live repository and is intentionally broad: product behavior, architecture, every backend service, frontend, APIs, databases, AI routing, research, files, memory, payments, local runtimes, infrastructure, testing, QA, rules, skills, scripts, tooling, agent runtimes, and the separate VS Code Coding Agent.

## Current repository snapshot

- **25 npm workspaces**: 18 backend services + 1 frontend + 6 shared packages.
- **1283 test files** tracked by the generated test manifest.
- **669 API endpoints** in the generated endpoint manifest.
- **178 RabbitMQ event definitions** in the event graph.
- **355 environment variables** in the generated environment manifest.
- **59 Nginx routes** in the generated gateway manifest.
- **11,289 repository tree entries** were enumerated recursively during the Wiki audit; the inventory includes `.ai`, `.github`, `agent-cli`, `agents`, `apps`, `context`, `docker`, `docs`, `eslint`, `infra`, `memory`, `packages`, `qa`, `rules`, `scripts`, `skills`, `testing`, `tools`, `wiki`, and `work`.

## Start here

1. [[Getting-Started]]
2. [[System-at-a-Glance]]
3. [[Repository-Map]]
4. [[Architecture-Map]]
5. [[Backend-Services]]
6. [[Frontend-Architecture]]
7. [[API-Reference]]
8. [[Docker-Guide]]
9. [[Testing-Standards]]
10. [[AI-Native-Engineering-OS]]

## Deep-dive areas

- **AI orchestration:** [[Routing-Engine]], [[Provider-Catalog]], [[Memory-and-Context-Architecture]], [[File-Support-Architecture]]
- **Runtime:** [[Docker-and-DevOps-Architecture]], [[Nginx-Reference]], [[CI-CD-Pipeline]], [[Logging-and-Observability]]
- **Quality:** [[Testing-and-QA-Architecture]], [[Quality-Gates]], [[UAT-Guide]], [[Reviewer-Roles]]
- **Governance:** [[Rules-Catalog]], [[Skills-Catalog]], [[Context-Layer]], [[Engineering-Memory]]
- **Agents:** [[Agent-CLI]], [[Coding-Agent]], [[Coding-Agent-Architecture]], [[Coding-Agent-Security]]

> Source of truth remains the code and generated manifests on `main`. Wiki pages that mirror repo docs include their source path at the top.

_Last verified against `main` on 2026-09-19._
