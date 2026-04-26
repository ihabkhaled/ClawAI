# TDD and Unit Testing Standard

> Tests are written before or alongside code — never retroactively.
> A function without a test is unfinished work, not a future task.
> Passing 100% line coverage with no scenario coverage is not testing — it is paperwork.

---

## TDD Philosophy for ClawAI

Test-Driven Development in ClawAI means tests define behavior, not just verify it after the fact. Every new function, method, or component must have tests that:

1. Specify exactly what the code is supposed to do (happy path).
2. Specify what the code must NOT do (bad inputs, missing data, auth violations).
3. Specify how the code behaves at the edges (empty arrays, null values, exactly-at-limits).
4. Specify what happens when dependencies fail (repository returns null, Ollama times out, RabbitMQ is down).

### The Three Failures of Fake Testing

**Fake test 1 — Testing the mock:** A test that only verifies `service.createThread` was called with the correct arguments, without verifying what happens to the result, is not testing behavior. It is testing that you called a function.

**Fake test 2 — Happy-path-only coverage:** A service test that only tests the success case achieves 90% line coverage while leaving every error path, null return, and ownership violation untested. The 10% you skipped is where the bugs live.

**Fake test 3 — Test description lying about the test:** A test named `"should return 400 for invalid input"` that calls the function with valid input and expects a 200 is worse than no test — it creates false confidence.

---

## When to Write Tests

| Scenario                   | When Tests Are Written                                         |
| -------------------------- | -------------------------------------------------------------- |
| New function or method     | Write the test first (or simultaneously). Never after.         |
| Bug fix                    | Write a failing test that reproduces the bug. Then fix it.     |
| Refactor                   | Tests must exist before refactoring begins. Do not add during. |
| DTO/schema change          | Update tests immediately when the schema changes.              |
| Enum value added           | Add a test case for the new enum value in every switch/branch. |
| New routing pipeline stage | Write unit tests for the new stage before wiring it in.        |

**The TDD cycle for ClawAI:**

```
1. Write a failing test describing the desired behavior.
2. Write the minimum code to make the test pass.
3. Refactor the code (keep tests passing).
4. Add tests for the next scenario.
5. Repeat.
```

---

## Section 1: Backend Unit Test Targets

### 1.1 Controller Files (`*.controller.ts`)

Controllers have exactly one responsibility: extract params, call a service method, return the result. Tests verify this delegation, not business logic.

**Mandatory test scenarios for every controller method:**

```typescript
// EXAMPLE: RoutingController.replayRun()
describe('RoutingController', () => {
  describe('replayRun', () => {
    it('should call routingService.replayRun with the correct DTO and userId', async () => {
      const dto: ReplayRoutingDto = { limit: 50, saveRun: true, runName: 'test' };
      const user: UserPayload = { id: 'user-1', role: UserRole.ADMIN };
      mockRoutingService.replayRun.mockResolvedValue(mockReplayResult);

      const result = await controller.replayRun(dto, user);

      expect(mockRoutingService.replayRun).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toBe(mockReplayResult);
    });

    it('should return whatever the service returns without transformation', async () => {
      // Controllers NEVER transform — verify pass-through
      const serviceResult = { totalReplayed: 10, changedCount: 3 };
      mockRoutingService.replayRun.mockResolvedValue(serviceResult);

      const result = await controller.replayRun(dto, user);

      expect(result).toStrictEqual(serviceResult);
    });
  });
});
```

**What NOT to test in controllers:**

- Business logic (does not exist there)
- Zod validation (tested in DTO tests)
- Database queries (do not exist there)
- Error throwing (no try/catch in controllers)

### 1.2 Service Files (`*.service.ts`)

Services contain business logic. This is where the majority of unit tests live.

**Mandatory test scenarios per service method:**

1. **Happy path:** valid inputs, expected output, correct delegation to repo/manager.
2. **Entity not found:** repo returns `null`; service throws `EntityNotFoundException`.
3. **Ownership violation:** entity belongs to different user; service throws with `FORBIDDEN`.
4. **Invalid state transition:** e.g., cannot activate a connector that is in `ERROR` state.
5. **Delegation verification:** service calls the correct repo/manager method with correct args.
6. **Event publication:** service publishes the correct RabbitMQ event on success.

**Example:**

