# ClawAI Documentation Hub

> **Local-first AI orchestration platform** — 13 NestJS microservices + Next.js frontend + 8 PostgreSQL + MongoDB + Redis + RabbitMQ + Ollama

---

## Quick Start by Role

| Role              | Start Here                                                    | Then Read                                                                                                             |
| ----------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **New Engineer**  | [Onboarding (5 min)](00-start-here/onboarding-5-minutes.md)   | [System at a Glance](00-start-here/system-at-a-glance.md) → [Backend Services](04-backend/services-index.md)          |
| **Product Owner** | [Product Vision](01-executive-context/product-vision.md)      | [Feature Inventory](02-business-product/feature-inventory.md) → [User Journeys](02-business-product/user-journeys.md) |
| **QA / Tester**   | [Testing Strategy](09-testing/testing-strategy.md)            | [UAT Guide](10-uat-acceptance/uat-guide.md) → [API Reference](12-reference/api-reference.md)                          |
| **DevOps**        | [Docker Guide](08-runtime-devops/docker-guide.md)             | [Nginx Reference](08-runtime-devops/nginx-reference.md) → [Troubleshooting](11-runbooks/troubleshooting.md)           |
| **AI Agent**      | [AI Context Pack](15-ai-context/ai-context-pack.md)           | [Codebase Navigation](15-ai-context/codebase-navigation.md) → [Services Index](04-backend/services-index.md)          |
| **Architect**     | [System Architecture](03-architecture/system-architecture.md) | [Message Flow](03-architecture/message-flow.md) → [ADRs](13-adr/adr-index.md)                                         |

---

## Documentation Map

### Layer A: Fast Context (30 seconds to 5 minutes)

| Document                                                         | Purpose                                |
| ---------------------------------------------------------------- | -------------------------------------- |
| [Documentation Index](00-start-here/README.md)                   | Navigate all docs by role and topic    |
| [System at a Glance](00-start-here/system-at-a-glance.md)        | One-page architecture, services, flows |
| [Onboarding in 5 Minutes](00-start-here/onboarding-5-minutes.md) | Setup, first run, key commands         |

### Layer B: Business & Product Context

| Document                                                       | Purpose                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| [Product Vision](01-executive-context/product-vision.md)       | Mission, goals, KPIs, positioning                       |
| [Business Overview](01-executive-context/business-overview.md) | Problem, market, personas, business rules, glossary     |
| [User Personas](02-business-product/user-personas.md)          | 5 personas with workflows and RBAC mapping              |
| [Feature Inventory](02-business-product/feature-inventory.md)  | 14 feature domains with stories and acceptance criteria |
| [User Journeys](02-business-product/user-journeys.md)          | 8 end-to-end user journeys with error paths             |

### Layer C: Technical Architecture

| Document                                                          | Purpose                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| [System Architecture](03-architecture/system-architecture.md)     | Context diagram, containers, principles, data ownership |
| [Message Flow](03-architecture/message-flow.md)                   | End-to-end message lifecycle with sequence diagram      |
| [Routing Engine](03-architecture/routing-engine.md)               | 7 routing modes, AUTO deep-dive, policies, fallback     |
| [Event Bus](03-architecture/event-bus.md)                         | RabbitMQ topology, all events, DLQ, retry strategy      |
| [Security Architecture](03-architecture/security-architecture.md) | JWT, RBAC, encryption, threat model                     |

### Layer D: Backend & Frontend

| Document                                                      | Purpose                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------- |
| [Services Index](04-backend/services-index.md)                | All 13 services: ports, DBs, controllers, events, dependencies |
| [Controllers Reference](04-backend/controllers-reference.md)  | Every route across all services                                |
| [Backend Coding Standards](04-backend/coding-standards.md)    | Layer rules, ESLint, extraction, error handling                |
| [Shared Packages](04-backend/shared-packages.md)              | shared-types, shared-constants, shared-rabbitmq, shared-auth   |
| [Frontend Architecture](05-frontend/frontend-architecture.md) | Page→Hook→Service→Repo pattern, state management, i18n         |
| [Frontend Coding Standards](05-frontend/coding-standards.md)  | 30 rules, component/hook/query patterns                        |

