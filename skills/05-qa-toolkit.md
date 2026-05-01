# Skill: QA Automation Toolkit

> Use this skill to write and run QA scripts for any feature. These scripts are the mandatory evidence that a feature is complete.

---

## QA Script Template

Every feature gets a script at `qa/test-<feature>.sh`. The `qa/` folder is gitignored.

```bash
#!/usr/bin/env bash
# qa/test-<feature>.sh
# Tests for: <feature description>
# Usage: bash qa/test-<feature>.sh

set -euo pipefail

BASE="http://localhost:4000/api/v1"
PASS=0
FAIL=0

# ─── HELPERS ──────────────────────────────────────────────────────────────────

run_test() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  if [ "$actual" = "$expected" ]; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name (expected=$expected, actual=$actual)"
    FAIL=$((FAIL + 1))
  fi
}

status() {
  curl -s -o /dev/null -w '%{http_code}' "$@"
}

# ─── SECTION 1: AUTH ──────────────────────────────────────────────────────────

echo ""
echo "=== AUTH ==="

TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.ai","password":"Admin123!"}' | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "FATAL: Could not get auth token. Aborting."
  exit 1
fi

echo "Auth token obtained"

# ─── SECTION 2: HAPPY PATH TESTS ─────────────────────────────────────────────

echo ""
echo "=== HAPPY PATH ==="

# Test: Create resource (201)
RESOURCE_ID=$(curl -s -X POST "$BASE/<resource>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Resource","type":"VALID_TYPE"}' | jq -r '.id')

run_test "create resource returns 201" \
  "$(status -X POST "$BASE/<resource>" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Resource 2","type":"VALID_TYPE"}')" "201"

# Test: Get resource (200)
run_test "get resource by id returns 200" \
  "$(status "$BASE/<resource>/$RESOURCE_ID" \
    -H "Authorization: Bearer $TOKEN")" "200"

# Test: List resources (200)
run_test "list resources returns 200" \
  "$(status "$BASE/<resource>" \
    -H "Authorization: Bearer $TOKEN")" "200"

# ─── SECTION 3: AUTH FAILURE TESTS ───────────────────────────────────────────

echo ""
echo "=== AUTH FAILURES ==="

run_test "no auth header returns 401" \
  "$(status "$BASE/<resource>")" "401"

run_test "invalid token returns 401" \
  "$(status "$BASE/<resource>" \
    -H "Authorization: Bearer invalid.token.here")" "401"

# ─── SECTION 4: VALIDATION TESTS ─────────────────────────────────────────────

echo ""
echo "=== VALIDATION ==="

# Test: Missing required field
run_test "missing name field returns 400" \
  "$(status -X POST "$BASE/<resource>" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type":"VALID_TYPE"}')" "400"

# Test: String too long (max 200 chars — use 201 char string)
LONG_STRING=$(python3 -c "print('a' * 201)")
run_test "name exceeding max length returns 400" \
  "$(status -X POST "$BASE/<resource>" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$LONG_STRING\",\"type\":\"VALID_TYPE\"}")" "400"

# Test: Invalid enum value
run_test "invalid type enum returns 400" \
  "$(status -X POST "$BASE/<resource>" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","type":"INVALID_ENUM"}')" "400"

# Test: Empty required string
run_test "empty name returns 400" \
  "$(status -X POST "$BASE/<resource>" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"","type":"VALID_TYPE"}')" "400"

# Test: Null field
run_test "null name returns 400" \
  "$(status -X POST "$BASE/<resource>" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":null,"type":"VALID_TYPE"}')" "400"

# ─── SECTION 5: NOT FOUND TESTS ──────────────────────────────────────────────

echo ""
echo "=== NOT FOUND ==="

run_test "get nonexistent resource returns 404" \
  "$(status "$BASE/<resource>/nonexistent-id-99999" \
    -H "Authorization: Bearer $TOKEN")" "404"

# ─── SECTION 6: RESPONSE SHAPE VERIFICATION ──────────────────────────────────

echo ""
echo "=== RESPONSE SHAPE ==="

RESPONSE=$(curl -s "$BASE/<resource>/$RESOURCE_ID" \
  -H "Authorization: Bearer $TOKEN")

# Verify required fields present
run_test "response has id field" \
  "$(echo "$RESPONSE" | jq -r '.id' | head -1)" "$RESOURCE_ID"

# Verify sensitive fields absent
SENSITIVE=$(echo "$RESPONSE" | jq -r '.encryptedConfig // .passwordHash // .apiKey // "null"')
run_test "response does not contain sensitive fields" "$SENSITIVE" "null"

# ─── SECTION N-1: DATABASE VERIFICATION ──────────────────────────────────────

echo ""
echo "=== DATABASE VERIFICATION ==="

DB_COUNT=$(docker exec claw-db-<service> psql -U claw_user -d claw_<service> \
  -tAc "SELECT COUNT(*) FROM \"Resource\" WHERE id IS NOT NULL;" | tr -d '[:space:]')

[ "$DB_COUNT" -gt "0" ] && {
  echo "PASS: DB has $DB_COUNT records"
  PASS=$((PASS + 1))
} || {
  echo "FAIL: No records found in DB"
  FAIL=$((FAIL + 1))
}

# ─── SECTION N: DOCKER LOG CHECK ─────────────────────────────────────────────

echo ""
echo "=== DOCKER LOGS ==="

for SERVICE in <service>-service; do
  ERROR_COUNT=$(./scripts/claw.sh logs "claw-$SERVICE" \
    --tail=200 2>/dev/null | \
    grep -cE "UnhandledPromiseRejection|FATAL|Cannot read properties of undefined" || echo "0")
  run_test "$SERVICE has no critical errors" "$ERROR_COUNT" "0"
done

# ─── SUMMARY ─────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════"
echo "RESULTS: Passed=$PASS Failed=$FAIL"
echo "═══════════════════════════════════════"

[ "$FAIL" -eq 0 ] || exit 1
```

