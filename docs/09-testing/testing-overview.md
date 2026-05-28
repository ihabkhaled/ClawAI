# Testing

Testing strategy and mandatory quality gates for the Claw platform.

> **See also**: `rules/04-testing-rules.md` — the canonical, non-negotiable testing mandate referenced by all AI agents.

---

## Testing Strategy Overview

Claw uses a layered testing approach across the frontend and all 17 backend microservices:

```
              ┌──────────────────────┐
              │  QA Scripts (curl)   │   Required — 20-25 variations per endpoint
              ├──────────────────────┤
              │  E2E Tests           │   Few, slow, full-stack confidence
              │  (Playwright)        │
              ├──────────────────────┤
              │  Integration Tests   │   Moderate, real DB/services
              ├──────────────────────┤
              │  DTO Fuzz Tests      │   Required — boundary/null/overflow per DTO
              ├──────────────────────┤
              │  Unit Tests          │   Many, fast, isolated (≥95% coverage)
              └──────────────────────┘
```

**Guiding principles:**

- Each microservice has its own independent test suite
- Tests run against the service's own database instance
- Unit tests cover business logic and utilities in isolation
- Integration tests verify module interactions with real infrastructure
- QA scripts are mandatory for every endpoint — not optional
- DB verification is mandatory after every write operation
- Docker log inspection is mandatory at the end of every QA run
- Tests must pass (0 failures) before any feature is declared done

---

## Mandatory Testing Requirements

Before declaring a feature complete, ALL of the following must be done and evidenced:

### T1 — Unit Tests (TDD)

- Write failing tests BEFORE writing implementation code
- Test files co-located in `__tests__/` or alongside source
- Required test cases per subject: happy path, boundary, null input, empty input, error input, duplicate input
- ≥95% coverage on all new code
- Coverage command: `npx jest --coverage` (backend) / `npx vitest --coverage` (frontend)

### T2 — QA Script (Mandatory Per Feature)

Every feature must have `qa/test-<feature>.sh` covering:

1. **Auth** — get admin JWT token
2. **Happy path** — 20-25 variations per endpoint
3. **Auth failures** — unauthenticated (401) and wrong-user (403/404)
4. **DTO validation** — missing required fields (400), strings too long (400), invalid enum (400), array too large (400), null values (400)
5. **Not found** — wrong IDs (404)
6. **Response shape** — required fields present; sensitive fields (`encryptedConfig`, `passwordHash`) absent
7. **DB verification** — `docker exec ... psql -tAc "SELECT COUNT(*) ..."` after every write
8. **Docker log check** — 0 `UnhandledPromiseRejection`, 0 `FATAL` in last 200 lines

Run: `bash qa/test-<feature>.sh` — must produce 0 failures.

Template in `skills/05-qa-toolkit.md`.

### T3 — DTO Fuzz Tests

For each DTO in each service:

```typescript
// apps/<service>/__tests__/dto/<name>.dto.spec.ts
describe('CreateConnectorDto', () => {
  it('rejects name over max length', () => {
    /* ... */
  });
  it('rejects missing required field', () => {
    /* ... */
  });
  it('rejects invalid enum value', () => {
    /* ... */
  });
  it('rejects array over max size', () => {
    /* ... */
  });
  it('rejects null for required string', () => {
    /* ... */
  });
  it('accepts valid minimal payload', () => {
    /* ... */
  });
});
```

### T4 — UI Manual Testing Per Component

For every new or changed UI component:

- [ ] Loading state renders correctly
- [ ] Empty state renders correctly
- [ ] Error state renders correctly
- [ ] Success state renders correctly
- [ ] Dark mode: no invisible text, no white flashes
- [ ] Arabic RTL (`ar` locale): layout mirrors correctly
- [ ] Mobile viewport (375×812): no overflow, no broken layout
- [ ] Accessibility: keyboard navigable, visible focus rings, correct aria labels

### T5 — DB Verification

After every write tested via API:

```bash
docker exec claw-pg-<service> psql -U claw -d claw_<service> -tAc \
  "SELECT COUNT(*) FROM <table> WHERE <condition>;"
```

Verify: row counts changed as expected, sensitive columns stored encrypted, deleted rows are gone.

### T6 — Docker Log Check

At the end of every QA run:

```bash
./scripts/claw.sh logs <service> --tail=200 2>/dev/null | \
  grep -cE "UnhandledPromiseRejection|FATAL|Cannot read properties of undefined"
```

Must return 0. Any non-zero count is a delivery blocker.