### Layer E: Data & Integrations

| Document                                                  | Purpose                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| [Database Reference](06-data/database-reference.md)       | All 30+ tables, fields, relationships, migrations                  |
| [Environment Variables](06-data/environment-variables.md) | All 80+ env vars with defaults and security notes                  |
| [Provider Catalog](07-integrations/provider-catalog.md)   | OpenAI, Anthropic, Gemini, DeepSeek, Ollama setup and capabilities |

### Layer F: DevOps, Testing & Operations

| Document                                                        | Purpose                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| [Docker Guide](08-runtime-devops/docker-guide.md)               | 26 containers, hot reload, startup order, troubleshooting |
| [CI/CD Pipeline](08-runtime-devops/cicd-pipeline.md)            | GitHub Actions, pre-commit hooks, quality gates           |
| [Nginx Reference](08-runtime-devops/nginx-reference.md)         | Route mappings, SSE config, security headers              |
| [Testing Strategy](09-testing/testing-strategy.md)              | Test pyramid, inventory, commands, coverage               |
| [UAT Guide](10-uat-acceptance/uat-guide.md)                     | 60+ test scenarios across 11 features                     |
| [Business Acceptance](10-uat-acceptance/business-acceptance.md) | Per-feature checklists, go-live criteria, rollback plan   |
| [Troubleshooting](11-runbooks/troubleshooting.md)               | 13 problem categories with solutions                      |
| [Operational Runbooks](11-runbooks/operational-runbooks.md)     | 10 procedures: add provider, backup, rotate secrets, etc. |

### Layer G: Reference

| Document                                                    | Purpose                                      |
| ----------------------------------------------------------- | -------------------------------------------- |
| [API Reference](12-reference/api-reference.md)              | Every endpoint: method, path, schema, errors |
| [Error Catalog](12-reference/error-catalog.md)              | 30+ error codes with retry guidance          |
| [ADR Index](13-adr/adr-index.md)                            | 10 architecture decisions with rationale     |
| [Technical Debt](14-risk-debt/technical-debt.md)            | 20 items with severity and prioritization    |
| [Risk Register](14-risk-debt/risk-register.md)              | 17 risks with scores and mitigations         |
| [AI Context Pack](15-ai-context/ai-context-pack.md)         | Optimized for AI coding agents               |
| [Codebase Navigation](15-ai-context/codebase-navigation.md) | Where to find everything                     |

---

## Legacy Docs (Pre-existing)

These documents were created during earlier architecture audits:

- [Master Audit](MASTER_AUDIT.md)
- [Backend Architecture](BACKEND_ARCHITECTURE.md)
- [Frontend Architecture](FRONTEND_ARCHITECTURE.md)
- [Routing Architecture](ROUTING_ARCHITECTURE.md)
- [Memory & Context Architecture](MEMORY_CONTEXT_ARCHITECTURE.md)
- [File Support Architecture](FILE_SUPPORT_ARCHITECTURE.md)
- [Logging & Observability](LOGGING_OBSERVABILITY_ARCHITECTURE.md)
- [Docker & DevOps](DOCKER_DEVOPS_ARCHITECTURE.md)
- [Testing & QA](TESTING_QA_ARCHITECTURE.md)
- [Security Hardening](SECURITY_HARDENING_ARCHITECTURE.md)
- [Release Readiness Scorecard](RELEASE_READINESS_SCORECARD.md)
- [Operating Rules](OPERATING_RULES.md)
- [Full Lifecycle Audit](FULL_LIFECYCLE_AUDIT.md)
- [Forward Development Plan](FORWARD_DEVELOPMENT_PLAN.md)

---

## Documentation Maintenance

- **Update trigger**: Any code change that affects architecture, APIs, config, or business rules
- **Owner**: The engineer making the change is responsible for updating relevant docs
- **CLAUDE.md**: Always the single source of truth for coding rules and development lifecycle
- **Review**: Doc updates should be part of PR review
