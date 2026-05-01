# API Testing Standard

> How to test every API endpoint in ClawAI thoroughly.
> Every endpoint must be tested through Nginx (port 4000) and directly to the service.

---

## Testing Setup

### Get a JWT Token

Every authenticated test starts with obtaining a valid JWT:

```bash
# Login as admin
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.ai","password":"Admin123!"}' | jq -r '.accessToken')

# Verify the token works
curl -s http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Two Test Paths

Always test both:

1. **Through Nginx (port 4000):** Verifies routing, proxy headers, rate limiting, SSE buffering.
2. **Direct to service (port 400X):** Isolates service behavior from Nginx configuration.

If a test passes direct but fails through Nginx, the issue is in `infra/nginx/nginx.conf`.

---

## Test Category 1: Authentication

Every endpoint (except those decorated with `@Public()`) must be tested with these auth scenarios.

### 1.1 Valid JWT

```bash
# Should succeed
curl -s -X GET http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: 200 with data
```

### 1.2 Missing JWT

```bash
# Should fail
curl -s -X GET http://localhost:4000/api/v1/chat-threads | jq .
# Expected: 401 { "statusCode": 401, "message": "Unauthorized" }
```

### 1.3 Expired JWT

```bash
# Craft an expired token or wait for expiry (default: 15 minutes)
# Then test
curl -s -X GET http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $EXPIRED_TOKEN" | jq .
# Expected: 401
```

### 1.4 Malformed JWT

```bash
curl -s -X GET http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer not.a.valid.jwt" | jq .
# Expected: 401
```

### 1.5 Wrong Role (RBAC)

Test with a VIEWER token on an ADMIN-only endpoint:

```bash
# Login as viewer
VIEWER_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@claw.ai","password":"Viewer123!"}' | jq -r '.accessToken')

# Try admin-only action
curl -s -X DELETE http://localhost:4000/api/v1/users/some-id \
  -H "Authorization: Bearer $VIEWER_TOKEN" | jq .
# Expected: 403 Forbidden
```

### 1.6 Token from Different User (Ownership)

```bash
# Login as User A
TOKEN_A=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usera@claw.ai","password":"UserA123!"}' | jq -r '.accessToken')

# Create a thread as User A
THREAD_ID=$(curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"title":"User A Thread"}' | jq -r '.id')

# Login as User B
TOKEN_B=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"userb@claw.ai","password":"UserB123!"}' | jq -r '.accessToken')

# Try to access User A's thread as User B
curl -s -X GET http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN_B" | jq .
# Expected: 403 or 404 (thread not visible to User B)
```

---

## Test Category 2: Input Validation

### 2.1 Valid Payload

```bash
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Thread",
    "routingMode": "AUTO",
    "systemPrompt": "You are a helpful assistant.",
    "temperature": 0.7,
    "maxTokens": 4096
  }' | jq .
# Expected: 201 with complete thread object
```

### 2.2 Missing Required Fields

Test each required field individually:

```bash
# Missing title
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"routingMode": "AUTO"}' | jq .
# Expected: 400 with validation error mentioning "title"
```

### 2.3 Extra Fields (Unknown Properties)

```bash
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Thread", "hackerField": "drop table"}' | jq .
# Expected: 400 (if strict) or 201 with extra field ignored (if strip unknown)
# Document which behavior your Zod schema implements (.strict() vs .strip())
```

### 2.4 Wrong Field Types

```bash
# temperature should be number, sending string
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Thread", "temperature": "hot"}' | jq .
# Expected: 400 with validation error mentioning "temperature" and "number"
```

### 2.5 Invalid Enum Values

```bash
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Thread", "routingMode": "INVALID_MODE"}' | jq .
# Expected: 400 with validation error listing valid enum values
```

### 2.6 Boundary Values (Max Length)

```bash
# Generate a string of exactly the max length
TITLE=$(python3 -c "print('x' * 200)")

# At max length -- should succeed
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"$TITLE\"}" | jq .status
# Expected: 201

