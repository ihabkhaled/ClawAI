# ClawAI Wiki

> **Every AI, one workspace.** Every frontier AI model in one workspace that sees,
> hears, researches and builds. Pay as you go, bring your team, or run it on your
> own hardware. — [[Product Vision|Product-Vision]] · [[Flagship Features|Flagship-Features]]

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

## Product and business

- **Positioning:** [[Product Vision|Product-Vision]] (canonical) and the decision, [ADR-126](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-126-every-ai-one-workspace-positioning.md)
- **What ships:** [[Flagship Features|Flagship-Features]] — 15 flagships, each traced to code, with limits and gaps
- **Business:** [[Business Overview|Business-Overview]], and the numbers in [`docs/business/`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/business/README.md)
- **Market:** [competitive analysis](https://github.com/ihabkhaled/ClawAI/blob/main/docs/01-executive-context/competitive-analysis.md)
- **Requirements and drift:** [[Requirements Register|Requirements-Register]] · [[Drift Log|Drift-Log]]
- **Decisions and changes:** [[ADR Index|ADR-Index]] · [changelog](https://github.com/ihabkhaled/ClawAI/blob/main/docs/CHANGELOG.md)

## Deep-dive areas

- **AI orchestration:** [[Routing-Engine]], [[Provider-Catalog]], [[Memory-and-Context-Architecture]], [[File-Support-Architecture]]
- **Runtime:** [[Docker-and-DevOps-Architecture]], [[Nginx-Reference]], [[CI-CD-Pipeline]], [[Logging-and-Observability]]
- **Quality:** [[Testing-and-QA-Architecture]], [[Quality-Gates]], [[UAT-Guide]], [[Reviewer-Roles]]
- **Governance:** [[Rules-Catalog]], [[Skills-Catalog]], [[Context-Layer]], [[Engineering-Memory]]
- **Agents:** [[Agent-CLI]], [[Coding-Agent]], [[Coding-Agent-Architecture]], [[Coding-Agent-Security]]

> Source of truth remains the code and generated manifests on `main`. Wiki pages that mirror repo docs include their source path at the top.

_Last verified against `main` on 2026-09-19; product and business section 2026-09-26._
