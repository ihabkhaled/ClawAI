# AI-Native Engineering OS

ClawAI treats engineering context as a first-class system. Human contributors and coding agents are routed through the same canonical knowledge layer.

## Authority stack

1. Root policy/router files such as `CLAUDE.md`.
2. Hard blockers in `rules/00-non-negotiable-rules.md`.
3. Canonical structure in `context/architecture-map.md`.
4. Task-specific rules, skills, context, memory, service-local `AGENTS.md`, and generated manifests.
5. Implementation code and tests.

## The generated `.ai` layer

The repository currently contains **33 files under `.ai/`**. The manifests include:

- API endpoints
- data ownership
- Docker services
- environment variables
- event graph
- frontend routes
- governance
- hashes/freshness
- i18n
- Nginx routes
- packages
- permissions
- ports
- Prisma models
- RabbitMQ events
- repository metadata
- services
- tests
- workspace dependency graph
- workspaces

The pack layer includes task-oriented bundles for provider connectors, authentication/security, billing/payments, chat streaming, database migrations, documentation, frontend features, infrastructure, model routing, RabbitMQ events, and workspace connectors.

## Context-first workflow

Before engineering work, the repository expects task classification/context resolution so the contributor knows:

- affected workspaces;
- rules that govern the change;
- skills/runbooks to execute;
- likely files and tests;
- generated artifacts that must be refreshed;
- relevant pitfalls and prior lessons.

See [[Context-Layer]], [[Skills-Catalog]], [[Rules-Catalog]], [[Engineering-Memory]], and [[Stack-and-Toolchain]].
