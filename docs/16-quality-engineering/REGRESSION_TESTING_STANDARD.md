# Regression Testing Standard

> ClawAI Quality Engineering -- Document 8 of 10

## Purpose

Regression testing ensures that new changes (features, bug fixes, refactors) do not break existing functionality. Given ClawAI's 13 interconnected microservices, a change in one service can cascade failures across the system. This document defines when to run regressions, what to test, and how to identify affected areas.

---

## 1. When to Run Regressions

### 1.1 Every Bug Fix

**Direct regression:** Re-run the exact test that originally failed (or the test that would have caught the bug).

**Adjacency regression:** Run tests for features that share code paths with the bug fix.

Example: A fix in `ChatExecutionManager` requires:

- Direct: the specific message flow that was broken
- Adjacency: parallel compare flow, file attachment flow, SSE streaming (all use ChatExecutionManager)

### 1.2 Every New Feature

Run the **full regression pack** for every area the feature touches.

Example: Adding a new routing mode requires:

- Full routing regression pack
- Chat pack (routing affects message flow)
- Connector pack (routing reads connector/model data)

### 1.3 Every Routing Change

Routing is the most sensitive subsystem. Any change to routing constants, pipeline stages, prompt builder, or routing policies requires:

- **Full routing regression pack** (all 7 modes)
- Category detection spot check (at least 5 messages per category)
- Privacy keyword enforcement check (at least 5 privacy-sensitive messages)
- Fallback chain verification (disable primary model, verify fallback activates)

### 1.4 Every Auth Change

Authentication and authorization are security-critical. Any change requires:

- **Full auth/RBAC regression pack**
- Login/logout on all 3 roles (ADMIN, OPERATOR, VIEWER)
- Token refresh flow
- Session expiry and redirect
- Every protected endpoint returns 401 without token
- Every role-restricted endpoint returns 403 for unauthorized roles

### 1.5 Every Shared Component Change

Changes to files in `packages/shared-types`, `packages/shared-constants`, `packages/shared-rabbitmq`, or `packages/shared-auth` affect all 13 services. Requires:

- **Full system regression** (smoke test all services)
- Rebuild all dependent services
- Verify no TypeScript compilation errors (`npm run typecheck`)

### 1.6 Every i18n Change

- Spot-check all 8 locales (EN, AR, DE, ES, FR, IT, PT, RU)
- Verify Arabic (RTL) layout is not broken
- Verify new keys exist in all 8 locale files
- Verify no missing translation warnings in browser console

### 1.7 Every Docker/Nginx Change

- **Full system regression**: all containers start, all health checks pass
- Nginx route verification: test every `/api/v1/*` path
- SSE routes still work (proxy_buffering off)
- Service restart recovery: restart each changed service, verify it comes back healthy
- No port conflicts

---

## 2. Regression Packs

Each pack is a predefined set of tests grouped by feature area. Engineers select packs based on the areas affected by their change.

### 2.1 Auth Pack

| #   | Test Case                      | Verification                                                    |
| --- | ------------------------------ | --------------------------------------------------------------- |
| A1  | Login with valid credentials   | Redirects to dashboard, token stored                            |
| A2  | Login with invalid credentials | Error message shown, no redirect                                |
| A3  | Login with disabled account    | Error message, no access                                        |
| A4  | Logout                         | Token cleared, redirected to login                              |
| A5  | Token refresh                  | Expired access token triggers silent refresh                    |
| A6  | Session expiry                 | After refresh token expires, redirect to login                  |
| A7  | ADMIN role access              | Can access /admin, /connectors (create/delete), /routing (edit) |
| A8  | OPERATOR role access           | Can access /connectors (create), cannot access /admin           |
| A9  | VIEWER role access             | Read-only on all pages, cannot create/edit/delete               |
| A10 | Concurrent sessions            | Multiple browser tabs stay in sync                              |
| A11 | Password change                | New password works, old password rejected                       |
| A12 | Protected API without token    | Returns 401 on all protected endpoints                          |

**Trigger:** Any change in `claw-auth-service`, `packages/shared-auth`, JWT config, or RBAC guards.

### 2.2 Chat Pack

