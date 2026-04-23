# ClawAI — Testing Rules (Mandatory)

> Testing is not optional. Automated tests are the floor, not the ceiling. Manual testing is a hard requirement for every feature. This file defines exactly what must be tested and how.

---

## The Hard Testing Mandate

**Every feature delivery requires ALL of the following. Missing any item = feature is incomplete.**

### T1 — Unit Tests (Written Before Implementation — TDD)

Write failing tests BEFORE writing the implementation code.

**Coverage target: ≥ 95% on all new code.**

Required test subjects:

- Every new service method (happy path + all error branches)
- Every new manager method (happy path + all error branches)
- Every new repository method (with Prisma mock)
- Every new utility function (all inputs + edge cases)
- Every new Zod DTO schema (valid + invalid + boundary values)
- Every new frontend hook (state changes, mutations, error handling)
- Every new utility function (frontend)

Test case types required per subject:

```
1. Happy path (expected input, expected output)
2. Empty input (empty string, empty array, 0, null, undefined)
3. Boundary values (max length, min value, max value, exactly at limit)
4. Invalid input (wrong type, wrong format, wrong enum value)
5. Error path (service throws, provider fails, DB error)
6. Concurrent/idempotent (same call twice produces safe result)
```

**Backend**: Jest (`apps/<service>/__tests__/`)
**Frontend**: Vitest (`apps/claw-frontend/src/__tests__/`)

---

### T2 — API Testing (20-25 Calls Per Endpoint)

For every new or modified API endpoint, run a QA script with **20-25 variations** minimum.

#### Mandatory Variations Per Endpoint

```
1.  Happy path — valid token, valid body → expected 2xx
2.  No auth header → 401
3.  Expired/invalid token → 401
4.  Wrong role (VIEWER calling ADMIN route) → 403
5.  Resource belongs to different user → 403 or 404
6.  Resource does not exist → 404
7.  Valid body with min-length strings → 2xx
8.  Valid body with max-length strings → 2xx
9.  Body with string exceeding max length → 400
10. Body with array exceeding max items → 400
11. Missing required field → 400
12. Invalid enum value → 400
13. Null field → 400
14. Empty string on required field → 400
15. Negative number where positive required → 400
16. String instead of number → 400
17. Valid body with optional fields omitted → 2xx
18. Valid body with all optional fields → 2xx
19. Duplicate creation (unique constraint) → 409
20. Valid pagination (page=1, limit=10) → 2xx with correct shape
21. Pagination boundary (page=9999) → 2xx with empty array
22. Provider-specific error (external API down) → appropriate 5xx or fallback
23. Concurrent requests (2 simultaneous) → both succeed or one gets 409
24. Large payload (near size limit) → 2xx or 413
25. SQL injection attempt in string field → 400 (Zod catches it)
```

#### QA Script Location and Format

All scripts in `qa/` folder (gitignored):

```bash
# qa/test-<service-name>.sh

# ─── SECTION 1: AUTH ──────────────────────────────────────────────────────────
AUTH_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.ai","password":"Admin123!"}' | jq -r '.accessToken')

# ─── SECTION 2: <FEATURE> TESTS ───────────────────────────────────────────────
run_test "happy path creates connector" \
  "$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST "$BASE/connectors" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","provider":"OPENAI","apiKey":"sk-test"}')" \
  "201"

# ... 20+ more test cases ...

# ─── SECTION N-1: DB VERIFICATION ─────────────────────────────────────────────
DB_COUNT=$(docker exec claw-connectors-db psql -U claw_user -d claw_connectors \
  -tAc "SELECT COUNT(*) FROM \"Connector\" WHERE name = 'Test';")
[ "$DB_COUNT" -eq 1 ] && echo "PASS: DB record created" || echo "FAIL: DB record not found"

# ─── SECTION N: DOCKER LOG CHECK ──────────────────────────────────────────────
ERROR_COUNT=$(docker compose -f docker-compose.dev.yml logs connector-service \
  --tail=200 2>/dev/null | grep -cE "UnhandledPromiseRejection|FATAL")
[ "$ERROR_COUNT" -eq 0 ] && echo "PASS: No critical errors" || echo "FAIL: $ERROR_COUNT errors found"

# ─── SUMMARY ──────────────────────────────────────────────────────────────────
echo "Passed: $PASS_COUNT / Failed: $FAIL_COUNT"
[ "$FAIL_COUNT" -eq 0 ] || exit 1
```

---

### T3 — DTO Fuzzing

For every new Zod DTO schema, write a dedicated fuzz test that covers:

```
1. All required fields — verify each fails when missing individually
2. All string fields — verify .max() rejects oversized inputs
3. All enum fields — verify invalid values return 400
4. All array fields — verify .max() rejects oversized arrays
5. All nested objects — verify partial objects fail correctly
6. Null vs undefined — verify both handled appropriately
7. Type coercion — verify string "123" rejected for number fields
```

Location: `apps/<service>/__tests__/dto/<name>.dto.spec.ts`

