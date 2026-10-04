# API Reference — Connectors Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4003/api/v1` (direct)

## Runtime provider definitions (ADR-157)

These endpoints require `ADMIN_CONNECTORS_MANAGE`.

- `GET /connectors/provider-definitions?search=<text>&status=<ACTIVE|INACTIVE>` lists
  custom and built-in definitions with dependency counts.
- `POST /connectors/provider-definitions` creates an OpenAI-compatible definition
  with a normalized unique key, HTTPS base URL, model-list endpoint, auth type,
  capability flags, and billing defaults.
- `PATCH /connectors/provider-definitions/:id` updates custom metadata. Built-in
  identity and configuration are protected.
- `PATCH /connectors/provider-definitions/:id/status` activates or deactivates a
  custom or built-in definition.
- `DELETE /connectors/provider-definitions/:id` removes unused definitions only;
  built-ins and definitions that were ever connected are retained for history.

Create a custom connector through `POST /connectors` with
`provider: "CUSTOM_OPENAI_COMPATIBLE"`, `providerDefinitionId`, and credentials
matching the definition's auth type. Responses never include credentials or
`encryptedConfig`. These database-backed definitions cover the OpenAI-compatible
chat and model-list protocol; specialized async/media/task APIs are unsupported.

---

## POST /connectors

Create a new AI provider connector.

**Auth**: Bearer token
**Request Body** (optional `isPayAsYouGo` boolean = "credit connector"; omitted, the provider default applies):

```json
{
  "name": "My Gemini",
  "provider": "GEMINI",
  "authType": "API_KEY",
  "apiKey": "AIzaSy...",
  "baseUrl": null,
  "region": null
}
```

**Response 201**:

```json
{
  "id": "clconn...",
  "name": "My Gemini",
  "provider": "GEMINI",
  "status": "UNKNOWN",
  "authType": "API_KEY",
  "isEnabled": true,
  "defaultModelId": null,
  "baseUrl": null,
  "region": null,
  "createdAt": "2026-04-11T10:00:00.000Z",
  "models": []
}
```

**Errors**:

- `400 Validation failed` — missing required fields
- `409 DUPLICATE_ENTITY` — connector with this name exists

**curl**:

```bash
curl -X POST http://localhost:4000/api/v1/connectors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Gemini","provider":"GEMINI","authType":"API_KEY","apiKey":"AIzaSy..."}'
```

---

## GET /connectors

List all connectors with their models.

**Auth**: Bearer token
**Query Parameters**:

- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `provider` (enum) — OPENAI, ANTHROPIC, GEMINI, AWS_BEDROCK, DEEPSEEK, OLLAMA
- `status` (enum) — HEALTHY, DEGRADED, DOWN, UNKNOWN

**Response 200**:

```json
{
  "data": [
    {
      "id": "clconn...",
      "name": "My Gemini",
      "provider": "GEMINI",
      "status": "HEALTHY",
      "authType": "API_KEY",
      "isEnabled": true,
      "models": [
        {
          "id": "clmod...",
          "modelKey": "gemini-2.5-flash",
          "displayName": "Gemini 2.5 Flash",
          "lifecycle": "ACTIVE",
          "supportsStreaming": true,
          "supportsVision": true
        }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

## GET /connectors/:id

Get a specific connector with models.

**Auth**: Bearer token
**Response 200**: ConnectorWithModels object
**Errors**: `404 ENTITY_NOT_FOUND`

---

## PATCH /connectors/:id

Update a connector.

**Auth**: Bearer token
**Request Body**: Partial fields (name, isEnabled, defaultModelId, baseUrl, apiKey, isPayAsYouGo)
**Response 200**: Updated ConnectorWithModels

---

## DELETE /connectors/:id

Delete a connector and all its models.

**Auth**: Bearer token
**Response 200**: Deleted ConnectorWithModels

---

## POST /connectors/:id/test

Test a connector's health by making a lightweight API call.

**Auth**: Bearer token
**Response 200**:

```json
{
  "status": "HEALTHY",
  "latencyMs": 245,
  "error": null
}
```

**Error response**:

```json
{
  "status": "DOWN",
  "latencyMs": 5000,
  "error": "Connection timed out"
}
```

---

## POST /connectors/:id/sync

Sync available models from the provider's API.

**Auth**: Bearer token
**Response 200**:

```json
{
  "status": "COMPLETED",
  "modelsFound": 15,
  "modelsAdded": 3,
  "modelsRemoved": 1
}
```

---

## GET /connectors/:id/models

Get all models for a specific connector.

**Auth**: Bearer token
**Response 200**:

```json
[
  {
    "id": "clmod...",
    "connectorId": "clconn...",
    "provider": "GEMINI",
    "modelKey": "gemini-2.5-flash",
    "displayName": "Gemini 2.5 Flash",
    "lifecycle": "ACTIVE",
    "supportsStreaming": true,
    "supportsTools": true,
    "supportsVision": true,
    "supportsAudio": false,
    "supportsStructuredOutput": true,
    "maxContextTokens": 1048576,
    "syncedAt": "2026-04-11T10:00:00.000Z"
  }
]
```

---

## Internal: GET /internal/connectors/config

Get decrypted connector configuration for a provider. Internal use only (not exposed via nginx).

**Auth**: Public (internal network only)
**Query**: `?provider=GEMINI`
**Response 200**:

```json
{
  "apiKey": "AIzaSy...",
  "baseUrl": "https://generativelanguage.googleapis.com",
  "provider": "GEMINI"
}
```
