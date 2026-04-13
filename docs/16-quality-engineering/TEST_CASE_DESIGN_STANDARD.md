# Test Case Design Standard

> How to design, structure, and organize test cases for ClawAI.
> Every test must be traceable, reproducible, and cover a specific risk.

---

## Test Case Structure

Every test case must include these fields:

```yaml
ID: TC-<FEATURE>-<LAYER>-<NUMBER>
Title: Short description of what is being tested
Feature: The feature or module under test
Layer: unit | api | ui | integration | e2e | system | regression | uat | client
Priority: P0 | P1 | P2 | P3
Severity: S1 | S2 | S3 | S4
Preconditions:
  - List of conditions that must be true before the test runs
Seed/Setup Data:
  - Data that must exist in the database before the test
  - User accounts, threads, connectors, etc.
Role: ADMIN | OPERATOR | VIEWER (which user role executes the test)
Steps:
  1. Step-by-step instructions
  2. Each step is a single action
  3. No ambiguity -- anyone should be able to follow
Payload: (for API tests)
  method: POST
  url: /api/v1/chat-threads
  headers:
    Authorization: Bearer <JWT>
    Content-Type: application/json
  body:
    title: "Test Thread"
    routingMode: "AUTO"
Expected Results:
  API:
    status: 201
    body:
      - id: UUID format
      - title: "Test Thread"
      - routingMode: "AUTO"
  UI:
    - Thread appears in sidebar list
    - Thread title shows "Test Thread"
  DB:
    table: ChatThread
    assertions:
      - title = "Test Thread"
      - routingMode = "AUTO"
      - userId = <current user ID>
  Logs:
    - Service log: "Thread created: <id> by user: <userId>"
Cleanup:
  - DELETE /api/v1/chat-threads/<id> (or note if cleanup is automatic)
Regression Tags: [chat, thread-creation, sidebar]
Notes: Any special considerations, known limitations, or related bugs
```

---

## Severity Model

| Level | Name     | Definition                                                                  | Response Time | Examples                                                                                                                                                      |
| ----- | -------- | --------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1    | Critical | System down, data loss, security breach, or complete feature unavailability | Immediate     | Service crash loop, database corruption, auth bypass, data deletion without confirmation, message flow completely broken                                      |
| S2    | Major    | Major feature broken but system is operational, significant user impact     | Same day      | Cannot send messages in a thread, routing always fails, connector sync produces wrong data, file upload silently fails                                        |
| S3    | Minor    | Feature works but with issues, workaround exists                            | Next sprint   | Wrong label on button, loading spinner shows for 100ms then disappears, sorting is case-sensitive when it should not be, toast message disappears too quickly |
| S4    | Cosmetic | Visual or text issue, no functional impact                                  | Backlog       | 1px alignment off, inconsistent spacing between elements, typo in non-critical text, slightly wrong shade in dark mode                                        |

### Severity Assignment Rules

- **S1 if:** Data could be lost or corrupted, user cannot log in, security is compromised, a service is down.
- **S2 if:** A primary user workflow is blocked (send message, create thread, manage connectors, route decisions).
- **S3 if:** Feature works but the experience is degraded (wrong state shown, missing loading indicator, slow but functional).
- **S4 if:** Only visual appearance is affected and functionality is correct.

---

## Priority Model

| Level | Name     | Definition                                                  | Testing Requirement                                   |
| ----- | -------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| P0    | Blocker  | Must pass before any release. Failure blocks deployment.    | Tested in every test cycle. Automated.                |
| P1    | Critical | Must pass for feature completeness. Failure delays release. | Tested in every test cycle. Automated where possible. |
| P2    | Major    | Should pass. Failure is acceptable with a tracked ticket.   | Tested once per release. Manual acceptable.           |
| P3    | Minor    | Nice to have. Failure documented but does not block.        | Tested opportunistically.                             |

### Priority Assignment Rules