---

### T4 — UI Component Testing (Per Component)

For every new UI component and page, manually verify in a real browser:

```
Loading state:   Component shows skeleton/spinner while data loads
Empty state:     Component shows empty-state UI when no data
Error state:     Component shows error message when API fails
Success state:   Component renders expected data correctly
```

Additional verifications:

```
Dark mode:       Toggle dark mode — no white flashes, no invisible text
Arabic RTL:      Switch to Arabic locale — text flows right-to-left, layout mirrors
Mobile viewport: Resize to 375×812 — no overflow, no truncated content
Tab order:       Tab through interactive elements — logical focus order
Error recovery:  After error, retry button works
Stale data:      After update, UI reflects new data (query invalidation working)
```

#### UI Test Log Format

After manual testing, log evidence in `.claude/Integrations/<feature>__QA_output.md`:

```markdown
# UI Test Log: <feature name>

Date: YYYY-MM-DD

## Component: <name>

- [ ] Loading state: spinner shown
- [ ] Empty state: "No items" message shown
- [ ] Error state: error toast shown, retry available
- [ ] Success state: data renders correctly

## Dark mode: PASS / FAIL

## Arabic RTL: PASS / FAIL

## Mobile (375px): PASS / FAIL
```

---

### T5 — Integration Testing (Cross-Service)

For features involving multiple services:

```
1. Publish event → verify consumer receives it (check consumer service logs)
2. HTTP inter-service call → verify response shape and error handling
3. DB write → verify correct service's DB received the record
4. SSE stream → verify events reach frontend client
5. Audit → verify claw-audit-service recorded the action
6. Memory → verify claw-memory-service extracted facts from completed messages
```

---

### T6 — Regression Testing

After every feature change, verify existing features still work:

**Minimum regression scope:**

1. Auth: login, refresh token, logout still work
2. Chat: send message, receive response via SSE still works
3. Routing: AUTO mode still routes to correct provider
4. Connectors: list, health check, sync still work for unchanged providers
5. Files: upload, list, delete still work
6. The specific service area neighboring your change

---

### T7 — DB Verification (Every Write)

After every CREATE, UPDATE, DELETE tested via API:

```bash
# PostgreSQL
docker exec <db-container> psql -U <user> -d <db> -tAc \
  "SELECT COUNT(*) FROM \"Table\" WHERE condition;"

# MongoDB
docker exec claw-mongo mongosh --quiet --eval \
  'db.auditLogs.countDocuments({ action: "CONNECTOR_CREATED" })'
```

Verify:

- Row count changed as expected
- Sensitive columns (encrypted keys, password hashes) EXIST in DB but NOT in API response
- Deleted records are actually gone (no soft-delete confusion)
- Status transitions reflected correctly in DB
- Timestamps set correctly (createdAt, updatedAt)

---

### T8 — Docker Log Verification

At the end of every QA session:

```bash
docker compose -f docker-compose.dev.yml logs <service> --tail=200 2>/dev/null | \
  grep -E "UnhandledPromiseRejection|FATAL|Cannot read properties of undefined"
```

Zero matches required. Any match = delivery blocked.

---

## Coverage Rules

| File type          | Min coverage target |
| ------------------ | ------------------- |
| `*.service.ts`     | 95%                 |
| `*.manager.ts`     | 90%                 |
| `*.utility.ts`     | 98%                 |
| `*.repository.ts`  | 80% (mock-based)    |
| Frontend hooks     | 90%                 |
| Frontend utilities | 98%                 |
| Zod schemas/DTOs   | 100%                |

Run coverage:

```bash
# Backend
cd apps/<service> && npm run test:cov

# Frontend
cd apps/claw-frontend && npm run test:cov
```

---

## Test Evidence Documentation

Every feature MUST produce a QA output document:

`.claude/Integrations/<feature>__QA_output.md`

Template:

```markdown
# QA Evidence: <feature name>

Date: YYYY-MM-DD HH:MM

## Unit Tests

- Total: X passing, Y failing
- Coverage: X%
- Output: [paste npm run test:cov output]

## API Tests (QA Script)

- Script: qa/test-<feature>.sh
- Total variations: X
- Passed: X / Failed: Y
- Failures: [list any failures]

## DB Verification

- [Table/collection name]: X records found after test write ✓

## Docker Logs

- connector-service: 0 critical errors ✓
- chat-service: 0 critical errors ✓

## UI Testing

- Chrome/Edge: loading ✓ / empty ✓ / error ✓ / success ✓
- Dark mode: ✓
- Arabic RTL: ✓
- Mobile 375px: ✓

## Regression

- Auth flow: ✓
- Chat send/receive: ✓
- Related endpoints: ✓
```

---

## What "Test Coverage" Does NOT Mean

- It does NOT mean hitting code paths with happy-path data only
- It does NOT mean testing the same function with slightly different names
- It does NOT mean testing a mock that always returns what you tell it to return
- It DOES mean: the code behaves correctly under real failure conditions, boundary inputs, and concurrent load
