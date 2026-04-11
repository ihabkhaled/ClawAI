# E2E Testing Guide

> API testing with curl, full message flow verification, Playwright, and regression checklist.

---

## 1. Prerequisites

E2E tests require the full development environment running:

```bash
docker compose -f docker-compose.dev.yml up -d

# Wait for all services to be healthy
docker compose -f docker-compose.dev.yml ps
# All should show (healthy)
```

---

## 2. API Testing with curl

### Step 1: Get a JWT Token

```bash
# Login and capture the access token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.local","password":"Admin123!"}' \
  | jq -r '.data.accessToken')

echo $TOKEN
```

### Step 2: Test Authenticated Endpoints

```bash
# List chat threads
curl -s http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" | jq

# Create a thread
THREAD_ID=$(curl -s -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Thread","routingMode":"AUTO"}' \
  | jq -r '.data.id')

echo "Created thread: $THREAD_ID"

# Send a message
curl -s -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\":\"$THREAD_ID\",\"content\":\"Hello, what is 2+2?\"}" | jq

# List messages (poll until ASSISTANT message appears)
curl -s http://localhost:4000/api/v1/chat-messages?threadId=$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Step 3: Test Through Nginx vs Direct

```bash
# Through nginx (production path)
curl -s http://localhost:4000/api/v1/health | jq

# Direct to service (debugging)
curl -s http://localhost:4009/api/v1/health | jq

# If nginx returns 502 but direct works, it's a nginx routing issue
```

---

## 3. Full Message Flow Verification

The complete message flow involves 5 services. Verify each step:

### Step 1: Send Message (Chat Service)

```bash
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\":\"$THREAD_ID\",\"content\":\"Explain recursion\"}"
```

Check chat-service logs for `message.created` event publication:
```bash
docker compose logs chat-service --since 1m | grep "message.created"
```

### Step 2: Routing (Routing Service)

Check routing-service logs for routing decision:
```bash
docker compose logs routing-service --since 1m | grep "routing"
```

Verify `message.routed` event was published.

### Step 3: Execution (Chat Service)

Check chat-service logs for provider call:
```bash
docker compose logs chat-service --since 1m | grep -E "(execution|provider|ollama)"
```

### Step 4: SSE Events (Optional)

Connect to SSE stream in another terminal:
```bash
curl -N http://localhost:4000/api/v1/chat-messages/stream/$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream"
```

### Step 5: Completion

Check for `message.completed` event:
```bash
docker compose logs chat-service --since 2m | grep "message.completed"
```

Verify ASSISTANT message exists:
```bash
curl -s http://localhost:4000/api/v1/chat-messages?threadId=$THREAD_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {role, content}'
```

### Step 6: Audit (Audit Service)

```bash
docker compose logs audit-service --since 2m | grep "audit"
```

### Step 7: Memory Extraction (Memory Service)

```bash
docker compose logs memory-service --since 2m | grep "memory"
```

---

## 4. Testing Error Paths

### Invalid Input

```bash
# Missing required fields
curl -s -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Should return 400 with validation errors
```

### Missing Auth

```bash
curl -s http://localhost:4000/api/v1/chat-threads | jq
# Should return 401 Unauthorized
```

### Invalid Token

```bash
curl -s http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer invalid-token" | jq
# Should return 401 Unauthorized
```

### Forbidden Access

```bash
# Try to access admin endpoint as VIEWER
curl -s http://localhost:4000/api/v1/users \
  -H "Authorization: Bearer $VIEWER_TOKEN" | jq
# Should return 403 Forbidden
```

---

## 5. Testing Specific Features

### Connector Management

```bash
# Create a connector
curl -X POST http://localhost:4000/api/v1/connectors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Gemini","provider":"GOOGLE","config":{"apiKey":"test-key"}}'

# Test connection
curl -X POST http://localhost:4000/api/v1/connectors/$CONNECTOR_ID/test \
  -H "Authorization: Bearer $TOKEN"

# Sync models
curl -X POST http://localhost:4000/api/v1/connectors/$CONNECTOR_ID/sync \
  -H "Authorization: Bearer $TOKEN"
```

### File Upload

```bash
curl -X POST http://localhost:4000/api/v1/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-document.txt"
```

### Memory Management

```bash
# Create a memory
curl -X POST http://localhost:4000/api/v1/memories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"User prefers dark mode","type":"PREFERENCE"}'

# List memories
curl -s http://localhost:4000/api/v1/memories \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Local Models

```bash
# List local models
curl -s http://localhost:4000/api/v1/ollama/models \
  -H "Authorization: Bearer $TOKEN" | jq

# Pull a model
curl -X POST http://localhost:4000/api/v1/ollama/pull \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"tinyllama"}'
```

---

## 6. Playwright E2E Tests

### Setup

```bash
# Install Playwright browsers
npx playwright install

# Run all E2E tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Run specific test
npx playwright test tests/chat.spec.ts
```

### Critical Flows to Cover

1. **Login flow**: Submit credentials, redirect to dashboard, token stored
2. **Chat flow**: Create thread, send message, wait for response, verify message appears
3. **Connector flow**: Create connector, test connection, sync models
4. **File flow**: Upload file, verify ingestion status, attach to chat
5. **Settings flow**: Change language, change theme, change password
6. **Admin flow**: View users, change roles (ADMIN only)

---

## 7. Regression Checklist

Before releasing, manually verify these flows:

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (shows error)
- [ ] Token refresh works (wait 15+ minutes, make a request)
- [ ] Logout clears session
- [ ] Protected routes redirect to login when unauthenticated

### Chat
- [ ] Create a new thread
- [ ] Send a message and receive AI response
- [ ] Message appears with provider/model badge
- [ ] Routing transparency shows decision details
- [ ] Fallback indicators appear when primary provider fails
- [ ] Error message appears when all providers fail
- [ ] "AI is thinking..." indicator shows and stops correctly
- [ ] Pin/unpin a thread
- [ ] Archive/unarchive a thread
- [ ] Search threads

### Connectors
- [ ] Create a connector
- [ ] Test connector connection
- [ ] Sync connector models
- [ ] Delete a connector

### Models
- [ ] View cloud models
- [ ] View local models
- [ ] Pull a model from catalog
- [ ] Assign a model role

### Memory
- [ ] Create a memory record
- [ ] Edit a memory record
- [ ] Toggle memory enabled/disabled
- [ ] Delete a memory record

### Files
- [ ] Upload a file
- [ ] View file list with ingestion status
- [ ] Delete a file

### Settings
- [ ] Change language (verify translations)
- [ ] Change theme (verify dark/light mode)
- [ ] Change password

### Admin (ADMIN role only)
- [ ] View user list
- [ ] Non-admin cannot access admin page

### Observability
- [ ] Health dashboard shows all services
- [ ] Audit log viewer works with filters
- [ ] Log viewer shows client and server logs

---

## 8. Debugging Failed E2E Tests

### Check Service Logs

```bash
docker compose -f docker-compose.dev.yml logs --since 5m chat-service routing-service
```

### Check Database State

```bash
# Connect to chat database
docker exec -it claw-pg-chat psql -U claw claw_chat

# Query messages
SELECT id, role, content, provider, model FROM "ChatMessage" ORDER BY "createdAt" DESC LIMIT 5;
```

### Check RabbitMQ

Access the management UI at http://localhost:15672 (credentials from `.env`):
- Check queue depths
- Check for dead-letter messages
- Verify exchange bindings

### Check Nginx

```bash
docker compose logs nginx --since 5m
```
