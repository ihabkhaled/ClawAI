# Quality Engineering Operating System

> The complete lifecycle for delivering production-grade features and fixes in ClawAI.
> Every phase is mandatory. Skipping a phase means the work is incomplete.

---

## Core Principles

1. **A feature is not implemented when the code compiles.** It is implemented when: the code has been reviewed against architecture rules, tested across all layers (unit, API, UI, integration, DB, logs, events), regressions are covered, UAT passes, and documentation is updated.

2. **A bug is not fixed when the symptom disappears.** It is fixed when: the root cause is understood and documented, a test covers the exact failure mode, adjacent regressions have been checked, stale state and caches have been verified clean, and UAT confirms the fix in context.

3. **Every changed line creates a testing obligation.** A one-line change to a Zod schema requires: a unit test for the new constraint, an API test confirming rejection of invalid input, and a UI test confirming the error message renders correctly.

4. **Never trust a single validation layer.** Zod validates the DTO. The service validates ownership. The repository returns null on not-found. The frontend shows an error state. The Nginx proxy enforces rate limits. Each layer must independently handle failure.

5. **Mandatory output for every feature delivery:**
   - Changed files summary (with line counts)
   - Affected services list
   - Test plan document
   - Test cases (with IDs, steps, expected results)
   - Executed evidence (screenshots, curl output, log snippets)
   - Bug list (found during QA)
   - Fixes list (what was fixed and how)
   - Regression summary (what was re-tested after fixes)
   - Documentation updates list
   - Release readiness checklist (signed off)

---

## Phase A: Requirement and Risk Understanding

**Goal:** Fully understand what is being built or fixed before touching any code.

### A1. Restate the Feature or Bug

Write a plain-language summary of the work. If you cannot explain it in two sentences, you do not understand it yet.

- **Feature example:** "Add a 'duplicate thread' button to the chat page that creates a new thread with the same settings (routing mode, system prompt, temperature, max tokens, context packs) but no messages."
- **Bug example:** "When a user sends a message with a file attachment and the file-service is down, the chat page shows 'AI is thinking...' indefinitely instead of an error message."

### A2. Identify the Business Problem

Why does this matter? Who is affected? What is the user impact if this is not delivered or if it regresses?

### A3. Determine Technical Scope

For every feature or bug, explicitly enumerate:

| Dimension                 | What to Check                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **Backend services**      | Which of the 13 services are touched? List by name (e.g., claw-chat-service, claw-file-service). |
| **Frontend pages**        | Which pages in `src/app/(portal)/` are affected?                                                 |
| **Frontend components**   | Which components in `src/components/` change?                                                    |
| **Database schemas**      | Any Prisma schema or MongoDB collection changes? Which DB (claw_chat, claw_files, etc.)?         |
| **RabbitMQ events**       | New events? Changed payloads? New consumers? Check the event bus table in CLAUDE.md.             |
| **API endpoints**         | New or modified endpoints? Check Nginx route map.                                                |
| **Shared packages**       | Changes to `shared-types`, `shared-constants`, `shared-rabbitmq`, `shared-auth`?                 |
| **Environment variables** | New or renamed env vars? Affects `.env`, `.env.example`, install scripts, Docker compose files.  |
| **Docker compose**        | New containers, volumes, ports, depends_on, healthchecks? All 4 compose files.                   |
| **Nginx config**          | New upstream, location block, SSE route?                                                         |
| **CI pipeline**           | New service in Prisma generate loop? New test env vars?                                          |
| **i18n locales**          | New user-facing text? All 8 locales (en, ar, de, es, fr, it, pt, ru).                            |
| **Documentation**         | CLAUDE.md, docs/ folder, service-specific docs?                                                  |
| **Seed data**             | New default records (catalog entries, routing policies, admin user data)?                        |

### A4. Define Success Criteria

Write explicit, testable statements:

- "POST /api/v1/chat-threads with `{ sourceThreadId }` returns 201 with a new thread that has identical settings."
- "The duplicated thread appears in the sidebar thread list within 2 seconds."
- "The original thread is unchanged after duplication."

### A5. Define Failure Criteria

What should NOT happen:

- "Messages from the original thread must NOT be copied."
- "If the source thread does not exist, the API must return 404 with messageKey `thread.not_found`."
- "The duplicate button must NOT appear for threads the user does not own."

### A6. Identify Risks

| Risk                                                         | Mitigation                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Context packs referenced by the thread may have been deleted | Validate pack IDs exist before copying; skip deleted packs                     |
| Race condition if user rapidly clicks duplicate              | Debounce on frontend; idempotency check on backend                             |
| Thread settings schema changes in future                     | Copy field-by-field, not spread operator, so new fields are explicitly handled |

---

## Phase B: Baseline Audit

**Goal:** Understand what already exists before writing new code.

### B1. Inspect Existing Code

For every affected service and frontend module:

1. **Read the controller** -- understand existing endpoints, parameter extraction, response shape.
2. **Read the service** -- understand business logic, validation, ownership checks, event publishing.
3. **Read the repository** -- understand data access patterns, what queries exist.
4. **Read the manager** (if any) -- understand orchestration logic.
5. **Read the DTOs** -- understand current validation rules, what Zod schemas exist.
6. **Read the types** -- understand current type definitions.
7. **Read the frontend hooks** -- understand current data fetching and mutation patterns.
8. **Read the frontend components** -- understand current UI composition.

### B2. Identify Related Methods Across Layers

Map the call chain for the feature area:

```
Frontend page
  -> Controller hook (useXxx)
    -> Mutation hook (useCreateXxx)
      -> Repository method (xxxRepository.create)
        -> API endpoint (POST /api/v1/xxx)
          -> Controller method (XxxController.create)
            -> Service method (XxxService.create)
              -> Repository method (XxxRepository.create)
                -> Prisma query
              -> Event publish (xxx.created)
```

### B3. Audit Existing Tests

For every file that will be modified:

- Does a `.spec.ts` test file exist?
- What scenarios are already covered?
- What scenarios are missing?
- Are the tests actually testing behavior or just asserting that mocks were called?

### B4. Check for Duplication Risk

Before creating any new utility, hook, type, or component:

- Search the codebase for similar functionality.
- Check `src/utilities/` for existing utility wrappers.
- Check `src/hooks/` for existing hooks that could be extended.
- Check `src/types/` for existing types that already model the data.

### B5. Identify Documentation to Update

List every document that will need changes after the feature is complete. Reference the 18-item checklist from CLAUDE.md.

---

## Phase C: Code Review / PR Review

**Goal:** Every changed file is reviewed for correctness, architecture compliance, and completeness.

### C1. Architecture Violations

Review every changed file against these rules:

| File Type            | Rule                                | What to Check                                                                               |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `*.controller.ts`    | 3-line methods                      | Extract params, call ONE service method, return. No try/catch, no throw, no business logic. |
| `*.service.ts`       | Max 30 lines/method                 | No god-methods. Split complex logic into private helpers or delegate to managers.           |
| `*.manager.ts`       | Max 80 lines/method, complexity 15  | Each private helper under 30 lines. Clear naming.                                           |
| `*.repository.ts`    | Pure data access                    | No throw. No business logic. Return data or null.                                           |
| `*.tsx` (components) | Render-only                         | No inline hooks, types, constants, utility functions. One controller hook max.              |
| `*.ts` (hooks)       | Single responsibility, max 50 lines | No inline types, constants. One hook = one thing.                                           |

### C2. Missing Validation

For every endpoint that accepts input:

- [ ] Zod schema exists in `dto/` folder
- [ ] Every `z.string()` has `.max()` with a reasonable limit
- [ ] Every `z.array()` has `.max()` with a reasonable limit
- [ ] Every `z.number()` has `.min()` and `.max()` where appropriate
- [ ] Enum fields use `z.nativeEnum(MyEnum)`, not `z.enum(['a', 'b'])`
- [ ] Optional fields use `.optional()` or `.nullish()`, not implicit undefined

### C3. Null Handling

- [ ] No `!` non-null assertions anywhere
- [ ] Repository methods that return nullable are handled with explicit null checks
- [ ] Frontend optional chaining (`?.`) used where data may be undefined
- [ ] Loading states render before data is available (no "cannot read property of undefined")

### C4. Error Handling

- [ ] Services throw `BusinessException` with a machine-readable `code` string
- [ ] Entity not found uses `EntityNotFoundException`
- [ ] Controllers do NOT catch exceptions (GlobalExceptionFilter handles it)
- [ ] RabbitMQ event handlers log AND store user-visible errors (never silently swallow)
- [ ] SSE endpoints emit error events before throwing
- [ ] Frontend handles error state (not just loading and success)

### C5. Message Keys and Error Responses

- [ ] Every error response includes a `messageKey` for i18n
- [ ] Error messageKeys follow the pattern `<entity>.<action>_<reason>` (e.g., `thread.create_failed`)
- [ ] Frontend maps messageKeys to translated strings via `t()`

### C6. Enum Usage

- [ ] No string literal unions (`'a' | 'b'`) -- use enums
- [ ] No raw string comparisons for domain values -- use enum comparisons
- [ ] New enums placed in `src/common/enums/` (backend) or `src/enums/` (frontend)
- [ ] Cross-service enums in `packages/shared-types`

### C7. Logging

- [ ] No `console.log` anywhere (backend uses NestJS `Logger`, frontend uses logger utility)
- [ ] No secrets logged (password, token, apiKey, secret, authorization, refreshToken)
- [ ] Meaningful log messages with context (userId, threadId, action)
- [ ] SSE endpoints use `@SkipLogging()` decorator

### C8. i18n Compliance

- [ ] No hardcoded user-facing text in components
- [ ] All new text added to all 8 locale files (en, ar, de, es, fr, it, pt, ru)
- [ ] Keys defined in `src/types/i18n.types.ts`
- [ ] `t('key')` used in every component rendering user text

### C9. Test Coverage

- [ ] Every new public method in a service has at least one test
- [ ] Every new DTO/Zod schema has validation tests (valid + invalid inputs)
- [ ] Every new hook has a test
- [ ] Every bug fix has a regression test that would have caught the bug

### C10. Security

- [ ] No XSS vectors (no `dangerouslySetInnerHTML`, no unescaped user input in HTML)
- [ ] No SQL injection (Prisma ORM only, no raw SQL)
- [ ] No secrets in client-side code or environment variables prefixed with `NEXT_PUBLIC_`
- [ ] File uploads go through FileSecurityManager (antivirus, magic bytes, filename, zip bomb)
- [ ] Auth guards on all new endpoints (or explicit `@Public()` decorator with justification)

### C11. Configuration Completeness

For every feature, verify:

- [ ] `.env.example` updated with new variables and example values
- [ ] `.env` updated with working dev values
- [ ] `scripts/install.sh` updated
- [ ] `scripts/install.ps1` updated
- [ ] All 4 Docker compose files updated (dev, prod, dev-ollama, prod-ollama)
- [ ] `infra/nginx/nginx.conf` updated (if new routes)
- [ ] `packages/shared-constants` updated (if new ports or service names)
- [ ] `packages/shared-types` updated (if new events)
- [ ] `apps/claw-health-service` updated (if new service)
- [ ] `.github/workflows/ci.yml` updated (if new service)
- [ ] `CLAUDE.md` updated (if new patterns, services, env vars)

### C12. PR Approval Criteria

A PR may be approved ONLY when ALL of the following are true:

1. `npm run typecheck` -- 0 errors
2. `npm run lint` -- 0 errors
3. `npm run test` -- all tests pass
4. `npm run build` -- production build succeeds
5. Code review complete (all sections C1-C11 checked)
6. No unresolved review comments
7. Commit messages follow conventional commits format

---

## Phase D: Implementation with TDD Mindset

**Goal:** Write code that is testable, tested, and deterministic from the start.

### D1. Test-First or Test-Alongside

For every new method:

1. Write the test first (or simultaneously with the implementation).
2. The test defines the expected behavior -- the implementation makes it pass.
3. If you cannot write a test for a method, the method is doing too much. Refactor.

### D2. Acceptance Criteria as Tests

Before finalizing any feature:

1. Convert every success criterion from Phase A into a test case.
2. Convert every failure criterion into a negative test case.
3. Run all tests. If any fail, the feature is not done.

### D3. No Untested Layer

Every layer must have tests:

| Layer               | Test Type                                                             | Tool                     |
| ------------------- | --------------------------------------------------------------------- | ------------------------ |
| Zod DTOs            | Unit test: valid input passes, invalid input fails with correct error | Jest                     |
| Repository          | Unit test: mock Prisma, verify correct query construction             | Jest                     |
| Service             | Unit test: mock repository + manager, verify business logic           | Jest                     |
| Manager             | Unit test: mock dependencies, verify orchestration logic              | Jest                     |
| Controller          | Integration test: verify route, auth guard, response shape            | Jest + supertest         |
| Frontend hooks      | Unit test: mock repository, verify query/mutation behavior            | Vitest                   |
| Frontend components | Render test: verify correct elements, states, interactions            | Vitest + Testing Library |
| API endpoints       | API test: curl through Nginx (port 4000) and direct (service port)    | curl / Playwright        |
| Full flow           | E2E test: user action to database record to UI update                 | Playwright               |

### D4. Deterministic and Observable Code

- No random behavior without seeding.
- No time-dependent logic without injectable clocks.
- Every decision point has a log statement.
- Every async operation has a timeout.
- Every polling loop has a maximum iteration count.

---

## Phase E: Developer-Side Testing

**Goal:** Verify the implementation works before handing off to QA.

### E1. Unit Tests

```bash
# Run all tests
npm run test

# Run tests for a specific service
cd apps/claw-chat-service && npm test

# Run a specific test file
cd apps/claw-chat-service && npx jest --testPathPattern=chat.service.spec.ts

# Frontend tests
cd apps/claw-frontend && npx vitest run
```

Every new or modified method must have passing tests.

### E2. Type Check

```bash
npm run typecheck
```

Zero errors required. No `// @ts-ignore` or `// @ts-expect-error` without a tracked issue number.

### E3. Lint

```bash
npm run lint
```

Zero errors required. No `// eslint-disable` comments. Fix the underlying issue.

### E4. Build

```bash
npm run build
```

Production build must succeed. This catches import errors, missing exports, and tree-shaking issues that typecheck alone misses.

### E5. Targeted API Check

For every new or modified endpoint:

```bash
# Get a JWT token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.ai","password":"your-password"}' | jq -r '.accessToken')

# Test the endpoint through Nginx
curl -s -X POST http://localhost:4000/api/v1/your-endpoint \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field":"value"}' | jq .

# Test directly to the service (bypass Nginx, isolate service issues)
curl -s -X POST http://localhost:400X/api/v1/your-endpoint \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field":"value"}' | jq .
```

### E6. Targeted Browser Check

1. Open the affected page in the browser.
2. Perform the user action.
3. Verify the UI updates correctly.
4. Open DevTools Network tab -- verify request/response.
5. Open DevTools Console -- verify no errors.

### E7. Targeted Log Check

```bash
# Check service logs for errors
./scripts/claw.sh logs chat-service --since 5m | grep -i error

# Check all service logs
./scripts/claw.sh logs --since 5m | grep -i error
```

### E8. Targeted DB Check

