# ClawAI Documentation Index

## What Is ClawAI?

ClawAI is a local-first AI orchestration platform that routes conversations to the best AI provider automatically. It now runs 15 NestJS backend services behind a Next.js frontend, supports 7 routing modes (from fully automatic to privacy-first), adds advanced orchestration workflows, and keeps sensitive data local via Ollama. Three roles (Admin, Operator, Viewer), eight languages, full audit trail, workspace grounding, and local agent-assisted workflows are all part of the active platform.

---

## Quick Links

| Section               | Path                         | What You'll Find                                    |
| --------------------- | ---------------------------- | --------------------------------------------------- |
| **Start Here**        | `docs/00-start-here/`        | This index, system overview, onboarding guide       |
| **Executive Context** | `docs/01-executive-context/` | Product vision, business overview, personas         |
| **Architecture**      | `docs/03-architecture/`      | System design, service topology, data flow          |
| **Backend**           | `docs/04-backend/`           | Per-service deep dives, routes, communication       |
| **Frontend**          | `docs/05-frontend/`          | Next.js app structure, components, state management |
| **Infrastructure**    | `docs/08-runtime-devops/`    | Docker, Nginx, databases, RabbitMQ, Ollama          |
| **Operations**        | `docs/11-runbooks/`          | Deployment, monitoring, troubleshooting, runbooks   |

---

## Reading Paths by Role

### Software Engineer (new to the project)

1. [Onboarding in 5 Minutes](./onboarding-5-minutes.md) -- get the system running
2. [System at a Glance](./system-at-a-glance.md) -- understand the architecture
3. `CLAUDE.md` (project root) -- mandatory coding rules and patterns
4. Service guide for the service you'll work on (in `docs/04-backend/`)
5. Frontend guide if touching the UI (in `docs/05-frontend/`)

### QA Engineer

1. [System at a Glance](./system-at-a-glance.md) -- understand what you're testing
2. [Business Overview](../01-executive-context/business-overview.md) -- business rules and workflows
3. [Onboarding in 5 Minutes](./onboarding-5-minutes.md) -- run the system locally
4. Service guides and API references for test coverage details

### Product Owner / Stakeholder

1. [Product Vision](../01-executive-context/product-vision.md) -- mission, goals, success metrics
2. [Business Overview](../01-executive-context/business-overview.md) -- personas, workflows, glossary
3. [Feature Catalog](../02-business-product/feature-catalog.md) -- product surface including new services
4. [System at a Glance](./system-at-a-glance.md) -- technical context without deep detail

### DevOps / Infrastructure Engineer

1. [System at a Glance](./system-at-a-glance.md) -- ports, databases, containers
2. [Onboarding in 5 Minutes](./onboarding-5-minutes.md) -- local setup
3. Runtime docs (in `docs/08-runtime-devops/`) -- Docker, Nginx, database topology
4. Operations docs (in `docs/11-runbooks/`) -- deployment, monitoring, runbooks

### AI Agent (Claude Code, Copilot, etc.)

1. `CLAUDE.md` (project root) -- the single source of truth for all coding rules
2. [System at a Glance](./system-at-a-glance.md) -- architecture reference
3. Service guide for the target service -- data models, API contracts, patterns
4. This index -- to find anything else

---

## How the Documentation Is Organized

The docs follow a layered structure, from broad context down to operational detail:

| Layer                      | Directory                              | Purpose                                                                         |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| **A -- Start Here**        | `00-start-here/`                       | Orientation. Where everyone begins. Index, overview, onboarding.                |
| **B -- Executive Context** | `01-executive-context/`                | The "why." Product vision, business rules, personas, glossary.                  |
| **C -- Architecture**      | `03-architecture/`                     | The "how at a high level." System design, data flow, security model, event bus. |
| **D -- Backend**           | `04-backend/`                          | The "how in detail." One doc per service plus cross-service references.          |
| **E -- Frontend**          | `05-frontend/`                         | UI architecture, component catalog, state management, i18n.                     |
| **F -- Data & Runtime**    | `06-data/`, `08-runtime-devops/`       | Data topology, env vars, Docker, Nginx, startup, troubleshooting.               |

Each layer assumes you've read the layers above it. If something in a service guide doesn't make sense, check the architecture docs. If the architecture doesn't make sense, check the executive context.

---

## Documentation Conventions

### File Naming

- Lowercase with hyphens: `system-at-a-glance.md`, not `SystemAtAGlance.md`
- Prefix with number for ordering within a directory: `01-auth-service.md`
- Use `README.md` only for directory indexes

### Content Rules

- Every document starts with an H1 title and a one-paragraph summary
- Use tables for structured data (ports, environment variables, API endpoints)
- Use ASCII diagrams for architecture visuals (no external image dependencies)
- Include "Last updated" only when the doc covers a volatile area
- Cross-reference other docs with relative links

### Keeping Docs Current

The `CLAUDE.md` file in the project root is the authoritative reference for coding rules, architecture patterns, and the mandatory change checklist. When the system changes, `CLAUDE.md` is updated first, and these docs follow.

Every pull request that changes architecture, adds a service, or modifies a public API should include a documentation update. The mandatory change checklist in `CLAUDE.md` item 7 enforces this.