```typescript
// EXAMPLE: RoutingService.getReplayRun()
describe('RoutingService', () => {
  describe('getReplayRun', () => {
    it('should return the run when it exists and belongs to the requesting user', async () => {
      mockRepo.findRunById.mockResolvedValue({ id: 'run-1', userId: 'user-1' });
      const result = await service.getReplayRun('run-1', 'user-1');
      expect(result).toEqual({ id: 'run-1', userId: 'user-1' });
    });

    it('should throw EntityNotFoundException when run does not exist', async () => {
      mockRepo.findRunById.mockResolvedValue(null);
      await expect(service.getReplayRun('run-1', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw BusinessException with FORBIDDEN when run belongs to another user', async () => {
      mockRepo.findRunById.mockResolvedValue({ id: 'run-1', userId: 'other-user' });
      await expect(service.getReplayRun('run-1', 'user-1')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });
  });
});
```

### 1.3 Manager Files (`*.manager.ts`)

Managers handle complex orchestration. Tests must cover all decision paths, fallback chains, and failure modes.

**Mandatory test scenarios per manager method:**

1. **Happy path:** all dependencies succeed; expected result produced.
2. **External dependency failure:** Ollama is down; fallback to heuristic routing.
3. **Partial failure:** one provider succeeds in a parallel call; allSettled correctly handled.
4. **Timeout:** Ollama takes longer than `OLLAMA_ROUTER_TIMEOUT_MS`; timeout is respected.
5. **Empty input:** empty message content; routing decision still produced (not a crash).
6. **Privacy enforcement:** message with privacy keywords; LOCAL_ONLY enforced.
7. **Fire-and-forget background tasks:** verify the async operation is triggered, not awaited.

**Testing fire-and-forget managers (critical pattern):**

```typescript
// ReplayManager.executeInBackground() — NEVER awaited in production
describe('ReplayManager', () => {
  describe('executeInBackground', () => {
    it('should initiate the background task and return without waiting', async () => {
      const runPromise = manager.executeInBackground(dto, userId);

      // Verify it returns quickly (does not block)
      await expect(runPromise).resolves.toBeUndefined();

      // Verify the background work was started (use jest.useFakeTimers or mock the function)
      expect(mockReplayService.runBatch).toHaveBeenCalledTimes(1);
    });

    it('should log and swallow errors in background task — not propagate to caller', async () => {
      mockReplayService.runBatch.mockRejectedValue(new Error('Ollama down'));

      // Should NOT reject — errors are swallowed in fire-and-forget
      await expect(manager.executeInBackground(dto, userId)).resolves.toBeUndefined();

      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('background task failed'),
        expect.any(String),
      );
    });
  });
});
```

### 1.4 Repository Files (`*.repository.ts`)

Repositories are pure data access. Tests verify query shape and correct Prisma mock delegation, not actual database behavior.

**Mandatory test scenarios per repository method:**

1. **Found:** mock returns a record; repository returns it.
2. **Not found:** mock returns `null`; repository returns `null` (NEVER throws).
3. **Prisma called with correct args:** verify the exact `where`, `include`, `skip`, `take` passed to Prisma mock.
4. **Array result:** mock returns array; repository returns the same array.
5. **Empty array:** mock returns `[]`; repository returns `[]` (never `null`).

**Key rule:** Repositories NEVER throw. If Prisma returns null, the repository returns null. The service decides what to do.

```typescript
// EXAMPLE: RoutingRepository.findRunById()
describe('RoutingRepository', () => {
  describe('findRunById', () => {
    it('should return the run when found', async () => {
      mockPrisma.replayRun.findUnique.mockResolvedValue(mockRun);
      const result = await repo.findRunById('run-1');
      expect(result).toBe(mockRun);
    });

    it('should return null when not found — never throw', async () => {
      mockPrisma.replayRun.findUnique.mockResolvedValue(null);
      const result = await repo.findRunById('run-1');
      expect(result).toBeNull();
    });

    it('should call prisma.findUnique with the correct id', async () => {
      await repo.findRunById('run-1');
      expect(mockPrisma.replayRun.findUnique).toHaveBeenCalledWith({
        where: { id: 'run-1' },
      });
    });
  });
});
```

### 1.5 DTO / Zod Schema Files