```bash
# Connect to the service's database
./scripts/claw.sh exec pg-chat psql -U claw -d claw_chat

# Verify the record was created/updated
SELECT * FROM "ChatThread" WHERE id = 'xxx' ORDER BY "createdAt" DESC LIMIT 5;
```

---

## Phase F: QA Phase

**Goal:** Systematically find bugs before users do.

### F1. Feature Testing

Test every acceptance criterion from Phase A. Document pass/fail for each.

### F2. Bug Hunting

Deliberately try to break the feature:

- Submit forms with empty fields, extremely long strings, special characters, HTML tags, script tags.
- Click buttons rapidly. Click while loading. Click after timeout.
- Navigate away mid-operation. Use browser back/forward.
- Open multiple tabs. Edit the same resource in two tabs.
- Resize browser to mobile width. Switch to dark mode. Switch to Arabic locale.

### F3. Negative Testing

Test every way the feature should fail gracefully:

- Wrong user role (VIEWER trying admin actions).
- Expired JWT (wait for token expiry or manually craft expired token).
- Missing required fields in API requests.
- Invalid enum values.
- Non-existent entity IDs (UUIDs that do not exist in the database).
- Payloads exceeding size limits.

### F4. Weird-Case Testing

Test combinations that are unlikely but possible:

- Thread with 0 messages. Thread with 1000 messages.
- File with 0 bytes. File with maximum allowed size.
- User with no connectors configured. User with all connectors configured.
- Ollama service down. RabbitMQ down. PostgreSQL slow.
- Simultaneous requests from the same user to the same endpoint.

### F5. Integration Testing (UI + API + DB)

For every user action:

1. Perform the action in the UI.
2. Verify the API request in the Network tab (correct endpoint, payload, headers).
3. Verify the API response (correct status code, body shape).
4. Verify the database record (correct table, fields, relationships).
5. Verify the subsequent GET returns the correct data.
6. Verify the UI reflects the persisted state after page refresh.

### F6. Event Testing

For features involving RabbitMQ events:

1. Perform the triggering action.
2. Check publisher service logs for "Published event: `<pattern>`".
3. Check consumer service logs for event received and processed.
4. Verify the consumer's side effects (DB records, audit logs, etc.).

### F7. Regression Testing

After any change:

1. Re-run the full test suite: `npm run test`.
2. Manually test the 3 most critical flows:
   - Login and session management.
   - Send a chat message and receive a response.
   - Create/update/delete a connector.
3. Verify the dashboard loads without errors.

### F8. System Testing

Verify the entire system works together:

```bash
# All services healthy
curl http://localhost:4000/api/v1/health | jq .

# All containers running
./scripts/claw.sh ps

# No restart loops
./scripts/claw.sh ps | grep -i restarting
```

### F9. UAT (User Acceptance Testing)

Walk through the feature as a real user would:

1. Start from the dashboard.
2. Navigate to the feature using the sidebar or natural flow.
3. Complete the full user journey.
4. Verify the result is correct and the experience is smooth.
5. Verify error messages are helpful and translated.

---

## Phase G: Bug Loop

**Goal:** Systematically fix every bug found during QA.

### G1. Collect

Create a list of every bug found. For each bug, record:

- Description (what went wrong)
- Steps to reproduce
- Expected behavior
- Actual behavior
- Severity (S1-S4)
- Screenshot or log snippet

### G2. Classify

| Severity | Definition               | Examples                                                   |
| -------- | ------------------------ | ---------------------------------------------------------- |
| S1       | System down or data loss | Service crash, database corruption, auth bypass            |
| S2       | Major feature broken     | Cannot send messages, cannot create threads, routing fails |
| S3       | Minor feature issue      | Wrong label, missing loading state, slow response          |
| S4       | Cosmetic                 | Alignment, spacing, color inconsistency                    |

### G3. Reproduce

For every bug, write exact reproduction steps that anyone can follow. If the bug is not reproducible, investigate logs and database state to understand the conditions.