# One over max length -- should fail
TITLE_OVER=$(python3 -c "print('x' * 201)")
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"$TITLE_OVER\"}" | jq .
# Expected: 400
```

### 2.7 Empty Strings

```bash
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": ""}' | jq .
# Expected: 400 (if .min(1) on title) or 201 (if empty is allowed -- document which)
```

### 2.8 Malformed JSON

```bash
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ title: broken }' | jq .
# Expected: 400 JSON parse error
```

### 2.9 SQL Injection Attempts

```bash
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Thread\"; DROP TABLE \"ChatThread\"; --"}' | jq .
# Expected: 201 (Prisma parameterizes queries, injection has no effect)
# Verify: SELECT count(*) FROM "ChatThread"; -- table still exists and intact
```

### 2.10 XSS Payloads

```bash
curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "<script>alert(1)</script>"}' | jq .
# Expected: 201 (stored as-is, but frontend must escape on render)
# Verify: GET the thread, confirm the script tag is returned as plain text
# Verify: In browser, confirm the script does NOT execute
```

---

## Test Category 3: Response Contract

### 3.1 Status Codes

Every endpoint must return the correct HTTP status code:

| Operation | Success    | Not Found | Validation Error | Auth Error | Forbidden | Server Error |
| --------- | ---------- | --------- | ---------------- | ---------- | --------- | ------------ |
| GET one   | 200        | 404       | -                | 401        | 403       | 500          |
| GET list  | 200        | -         | 400 (bad query)  | 401        | 403       | 500          |
| POST      | 201        | -         | 400              | 401        | 403       | 500          |
| PUT/PATCH | 200        | 404       | 400              | 401        | 403       | 500          |
| DELETE    | 200 or 204 | 404       | -                | 401        | 403       | 500          |

### 3.2 Response Body Shape

Verify the response includes all expected fields with correct types:

```bash
RESPONSE=$(curl -s -X GET http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN")

# Check pagination structure
echo $RESPONSE | jq 'keys'
# Expected: ["data", "meta"] or ["items", "total", "page", "limit"]

# Check item structure
echo $RESPONSE | jq '.data[0] | keys'
# Expected: ["id", "title", "routingMode", "createdAt", "updatedAt", ...]

# Check field types
echo $RESPONSE | jq '.data[0].id | type'
# Expected: "string" (UUID)
```

### 3.3 Error Response Format

All error responses must follow this structure:

```json
{
  "statusCode": 400,
  "message": "Human-readable error message",
  "messageKey": "thread.create_validation_failed",
  "details": {
    "field": "title",
    "reason": "String must contain at most 200 character(s)"
  }
}
```

Verify:

- [ ] `statusCode` matches the HTTP status code
- [ ] `message` is a readable English string
- [ ] `messageKey` is a machine-readable key for i18n
- [ ] `details` provides specific field-level information (for validation errors)

---

## Test Category 4: Database Side Effects

### 4.1 Verify Write Operations

After every POST, PUT, PATCH, or DELETE:

```bash
# Create a thread
THREAD=$(curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "DB Check Thread", "routingMode": "AUTO"}')

THREAD_ID=$(echo $THREAD | jq -r '.id')

# Verify in database
./scripts/claw.sh exec pg-chat \
  psql -U claw -d claw_chat -c \
  "SELECT id, title, \"routingMode\", \"userId\" FROM \"ChatThread\" WHERE id = '$THREAD_ID';"
```

### 4.2 Verify Correct Fields

Check that:

- [ ] `id` is a valid UUID
- [ ] `userId` matches the authenticated user
- [ ] `createdAt` and `updatedAt` are set
- [ ] Default values are applied for omitted optional fields
- [ ] Enum values are stored as the enum string (not an integer index)

### 4.3 Verify Relationships

For entities with foreign keys:

```bash
# Create a message in a thread
MESSAGE=$(curl -s -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\": \"$THREAD_ID\", \"content\": \"Hello\"}")

MESSAGE_ID=$(echo $MESSAGE | jq -r '.id')

# Verify foreign key
./scripts/claw.sh exec pg-chat \
  psql -U claw -d claw_chat -c \
  "SELECT id, \"threadId\" FROM \"ChatMessage\" WHERE id = '$MESSAGE_ID';"
# threadId must match the created thread
```

---

## Test Category 5: Read-After-Write Consistency

After every write operation, verify the subsequent read returns the persisted data.

```bash
# Create
THREAD=$(curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Consistency Check", "routingMode": "LOCAL_ONLY"}')

THREAD_ID=$(echo $THREAD | jq -r '.id')

# Read back
FETCHED=$(curl -s -X GET http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN")

# Compare key fields
echo $FETCHED | jq '{title, routingMode}'
# Expected: {"title": "Consistency Check", "routingMode": "LOCAL_ONLY"}
```

### After Update

```bash
# Update
curl -s -X PATCH http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}' | jq .

# Read back
FETCHED=$(curl -s -X GET http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN")

echo $FETCHED | jq '.title'
# Expected: "Updated Title"
```

### After Delete

```bash
# Delete
curl -s -X DELETE http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" | jq .

# Read back
curl -s -X GET http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: 404
```

---

## Test Category 6: Idempotency

### 6.1 Duplicate Creation

```bash
# Send identical POST twice
RESPONSE_1=$(curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Idempotency Test"}')

RESPONSE_2=$(curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Idempotency Test"}')

ID_1=$(echo $RESPONSE_1 | jq -r '.id')
ID_2=$(echo $RESPONSE_2 | jq -r '.id')

# Document expected behavior:
# If duplicates allowed: ID_1 != ID_2 (two separate threads)
# If idempotent: ID_1 == ID_2 (same thread returned)
```

### 6.2 Duplicate Updates

```bash
# Send identical PATCH twice
curl -s -X PATCH http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Same Title"}' | jq .

curl -s -X PATCH http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Same Title"}' | jq .
# Expected: Both return 200, no error, no side effects from duplicate
```

---

## Test Category 7: Race Conditions

### 7.1 Rapid Repeated Requests

```bash
# Send 10 requests in parallel using background processes
for i in $(seq 1 10); do
  curl -s -X POST http://localhost:4000/api/v1/chat-threads \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\": \"Race Test $i\"}" &
done
wait

# Count threads created
curl -s http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'
# Expected: 10 (no lost writes, no duplicates unless idempotency is intended)
```

### 7.2 Concurrent Update and Delete

```bash
# Update and delete the same resource simultaneously
curl -s -X PATCH http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated"}' &

curl -s -X DELETE http://localhost:4000/api/v1/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" &

wait
# Expected: One succeeds and one fails (404), no 500 errors, no data corruption
```

---

## Test Category 8: Dependency Failure

### 8.1 Downstream Service Down

```bash
# Stop a dependency
./scripts/claw.sh stop ollama-service

# Test an endpoint that depends on it
curl -s -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\": \"$THREAD_ID\", \"content\": \"Hello\"}" | jq .
# Expected: Graceful error (503 or 500 with clear message), not a hang or crash

# Restart
./scripts/claw.sh start ollama-service
```

### 8.2 Database Connection Lost

```bash
# Stop the database
./scripts/claw.sh stop pg-chat

# Test
curl -s -X GET http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: 500 with "database connection error" type message, not a crash

# Restart
./scripts/claw.sh start pg-chat
```

### 8.3 RabbitMQ Down

```bash
# Stop RabbitMQ
./scripts/claw.sh stop rabbitmq

# Test message send (depends on RabbitMQ for event publishing)
curl -s -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\": \"$THREAD_ID\", \"content\": \"Hello\"}" | jq .
# Expected: Message may be created but routing event fails.
# Document actual behavior: does the service queue events? fail fast? retry?

# Restart
./scripts/claw.sh start rabbitmq
```

---

## Test Category 9: Pagination and Filtering

### 9.1 Pagination

```bash
# Create enough data for multiple pages (or use existing seed data)

# Page 1
curl -s "http://localhost:4000/api/v1/chat-threads?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.meta'
# Expected: { "page": 1, "limit": 5, "total": N, "totalPages": ceil(N/5) }

# Last page
curl -s "http://localhost:4000/api/v1/chat-threads?page=999&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'
# Expected: 0 (empty array, not an error)

# Invalid page
curl -s "http://localhost:4000/api/v1/chat-threads?page=-1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: 400 validation error

# Oversized limit
curl -s "http://localhost:4000/api/v1/chat-threads?page=1&limit=10000" \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: 400 or capped to maximum allowed limit
```

### 9.2 Filtering

```bash
# Filter by routing mode
curl -s "http://localhost:4000/api/v1/chat-threads?routingMode=AUTO" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].routingMode'
# Expected: All values are "AUTO"

# Filter with invalid enum
curl -s "http://localhost:4000/api/v1/chat-threads?routingMode=INVALID" \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: 400 or empty results (document which behavior)
```

---

## Test Category 10: SSE Endpoints

SSE endpoints require special testing because they use long-lived connections.

### 10.1 Connection Establishment

```bash
# Test SSE through Nginx (must have proxy_buffering off)
curl -s -N http://localhost:4000/api/v1/ollama/pull-jobs/$JOB_ID/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream"
# Expected: Connection stays open, events stream as they occur
# Verify: events are newline-delimited, format is "data: {...}\n\n"
```

### 10.2 Auth on SSE

```bash
# SSE without token
curl -s -N http://localhost:4000/api/v1/ollama/pull-jobs/$JOB_ID/progress \
  -H "Accept: text/event-stream" | head -5
# Expected: 401 response (not an open connection with no data)
```

### 10.3 Nginx SSE Configuration

Verify the Nginx config for SSE endpoints includes:

```nginx
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_read_timeout 86400;
proxy_buffering off;
proxy_cache off;
```

Test by comparing behavior through Nginx vs direct:

- Through Nginx: events arrive in real-time (not batched)
- Direct to service: events arrive in real-time (baseline)

---

## Complete Test Pattern: End-to-End for a Feature

Here is the complete test pattern for testing the "create chat thread" feature:

```bash
#!/bin/bash
# Test: Chat Thread CRUD - Complete API Test Suite
set -e

BASE_URL="http://localhost:4000/api/v1"

echo "=== Setup: Get JWT token ==="
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.ai","password":"Admin123!"}' | jq -r '.accessToken')
echo "Token: ${TOKEN:0:20}..."

echo "=== Test 1: Create thread (happy path) ==="
THREAD=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "API Test Thread", "routingMode": "AUTO"}')
STATUS=$(echo "$THREAD" | tail -1)
BODY=$(echo "$THREAD" | sed '$d')
echo "Status: $STATUS (expected: 201)"
THREAD_ID=$(echo $BODY | jq -r '.id')
echo "Thread ID: $THREAD_ID"

echo "=== Test 2: Read thread back ==="
FETCHED=$(curl -s -w "\n%{http_code}" -X GET $BASE_URL/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$FETCHED" | tail -1)
echo "Status: $STATUS (expected: 200)"
echo "Title: $(echo "$FETCHED" | sed '$d' | jq -r '.title') (expected: API Test Thread)"

echo "=== Test 3: Update thread ==="
UPDATED=$(curl -s -w "\n%{http_code}" -X PATCH $BASE_URL/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Thread Title"}')
STATUS=$(echo "$UPDATED" | tail -1)
echo "Status: $STATUS (expected: 200)"

echo "=== Test 4: Verify update persisted ==="
FETCHED=$(curl -s $BASE_URL/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN")
echo "Title: $(echo $FETCHED | jq -r '.title') (expected: Updated Thread Title)"

echo "=== Test 5: Missing auth ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/chat-threads)
echo "Status: $STATUS (expected: 401)"

echo "=== Test 6: Missing required field ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"routingMode": "AUTO"}')
echo "Status: $STATUS (expected: 400)"

echo "=== Test 7: Invalid enum ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Thread", "routingMode": "INVALID"}')
echo "Status: $STATUS (expected: 400)"

echo "=== Test 8: Non-existent thread ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  $BASE_URL/chat-threads/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $TOKEN")
echo "Status: $STATUS (expected: 404)"

echo "=== Test 9: Delete thread ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  $BASE_URL/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN")
echo "Status: $STATUS (expected: 200 or 204)"

echo "=== Test 10: Verify delete ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  $BASE_URL/chat-threads/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN")
echo "Status: $STATUS (expected: 404)"

echo "=== Test 11: DB verification ==="
./scripts/claw.sh exec pg-chat \
  psql -U claw -d claw_chat -t -c \
  "SELECT count(*) FROM \"ChatThread\" WHERE id = '$THREAD_ID';"
# Expected: 0 (deleted)

echo "=== All tests complete ==="
```

---

## Endpoint-Specific Testing Notes

### Auth Service (port 4001)

| Endpoint           | Special Testing Notes                                              |
| ------------------ | ------------------------------------------------------------------ |
| POST /auth/login   | Test rate limiting (101st request in 1 minute should be throttled) |
| POST /auth/refresh | Test token rotation (old refresh token becomes invalid after use)  |
| POST /auth/logout  | Verify session record deleted from DB                              |
| GET /auth/me       | Verify returns current user, not cached stale data                 |

### Chat Service (port 4002)

| Endpoint                         | Special Testing Notes                                                    |
| -------------------------------- | ------------------------------------------------------------------------ |
| POST /chat-messages              | This triggers the full 10-step async pipeline. Test with SSE monitoring. |
| POST /chat-messages/parallel     | Verify all models execute, partial failures handled                      |
| GET /chat-messages?threadId=X    | Verify ordering (chronological), verify pagination                       |
| POST /chat-messages/:id/feedback | Verify feedback enum values (THUMBS_UP, THUMBS_DOWN)                     |

### Connector Service (port 4003)

| Endpoint                  | Special Testing Notes                                           |
| ------------------------- | --------------------------------------------------------------- |
| POST /connectors          | Verify API key is encrypted (check DB, should NOT be plaintext) |
| POST /connectors/:id/test | Verify actually calls the provider API                          |
| POST /connectors/:id/sync | Verify models synced to ConnectorModel table                    |

### Routing Service (port 4004)

| Endpoint               | Special Testing Notes                                      |
| ---------------------- | ---------------------------------------------------------- |
| POST /routing/evaluate | Test with different message types (coding, image, privacy) |
| POST /routing/replay   | Test with historical decisions, verify comparison output   |

### Ollama Service (port 4008)

| Endpoint                                 | Special Testing Notes                              |
| ---------------------------------------- | -------------------------------------------------- |
| GET /ollama/catalog                      | Test category filtering, pagination                |
| POST /ollama/catalog/:id/pull            | Verify PullJob created, SSE progress works         |
| DELETE /ollama/pull-jobs/:id             | Verify cancellation stops the download             |
| GET /ollama/pull-jobs/:id/progress (SSE) | Test with @SkipLogging, verify Nginx buffering off |

### File Service (port 4006)

| Endpoint                | Special Testing Notes                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| POST /files (multipart) | Test all 4 security checks: antivirus, magic bytes, filename, zip bomb |
| POST /files             | Test with path traversal filename: `../../../etc/passwd`               |
| POST /files             | Test with double extension: `file.exe.pdf`                             |
| POST /files             | Test with oversized file (exceeds FILE_MAX_SIZE)                       |

---

## Verification Checklist Per Endpoint

For each endpoint you test, verify ALL of these:

- [ ] Correct HTTP status code for success
- [ ] Correct HTTP status code for each error type (400, 401, 403, 404, 500)
- [ ] Response body matches expected shape
- [ ] Error responses include messageKey
- [ ] Database record created/updated/deleted correctly
- [ ] Subsequent GET returns persisted data
- [ ] Auth required (unless @Public)
- [ ] Role-based access enforced
- [ ] Ownership enforced (users cannot access other users' data)
- [ ] Validation rejects invalid input with clear error messages
- [ ] Boundary values handled correctly
- [ ] Works through Nginx (port 4000)
- [ ] Works direct to service (port 400X)
- [ ] Service logs show expected log entries
- [ ] Audit log created (if audit-worthy action)
- [ ] RabbitMQ event published (if event-publishing action)