Every Zod schema must be tested independently. Do not assume Zod "just works."

**Mandatory test scenarios for every Zod schema:**

1. **Happy path:** valid complete input; `.safeParse()` returns `success: true`.
2. **Missing required field:** omit each required field individually; expect `success: false`.
3. **Invalid type:** pass wrong type for each field (string where number expected, etc.).
4. **Below minimum:** value below `.min()` constraint; expect `success: false`.
5. **At minimum (boundary):** value exactly at `.min()`; expect `success: true`.
6. **Above maximum:** value above `.max()` constraint; expect `success: false`.
7. **At maximum (boundary):** value exactly at `.max()`; expect `success: true`.
8. **Array too long:** array exceeding `.max()` item count; expect `success: false`.
9. **Empty string where content required:** `""` for a `.min(1)` field; expect `success: false`.
10. **Default values:** omit optional field with default; verify default is applied.
11. **Enum rejection:** invalid enum value; expect `success: false`.

```typescript
// EXAMPLE: ReplayRoutingDto schema tests
describe('ReplayRoutingDtoSchema', () => {
  it('should accept valid input with all optional fields omitted', () => {
    const result = ReplayRoutingDtoSchema.safeParse({ limit: 50 });
    expect(result.success).toBe(true);
  });

  it('should reject limit of 0', () => {
    const result = ReplayRoutingDtoSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit of 1001 (above max)', () => {
    const result = ReplayRoutingDtoSchema.safeParse({ limit: 1001 });
    expect(result.success).toBe(false);
  });

  it('should reject runName exceeding max length', () => {
    const result = ReplayRoutingDtoSchema.safeParse({
      limit: 10,
      runName: 'x'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('should default saveRun to false when omitted', () => {
    const result = ReplayRoutingDtoSchema.safeParse({ limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.saveRun).toBe(false);
    }
  });
});
```

### 1.6 Utility Files (`*.utility.ts`)

Every branch of every utility function must be tested.

**Mandatory test scenarios:**

1. Normal input — expected output.
2. Edge case input — boundary value output.
3. Every `if` branch.
4. Every fallback/default path.
5. null input (if the function accepts unknown input).
6. Empty string or empty array input.

---

## Section 2: Frontend Unit Test Targets

### 2.1 Controller Hooks

The controller hook is the brain of a page. It must be thoroughly tested.

**Mandatory test scenarios:**

1. **Initial state:** all state values at their defaults before any interaction.
2. **Query loading state:** `isLoading` is true; component receives correct loading props.
3. **Query success state:** data returned; component receives mapped props.
4. **Query error state:** error returned; component receives error props.
5. **Mutation delegation:** mutation function called with correct args when handler invoked.
6. **Invalidation on success:** TanStack Query cache is invalidated after mutation succeeds.
7. **Pagination state change:** page increment/decrement changes the query param correctly.
8. **Filter state change:** updating a filter re-triggers the query with new params.

```typescript
// EXAMPLE: use-replay-lab-page.test.ts
describe('useReplayLabPage', () => {
  it('should initialize with page 1 and default filters', () => {
    const { result } = renderHook(() => useReplayLabPage());
    expect(result.current.currentPage).toBe(1);
    expect(result.current.filters).toEqual(DEFAULT_REPLAY_FILTERS);
  });

  it('should increment page and refetch when nextPage is called', async () => {
    const { result } = renderHook(() => useReplayLabPage());
    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(2);
  });
});
```

### 2.2 Data Transformation Utilities

Any function that maps, formats, or transforms data must have full branch coverage.

**Examples:**

- `formatConfidenceDelta(old: number, new: number): string` — positive delta, negative delta, zero delta, NaN guard.
- `mapOutcomeLabelToColor(label: ReplayOutcomeLabel): string` — every enum value maps to a color; missing enum throws or defaults.
- `buildReplayFilterParams(filters: ReplayFilters): URLSearchParams` — all filters applied; empty filters produce empty params.

### 2.3 Repository Functions

Frontend repository functions make API calls. Tests verify the correct URL, method, headers, and payload are sent.

