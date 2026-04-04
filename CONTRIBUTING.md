# Contributing to Claw

Thank you for your interest in contributing to Claw. This guide will help you get started.

---

## Getting Started

1. **Fork the repository** and clone your fork locally.

2. **Set up the development environment** by following the [Installation Guide](INSTALL.md).

3. **Read the project rules** in [CLAUDE.md](CLAUDE.md) -- these are the coding standards enforced across the project.

4. **Understand the architecture**: Claw uses a microservices architecture with 9 backend services, 4 shared packages, and a Next.js frontend. See [ADR-004](docs/adrs/004-microservices-architecture.md) for the architectural rationale.

---

## Project Layout

```
claw/
├── apps/
│   ├── claw-frontend/              # Next.js frontend
│   ├── claw-auth-service/          # Auth microservice (:4001)
│   ├── claw-chat-service/          # Chat microservice (:4002)
│   ├── claw-connector-service/     # Connector microservice (:4003)
│   ├── claw-routing-service/       # Routing microservice (:4004)
│   ├── claw-memory-service/        # Memory microservice (:4005)
│   ├── claw-file-service/          # File microservice (:4006)
│   ├── claw-audit-service/         # Audit microservice (:4007)
│   ├── claw-ollama-service/        # Ollama proxy microservice (:4008)
│   └── claw-health-service/        # Health aggregator microservice (:4009)
├── packages/
│   ├── shared-types/               # @claw/shared-types
│   ├── shared-constants/           # @claw/shared-constants
│   ├── shared-rabbitmq/            # @claw/shared-rabbitmq
│   └── shared-auth/                # @claw/shared-auth
├── docker-compose.yml
└── package.json
```

---

## Development Workflow

### 1. Pick or Create an Issue

- Check existing issues for something you want to work on
- If no issue exists for your change, create one first to discuss the approach
- Comment on the issue to signal that you are working on it

### 2. Create a Branch

Branch from `main` using a descriptive name:

```bash
git checkout -b feat/add-model-pinning
git checkout -b fix/refresh-token-rotation
git checkout -b docs/update-architecture
```

Branch naming conventions:
- `feat/` -- New features
- `fix/` -- Bug fixes
- `refactor/` -- Code refactoring (no behavior change)
- `docs/` -- Documentation changes
- `test/` -- Test additions or fixes
- `chore/` -- Build, CI, tooling changes

### 3. Start the Development Environment

```bash
# Start all infrastructure containers
docker compose up -d

# Install dependencies (all workspaces)
npm install

# Build shared packages (required before running services)
npm run build -w packages/shared-types
npm run build -w packages/shared-constants
npm run build -w packages/shared-rabbitmq
npm run build -w packages/shared-auth

# Run the service you are working on
npm run dev:auth    # or dev:chat, dev:routing, etc.
npm run dev:frontend
```

### 4. Make Your Changes

- Follow the code standards described below
- Write tests for new functionality
- Update documentation if your change affects public APIs, configuration, or architecture

### 5. Verify Quality

Before submitting, run the full quality gate:

```bash
npm run lint        # Zero errors required
npm run typecheck   # Zero errors required
npm run build       # Must compile successfully
npm run test        # All tests must pass
```

### 6. Submit a Pull Request

- Push your branch and open a PR against `main`
- Fill out the PR template with a clear description
- Link the related issue
- Ensure CI checks pass

---

## How to Add a New Microservice

If your contribution requires a new microservice:

### 1. Create the Service

```bash
mkdir -p apps/claw-<name>-service/src
```

Follow the structure of an existing service (e.g., `claw-auth-service`) as a template:
- `src/main.ts` -- NestJS bootstrap
- `src/app.module.ts` -- Root module with RabbitMQ, database, and shared-auth imports
- `src/<domain>/` -- Controllers, services, repositories
- `package.json` -- With workspace dependencies on shared packages
- `Dockerfile` -- Multi-stage build

### 2. Assign a Port

Add the port to `packages/shared-constants` and document it. Follow the existing port sequence (4001-4009).

### 3. Add Database (if needed)

If the service needs its own database:
- Add a new PostgreSQL (or MongoDB) service to `docker-compose.yml`
- Assign the next available host port (5447+ for PostgreSQL)
- Add connection variables to `.env.example`

### 4. Register with Nginx

Add routing rules to `nginx.conf` so the frontend can reach the new service through the reverse proxy.

### 5. Register with Health Service

Update the Health service to include the new service in its health aggregation.

### 6. Add RabbitMQ Events

If the service publishes or consumes events:
- Define event types in `@claw/shared-types`
- Define routing keys in `@claw/shared-constants`
- Use `@claw/shared-rabbitmq` for publishing and consuming

### 7. Update Docker Compose

Add the service container to `docker-compose.yml` with proper dependencies, health checks, and network configuration.

### 8. Update Documentation

Update `README.md`, `INSTALL.md`, `ENVIRONMENT_VARIABLES.md`, and any other affected docs.

---

## Shared Packages Workflow

The 4 shared packages under `packages/` are consumed by all microservices:

