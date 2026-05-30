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

---

## Provider Registry (catalog + admin app-configs)

| Endpoint                                       | Method | Required permission                  | Notes                                                                       |
| ---------------------------------------------- | ------ | ------------------------------------ | --------------------------------------------------------------------------- |
| `GET /workspace/providers`                     | GET    | (any auth role)                      | Provider definition catalog (no secrets).                                   |
| `GET /workspace/providers/:provider`           | GET    | (any auth role)                      | Single provider definition.                                                 |
| `GET /workspace/provider-app-configs`          | GET    | `WORKSPACE_APP_CONFIG_VIEW`          | Sanitised list (`ProviderAppConfigPublic` — `hasSecret: boolean`, no key).  |
| `POST /workspace/provider-app-configs`         | POST   | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`  | Admin-only. Creates an OAuth client-id/secret config for a provider.        |
| `GET /workspace/provider-app-configs/:id`      | GET    | `WORKSPACE_APP_CONFIG_VIEW`          | Sanitised single record.                                                    |
| `PUT /workspace/provider-app-configs/:id`      | PUT    | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`  | Admin-only. Update client-id/secret.                                        |
| `DELETE /workspace/provider-app-configs/:id`   | DELETE | `ADMIN_WORKSPACE_AUTOMATION_MANAGE`  | Admin-only. 204 on success.                                                 |

USER (and OPERATOR / VIEWER) can browse the list to choose which provider app
to connect their own account against; mutations are admin-only so secret
rotations stay centralised. See
[`service-guide-workspace.md`: USER VIEW + CONNECT Permission Scope](../04-backend/service-guide-workspace.md#user-view--connect-permission-scope-2026-05-30)
for the full per-endpoint permission matrix.
