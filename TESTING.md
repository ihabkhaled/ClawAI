# Testing

Testing strategy and guide for the Claw platform.

---

## Testing Strategy Overview

Claw uses a layered testing approach across the frontend and all 9 backend microservices:

```
              ┌──────────────┐
              │   E2E Tests  │   Few, slow, high confidence
              │  (Playwright) │
              ├──────────────┤
              │  Integration │   Moderate count, real DB/services
              │    Tests     │
              ├──────────────┤
              │  Unit Tests  │   Many, fast, isolated
              └──────────────┘
```

**Guiding principles:**
- Each microservice has its own independent test suite
- Each service tests against its own database instance (test isolation)
- Unit tests cover business logic and utilities in isolation
- Integration tests verify module interactions with real infrastructure
- E2E tests validate critical user journeys through the full stack
- Every new feature or bug fix includes corresponding tests
- Tests must pass before any code is merged

---

## Microservice Test Isolation

Each microservice has its own:
- **Test database**: Connects to its own PostgreSQL instance (or MongoDB for Audit)
- **Test configuration**: Independent Jest config
- **Test data**: Factory functions scoped to the service's domain

This ensures tests for one service never interfere with another service's data or state.

| Service    | Test Database         | Port  |
|------------|-----------------------|-------|
| Auth       | `claw_auth_test`      | 5441  |
| Chat       | `claw_chat_test`      | 5442  |
| Connector  | `claw_connectors_test`| 5443  |
| Routing    | `claw_routing_test`   | 5444  |
| Memory     | `claw_memory_test`    | 5445  |
| File       | `claw_files_test`     | 5446  |
| Audit      | `claw_audit_test`     | 27018 |

---

## Running Tests Per Service

### All Tests

```bash
# Run all test suites across all services
npm run test
```

### Individual Service Tests

```bash
# Auth service
npm run test -w apps/claw-auth-service

# Chat service
npm run test -w apps/claw-chat-service

# Connector service
npm run test -w apps/claw-connector-service

# Routing service
npm run test -w apps/claw-routing-service

# Memory service
npm run test -w apps/claw-memory-service

# File service
npm run test -w apps/claw-file-service

# Audit service
npm run test -w apps/claw-audit-service

# Ollama service
npm run test -w apps/claw-ollama-service

# Health service
npm run test -w apps/claw-health-service

# Frontend
npm run test -w apps/claw-frontend
```

### Watch Mode

```bash
# Watch mode for a specific service
cd apps/claw-auth-service && npx jest --watch

# Watch mode for frontend
cd apps/claw-frontend && npx vitest
```

### Coverage

```bash
# Coverage for a specific service
cd apps/claw-auth-service && npx jest --coverage

# Coverage for frontend
cd apps/claw-frontend && npx vitest --coverage
```

---

## Backend Testing (Per Service)

### Framework: Jest

All backend microservices use Jest with `ts-jest` for TypeScript support.

### Unit Tests

**Scope**: Services, managers, utilities, guards, pipes within each microservice.

**Location**: `apps/claw-<service>-service/src/__tests__/` or alongside source files.

**Conventions**:
- File naming: `<name>.spec.ts`
- Mock all external dependencies (repositories, other services, RabbitMQ publishers)
- Test business logic, validation rules, error handling, and edge cases
- Use factory functions for test data to avoid repetition
- Mock inter-service HTTP calls and RabbitMQ message publishing

**Example structure** (Auth service):
```
apps/claw-auth-service/src/
├── __tests__/
│   ├── auth.service.spec.ts
│   ├── auth.controller.spec.ts
│   └── auth.guard.spec.ts
```

### Integration Tests

**Scope**: API endpoints with real database and service connections.

**Location**: `apps/claw-<service>-service/test/`

**Conventions**:
- File naming: `<module>.e2e-spec.ts`
- Use `@nestjs/testing` to create a full application instance
- Tests run against the service's own PostgreSQL/MongoDB test database
- Each test suite resets relevant database tables before running
- Mock RabbitMQ connections to avoid cross-service dependencies
- Test the full request/response cycle including validation, auth, and database effects

**Running integration tests**:
```bash
cd apps/claw-auth-service && npx jest --config test/jest-e2e.json
```

### What to Test (Backend Services)

| Layer        | What to test                                            |
|--------------|---------------------------------------------------------|
| Controllers  | Route mapping, response status codes, DTO validation    |
| Services     | Business logic, authorization, error cases              |
| Managers     | Multi-step orchestration, failure handling               |
| Repositories | Query correctness (integration tests only)              |
| Guards       | Token verification, role checking, rejection cases      |
| Pipes        | Zod schema validation, transformation                   |
| Utilities    | Encryption/decryption, token generation, helpers        |
| Events       | RabbitMQ message publishing and handling                 |

---

## Shared Package Tests

The shared packages under `packages/` have their own test suites:

```bash
# Test shared types
npm run test -w packages/shared-types

# Test shared constants
npm run test -w packages/shared-constants

# Test shared RabbitMQ module
npm run test -w packages/shared-rabbitmq

# Test shared auth
npm run test -w packages/shared-auth
```

---

## Frontend Testing

### Frameworks

- **Unit/Component tests**: Vitest + React Testing Library
- **E2E tests**: Playwright

### Unit Tests

**Scope**: Utilities, hooks, services, repositories, stores.

**Location**: Alongside the source file or in `__tests__/` directories.

**Conventions**:
- File naming: `<name>.test.ts` or `<name>.test.tsx`
- Mock HTTP calls and external dependencies
- Test data transformations, state logic, and error handling

**Running unit tests**:
```bash
# All frontend unit tests
npm run test -w apps/claw-frontend

# Watch mode
cd apps/claw-frontend && npx vitest

# Single file
cd apps/claw-frontend && npx vitest src/utilities/format-date.test.ts
```

### Component Tests

**Scope**: React components rendered in isolation.

**Location**: Alongside the component file.

**Conventions**:
- Use React Testing Library to render components and assert DOM output
- Test user interactions (click, type, submit) and their effects
- Mock API calls at the service/repository layer
- Test accessibility (roles, labels, keyboard navigation)

### E2E Tests (Playwright)

**Scope**: Full user journeys through the running application (all services must be running).

**Location**: `apps/claw-frontend/e2e/` or `apps/claw-frontend/tests/`

**Conventions**:
- Test critical paths: login, send message, create connector, manage settings
- Run against development servers with seeded test data
- All 20 containers must be running for E2E tests
- Use page object models to keep selectors maintainable
- Tests must be independent and not rely on execution order

**Running E2E tests**:
```bash
# Run all E2E tests
npm run test:e2e

# With headed browser (for debugging)
cd apps/claw-frontend && npx playwright test --headed

# Single test file
cd apps/claw-frontend && npx playwright test e2e/auth-flow.spec.ts

# Generate test code interactively
cd apps/claw-frontend && npx playwright codegen http://localhost:3000
```

---

## Running All Tests

```bash
# Run everything
npm run test

# Frontend only
npm run test -w apps/claw-frontend

# All backend services
npm run test -w apps/claw-auth-service -w apps/claw-chat-service -w apps/claw-connector-service -w apps/claw-routing-service -w apps/claw-memory-service -w apps/claw-file-service -w apps/claw-audit-service -w apps/claw-ollama-service -w apps/claw-health-service

# E2E only
npm run test:e2e
```

---

## Manual Test Matrix

Use this template for manual testing before releases. Check each item after verification.

### Authentication

- [ ] Register a new user account
- [ ] Login with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Access token refreshes automatically
- [ ] Logout clears session
- [ ] Protected pages redirect to login when unauthenticated

### Chat

- [ ] Create a new chat thread
- [ ] Send a message and receive a response
- [ ] Message history loads correctly
- [ ] Long messages render without layout issues
- [ ] Delete a chat thread
- [ ] Thread list updates in real time

### Connectors

- [ ] Add a new connector (e.g., OpenAI)
- [ ] Test connector connectivity
- [ ] Edit connector settings
- [ ] Delete a connector
- [ ] Connector API key is not visible after saving

### Routing

- [ ] Message routes to the correct provider based on rules
- [ ] Fallback activates when primary provider fails
- [ ] Local-only mode routes exclusively through Ollama
- [ ] Routing decisions appear in audit logs

### User Management (Admin)

- [ ] View user list
- [ ] Create a new user
- [ ] Change user role
- [ ] Deactivate a user account

### Inter-Service Communication

- [ ] RabbitMQ events propagate between services
- [ ] Health endpoint aggregates all service statuses
- [ ] Audit service receives events from all other services

### General

- [ ] Application loads without console errors
- [ ] Responsive layout works on mobile viewport
- [ ] Dark/light theme toggle works
- [ ] 404 page displays for unknown routes
- [ ] Health endpoint returns 200 at `localhost:4009/api/v1/health`

---

## Provider Mock Adapters

For testing without real provider API keys, Claw includes mock adapters that simulate provider behavior.

### Using Mock Adapters

Mock adapters are activated by setting the environment variable:

```bash
USE_MOCK_PROVIDERS=true
```

When enabled:
- All provider calls return deterministic responses
- No real API keys are needed
- Response latency is simulated (configurable)
- Token counts are estimated based on input/output length
- Error scenarios can be triggered by special prompt prefixes (e.g., `ERROR:timeout`)

### Mock Adapter Capabilities

| Feature              | Supported |
|----------------------|-----------|
| Chat completion      | Yes       |
| Streaming            | Yes       |
| Token counting       | Estimated |
| Error simulation     | Yes       |
| Latency simulation   | Yes       |
| Model listing        | Yes       |

Mock adapters are used in:
- Unit and integration tests
- Local development without API keys
- CI/CD pipelines
- Demo environments