```typescript
// EXAMPLE: routing.repository.test.ts
describe('routingRepository.getReplayRuns', () => {
  it('should call GET /api/v1/routing/replay/runs with page and limit params', async () => {
    mockHttpClient.get.mockResolvedValue({ data: [] });
    await routingRepository.getReplayRuns({ page: 2, limit: 10 });
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/routing/replay/runs', {
      params: { page: 2, limit: 10 },
    });
  });
});
```

---

## Section 3: Mandatory Scenario Sets

Every test suite MUST include these scenarios. Missing any of them requires explicit justification in a code review comment.

| Scenario                     | What to Test                                                        | Why It Matters                                     |
| ---------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| **Happy path**               | Valid inputs produce expected output                                | Confirms the feature works                         |
| **Bad path**                 | Invalid inputs produce the correct error                            | Confirms validation works                          |
| **Missing required param**   | Each required field omitted individually                            | Catches partial validation bugs                    |
| **Boundary: at minimum**     | Value exactly at `.min()` is accepted                               | Confirms off-by-one is correct                     |
| **Boundary: below minimum**  | Value one below `.min()` is rejected                                | Confirms lower bound is enforced                   |
| **Boundary: at maximum**     | Value exactly at `.max()` is accepted                               | Confirms upper bound allows the limit itself       |
| **Boundary: above maximum**  | Value one above `.max()` is rejected                                | Confirms upper bound is enforced                   |
| **null input**               | Function handles null without throwing or returning wrong type      | Prevents NPE in production                         |
| **undefined input**          | Function handles undefined without throwing                         | Prevents undefined-propagation bugs                |
| **Empty array**              | Function handles `[]` correctly (returns `[]`, not null, not crash) | Prevents empty-state rendering bugs                |
| **Empty string**             | Function handles `""` correctly per the business rule               | Prevents silent empty-data acceptance              |
| **Duplicate / idempotent**   | Calling the same operation twice produces the correct result        | Prevents double-insert and double-event bugs       |
| **Fallback path**            | Primary dependency fails; fallback is invoked                       | Confirms resilience logic works                    |
| **Error propagation**        | Error from downstream is surfaced (or swallowed) as intended        | Confirms error contracts are honored               |
| **Fire-and-forget resolves** | Background tasks resolve without blocking the caller                | Prevents hanging requests                          |
| **Auth: owner**              | Resource owner can perform the operation                            | Confirms access control allows legitimate access   |
| **Auth: non-owner**          | Non-owner receives FORBIDDEN                                        | Confirms access control blocks illegitimate access |
| **Auth: wrong role**         | Insufficient role receives FORBIDDEN                                | Confirms RBAC is enforced                          |

---

## Section 4: Test Isolation Rules

### 4.1 Mock Boundaries

**Mock at the correct boundary:**

| Layer            | Mock This                             | Do NOT Mock This                       |
| ---------------- | ------------------------------------- | -------------------------------------- |
| Service tests    | Repository, Manager, RabbitMQService  | Service itself, Zod schemas            |
| Manager tests    | HttpRequest, AppConfig, Logger        | Internal private methods               |
| Repository tests | PrismaService (mockDeep)              | Repository itself                      |
| Controller tests | Service                               | Guards, interceptors (test separately) |
| Hook tests       | TanStack Query (msw or mock function) | React itself                           |

**Rule:** Never mock the system under test. Only mock its dependencies.

### 4.2 No Test-to-Test Contamination

Every test must be fully independent. A test that passes only when run after another test is a broken test.

```typescript
// MANDATORY in every backend test file
beforeEach(() => {
  jest.clearAllMocks();
});

// MANDATORY in every frontend test file
beforeEach(() => {
  vi.clearAllMocks();
});
```

Why `clearAllMocks()` in `beforeEach` is mandatory:

- `mockReturnValue` from one test bleeds into the next test if not cleared.
- A test that passes in isolation but fails in suite is harder to debug than a test that always fails.
- Unexpected mock call counts from previous tests corrupt `toHaveBeenCalledTimes` assertions.

### 4.3 Isolated Mock Instances for Background Task Tests

Tests for fire-and-forget patterns (e.g., `ReplayManager.executeInBackground`) must use `jest.useFakeTimers()` or explicit promise resolution to control timing. Never rely on setTimeout-based behavior resolving naturally in a test.

```typescript
describe('background task isolation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
```

---

## Section 5: Coverage Philosophy

### What Good Coverage Means

Good coverage in ClawAI means:

1. Every **business rule** is expressed as a test — not just every line of code.
2. Every **error path** is tested — not just the happy path.
3. Every **boundary value** is tested — not just typical values.
4. Every **enum value** used in a switch or conditional is tested.
5. Every **fallback chain** has a test for primary failure AND fallback invocation.

### What Fake Coverage Looks Like

**Do NOT do these things — they produce line coverage numbers without real quality:**

```typescript
// FAKE COVERAGE: Testing that a function runs without crashing
it('should run without errors', async () => {
  await expect(service.createThread(dto, userId)).resolves.not.toThrow();
  // No assertion about what was RETURNED or CALLED
});

// FAKE COVERAGE: Mocking the return value and asserting the same value back
it('should return the run', async () => {
  mockRepo.findRunById.mockResolvedValue(mockRun);
  const result = await service.getReplayRun('run-1', 'user-1');
  expect(result).toBe(mockRun); // Only tests that the mock was passed through — not any logic
});

// FAKE COVERAGE: Testing only the success case for a function with 5 error paths
it('should create a routing policy', async () => {
  mockRepo.create.mockResolvedValue(mockPolicy);
  const result = await service.createPolicy(dto, userId);
  expect(result).toBe(mockPolicy);
  // No test for: duplicate name, invalid mode, auth failure, DB error
});
```

### Why Line Coverage ≠ Quality

A function with this implementation:

```typescript
async function replayDecision(decision: RoutingDecision): Promise<ReplayResult> {
  if (!decision.messageContent) return buildSkippedResult(decision);
  const newDecision = await rerouteDecision(decision);
  return buildResult(decision, newDecision);
}
```

Can achieve 100% line coverage with ONE test (happy path). But real coverage requires four tests:

1. Happy path: `messageContent` exists; `rerouteDecision` succeeds.
2. Empty content: `messageContent` is `null`; skipped result returned.
3. Reroute failure: `rerouteDecision` throws; error propagated correctly.
4. Empty string content: `messageContent` is `""`; treated same as null.

### Branch Coverage and Scenario Coverage Matter More

Aim for:

- **100% branch coverage** (every `if`, `else`, `switch` arm, ternary branch tested).
- **Scenario coverage** (every business rule in the acceptance criteria has a corresponding test).

A 75% line coverage with 100% branch coverage and all AC scenarios tested is far better than 100% line coverage achieved by running the happy path through deeply nested code.

### Mandatory Coverage Floor (added 2026-04-26)

Every microservice and the frontend MUST report **≥92 %** on all four jest/vitest metrics: statements, branches, functions, lines. This is the flagship floor — branch coverage above the floor is the quality target.

Per-service `jest.config.ts`:

```ts
coverageThreshold: {
  global: {
    statements: 92,
    branches: 92,
    functions: 92,
    lines: 92,
  },
},
```

Frontend `vitest.config.ts`:

```ts
coverage: {
  provider: 'v8',
  thresholds: {
    statements: 92,
    branches: 92,
    functions: 92,
    lines: 92,
  },
}
```

CI runs `npm run test -- --coverage` and fails on any metric drop. **Coverage is ratcheted only upward** — never lower a threshold to land a change.

A service below 92 % blocks delivery. The fix is more tests, not a lower threshold.

---

## Section 6: Test Naming Conventions

**Format:** `"should [do X] when [condition Y]"`

```typescript
// GOOD — describes behavior and condition
it('should return null when run does not exist', ...)
it('should throw EntityNotFoundException when routing decision is not found', ...)
it('should route to LOCAL_ONLY when message contains privacy keywords', ...)
it('should default page to 1 when page param is omitted', ...)
it('should reject limit greater than 1000', ...)

// BAD — vague, not testable from description alone
it('should work', ...)
it('returns data', ...)
it('handles error', ...)
it('test pagination', ...)
```

**Describe block naming:**

```typescript
describe('RoutingService', () => {
  describe('replayRun', () => {
    // Tests for the replayRun method
  });

  describe('getReplayRun', () => {
    // Tests for the getReplayRun method
  });
});
```

---

## Section 7: Test File Placement Rules