- **P0:** Auth flows, message send/receive, data persistence, security checks, payment (if any).
- **P1:** CRUD for all entities, routing correctness, connector management, model management.
- **P2:** Sorting, filtering, pagination, dark mode, mobile layout, non-critical UI states.
- **P3:** Tooltips, animations, edge-case empty states, cosmetic polish.

---

## Scenario Categories

Every feature must have test cases covering these categories. Not every category applies to every feature -- use judgment, but default to including more rather than fewer.

### Category 1: Happy Path

The expected, normal use case.

```yaml
ID: TC-THREAD-API-001
Title: Create a chat thread with valid data
Steps: 1. POST /api/v1/chat-threads with valid title, routingMode, systemPrompt
  2. Verify 201 response with thread data
  3. GET /api/v1/chat-threads/<id> to confirm persistence
Expected: Thread created, returned, and persisted correctly
Priority: P0
Severity: S1
```

### Category 2: Invalid Input

Required fields missing, wrong types, constraint violations.

```yaml
ID: TC-THREAD-API-002
Title: Create thread with missing title (required field)
Payload: { "routingMode": "AUTO" }  # title missing
Expected: 400 with messageKey "thread.title_required"
Priority: P1
Severity: S2

ID: TC-THREAD-API-003
Title: Create thread with title exceeding max length
Payload: { "title": "<201 characters>", "routingMode": "AUTO" }
Expected: 400 with messageKey "thread.title_too_long"
Priority: P1
Severity: S3
```

### Category 3: Missing Parameters

Omitting optional vs required parameters.

```yaml
ID: TC-THREAD-API-004
Title: Create thread with only required fields (optional fields omitted)
Payload: { 'title': 'Minimal Thread' }
Expected: 201, optional fields have default values (routingMode=AUTO, temperature=0.7, etc.)
Priority: P1
Severity: S2
```

### Category 4: Null and Undefined

Explicitly passing null or undefined values.

```yaml
ID: TC-THREAD-API-005
Title: Create thread with null systemPrompt
Payload: { 'title': 'Thread', 'systemPrompt': null }
Expected: 201, systemPrompt stored as null (not the string "null")
Priority: P2
Severity: S3
```

### Category 5: Boundary Values

Testing at the exact limits of constraints.

```yaml
ID: TC-THREAD-API-006
Title: Create thread with title at exactly max length (200 chars)
Payload: { "title": "<exactly 200 characters>" }
Expected: 201, title stored correctly
Priority: P2
Severity: S3

ID: TC-THREAD-API-007
Title: Create thread with title at max+1 length (201 chars)
Payload: { "title": "<exactly 201 characters>" }
Expected: 400, validation error
Priority: P2
Severity: S3
```

### Category 6: Enum Mismatch

Invalid enum values.

```yaml
ID: TC-THREAD-API-008
Title: Create thread with invalid routingMode
Payload: { 'title': 'Thread', 'routingMode': 'INVALID_MODE' }
Expected: 400 with validation error listing valid enum values
Priority: P1
Severity: S2
```

### Category 7: Malformed Payloads

Broken JSON, wrong content type, unexpected structure.

```yaml
ID: TC-THREAD-API-009
Title: Send malformed JSON body
Payload: "{ title: broken json }"
Expected: 400, parse error
Priority: P2
Severity: S3

ID: TC-THREAD-API-010
Title: Send request with wrong Content-Type
Headers: Content-Type: text/plain
Expected: 400 or 415
Priority: P2
Severity: S3
```

### Category 8: Error Propagation

Verify errors from downstream services are handled correctly.

```yaml
ID: TC-MESSAGE-API-020
Title: Send message when Ollama service is down
Preconditions: Ollama service stopped
Steps: 1. Send message to thread with routingMode=LOCAL_ONLY
  2. Wait for response
Expected:
  API: ASSISTANT message stored with metadata.error=true
  UI: Error message displayed (not infinite "AI is thinking...")
  Logs: Error logged in chat-service with details
Priority: P1
Severity: S2
```