### T7 — QA Evidence Archive

Document evidence in `.claude/Integrations/<feature>__QA_output.md`:

- Test run date and environment
- Pass/fail counts
- DB verification results
- Docker log status
- Any bugs found and fixed

---

## Delivery Blockers (Never Ship With These)

1. TypeScript errors (`npm run typecheck` must return 0)
2. ESLint errors (`npm run lint` must return 0)
3. Failing unit or integration tests
4. QA script not written or not run
5. QA script producing failures (must be 0)
6. DB verification skipped
7. Docker logs showing `UnhandledPromiseRejection` or `FATAL`
8. Missing i18n keys in any of the 9 locales
9. Missing error state handling in new UI components
10. `storeErrorMessage` not in try-catch for fire-and-forget managers

---

## Microservice Test Isolation

Each microservice tests against its own database instance:

| Service         | Test Database                | Host Port |
| --------------- | ---------------------------- | --------- |
| Auth            | `claw_auth_test`             | 5441      |
| Chat            | `claw_chat_test`             | 5442      |
| Connector       | `claw_connectors_test`       | 5443      |
| Routing         | `claw_routing_test`          | 5444      |
| Memory          | `claw_memory_test`           | 5445      |
| File            | `claw_files_test`            | 5446      |
| Audit           | `claw_audit_test`            | 27018     |
| Ollama Service  | `claw_ollama_test`           | 5447      |
| Image           | `claw_images_test`           | 5448      |
| File Generation | `claw_file_generations_test` | 5449      |
| Agent           | `claw_agent_test`            | 5451      |
| Research        | `claw_research_test`         | 5452      |
| Workspace       | `claw_workspace_test`        | 5450      |

---

## Running Tests

### All Tests

```bash
npm run test
```

### Individual Service Tests

```bash
npm run test -w apps/claw-auth-service
npm run test -w apps/claw-chat-service
npm run test -w apps/claw-connector-service
npm run test -w apps/claw-routing-service
npm run test -w apps/claw-memory-service
npm run test -w apps/claw-file-service
npm run test -w apps/claw-audit-service
npm run test -w apps/claw-ollama-service
npm run test -w apps/claw-health-service
npm run test -w apps/claw-image-service
npm run test -w apps/claw-file-generation-service
npm run test -w apps/claw-agent-service
npm run test -w apps/claw-research-service
npm run test -w apps/claw-workspace-service
npm run test -w apps/claw-frontend
```

### Coverage

```bash
# Backend service
cd apps/claw-auth-service && npx jest --coverage

# Frontend
cd apps/claw-frontend && npx vitest --coverage
```

### Watch Mode

```bash
cd apps/claw-auth-service && npx jest --watch
cd apps/claw-frontend && npx vitest
```

---

## Backend Testing (NestJS / Jest)

### Unit Tests

**Scope**: Services, managers, utilities, guards, pipes

**Conventions:**

- File naming: `<name>.spec.ts`
- Mock all external dependencies (repositories, RabbitMQ, other services)
- Use factory functions for test data
- Mock inter-service HTTP calls

**What to test per layer:**

| Layer        | What to test                                          |
| ------------ | ----------------------------------------------------- |
| Controllers  | Route mapping, status codes, DTO validation           |
| Services     | Business logic, authorization, error paths            |
| Managers     | Multi-step orchestration, failure handling, fallbacks |
| Repositories | Query correctness (integration tests only)            |
| Guards       | Token verification, role checking, rejection          |
| Pipes        | Zod schema validation, transformation                 |
| Utilities    | Encryption, token generation, all edge cases          |

### Integration Tests

**Scope**: API endpoints with real database and service connections

**Location**: `apps/claw-<service>-service/test/`

**Conventions:**

- File naming: `<module>.e2e-spec.ts`
- Use `@nestjs/testing` to boot a full NestJS app
- Reset relevant database tables before each suite
- Mock RabbitMQ to avoid cross-service dependencies

```bash
cd apps/claw-auth-service && npx jest --config test/jest-e2e.json
```

---

## Frontend Testing (Vitest + Playwright)

### Unit Tests

**Scope**: Utilities, hooks, services, repositories, stores

**Conventions:**

- File naming: `<name>.test.ts` or `<name>.test.tsx`
- Mock HTTP calls at the repository layer
- Test data transformations, state logic, error handling

```bash
cd apps/claw-frontend && npx vitest
cd apps/claw-frontend && npx vitest src/utilities/format-date.test.ts
```

### Component Tests

**Scope**: React components in isolation

