# Testing Strategy

> Unit vs integration vs E2E, Jest (backend) vs Vitest (frontend), and test pyramid.

---

## 1. Test Pyramid

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

| Layer       | Tool      | Speed   | Count    | What It Tests                              |
| ----------- | --------- | ------- | -------- | ------------------------------------------ |
| Unit        | Jest/Vitest | Fast  | Many     | Functions, DTOs, utilities, pure logic     |
| Integration | Jest      | Medium  | Moderate | Service methods with mocked dependencies   |
| E2E         | Playwright| Slow    | Few      | Full user flows through the browser        |

---

## 2. Test Framework Matrix

| Aspect              | Backend (Jest)                       | Frontend (Vitest)                    |
| ------------------- | ------------------------------------ | ------------------------------------ |
| Framework           | Jest                                 | Vitest                               |
| File extension      | `*.spec.ts`                          | `*.test.ts` / `*.test.tsx`           |
| Location            | `__tests__/` adjacent to source      | `__tests__/` adjacent to source      |
| Environment         | Node.js                              | jsdom                                |
| Mocking             | `jest.fn()`, `jest.mock()`           | `vi.fn()`, `vi.mock()`              |
| Coverage tool       | `jest --coverage`                    | `vitest --coverage`                  |
| Watch mode          | `jest --watch`                       | `vitest` (watch by default)          |
| Config file         | `jest.config.ts` per service         | `vitest.config.ts` in frontend       |
| ESLint restrictions | All OFF in test files                | All OFF in test files                |

---

## 3. Test Inventory

### Backend Tests (Jest) -- 38+ test files across 13 services

| Service                      | Files | Focus                                           |
| ---------------------------- | ----- | ----------------------------------------------- |
| claw-auth-service            | 7     | Guard, hashing, JWT, DTO, manager, service, app |
| claw-chat-service            | 5     | DTO validation, service CRUD, app bootstrap     |
| claw-connector-service       | 4     | DTO, manager, service, app                      |
| claw-routing-service         | 3     | Manager, service, app                           |
| claw-memory-service          | 4     | Context packs, DTO, memory service, app         |
| claw-file-service            | 3     | Processing manager, service, app                |
| claw-audit-service           | 4     | Event manager, audit service, usage service, app|
| claw-ollama-service          | 3     | Manager, service, app                           |
| claw-health-service          | 1     | App bootstrap                                   |
| claw-image-service           | 2     | Image generation service, app                   |
| claw-file-generation-service | 2     | File generation service, app                    |

### Frontend Tests (Vitest) -- 28+ test files

| Category     | Files | Examples                                                     |
| ------------ | ----- | ------------------------------------------------------------ |
| Components   | 4     | EmptyState, LoadingSpinner, PageHeader, StatusBadge          |
| Enums        | 1     | Enum value validation                                        |
| Hooks        | 2     | useAuthGuard, useDebounce                                    |
| i18n         | 2     | LocaleContext, translation completeness                      |
| Validation   | 8     | Connector, context-pack, file, login, memory, message, ollama, routing |
| Repositories | 2     | Auth repository, query keys                                  |
| Services     | 2     | Auth service, API client                                     |
| Stores       | 1     | Auth store                                                   |
| Utilities    | 6     | API, cn, preference, SSE, string, toast utilities            |

---

## 4. What to Test at Each Layer

### Unit Tests (Backend)

| Target       | Test For                                                    |
| ------------ | ----------------------------------------------------------- |
| DTOs         | Valid input passes, invalid input fails, boundary values    |
| Utilities    | Pure functions with varied inputs, edge cases               |
| Services     | Happy path, validation, not-found, authorization, edges     |
| Managers     | Orchestration order, failure handling, retry, fallback      |
| App bootstrap| NestJS module can be created (dependency injection check)   |

### Unit Tests (Frontend)

| Target       | Test For                                                    |
| ------------ | ----------------------------------------------------------- |
| Validation   | Zod schemas: valid/invalid input, max lengths, error messages |
| Utilities    | Format functions, parsers, edge cases                       |
| Components   | Renders correctly, handles props, loading/empty/error states|
| Hooks        | Initial state, state updates, cleanup on unmount            |
| Stores       | Initial state, actions update state, selectors              |
| Repositories | Correct URL, request body, headers                          |

### Integration Tests

| Target       | Test For                                                    |
| ------------ | ----------------------------------------------------------- |
| Service + DB | CRUD operations with mocked Prisma                         |
| Service + MQ | Event publishing with mocked RabbitMQ                      |
| Managers     | Multi-service orchestration with mocked dependencies        |

### E2E Tests

| Flow                    | Steps                                              |
| ----------------------- | -------------------------------------------------- |
| Login                   | Submit credentials, verify redirect to dashboard   |
| Chat                    | Create thread, send message, receive AI response   |
| Connector               | Create connector, test connection, sync models     |
| File upload             | Upload file, verify ingestion, attach to chat      |
| Memory                  | Create memory, verify it appears in context        |

---

## 5. Coverage Targets

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

## 6. Test Commands

```bash
# All tests (all workspaces)
npm run test

# Backend service tests
npm run test --workspace=apps/claw-auth-service
npm run test --workspace=apps/claw-chat-service

# Frontend tests
npm run test --workspace=apps/claw-frontend

# Watch mode (backend)
cd apps/claw-auth-service && npx jest --watch

# Watch mode (frontend)
cd apps/claw-frontend && npx vitest

# Single test file (backend)
cd apps/claw-auth-service && npx jest src/modules/auth/managers/__tests__/auth.manager.spec.ts

# Single test file (frontend)
cd apps/claw-frontend && npx vitest src/utilities/__tests__/string.utility.test.ts

# Coverage
cd apps/claw-frontend && npx vitest --coverage
cd apps/claw-auth-service && npx jest --coverage
```

---

## 7. Adding Tests for New Code

Every new feature or bug fix must include tests:

| New Code                | Required Tests                                    |
| ----------------------- | ------------------------------------------------- |
| New DTO/schema          | Valid input, invalid input, boundary values       |
| New service method      | Happy path, error cases, edge cases               |
| New manager method      | Orchestration logic, failure handling              |
| New utility function    | All input variations, edge cases                  |
| New component           | Render tests for all states                       |
| New hook                | State init, updates, cleanup                      |
| New API endpoint        | E2E test if critical flow                         |
| Bug fix                 | Regression test proving the fix works             |

---

## 8. ESLint Relaxation in Tests

Test files (`*.spec.ts`, `*.test.ts`, `*.test.tsx`) have ALL ESLint restrictions turned off:

- `any` type is allowed
- Inline types are permitted
- No file structure rules apply
- `console.log` is allowed
- `eslint-disable` is allowed

This allows tests to focus on testing behavior without being constrained by production code style rules.