### Category 9: Retry and Fallback

Verify retry logic and fallback chains.

```yaml
ID: TC-MESSAGE-API-021
Title: Primary provider fails, fallback provider succeeds
Preconditions: Primary connector unhealthy, fallback connector healthy
Steps: 1. Send message routed to primary provider
  2. Wait for response
Expected:
  API: Message completed using fallback provider
  DB: Message record shows fallback provider/model
  Logs: Retry attempt logged, fallback used
Priority: P1
Severity: S2
```

### Category 10: Race Conditions

Concurrent or rapid requests that may conflict.

```yaml
ID: TC-THREAD-API-030
Title: Rapid duplicate thread creation
Steps:
  1. Send 5 concurrent POST /api/v1/chat-threads with identical data
  2. List all threads
Expected: Either 5 threads created (if duplicates allowed) or 1 created + 4 rejected with appropriate error
Priority: P2
Severity: S3

ID: TC-MESSAGE-API-031
Title: Send message while previous message is still processing
Steps:
  1. Send message A to thread
  2. Immediately send message B to same thread (before A completes)
Expected: Both messages processed correctly, no data corruption, responses in correct order
Priority: P1
Severity: S2
```

### Category 11: Stale State

Data that was correct but is now outdated.

```yaml
ID: TC-THREAD-UI-040
Title: Thread settings updated in another tab
Steps: 1. Open thread in Tab A and Tab B
  2. Change temperature to 0.5 in Tab A, save
  3. In Tab B (still showing old value), change systemPrompt, save
Expected: Tab B should not overwrite temperature back to old value. Last-write-wins or conflict detection.
Priority: P2
Severity: S3
```

### Category 12: Concurrent Operations

Multiple users or operations on the same resource.

```yaml
ID: TC-CONNECTOR-API-050
Title: Two admins update same connector simultaneously
Steps: 1. Admin A reads connector config
  2. Admin B reads connector config
  3. Admin A updates connector name
  4. Admin B updates connector status
Expected: Both updates applied (if fields are independent) or last-write-wins with correct final state
Priority: P2
Severity: S3
```

---

## Risk-Based Test Design

Allocate more test effort to higher-risk areas:

| Area                                              | Risk Level | Minimum Test Cases | Rationale                                                 |
| ------------------------------------------------- | ---------- | ------------------ | --------------------------------------------------------- |
| Authentication (login, JWT, session)              | Critical   | 20+                | Auth bypass = security breach                             |
| Chat message flow (send, route, execute, respond) | Critical   | 30+                | Core user experience, 10-step async pipeline              |
| Routing engine (5-stage pipeline)                 | High       | 25+                | Wrong routing = wrong model = bad response                |
| Connector management (CRUD, encryption, sync)     | High       | 20+                | Encryption errors = data loss, sync errors = stale models |
| File upload (security checks, chunking)           | High       | 15+                | Security bypass = malicious file execution                |
| Memory extraction and context assembly            | Medium     | 15+                | Wrong context = irrelevant responses                      |
| Model catalog and downloads                       | Medium     | 10+                | Download failures are recoverable                         |
| Audit logging                                     | Medium     | 10+                | Missing audits = compliance risk                          |
| Thread management (CRUD, settings)                | Medium     | 10+                | Core UX but lower blast radius                            |
| Dashboard and UI chrome                           | Low        | 5+                 | Visual, no data risk                                      |
| Dark mode and responsive layout                   | Low        | 5+                 | Cosmetic                                                  |

---

## Traceability

### Requirement Traceability

Every test case must trace to either:

1. **A requirement:** "Users can create chat threads" maps to TC-THREAD-API-001 through TC-THREAD-API-010.
2. **A bug:** "BUG-123: Thread creation fails with null systemPrompt" maps to TC-THREAD-API-005 (regression test).
3. **A security concern:** "SQL injection in thread title" maps to TC-THREAD-API-060.