| #   | Test Case                                 | Verification                                                        |
| --- | ----------------------------------------- | ------------------------------------------------------------------- |
| C1  | Create new thread                         | Thread appears in sidebar, empty state shown                        |
| C2  | Send message (AUTO mode)                  | User message stored, routing triggered, assistant response received |
| C3  | Send message (MANUAL mode)                | Message routed to selected provider/model                           |
| C4  | Send message (LOCAL_ONLY)                 | Message routed to local Ollama model                                |
| C5  | Thread settings (system prompt)           | System prompt included in context                                   |
| C6  | Thread settings (temperature, max tokens) | Parameters passed to LLM                                            |
| C7  | File attachment                           | File chunks included in context assembly                            |
| C8  | Context pack attachment                   | Pack items included in context assembly                             |
| C9  | Message feedback (thumbs up/down)         | Feedback stored on message record                                   |
| C10 | Regenerate message                        | New assistant message created with same input                       |
| C11 | Parallel compare                          | Multiple models respond, all results shown                          |
| C12 | SSE streaming                             | Real-time response delivery (no buffering)                          |
| C13 | Error message on LLM failure              | Error stored as ASSISTANT message, UI stops "thinking"              |
| C14 | Thread rename                             | Title updates in sidebar                                            |
| C15 | Thread delete                             | Thread removed, messages cleaned up                                 |
| C16 | Routing badge                             | Provider/model shown on each assistant message                      |
| C17 | Token count display                       | Input/output tokens shown in message metadata                       |
| C18 | Empty thread state                        | Helpful prompt or placeholder shown                                 |

**Trigger:** Any change in `claw-chat-service`, message flow, context assembly, SSE, or chat UI components.

### 2.3 Routing Pack

| #   | Test Case                            | Verification                                           |
| --- | ------------------------------------ | ------------------------------------------------------ |
| R1  | AUTO mode -- coding query            | Routes to coding model (Anthropic or LOCAL_CODING)     |
| R2  | AUTO mode -- reasoning query         | Routes to reasoning model                              |
| R3  | AUTO mode -- image query             | Routes to image generation                             |
| R4  | AUTO mode -- file generation query   | Routes to file generation model                        |
| R5  | AUTO mode -- privacy-sensitive query | Forces local model (never cloud)                       |
| R6  | AUTO mode -- general chat            | Routes to chat model                                   |
| R7  | MANUAL_MODEL mode                    | Routes to user-specified provider/model                |
| R8  | LOCAL_ONLY mode                      | Always uses local Ollama model                         |
| R9  | PRIVACY_FIRST mode                   | Local if healthy, Anthropic fallback                   |
| R10 | LOW_LATENCY mode                     | Routes to fastest model (OpenAI gpt-4o-mini)           |
| R11 | HIGH_REASONING mode                  | Routes to strongest reasoning model (claude-opus-4)    |
| R12 | COST_SAVER mode                      | Local if healthy, cheapest cloud fallback              |
| R13 | Policy override                      | Active policy overrides thread routing mode            |
| R14 | Fallback chain                       | Primary fails -> secondary used                        |
| R15 | Routing decision stored              | Decision record in routing DB with confidence, reasons |
| R16 | Replay lab                           | Historical decisions re-evaluated correctly            |
| R17 | Dynamic prompt builder               | Installed models reflected in router prompt            |
| R18 | Cache invalidation                   | Model pull/delete invalidates prompt cache             |

**Trigger:** Any change in `claw-routing-service`, routing constants, prompt builder, or routing policies.

### 2.4 Connector Pack

| #    | Test Case                 | Verification                                                 |
| ---- | ------------------------- | ------------------------------------------------------------ |
| CN1  | Create connector          | Saved with encrypted config                                  |
| CN2  | Edit connector            | Updated fields persisted                                     |
| CN3  | Delete connector          | Removed, models cleaned up                                   |
| CN4  | Test connection           | Success/failure status returned                              |
| CN5  | Sync models               | Models fetched from provider API, stored in DB               |
| CN6  | Health check              | Connector health status updated                              |
| CN7  | Encrypted config security | API key never returned in plaintext (except create response) |
| CN8  | Connector list            | All connectors shown with status badges                      |
| CN9  | Connector detail page     | Full config (masked), models, health history                 |
| CN10 | Audit trail               | Create/update/delete events in audit log                     |

**Trigger:** Any change in `claw-connector-service`, connector UI, or encryption utilities.

### 2.5 Model Pack

| #   | Test Case                            | Verification                                           |
| --- | ------------------------------------ | ------------------------------------------------------ |
| M1  | Browse catalog                       | All 30 models displayed                                |
| M2  | Filter by category                   | Correct models shown per category (6 categories)       |
| M3  | Search by name                       | Partial match works                                    |
| M4  | Download model                       | Pull job created, progress SSE works                   |
| M5  | Cancel download                      | Pull job cancelled, partial data cleaned up            |
| M6  | Download progress                    | Progress bar updates via SSE                           |
| M7  | Active downloads panel               | Shows all in-progress downloads                        |
| M8  | Model role assignment                | Assign LOCAL_CODING, LOCAL_REASONING, etc.             |
| M9  | Router models excluded from selector | Models with ROUTER role not shown in chat model picker |
| M10 | Model delete                         | Model removed from Ollama and DB                       |
| M11 | Local models page                    | Shows all installed models with roles and sizes        |