---

## DTO Fuzz Testing Template

```typescript
// apps/claw-<service>/__tests__/dto/<name>.dto.spec.ts

import { CreateNewEntitySchema } from '../../../src/modules/<domain>/dto/create-new-entity.dto';

describe('CreateNewEntitySchema', () => {
  const validInput = { name: 'Test Name', type: 'VALID_TYPE' };

  it('accepts valid input', () => {
    expect(() => CreateNewEntitySchema.parse(validInput)).not.toThrow();
  });

  it('rejects missing name', () => {
    expect(() => CreateNewEntitySchema.parse({ type: 'VALID_TYPE' })).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => CreateNewEntitySchema.parse({ ...validInput, name: '' })).toThrow();
  });

  it('rejects name exceeding max length', () => {
    expect(() =>
      CreateNewEntitySchema.parse({
        ...validInput,
        name: 'a'.repeat(201),
      }),
    ).toThrow();
  });

  it('accepts name at exact max length', () => {
    expect(() =>
      CreateNewEntitySchema.parse({
        ...validInput,
        name: 'a'.repeat(200),
      }),
    ).not.toThrow();
  });

  it('rejects invalid enum value', () => {
    expect(() =>
      CreateNewEntitySchema.parse({
        ...validInput,
        type: 'INVALID',
      }),
    ).toThrow();
  });

  it('rejects null fields', () => {
    expect(() => CreateNewEntitySchema.parse({ name: null, type: 'VALID_TYPE' })).toThrow();
  });

  it('rejects number where string expected', () => {
    expect(() => CreateNewEntitySchema.parse({ name: 123, type: 'VALID_TYPE' })).toThrow();
  });

  it('rejects array exceeding max items', () => {
    // Only for schemas with array fields
    expect(() =>
      CreateNewEntitySchema.parse({
        ...validInput,
        tags: new Array(101).fill('tag'),
      }),
    ).toThrow();
  });
});
```

---

## Running QA Scripts

```bash
# Run a single script
bash qa/test-connectors.sh

# Run all scripts
for f in qa/test-*.sh; do
  echo "=== Running $f ==="
  bash "$f" && echo "PASSED" || echo "FAILED: $f"
done
```

## Routing Intelligence QA

For routing, judge, or replay changes, run at least two rounds:

1. Replay round: inspect `GET /api/v1/routing/adaptive-insights`, compare recent replay trends, and verify the long-tail priors look sane.
2. Live round: send mixed-intent prompts across coding, business, privacy, image, file, and general chat, then confirm the SSE stream shows visible thinking progress before the final answer.

Keep the matrix broad enough to catch false positives, weak fallback behavior, and missing visibility during generation.

---

## UI Test Checklist (manual)

For each new page/component, document in `.claude/Integrations/<feature>__QA_output.md`:

```markdown
## UI Test: <component/page name>

Date: YYYY-MM-DD

Loading state: [ ] PASS / [ ] FAIL
Empty state: [ ] PASS / [ ] FAIL
Error state: [ ] PASS / [ ] FAIL
Success state: [ ] PASS / [ ] FAIL

Dark mode: [ ] PASS / [ ] FAIL
Arabic RTL: [ ] PASS / [ ] FAIL
Mobile 375×812: [ ] PASS / [ ] FAIL

Form validation:
[ ] Required field missing shows error
[ ] Max length exceeded shows error
[ ] Submit button disabled when invalid

Navigation:
[ ] Back button works
[ ] Links navigate correctly
[ ] Loading state shown on navigation

After mutation:
[ ] UI updates reflect new state
[ ] Success feedback shown (toast/badge)
[ ] Error feedback shown on failure
```

---

## Evidence Archive Format

`.claude/Integrations/<feature>__QA_output.md`:

```markdown
# QA Evidence: <Feature Name>

Date: YYYY-MM-DD HH:MM
Engineer: Claude

## Summary

- Total API tests: X
- Passed: X
- Failed: 0
- Coverage: X%

## Unit Tests

[paste: npm run test output]

## API QA Script

[paste: bash qa/test-<feature>.sh output]

## DB Verification

[paste: psql query output]

## Docker Logs

[paste: grep output for errors]

## UI Testing

[paste: checklist from above]

## Known Gaps

[any deferred test coverage]
```
