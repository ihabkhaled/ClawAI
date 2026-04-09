# Testing Strategy

## Overview

ClawAI employs a multi-layer testing strategy: Jest for backend unit and integration tests, Vitest for frontend unit tests, and Playwright for end-to-end tests. The goal is fast feedback loops at the unit level with selective coverage at higher layers.

---

## Test Pyramid

```
           /  E2E Tests  \           Playwright (browser)
          / (Playwright)   \         Few, slow, high confidence
         /------------------\
        /  Integration Tests  \      Jest (service-level)
       / (service + mocks)     \     Moderate count, moderate speed
      /------------------------\
     /      Unit Tests           \   Jest (backend) + Vitest (frontend)
    / (functions, DTOs, utilities) \ Many, fast, focused
   /--------------------------------\
```

---

## Test Inventory

### Backend Tests (Jest)

| Service                      | Test Files | Focus Areas                                      |
| ---------------------------- | ---------- | ------------------------------------------------ |
| claw-auth-service            | 7          | Guard, hashing, JWT, DTO, manager, service, app  |
| claw-chat-service            | 5          | DTO validation, service CRUD, app bootstrap      |
| claw-connector-service       | 4          | DTO, manager, service, app                       |
| claw-routing-service         | 3          | Manager, service, app                            |
| claw-memory-service          | 4          | Context packs, DTO, memory service, app          |
| claw-file-service            | 3          | Processing manager, service, app                 |
| claw-audit-service           | 4          | Event manager, audit service, usage service, app |
| claw-ollama-service          | 3          | Manager, service, app                            |
| claw-health-service          | 1          | App bootstrap                                    |
| claw-image-service           | 2          | Image generation service, app                    |
| claw-file-generation-service | 2          | File generation service, app                     |

### Frontend Tests (Vitest)

| Category     | Test Files | Examples                                                                       |
| ------------ | ---------- | ------------------------------------------------------------------------------ |
| Components   | 4          | EmptyState, LoadingSpinner, PageHeader, StatusBadge                            |
| Enums        | 1          | Enum value validation                                                          |
| Hooks        | 2          | useAuthGuard, useDebounce                                                      |
| i18n         | 2          | LocaleContext, translation completeness                                        |
| Validation   | 8          | Connector, context-pack, file, login, memory, message, ollama, routing schemas |
| Repositories | 2          | Auth repository, query keys                                                    |
| Services     | 2          | Auth service, API client                                                       |
| Stores       | 1          | Auth store                                                                     |
| Utilities    | 6          | API, cn, preference, SSE, string, toast utilities                              |

---

## Backend Testing (Jest)

### Configuration

Each backend service has its own Jest configuration. Tests use the `.spec.ts` extension and live in `__tests__/` directories adjacent to the code they test.

```
apps/claw-auth-service/
  src/
    modules/auth/
      managers/
        auth.manager.ts
        __tests__/
          auth.manager.spec.ts
      dto/
        login.dto.ts
        __tests__/
          login.dto.spec.ts
    common/utilities/
      hashing.utility.ts
      __tests__/
        hashing.utility.spec.ts
    __tests__/
      app.spec.ts
```

### What to Test per Layer

#### Controllers

Controllers should NOT be unit-tested directly because they are 3-line methods (extract, call, return). Test them indirectly through integration tests or E2E tests.

#### Services

Focus of backend testing. Each service method should be tested for:

- **Happy path**: correct input produces correct output
- **Validation**: invalid input is rejected
- **Not found**: entity lookups return appropriate errors
- **Authorization**: ownership/permission checks work correctly
- **Edge cases**: empty arrays, null values, boundary conditions

```typescript
// Example: chat-threads.service.spec.ts
describe('ChatThreadsService', () => {
  describe('create', () => {
    it('should create a thread with valid input', async () => { ... });
    it('should set default routing mode', async () => { ... });
  });

  describe('findByUser', () => {
    it('should return only threads owned by the user', async () => { ... });
    it('should paginate results', async () => { ... });
  });
});
```

#### Managers

Test complex orchestration logic:

- Multi-step workflows execute in correct order
- External service call failures are handled gracefully
- Retry logic works as expected
- Fallback chains activate correctly

#### Repositories

Repositories are pure data access. Test them via service-level integration tests rather than in isolation, since mocking Prisma/Mongoose at the repository level provides little value.

#### DTOs

Test Zod schema validation:

- Valid input passes
- Missing required fields fail
- Fields exceeding `.max()` limits fail
- Invalid enum values fail
- Type coercion works correctly

```typescript
// Example: create-connector.dto.spec.ts
describe('CreateConnectorDto', () => {
  it('should accept valid connector data', () => {
    const result = createConnectorSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject name exceeding max length', () => {
    const result = createConnectorSchema.safeParse({ ...validData, name: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });
});
```

#### Utilities

Test pure functions with a variety of inputs including edge cases.

#### App Bootstrap

Every service has an `app.spec.ts` that verifies the NestJS application module can be created successfully. This catches dependency injection errors early.

### Mocking Strategy (Backend)

**Prisma**: Mock the PrismaService by providing a factory that returns jest mocks for each model method:

```typescript
const mockPrismaService = {
  chatThread: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};
```

**RabbitMQ**: Mock `RabbitMQService` with a no-op `publish` method.

**HTTP calls**: Mock the NestJS `HttpService` or individual service clients.

**Redis**: Mock the cache manager.

**External APIs**: Never call real APIs in tests. Mock all HTTP calls to Ollama, cloud providers, etc.

---

## Frontend Testing (Vitest)

### Configuration

Frontend tests use Vitest with the `jsdom` environment. Tests use the `.test.ts` or `.test.tsx` extension and live in `__tests__/` directories.