### G4. Root Cause

Do not guess. Trace the bug through the code:

1. Check the API response (is the backend returning wrong data?).
2. Check the database (is the data correct in the DB?).
3. Check the service logic (is the business logic wrong?).
4. Check the frontend (is the UI misinterpreting correct data?).
5. Check the network (is Nginx routing correctly?).

### G5. Fix

Fix the root cause, not the symptom. If the bug is a missing null check, do not add a null check in the UI -- fix the backend to always return a valid value, AND add the null check in the UI as defense-in-depth.

### G6. Unit Test the Fix

Write a test that:

1. Sets up the exact conditions that caused the bug.
2. Asserts the correct behavior.
3. Would have FAILED before the fix.
4. PASSES after the fix.

### G7. Re-run Targeted Tests

After each fix:

1. Run the specific test file for the changed code.
2. Run the full test suite for the affected service.
3. Run the regression tests from F7.
4. Verify the fix in the browser.

### G8. Repeat Until Green

Continue the bug loop until:

- All S1 and S2 bugs are fixed and verified.
- All S3 bugs are fixed or have tracked tickets.
- All S4 bugs are documented.
- All tests pass.

---

## Phase H: Release Readiness

**Goal:** Confirm everything is ready for deployment.

### H1. Service Health

```bash
# All 13 services + infrastructure healthy
curl http://localhost:4000/api/v1/health | jq .

# No containers in restart loop
./scripts/claw.sh ps

# No error logs in the last 10 minutes
./scripts/claw.sh logs --since 10m 2>&1 | grep -c "ERROR"
```

### H2. Infrastructure Verification

- [ ] Docker compose files are correct (dev + prod + ollama variants)
- [ ] Nginx config routes all new endpoints correctly
- [ ] Database migrations run cleanly on a fresh database
- [ ] Seed data is up to date
- [ ] Environment variables documented in `.env.example`

### H3. Observability

- [ ] New endpoints log request/response at appropriate levels
- [ ] New events are captured in audit logs
- [ ] Error paths produce clear, actionable log messages
- [ ] Health check includes new service dependencies

### H4. Documentation

- [ ] CLAUDE.md updated with new patterns, services, or env vars
- [ ] API endpoints documented with request/response examples
- [ ] Architecture docs updated if system design changed
- [ ] Runbooks updated if new failure modes are possible

### H5. Final Checklist

| Item                                   | Status |
| -------------------------------------- | ------ |
| All tests pass (`npm run test`)        |        |
| TypeScript clean (`npm run typecheck`) |        |
| Lint clean (`npm run lint`)            |        |
| Build succeeds (`npm run build`)       |        |
| All services healthy                   |        |
| Feature tested end-to-end in browser   |        |
| Negative test cases pass               |        |
| Regression tests pass                  |        |
| All S1/S2 bugs fixed                   |        |
| Documentation updated                  |        |
| PR review complete                     |        |

---

## Phase Transition Rules

| From                  | To                               | Gate                                                         |
| --------------------- | -------------------------------- | ------------------------------------------------------------ |
| A (Requirements)      | B (Baseline)                     | Requirements restated and scope enumerated                   |
| B (Baseline)          | C (Review) or D (Implementation) | Existing code inspected, related tests identified            |
| D (Implementation)    | E (Developer Testing)            | Code written with tests                                      |
| E (Developer Testing) | F (QA)                           | Unit tests pass, typecheck clean, lint clean, build succeeds |
| F (QA)                | G (Bug Loop)                     | Bugs found and documented                                    |
| G (Bug Loop)          | F (QA)                           | Fixes applied, re-test                                       |
| F (QA)                | H (Release)                      | All tests pass, no S1/S2 bugs open                           |
| C (Review)            | D (Implementation)               | Review findings addressed                                    |

No phase may be skipped. Every phase produces artifacts that feed the next phase.
