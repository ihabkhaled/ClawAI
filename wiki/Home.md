# ClawAI Wiki

Welcome to the engineering and product Wiki for **ClawAI**.

This Wiki is generated from the live repository and is designed to explain the system from product intent down to concrete services, data ownership, APIs, deployment, QA, AI-agent governance, tools, and the companion Coding Agent.

## Start here

- [[Quick-Start]]
- [[System-at-a-Glance]]
- [[System-Architecture]]
- [[Backend-Services-Index]]
- [[Frontend-Architecture]]
- [[Complete-Repository-Inventory]]
- [[AI-Native-Engineering-OS]]
- [[Coding-Agent-Overview]]

## Current repository shape

- 18 NestJS backend services
- 1 Next.js frontend workspace
- 6 shared packages
- 25 npm workspaces total
- RabbitMQ event bus, PostgreSQL/MongoDB data stores, Redis, Nginx, local and hosted AI runtimes
- Dedicated research, routing, memory, file, image, agent, workspace, payment, observability, and health subsystems

## Wiki philosophy

The repository contains both human documentation and machine-generated truth. Where old prose disagrees with current generated manifests, the current manifests and canonical context layer win. Wiki pages link back to source paths so implementation and documentation can be traced together.

## Major sections

### Product and architecture
[[Product-Vision]] · [[Business-Overview]] · [[System-Architecture]] · [[Message-Flow]] · [[Data-Ownership]] · [[Security-Architecture]]

### Runtime
[[Docker-and-Local-Development]] · [[Nginx-and-API-Gateway]] · [[Environment-Variables]] · [[CI-CD-and-Releases]] · [[Production-Deployment]]

### Engineering quality
[[Testing-Strategy]] · [[QA-and-UAT]] · [[Rules-Catalog]] · [[Skills-Catalog]] · [[Reviewer-Agents]] · [[ESLint-and-Architecture-Enforcement]]

### AI-native repository operating system
[[AI-Bootstrap-and-Authority]] · [[Context-Layer]] · [[Knowledge-Manifests]] · [[Memory-Layer]] · [[Work-Skills-Framework]]

### Companion VS Code extension
[[Coding-Agent-Overview]] · [[Coding-Agent-Architecture]] · [[Coding-Agent-Security]] · [[Coding-Agent-Testing]]

---

Generated from repository state at commit `c42e24f308bb5daa824d27164e9bad0f03680c0b`.