| Package                  | Purpose                              |
|--------------------------|--------------------------------------|
| `@claw/shared-types`    | Enums, TypeScript types, event contracts |
| `@claw/shared-constants`| Service ports, names, exchange config |
| `@claw/shared-rabbitmq` | NestJS RabbitMQ module wrapper       |
| `@claw/shared-auth`     | JWT guard and role decorators        |

### Making Changes to Shared Packages

1. Make your change in the relevant `packages/<name>/` directory.
2. Rebuild the package: `npm run build -w packages/<name>`.
3. All consuming services will pick up the change (npm workspaces symlinks).
4. Test the change in at least one consuming service.
5. If adding a new export, verify all consuming services compile with `npm run typecheck`.

### Adding a New Shared Package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, and `src/`.
2. Set the package name to `@claw/<name>` in `package.json`.
3. Add the package to the root `package.json` workspaces array.
4. Run `npm install` from the root to link the new package.
5. Add the package as a dependency in consuming services' `package.json`.

---

## Docker Compose Workflow

### Starting Everything

```bash
docker compose up -d
```

### Rebuilding a Single Service

After changing code in a service:

```bash
docker compose build claw-auth-service
docker compose up -d claw-auth-service
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f claw-auth-service

# Infrastructure
docker compose logs -f claw-rabbitmq
```

### Resetting

```bash
# Stop and remove all containers and volumes
docker compose down -v

# Rebuild everything
docker compose up -d --build
```

---

## Code Standards

The full code standards are documented in [CLAUDE.md](CLAUDE.md). Key rules:

### TypeScript

- Never use `any` -- use proper types or `unknown`
- Never disable ESLint rules -- fix the underlying issue
- Use `type` over `interface` unless declaration merging is needed
- All functions must have explicit return types
- Use enums for domain constants, never string literal unions

### Backend (NestJS Microservices)

- Follow the layered architecture: Controller -> Service -> Manager -> Repository
- Validate all input with Zod DTOs
- Use guards from `@claw/shared-auth` for authentication and authorization
- Log with pino structured logger, never `console.log`
- Never log secrets, tokens, or API keys
- Publish domain events to RabbitMQ, never call another service's database directly

### Frontend (Next.js)

- Follow the layered architecture: View -> Controller (Hook) -> Service -> Repository
- Use TanStack Query for server state, Zustand for client state
- Use React Hook Form with Zod for form handling
- Components delegate logic to hooks, never call services directly

### General

- Keep functions focused and short
- Extract utilities aggressively
- Prefer predictable code over clever code
- Never build god-files -- keep modules focused

---

## Pull Request Process

### PR Requirements

1. **Description**: Clear explanation of what the PR does and why
2. **Issue link**: Reference the related issue (e.g., "Closes #42")
3. **Tests**: New or updated tests for the change
4. **Documentation**: Updated if the change affects APIs, config, or architecture
5. **Quality gate**: All CI checks pass (lint, typecheck, build, test)
6. **Single concern**: Each PR addresses one logical change

### Review Process

- At least one maintainer review is required before merging
- Reviewers will check code quality, test coverage, and architectural fit
- Address review feedback by pushing new commits (do not force-push during review)
- Once approved, the PR will be squash-merged into `main`

### What Makes a Good PR

- Small and focused (under 400 lines of changed code when possible)
- Clear commit messages that explain the reasoning
- Tests that cover both happy path and error cases
- No unrelated changes mixed in

---

## Testing Requirements

All contributions must include appropriate tests:

| Change Type            | Required Tests                                       |
|------------------------|------------------------------------------------------|
| New microservice       | Unit tests for service, integration test for API     |
| New frontend page      | Component test, update E2E if it is a critical path  |
| Bug fix                | Regression test that fails without the fix           |
| Utility function       | Unit tests covering edge cases                       |
| Shared package change  | Unit tests in the package, verify consuming services |
| Refactor               | Existing tests must continue to pass                 |

See [TESTING.md](TESTING.md) for detailed testing guidance.

---

## Commit Conventions

Claw follows conventional commit format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Purpose                                  |
|------------|------------------------------------------|
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation changes                    |
| `refactor` | Code change that neither fixes nor adds  |
| `test`     | Adding or updating tests                 |
| `chore`    | Build, CI, tooling, dependencies         |
| `style`    | Formatting, whitespace (no logic change) |
| `perf`     | Performance improvement                  |

### Scopes

| Scope        | Area                           |
|--------------|--------------------------------|
| `frontend`   | Frontend application           |
| `auth`       | Auth service                   |
| `chat`       | Chat service                   |
| `connectors` | Connector service              |
| `routing`    | Routing service                |
| `memory`     | Memory service                 |
| `file`       | File service                   |
| `audit`      | Audit service                  |
| `ollama`     | Ollama service                 |
| `health`     | Health service                 |
| `shared`     | Shared packages                |
| `infra`      | Docker, CI, deployment         |
| `docs`       | Documentation                  |

### Examples

```
feat(memory): add context pack CRUD operations
fix(auth): prevent refresh token reuse after rotation
docs(routing): update API endpoint documentation
refactor(chat): extract message streaming into dedicated service
test(connectors): add integration tests for secret encryption
chore(infra): add MongoDB container for audit service
feat(shared): add audit event types to shared-types
```

---

## Questions?

If you have questions about contributing, open a discussion on the repository or reach out to the maintainers.