**Conventions:**

- React Testing Library — render and assert DOM output
- Test user interactions (click, type, submit)
- Mock API calls at the service/repository layer
- Test accessibility (roles, labels, keyboard navigation)

### E2E Tests (Playwright)

**Scope**: Full user journeys (all services must be running)

**Location**: `apps/claw-frontend/e2e/`

**Critical paths to cover:**

- Login → dashboard → send chat message → receive response
- Add connector → test connectivity → sync models
- Upload file → attach to chat → verify RAG in response
- Create memory → verify it appears in context assembly
- Model catalog → pull model → assign role

```bash
npm run test:e2e
cd apps/claw-frontend && npx playwright test --headed   # headed (debug)
cd apps/claw-frontend && npx playwright codegen http://localhost:3000
```

---

## Shared Package Tests

```bash
npm run test -w packages/shared-types
npm run test -w packages/shared-constants
npm run test -w packages/shared-rabbitmq
npm run test -w packages/shared-auth
```

---

## Provider Mock Adapters

For testing without real provider API keys:

```bash
USE_MOCK_PROVIDERS=true
```

When enabled:

- All provider calls return deterministic responses
- No real API keys needed
- Latency simulated (configurable)
- Error scenarios triggered with special prompt prefixes (e.g., `ERROR:timeout`)

| Feature            | Supported |
| ------------------ | --------- |
| Chat completion    | Yes       |
| Streaming          | Yes       |
| Token counting     | Estimated |
| Error simulation   | Yes       |
| Latency simulation | Yes       |
| Model listing      | Yes       |

---

## Pre-Commit Quality Gates

The pre-commit hook runs 5 steps in order (all must pass):

```bash
1. prettier --write        # Format staged files
2. npm run lint            # ESLint all workspaces (0 errors required)
3. npm run typecheck       # TypeScript strict (0 errors required)
4. npm run build           # Production build all workspaces
5. npm run test            # All tests pass
```

Never use `--no-verify`. If a hook fails, fix the underlying issue.

---

## Manual Test Matrix

Use before releases. Every item must be checked.

### Authentication

- [ ] Register a new user account
- [ ] Login with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Access token refreshes automatically on 401
- [ ] Logout clears session and invalidates refresh token
- [ ] Protected pages redirect to login when unauthenticated

### Chat

- [ ] Create a new chat thread
- [ ] Send a message and receive a response (SSE + polling fallback)
- [ ] SSE "thinking" indicator appears while response is pending
- [ ] Error state renders when provider fails (not infinite spinner)
- [ ] Parallel compare sends to multiple models and shows all results
- [ ] Message history loads on thread open
- [ ] Thread settings save model selection and persist across page reload
- [ ] File attachment visible in message; RAG context used in response

### Connectors

- [ ] Add a connector (Gemini or Ollama)
- [ ] Test connector connectivity
- [ ] Edit connector settings
- [ ] Delete a connector
- [ ] Encrypted API key never appears in any API response

### Routing

- [ ] Message routes correctly in AUTO mode
- [ ] LOCAL_ONLY mode routes exclusively to local models
- [ ] PRIVACY_FIRST mode routes to local when healthy
- [ ] Routing transparency panel shows correct decision details
- [ ] Replay lab re-runs historical decisions and shows comparison

### Memory and Context

- [ ] Create a memory; verify it appears in context assembly for next message
- [ ] Create a context pack with items; attach to thread; verify used in response
- [ ] Disable a memory; verify it no longer appears in context

### Files

- [ ] Upload a supported file type (PDF, CSV, DOCX, TXT)
- [ ] Rejected dangerous file type (`.exe`) shows 422 error
- [ ] File chunk count increases after upload processing
- [ ] File attached to message; chunks visible in context assembly debug info

### Observability

- [ ] Audit log shows login, message creation, connector CRUD events
- [ ] Server logs visible with correct service name and structured fields
- [ ] Health endpoint returns aggregated status from all services
- [ ] Usage ledger shows token counts per message

### UI Cross-Cutting

- [ ] Application loads without console errors
- [ ] Responsive layout works on 375×812 viewport (mobile)
- [ ] Dark mode: no invisible text, no white boxes or flashes
- [ ] Arabic locale: layout mirrors correctly (RTL), text is Arabic
- [ ] All new text uses i18n (no hardcoded English strings)
- [ ] All form controls use shadcn/ui (no raw `<input>`, `<select>`, `<textarea>`)
- [ ] Loading, empty, error, and success states all render correctly per page