### Traceability Matrix Template

| Requirement / Bug          | Test Case IDs                                | Status               |
| -------------------------- | -------------------------------------------- | -------------------- |
| REQ: Create chat thread    | TC-THREAD-API-001 to 010                     | All passing          |
| REQ: Thread routing modes  | TC-THREAD-API-008, TC-ROUTING-API-001 to 010 | All passing          |
| BUG-123: Null systemPrompt | TC-THREAD-API-005                            | Passing (regression) |
| SEC: Input validation      | TC-THREAD-API-060 to 065                     | All passing          |

---

## Test Naming Conventions

### Unit Tests (Jest / Vitest)

```typescript
describe('ChatService', () => {
  describe('createThread', () => {
    it('should create a thread with valid data and return it', () => { ... });
    it('should throw EntityNotFoundException when user does not exist', () => { ... });
    it('should publish thread.created event after successful creation', () => { ... });
    it('should set default routingMode to AUTO when not provided', () => { ... });
  });
});
```

Pattern: `should <expected behavior> when <condition>`

### API Tests

```
TC-<MODULE>-API-<NUMBER>: <Action> <condition>
TC-THREAD-API-001: Create thread with valid data
TC-THREAD-API-002: Create thread with missing title
TC-THREAD-API-003: Create thread with expired JWT
```

### UI Tests

```
TC-<MODULE>-UI-<NUMBER>: <User action> <expected result>
TC-THREAD-UI-001: Click 'New Thread' button creates thread and navigates to it
TC-THREAD-UI-002: Thread list shows loading skeleton while fetching
TC-THREAD-UI-003: Empty thread list shows empty state with CTA
```

---

## Test Data Management

### Seed Data

Tests must not depend on manually created data. Use:

1. **Database seeds** (`prisma/seed.ts`) for baseline data (admin user, default routing policies).
2. **Test fixtures** in `__fixtures__/` folders for reusable test data.
3. **Factory functions** for creating test entities programmatically.

### Test Isolation

- Each test creates its own data and cleans up after itself.
- Tests must not depend on execution order.
- Tests must not share mutable state.
- Database tests use transactions that roll back after each test (where possible).

### Example Factory

```typescript
// test/factories/thread.factory.ts
export function buildThread(overrides: Partial<ChatThread> = {}): ChatThread {
  return {
    id: randomUUID(),
    title: 'Test Thread',
    userId: 'test-user-id',
    routingMode: RoutingMode.AUTO,
    systemPrompt: null,
    temperature: 0.7,
    maxTokens: 4096,
    contextPackIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## Test Layers Summary

| Layer           | Tool                   | Location                               | Runs In          | What It Tests                                       |
| --------------- | ---------------------- | -------------------------------------- | ---------------- | --------------------------------------------------- |
| Unit (backend)  | Jest                   | `apps/claw-*-service/src/**/*.spec.ts` | CI + pre-commit  | Individual methods in isolation                     |
| Unit (frontend) | Vitest                 | `apps/claw-frontend/src/**/*.test.ts`  | CI + pre-commit  | Hooks, utilities, component render                  |
| API             | curl / Jest+supertest  | Manual or `test/api/`                  | Dev environment  | Endpoint contract, auth, validation                 |
| Integration     | Jest                   | `test/integration/`                    | Dev environment  | Multi-layer (service -> repo -> DB)                 |
| E2E             | Playwright             | `apps/claw-frontend/e2e/`              | Dev environment  | Full browser flow                                   |
| System          | Shell scripts + curl   | `scripts/`                             | Dev/staging      | All services healthy, end-to-end flow               |
| Regression      | All of above           | Tagged with regression tags            | Every test cycle | Previously broken functionality still works         |
| UAT             | Manual                 | Test plan document                     | Pre-release      | Business acceptance criteria met                    |
| Client          | Manual browser testing | Browser DevTools                       | Pre-release      | Console errors, network, responsive, dark mode, RTL |