```
apps/claw-frontend/
  src/
    components/common/
      __tests__/
        empty-state.test.tsx
        loading-spinner.test.tsx
    hooks/
      __tests__/
        use-auth-guard.test.ts
    lib/validation/
      __tests__/
        login.schema.test.ts
    utilities/
      __tests__/
        string.utility.test.ts
```

### What to Test per Layer

#### Components

Test rendering behavior, not implementation details:

- Renders without crashing
- Displays correct content based on props
- Handles loading, empty, and error states
- Responds to user interactions (click, type, submit)
- Conditional rendering based on props/state

#### Hooks

Test hook behavior using `renderHook`:

- Initial state is correct
- State updates correctly after actions
- Side effects fire appropriately
- Cleanup runs on unmount

#### Validation Schemas

Test all Zod schemas for the frontend:

- Valid data passes
- Required fields are enforced
- Max length constraints work
- Type validation works
- Error messages are correct

#### Utilities

Test pure utility functions:

- Format functions produce expected output
- Parse functions handle valid and invalid input
- Edge cases (empty strings, null, undefined)

#### Repositories and Services

Test API call construction:

- Correct URL is called
- Request body is structured correctly
- Headers include auth token
- Response is parsed correctly

#### Stores (Zustand)

Test store actions and derived state:

- Initial state is correct
- Actions update state correctly
- Selectors return expected values

### Mocking Strategy (Frontend)

**API calls**: Mock the API client (`fetch` or `axios`) at the repository level.

**Next.js router**: Mock `useRouter`, `useParams`, `useSearchParams`.

**i18n**: Provide a mock translation function that returns the key.

**Browser APIs**: jsdom provides most DOM APIs. Mock `localStorage`, `window.matchMedia`, etc. as needed.

---

## E2E Testing (Playwright)

### Purpose

Playwright tests verify complete user flows through the browser against a running development environment. They catch integration issues between frontend and backend that unit tests cannot detect.

### Key Flows to Cover

- Login and session management
- Create a chat thread and send a message
- Receive an AI response (with mock or local Ollama)
- Create and configure a connector
- Upload a file and attach it to a chat
- Create a memory and context pack
- View audit logs and usage stats
- Routing mode selection and transparency display

### Running E2E Tests

```bash
# Start the full dev environment first
docker compose -f docker-compose.dev.yml up -d

# Run Playwright tests
npx playwright test

# Run with UI mode for debugging
npx playwright test --ui

# Run a specific test file
npx playwright test tests/chat.spec.ts
```

---

## Test Commands

### Run All Tests

```bash
npm run test
```

### Run Tests for a Specific Workspace

```bash
# Backend service
npm run test --workspace=apps/claw-auth-service
npm run test --workspace=apps/claw-chat-service

# Frontend
npm run test --workspace=apps/claw-frontend
```

### Run Tests in Watch Mode

```bash
# Backend (Jest)
cd apps/claw-auth-service && npx jest --watch

# Frontend (Vitest)
cd apps/claw-frontend && npx vitest
```

### Run a Single Test File

```bash
# Backend
cd apps/claw-auth-service && npx jest src/modules/auth/managers/__tests__/auth.manager.spec.ts

# Frontend
cd apps/claw-frontend && npx vitest src/utilities/__tests__/string.utility.test.ts
```

---

## Coverage Expectations

### Current State

Testing is established across all backend services and the frontend. The project has 70+ test files covering services, managers, DTOs, utilities, components, hooks, schemas, repositories, and stores.

### Target Coverage by Layer

| Layer          | Target | Notes                              |
| -------------- | ------ | ---------------------------------- |
| DTOs / Schemas | 90%+   | Critical for input validation      |
| Utilities      | 90%+   | Pure functions, easy to test       |
| Services       | 80%+   | Core business logic                |
| Managers       | 80%+   | Complex orchestration              |
| Components     | 70%+   | Focus on behavior, not styling     |
| Hooks          | 80%+   | State management logic             |
| Repositories   | 70%+   | API call construction              |
| Controllers    | N/A    | Tested indirectly (3-line methods) |
| E2E            | N/A    | Cover critical user flows          |

---

## Test File Conventions

### Naming

- Backend: `<name>.spec.ts` (Jest convention)
- Frontend: `<name>.test.ts` or `<name>.test.tsx` (Vitest convention)

### Location

Tests live in `__tests__/` directories adjacent to the source file:

```
src/modules/auth/
  auth.service.ts
  __tests__/
    auth.service.spec.ts
```

### Structure

Use `describe`/`it` blocks with clear, behavior-focused descriptions:

```typescript
describe('AuthService', () => {
  describe('login', () => {
    it('should return tokens for valid credentials', async () => { ... });
    it('should throw BusinessException for invalid password', async () => { ... });
    it('should record login event via RabbitMQ', async () => { ... });
  });
});
```

### ESLint Relaxation

Test files (`*.spec.ts`, `*.test.ts`, `*.test.tsx`) have all ESLint restrictions turned off. The `any` type is allowed, inline types are permitted, and file structure rules do not apply.

---

## Adding Tests for New Code

Every new feature or bug fix must include tests. Follow this checklist:

1. **New DTO**: Add schema validation tests (valid input, invalid input, boundary values)
2. **New service method**: Add tests for happy path, error cases, and edge cases
3. **New manager method**: Add tests for orchestration logic and failure handling
4. **New utility function**: Add tests for all input variations
5. **New component**: Add render tests for all states (loading, empty, error, data)
6. **New hook**: Add tests for state initialization, updates, and cleanup
7. **New API endpoint**: Add E2E test if it is a critical user flow
