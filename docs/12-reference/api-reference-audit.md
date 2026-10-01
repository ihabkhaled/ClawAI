# API Reference — Audit Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4007/api/v1` (direct)

---

## Audit Logs

### GET /audits

List audit log entries with filtering.

**Auth**: Bearer token
**Query Parameters**:

- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `action` (string) — filter by action type
- `severity` (string) — LOW, MEDIUM, HIGH, CRITICAL
- `entityType` (string) — filter by entity type
- `startDate` (ISO 8601 string) — from date
- `endDate` (ISO 8601 string) — to date
- `search` (string) — search in details

**Response 200**:

```json
{
  "data": [
    {
      "_id": "66abc...",
      "userId": "cluser...",
      "action": "MESSAGE_SENT",
      "entityType": "ChatMessage",
      "entityId": "clmsg...",
      "severity": "LOW",
      "details": {
        "provider": "anthropic",
        "model": "claude-sonnet-4",
        "inputTokens": 1500,
        "outputTokens": 800,
        "latencyMs": 1200
      },
      "ipAddress": "172.18.0.1",
      "createdAt": "2026-04-11T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

**curl**:

```bash
curl "http://localhost:4000/api/v1/audits?page=1&limit=10&severity=HIGH" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /audits/stats

Get audit log statistics.

**Auth**: Bearer token
**Response 200**:

```json
{
  "totalEvents": 1500,
  "byAction": {
    "MESSAGE_SENT": 800,
    "USER_LOGIN": 250,
    "CONNECTOR_CREATED": 5,
    "ROUTING_DECISION_MADE": 400
  },
  "bySeverity": {
    "LOW": 1200,
    "MEDIUM": 250,
    "HIGH": 45,
    "CRITICAL": 5
  }
}
```

---

## Usage

### GET /usage

List usage ledger entries.

**Auth**: Bearer token
**Query Parameters**:

- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `provider` (string) — filter by provider
- `model` (string) — filter by model
- `startDate` (ISO 8601 string)
- `endDate` (ISO 8601 string)

**Response 200**:

```json
{
  "data": [
    {
      "_id": "66abc...",
      "userId": "cluser...",
      "resourceType": "tokens",
      "action": "chat_completion",
      "quantity": 2300,
      "unit": "tokens",
      "metadata": {
        "provider": "anthropic",
        "model": "claude-sonnet-4",
        "inputTokens": 1500,
        "outputTokens": 800,
        "estimatedCost": 0.0023,
        "threadId": "clthread...",
        "messageId": "clmsg..."
      },
      "createdAt": "2026-04-11T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 800, "totalPages": 40 }
}
```

---

### GET /usage/summary

Get aggregated usage summary.

**Auth**: Bearer token
**Response 200**:

```json
{
  "totalTokens": 500000,
  "totalMessages": 800,
  "totalImages": 25,
  "totalFiles": 10,
  "byProvider": {
    "anthropic": { "tokens": 300000, "messages": 500 },
    "local-ollama": { "tokens": 150000, "messages": 250 },
    "openai": { "tokens": 50000, "messages": 50 }
  }
}
```

---

### GET /usage/cost

Get cost summary.

**Auth**: Bearer token
**Response 200**:

```json
{
  "totalCost": 15.5,
  "byProvider": {
    "anthropic": 10.25,
    "openai": 3.5,
    "gemini": 1.75,
    "local-ollama": 0.0
  },
  "byModel": {
    "claude-sonnet-4": 8.0,
    "claude-opus-4": 2.25,
    "gpt-4o-mini": 3.5,
    "gemini-2.5-flash": 1.75
  }
}
```

---

### GET /usage/latency

Get latency summary.

**Auth**: Bearer token
**Response 200**:

```json
{
  "averageLatencyMs": 1500,
  "p50LatencyMs": 1200,
  "p95LatencyMs": 3500,
  "p99LatencyMs": 8000,
  "byProvider": {
    "anthropic": { "avgMs": 1800, "p95Ms": 4000 },
    "local-ollama": { "avgMs": 800, "p95Ms": 2000 },
    "openai": { "avgMs": 1200, "p95Ms": 3000 }
  }
}
```

---

## Audit Actions

| Action                   | Severity | Source    |
| ------------------------ | -------- | --------- |
| USER_LOGIN               | LOW      | auth      |
| USER_LOGOUT              | LOW      | auth      |
| USER_CREATED             | MEDIUM   | auth      |
| USER_ROLE_CHANGED        | HIGH     | auth      |
| USER_DEACTIVATED         | HIGH     | auth      |
| MESSAGE_SENT             | LOW      | chat      |
| CONNECTOR_CREATED        | MEDIUM   | connector |
| CONNECTOR_UPDATED        | MEDIUM   | connector |
| CONNECTOR_DELETED        | HIGH     | connector |
| CONNECTOR_SYNCED         | LOW      | connector |
| CONNECTOR_HEALTH_CHECKED | LOW      | connector |
| ROUTING_DECISION_MADE    | LOW      | routing   |
| MEMORY_EXTRACTED         | LOW      | memory    |
| IMAGE_GENERATED          | LOW      | image     |
| IMAGE_FAILED             | MEDIUM   | image     |
| FILE_GENERATED           | LOW      | file-gen  |
| FILE_GENERATION_FAILED   | MEDIUM   | file-gen  |

---

## Data Ingestion

Audit and usage data are ingested from RabbitMQ events. The audit service subscribes to relevant event patterns and creates records automatically. There is no direct POST API for creating audit logs.

---

## Feedback

### POST /feedback (signed in)

**Auth**: Bearer token, `FEEDBACK_SUBMIT`. Stores `source=AUTHENTICATED`, `userId`,
the author's full-name snapshot and email. Response `201 {id, ticketNumber, status}`.

### POST /feedback/public (no login)

**Auth**: none. Body (JSON, max 16 KB at nginx):

```json
{
  "type": "BUG",
  "title": "optional",
  "message": "required",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "pageUrl": "https://claw.local/pricing",
  "locale": "en",
  "website": ""
}
```

`name` 1-120 chars, `email` valid and at most 255, `website` is a honeypot and must be
empty. No file uploads. **Response 201** `{ "id": "..." }` always (a filled honeypot gets
the same shape and nothing is saved). **400** validation. **429** `FEEDBACK_RATE_LIMITED`
(5/hour per IP, 3/hour per email). Never echoes the email.

### GET /feedback/admin and GET /feedback/admin/:id

**Auth**: `ADMIN_FEEDBACK_MANAGE`. Query adds `source` (`AUTHENTICATED` | `PUBLIC`).
Items include `source`, `reporterName`, `reporterEmail`; `userId` is null for public tickets.

See [ADR-141](../13-adr/adr-141-public-and-authenticated-feedback-apis.md).
