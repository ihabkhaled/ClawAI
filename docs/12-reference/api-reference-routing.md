# API Reference — Routing Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4004/api/v1` (direct)

---

## Policies

### POST /routing/policies

Create a routing policy.

**Auth**: Bearer token
**Request Body**:
```json
{
  "name": "Prefer Local for Coding",
  "routingMode": "AUTO",
  "priority": 10,
  "isActive": true,
  "config": {
    "preferLocal": true,
    "codingModel": "qwen2.5-coder:7b"
  }
}
```

**Response 201**:
```json
{
  "id": "clpol...",
  "name": "Prefer Local for Coding",
  "routingMode": "AUTO",
  "priority": 10,
  "isActive": true,
  "config": { "preferLocal": true, "codingModel": "qwen2.5-coder:7b" },
  "createdAt": "2026-04-11T10:00:00.000Z",
  "updatedAt": "2026-04-11T10:00:00.000Z"
}
```

**curl**:
```bash
curl -X POST http://localhost:4000/api/v1/routing/policies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","routingMode":"AUTO","priority":0,"config":{}}'
```

---

### GET /routing/policies

List routing policies.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `routingMode` (enum) — filter by mode
- `isActive` (boolean) — filter active/inactive

**Response 200**: `PaginatedResult<RoutingPolicy>`

---

### GET /routing/policies/:id

Get a specific policy.

**Auth**: Bearer token
**Response 200**: RoutingPolicy object
**Errors**: `404 ENTITY_NOT_FOUND`

---

### PATCH /routing/policies/:id

Update a policy.

**Auth**: Bearer token
**Request Body**: Partial fields (name, routingMode, priority, isActive, config)
**Response 200**: Updated RoutingPolicy

---

### DELETE /routing/policies/:id

Delete a policy.

**Auth**: Bearer token
**Response 200**: Deleted RoutingPolicy

---

## Evaluate

### POST /routing/evaluate

Evaluate which provider/model should handle a message. Used for testing routing decisions without sending an actual message.

**Auth**: Bearer token
**Request Body**:
```json
{
  "content": "Write a Python function to sort a list",
  "routingMode": "AUTO",
  "forcedProvider": null,
  "forcedModel": null
}
```

**Response 200**:
```json
{
  "selectedProvider": "anthropic",
  "selectedModel": "claude-sonnet-4",
  "routingMode": "AUTO",
  "confidence": 0.85,
  "reasonTags": ["coding", "python"],
  "privacyClass": "cloud",
  "costClass": "medium",
  "fallbackProvider": "local-ollama",
  "fallbackModel": "qwen2.5-coder:7b"
}
```

---

## Decisions

### GET /routing/decisions/:threadId

Get routing decisions for a specific thread.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20)

**Response 200**:
```json
{
  "data": [
    {
      "id": "cldec...",
      "messageId": "clmsg...",
      "threadId": "clthread...",
      "selectedProvider": "anthropic",
      "selectedModel": "claude-sonnet-4",
      "routingMode": "AUTO",
      "confidence": "0.8500",
      "reasonTags": ["coding"],
      "privacyClass": "cloud",
      "costClass": "medium",
      "fallbackProvider": "local-ollama",
      "fallbackModel": "gemma3:4b",
      "createdAt": "2026-04-11T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

## Routing Modes

| Mode | Behavior |
|------|----------|
| `AUTO` | Dynamic: Ollama router + category detection + heuristic fallback |
| `MANUAL_MODEL` | Uses forcedProvider + forcedModel from thread settings |
| `LOCAL_ONLY` | Category-aware: coding -> LOCAL_CODING, reasoning -> LOCAL_REASONING |
| `PRIVACY_FIRST` | Local if healthy, else Anthropic |
| `LOW_LATENCY` | OpenAI gpt-4o-mini |
| `HIGH_REASONING` | Anthropic claude-opus-4 |
| `COST_SAVER` | Local if healthy, else cheapest cloud |