**Trigger:** Any change in `claw-ollama-service`, model catalog, or model management UI.

### 2.6 Admin Pack

| #   | Test Case        | Verification                                   |
| --- | ---------------- | ---------------------------------------------- |
| AD1 | User list        | All users shown with roles and status          |
| AD2 | Create user      | New user can login                             |
| AD3 | Edit user role   | Role change takes effect on next request       |
| AD4 | Disable user     | User cannot login                              |
| AD5 | Audit log view   | Filterable by action, user, date range         |
| AD6 | Usage statistics | Token counts, request counts per user/provider |

**Trigger:** Any change in admin UI, user management, or audit service.

### 2.7 Settings Pack

| #   | Test Case                 | Verification                                     |
| --- | ------------------------- | ------------------------------------------------ |
| S1  | Theme toggle (dark/light) | Persists across refresh                          |
| S2  | Language change           | All UI text updates to selected language         |
| S3  | Arabic RTL layout         | Sidebar, text direction, input alignment correct |
| S4  | Profile update            | Name/email changes persisted                     |
| S5  | Password change           | New password works, old rejected                 |
| S6  | Preferences persistence   | All settings survive logout/login cycle          |

**Trigger:** Any change in settings UI, i18n, theme, or user preferences.

### 2.8 Shared UI Pack

| #   | Test Case          | Verification                                 |
| --- | ------------------ | -------------------------------------------- |
| U1  | Sidebar navigation | All links work, active state highlighted     |
| U2  | Sidebar collapse   | Collapses on mobile, toggle works on desktop |
| U3  | Data tables        | Sorting, pagination, filtering work          |
| U4  | Empty states       | All pages show helpful empty state           |
| U5  | Loading spinners   | All async operations show loading indicator  |
| U6  | Error toasts       | API errors shown as toast notifications      |
| U7  | Form validation    | Required fields, max lengths, format checks  |
| U8  | Responsive layout  | Works on 1920px, 1366px, 768px, 375px widths |

**Trigger:** Any change in shared components, layout, sidebar, or shadcn/ui customizations.

---

## 3. Adjacency Analysis

When a service changes, identify adjacent services that share data or events.

### Service Dependency Map

```
auth-service
  -> ALL services (AuthGuard, RolesGuard)

chat-service
  -> routing-service (message.created / message.routed events)
  -> memory-service (HTTP: fetch memories, context packs)
  -> file-service (HTTP: fetch file chunks)
  -> audit-service (message.completed event)
  -> ollama-service (HTTP: generate for local models)

routing-service
  -> connector-service (reads available models)
  -> ollama-service (HTTP: router model generation + internal model list)
  -> audit-service (routing.decision_made event)

memory-service
  -> ollama-service (HTTP: memory extraction generation)
  -> audit-service (memory.extracted event)

connector-service
  -> audit-service (connector.created/updated/deleted events)
  -> routing-service (connector.synced event)

file-service
  -> chat-service (file chunks consumed in context assembly)

ollama-service
  -> routing-service (model availability affects routing)
  -> chat-service (local model generation)
  -> memory-service (extraction model)

image-service
  -> audit-service (image.generated / image.failed events)

file-generation-service
  -> audit-service (file.generated / file_generation.failed events)
```

### Adjacency Regression Rules

| Changed Service         | Also Regression Test                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------- |
| auth-service            | ALL services (RBAC), login/logout UI                                                    |
| chat-service            | routing, memory, file, audit, SSE, frontend chat UI                                     |
| routing-service         | chat (message flow), connector (model list), ollama (router model)                      |
| memory-service          | chat (context assembly), ollama (extraction model)                                      |
| connector-service       | routing (available models), audit (events)                                              |
| file-service            | chat (file attachment flow)                                                             |
| ollama-service          | routing (prompt builder), chat (local execution), memory (extraction), model catalog UI |
| image-service           | audit (events), image generation UI                                                     |
| file-generation-service | audit (events), file export UI                                                          |
| health-service          | dashboard health widget                                                                 |
| client-logs-service     | frontend logger utility                                                                 |
| server-logs-service     | observability/logs page                                                                 |
| shared-types            | ALL services (recompile and verify)                                                     |
| shared-constants        | ALL services (recompile and verify)                                                     |
| shared-rabbitmq         | ALL services that publish/consume events                                                |
| shared-auth             | ALL services (guards and decorators)                                                    |