| What is being tested         | Test file location                                                      |
| ---------------------------- | ----------------------------------------------------------------------- |
| Backend service/manager/repo | `apps/<service>/src/modules/<domain>/__tests__/<name>.spec.ts`          |
| Backend DTO/Zod schema       | `apps/<service>/src/modules/<domain>/__tests__/<name>.dto.spec.ts`      |
| Backend utility              | `apps/<service>/src/common/utilities/__tests__/<name>.utility.spec.ts`  |
| Frontend controller hook     | `apps/claw-frontend/src/hooks/<domain>/__tests__/use-<name>.test.ts`    |
| Frontend repository          | `apps/claw-frontend/src/repositories/<domain>/__tests__/<name>.test.ts` |
| Frontend utility             | `apps/claw-frontend/src/utilities/__tests__/<name>.utility.test.ts`     |

---

## Section 8: ClawAI-Specific Test Patterns

### 8.1 Testing AppConfig

Never use real `process.env` values in tests. Mock `AppConfig` directly:

```typescript
const mockAppConfig = {
  OLLAMA_BASE_URL: 'http://localhost:11434',
  OLLAMA_ROUTER_TIMEOUT_MS: 5000,
  ROUTING_SERVICE_URL: 'http://localhost:4004',
} as AppConfig;

// In test setup
jest.mock('@/config/app.config', () => ({
  AppConfig: jest.fn(() => mockAppConfig),
}));
```

### 8.2 Testing Zod DTOs

Always use `.safeParse()` in tests — never `.parse()`. `.parse()` throws on failure and produces confusing test output.

```typescript
// CORRECT
const result = ReplayRoutingDtoSchema.safeParse(input);
expect(result.success).toBe(false);
if (!result.success) {
  expect(result.error.issues[0].path).toContain('limit');
}

// WRONG
expect(() => ReplayRoutingDtoSchema.parse(input)).toThrow();
// This tells you it threw, but not what validation failed
```

### 8.3 Testing Polling Hooks with Metadata Detection

The frontend polling pattern (used in chat and replay) detects a "done" state via metadata flags. Tests must verify both the still-polling and done states:

```typescript
// use-replay-polling.test.ts
it('should continue polling when result has no completedAt timestamp', () => {
  mockUseQuery.mockReturnValue({ data: { status: 'running', completedAt: null } });
  const { result } = renderHook(() => useReplayPolling(runId));
  expect(result.current.isPolling).toBe(true);
});

it('should stop polling when completedAt timestamp is present', () => {
  mockUseQuery.mockReturnValue({ data: { status: 'done', completedAt: '2026-04-13T00:00:00Z' } });
  const { result } = renderHook(() => useReplayPolling(runId));
  expect(result.current.isPolling).toBe(false);
});

it('should stop polling after 90 attempts (safety net)', () => {
  // Verify max poll count is enforced
  const { result } = renderHook(() => useReplayPolling(runId));
  act(() => {
    result.current.incrementPollCount(91);
  });
  expect(result.current.isPolling).toBe(false);
});
```

### 8.4 Mock Pattern for RabbitMQ

```typescript
const mockRabbitMQService = {
  publish: jest.fn().mockResolvedValue(undefined),
} as unknown as RabbitMQService;

// Verify event was published with correct pattern and payload
expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
  RoutingEventPatterns.DECISION_MADE,
  expect.objectContaining({
    decisionId: expect.any(String),
    selectedProvider: ProviderEnum.ANTHROPIC,
  }),
);
```

### 8.5 Mock Pattern for httpRequest (Frontend Repositories)

```typescript
// In test file
vi.mock('@/utilities/http-client.utility', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { httpClient } from '@/utilities/http-client.utility';
const mockGet = vi.mocked(httpClient.get);

// In test
mockGet.mockResolvedValueOnce({ data: mockRunsList });
```

### 8.6 Prisma Mock Pattern (Backend)

Use `jest-mock-extended` with `mockDeep` for Prisma:

```typescript
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

let mockPrisma: DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockPrisma = mockDeep<PrismaClient>();
  // Inject into repository
  repo = new RoutingRepository(mockPrisma);
  jest.clearAllMocks();
});

// Use in tests
mockPrisma.replayRun.findUnique.mockResolvedValue(mockRun);
mockPrisma.replayRun.findMany.mockResolvedValue([mockRun]);
mockPrisma.replayRun.create.mockResolvedValue(mockRun);
```
