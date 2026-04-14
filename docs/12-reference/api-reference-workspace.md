# API Reference: Workspace Service

Base URL:

- via Nginx: `http://localhost:4000/api/v1`
- direct: `http://localhost:4014/api/v1`

---

## Connectors

- `POST /workspace/connectors`
- `GET /workspace/connectors`
- `GET /workspace/connectors/:id`
- `PATCH /workspace/connectors/:id`
- `DELETE /workspace/connectors/:id`
- `POST /workspace/connectors/:id/health`
- `POST /workspace/connectors/:id/sync`

### Example create request

```json
{
  "name": "Engineering GitHub",
  "provider": "GITHUB",
  "permissionLevel": "READ",
  "scopes": ["repo", "read:user"]
}
```

---

## OAuth

- `POST /workspace/oauth/init`
- `GET /workspace/oauth/callback`

Used to start and complete provider authorization flows.

---

## Search and Objects

- `POST /workspace/search`
- `GET /workspace/objects`
- `GET /workspace/objects/:id`
- `POST /internal/workspace/search`

`/internal/workspace/search` is the path chat uses to retrieve grounded citations during context assembly.

---

## Actions

- `POST /workspace/actions`
- `GET /workspace/actions`
- `GET /workspace/actions/:id`
- `POST /workspace/actions/:id/approve`
- `POST /workspace/actions/:id/reject`

These routes support human-reviewed external action drafts such as issue creation or outbound messages.
