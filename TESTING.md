# Testing

Testing strategy and guide for the Claw platform.

---

## Testing Strategy Overview

Claw uses a layered testing approach across both frontend and backend:

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
- Unit tests cover business logic and utilities in isolation
- Integration tests verify module interactions with real infrastructure
- E2E tests validate critical user journeys through the full stack
- Every new feature or bug fix includes corresponding tests
- Tests must pass before any code is merged

---

## Backend Testing

### Framework: Jest

The backend uses Jest with `ts-jest` for TypeScript support.

### Unit Tests

**Scope**: Services, managers, utilities, guards, pipes.

**Location**: `apps/claw-backend/src/modules/<module>/__tests__/`

**Conventions**:
- File naming: `<name>.spec.ts`
- Mock all external dependencies (repositories, other services)
- Test business logic, validation rules, error handling, and edge cases
- Use factory functions for test data to avoid repetition

**Example structure**:
```
modules/auth/__tests__/
├── auth.service.spec.ts       # Service business logic
├── auth.controller.spec.ts    # Controller route handling
└── auth.guard.spec.ts         # Guard authorization logic
```

**Running unit tests**:
```bash
# All backend unit tests
npm run test:backend

# Watch mode (re-runs on file change)
cd apps/claw-backend && npx jest --watch

# Single file
cd apps/claw-backend && npx jest src/modules/auth/__tests__/auth.service.spec.ts

# With coverage
cd apps/claw-backend && npx jest --coverage
```

### Integration Tests

**Scope**: API endpoints with real database and Redis connections.

**Location**: `apps/claw-backend/test/`

**Conventions**:
- File naming: `<module>.e2e-spec.ts`
- Use `@nestjs/testing` to create a full application instance
- Tests run against a real PostgreSQL database (use a separate test database)
- Each test suite resets relevant database tables before running
- Test the full request/response cycle including validation, auth, and database effects

**Running integration tests**:
```bash
cd apps/claw-backend && npx jest --config test/jest-e2e.json
```

### What to Test (Backend)

| Layer        | What to test                                            |
|--------------|---------------------------------------------------------|
| Controllers  | Route mapping, response status codes, DTO validation    |
| Services     | Business logic, authorization, error cases              |
| Managers     | Multi-step orchestration, failure handling               |
| Repositories | Query correctness (integration tests only)              |
| Guards       | Token verification, role checking, rejection cases      |
| Pipes        | Zod schema validation, transformation                   |
| Utilities    | Encryption/decryption, token generation, helpers        |

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
npm run test:frontend

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

**Example**:
```bash
cd apps/claw-frontend && npx vitest src/components/chat/message-input.test.tsx
```

### E2E Tests (Playwright)

**Scope**: Full user journeys through the running application.

**Location**: `apps/claw-frontend/e2e/` or `apps/claw-frontend/tests/`

**Conventions**:
- Test critical paths: login, send message, create connector, manage settings
- Run against development servers with seeded test data
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

# Backend only
npm run test:backend

# Frontend only
npm run test:frontend

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

### General

- [ ] Application loads without console errors
- [ ] Responsive layout works on mobile viewport
- [ ] Dark/light theme toggle works
- [ ] 404 page displays for unknown routes
- [ ] Health endpoint returns 200

---

## Provider Mock Adapters

For testing without real provider API keys, Claw includes mock adapters that simulate provider behavior.

### How Mock Adapters Work

Each provider adapter has a corresponding mock implementation:

- **`MockOllamaAdapter`**: Returns predefined responses without calling Ollama
- **`MockOpenAIAdapter`**: Simulates OpenAI API responses with configurable latency
- **`MockAnthropicAdapter`**: Returns Anthropic-formatted responses
- **`MockGoogleAdapter`**: Simulates Gemini API responses
- **`MockAWSBedrockAdapter`**: Returns Bedrock-formatted responses
- **`MockDeepSeekAdapter`**: Simulates DeepSeek API responses

### Using Mock Adapters

Mock adapters are activated by setting the environment variable:

```bash
# In apps/claw-backend/.env
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