---

## 4. Regression Tagging

Tag every test with its regression pack for selective execution.

### Jest (Backend)

```typescript
describe('[AUTH] Login flow', () => {
  it('[AUTH][A1] should login with valid credentials', () => { ... });
  it('[AUTH][A2] should reject invalid credentials', () => { ... });
});

describe('[CHAT] Message flow', () => {
  it('[CHAT][C2] should send message and receive response', () => { ... });
});
```

Run a specific pack:

```bash
# Run only auth regression tests
npx jest --testPathPattern=".*" --testNamePattern="\[AUTH\]"

# Run only chat regression tests
npx jest --testPathPattern=".*" --testNamePattern="\[CHAT\]"
```

### Vitest (Frontend)

```typescript
describe('[CHAT] Message composer', () => {
  it('[CHAT][C2] should send message on enter', () => { ... });
});
```

```bash
npx vitest run --testNamePattern="\[CHAT\]"
```

### Playwright (E2E)

Use Playwright's `test.describe` with tags:

```typescript
test.describe('Auth regression @auth', () => {
  test('login with valid credentials @auth @a1', async ({ page }) => { ... });
});
```

```bash
npx playwright test --grep "@auth"
npx playwright test --grep "@chat"
npx playwright test --grep "@routing"
```

---

## 5. Regression Execution Matrix

### Quick Regression (10 minutes)

Run after every commit. Covers smoke tests only.

```bash
# Backend unit tests
npm run test

# Frontend unit tests
cd apps/claw-frontend && npx vitest run

# Health check
curl -f http://localhost:4000/api/v1/health
```

### Standard Regression (30 minutes)

Run after every feature branch merge. Covers the affected pack plus adjacent packs.

```bash
# 1. Full lint + typecheck + build
npm run lint && npm run typecheck && npm run build

# 2. All unit tests
npm run test

# 3. Affected regression pack (example: chat + adjacency)
npx jest --testNamePattern="\[CHAT\]|\[ROUTING\]|\[MEMORY\]|\[AUDIT\]"

# 4. Smoke E2E
npx playwright test --grep "@smoke"
```

### Full Regression (2 hours)

Run before every release, after Docker/Nginx changes, or after shared package changes.

```bash
# 1. Full quality gates
npm run lint && npm run typecheck && npm run build && npm run test

# 2. All regression packs
npx jest  # All backend tests
cd apps/claw-frontend && npx vitest run  # All frontend tests

# 3. Full E2E suite
cd apps/claw-frontend && npx playwright test

# 4. System tests (see SYSTEM_TESTING_STANDARD.md)
# - All services healthy
# - All nginx routes work
# - RabbitMQ queues clear
# - No Docker restart loops
# - Log storm check
```

---

## 6. Regression Failure Protocol

When a regression test fails:

1. **Stop the merge/deploy.** Do not proceed with a known regression.
2. **Identify the root cause.** Is it a real regression or a flaky test?
   - If flaky: fix the test, not the code. Flaky tests must be fixed immediately.
   - If real regression: fix the code before merging.
3. **Verify the fix.** Re-run the full regression pack for the affected area (not just the single failing test).
4. **Add the regression test.** If the bug was not caught by an existing test, write a new one and tag it.
5. **Update adjacency analysis.** If the failure revealed an unexpected dependency, update the adjacency map in this document.

---

## 7. Regression Test Coverage Targets

| Area              | Minimum Coverage                                                |
| ----------------- | --------------------------------------------------------------- |
| Auth/RBAC         | 100% of roles and endpoints                                     |
| Chat message flow | Every routing mode + error path                                 |
| Routing pipeline  | All 7 modes + all 33 capability classes (representative sample) |
| Connector CRUD    | All CRUD operations + sync + health                             |
| Model catalog     | Browse, filter, download, cancel                                |
| SSE streams       | Chat, pull progress, image progress                             |
| i18n              | All 8 locales have complete translations (no missing keys)      |
| Error handling    | Every user-facing error shows a message (no silent failures)    |
| Data persistence  | Every mutation survives page refresh                            |

---

## 8. Regression Documentation Trail

Every regression run should be documented (even informally) with:

- **Date and trigger** (what change triggered the regression)
- **Packs executed** (which regression packs were run)
- **Results** (pass/fail count, failing test names)
- **Failures investigated** (root cause for each failure)
- **Resolution** (how each failure was fixed)

This trail helps identify patterns: if the same area regresses repeatedly, it signals architectural fragility that needs deeper refactoring.
