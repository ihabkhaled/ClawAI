# Contributing to Claw

Thank you for your interest in contributing to Claw. This guide will help you get started.

---

## Getting Started

1. **Fork the repository** and clone your fork locally.

2. **Set up the development environment** by following the [Installation Guide](INSTALL.md).

3. **Read the project rules** in [CLAUDE.md](CLAUDE.md) -- these are the coding standards enforced across the project.

4. **Explore the architecture** in [ARCHITECTURE.md](ARCHITECTURE.md) to understand how the system is structured.

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

### 3. Make Your Changes

- Follow the code standards described below
- Write tests for new functionality
- Update documentation if your change affects public APIs, configuration, or architecture

### 4. Verify Quality

Before submitting, run the full quality gate:

```bash
npm run lint        # Zero errors required
npm run typecheck   # Zero errors required
npm run build       # Must compile successfully
npm run test        # All tests must pass
```

### 5. Submit a Pull Request

- Push your branch and open a PR against `main`
- Fill out the PR template with a clear description
- Link the related issue
- Ensure CI checks pass

---

## Code Standards

The full code standards are documented in [CLAUDE.md](CLAUDE.md). Key rules:

### TypeScript

- Never use `any` -- use proper types or `unknown`
- Never disable ESLint rules -- fix the underlying issue
- Use `type` over `interface` unless declaration merging is needed
- All functions must have explicit return types
- Use enums for domain constants, never string literal unions

### Backend (NestJS)

- Follow the layered architecture: Controller -> Service -> Manager -> Repository
- Validate all input with Zod DTOs
- Use guards for authentication and authorization
- Log with pino structured logger, never `console.log`
- Never log secrets, tokens, or API keys

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

| Change Type        | Required Tests                                       |
|--------------------|------------------------------------------------------|
| New backend module | Unit tests for service, integration test for API     |
| New frontend page  | Component test, update E2E if it is a critical path  |
| Bug fix            | Regression test that fails without the fix           |
| Utility function   | Unit tests covering edge cases                       |
| Refactor           | Existing tests must continue to pass                 |

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

| Scope      | Area                         |
|------------|------------------------------|
| `frontend` | Frontend application         |
| `backend`  | Backend application          |
| `auth`     | Authentication module        |
| `routing`  | Routing engine               |
| `connectors`| Connector system            |
| `chat`     | Chat threads and messages    |
| `infra`    | Docker, CI, deployment       |
| `docs`     | Documentation                |

### Examples

```
feat(routing): add fallback chain support for provider selection
fix(auth): prevent refresh token reuse after rotation
docs(backend): update API endpoint documentation
refactor(frontend): extract chat message component from thread view
test(connectors): add integration tests for secret encryption
chore(infra): upgrade PostgreSQL image to pg16
```

---

## Questions?

If you have questions about contributing, open a discussion on the repository or reach out to the maintainers.
