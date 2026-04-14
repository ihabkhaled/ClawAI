# Service Guide: claw-workspace-service

## Overview

| Property | Value |
| --- | --- |
| Port | 4014 |
| Database | PostgreSQL `claw_workspace` |
| ORM | Prisma 5.x |
| Env prefix | `WORKSPACE_` |
| Public route space | `/api/v1/workspace/*` |
| Internal route space | `/api/v1/internal/workspace/*` |

The workspace service is Claw's integration layer for external tools and knowledge systems. It manages workspace connectors, OAuth flows, connector health and sync runs, searchable synced objects, and approval-style workspace actions. Chat uses it during context assembly to pull relevant external citations.

---

## Supported Providers

- GitHub
- GitLab
- Bitbucket
- Slack
- Jira
- Confluence
- Figma
- ClickUp
- Google Drive
- Gmail
- Microsoft SharePoint
- Microsoft OneDrive

---

## Core Responsibilities

1. create and manage workspace connectors per user
2. initialize and complete OAuth flows
3. test connector health
4. trigger full or delta syncs
5. store searchable workspace objects
6. expose user-facing search and internal chat search
7. manage action drafts that require user approval

---

## Key Data Models

### `WorkspaceConnector`

Stores one provider connection for one user, including status, scopes, encrypted tokens, permission level, last sync time, and provider metadata.

### `WorkspaceSyncRun`

Tracks sync activity per connector, including object type, delta/full mode, totals, and failure details.

### `WorkspaceHealthEvent`

Persists connector health checks with latency and error details.

### `WorkspaceObject`

Stores synced external objects such as repositories, issues, pull requests, documents, files, comments, channels, emails, and project artifacts.

### `WorkspaceAction`

Represents an action draft such as creating an issue, comment, ticket, or Slack message. Actions move through approval and execution states.

### `WorkspaceObjectLink`

Stores graph-style relationships between synced workspace objects.

---

## API Surface

### Connectors

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/workspace/connectors` | Create connector |
| `GET` | `/api/v1/workspace/connectors` | List connectors |
| `GET` | `/api/v1/workspace/connectors/:id` | Get connector |
| `PATCH` | `/api/v1/workspace/connectors/:id` | Update connector |
| `DELETE` | `/api/v1/workspace/connectors/:id` | Delete connector |
| `POST` | `/api/v1/workspace/connectors/:id/health` | Run health check |
| `POST` | `/api/v1/workspace/connectors/:id/sync` | Trigger sync, optional delta mode |

### OAuth

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/workspace/oauth/init` | Start OAuth/PKCE flow |
| `GET` | `/api/v1/workspace/oauth/callback` | Complete OAuth callback |

### Search and objects

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/workspace/search` | Search synced objects for current user |
| `GET` | `/api/v1/workspace/objects` | List synced objects |
| `GET` | `/api/v1/workspace/objects/:id` | Get object details |
| `POST` | `/api/v1/internal/workspace/search` | Internal search for chat context assembly |

### Actions

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/workspace/actions` | Create action draft |
| `GET` | `/api/v1/workspace/actions` | List actions |
| `GET` | `/api/v1/workspace/actions/:id` | Get action |
| `POST` | `/api/v1/workspace/actions/:id/approve` | Approve action |
| `POST` | `/api/v1/workspace/actions/:id/reject` | Reject action |

---

## Important Request Shapes

### Create connector

```json
{
  "name": "Engineering GitHub",
  "provider": "GITHUB",
  "permissionLevel": "READ",
  "scopes": ["repo", "read:user"],
  "metadata": {
    "organization": "acme"
  }
}
```

### Search

```json
{
  "query": "routing replay regression",
  "limit": 8,
  "types": ["ISSUE", "DOCUMENT"],
  "providers": ["GITHUB", "JIRA"]
}
```

### Create action draft

```json
{
  "connectorId": "ck_workspace_connector",
  "actionType": "CREATE_ISSUE",
  "payload": {
    "title": "Investigate routing mismatch",
    "body": "Linked from chat escalation"
  },
  "expiresInHours": 24
}
```

---

## How Chat Uses Workspace Search

`chat-service` calls `/api/v1/internal/workspace/search` during context assembly. The response is turned into citations and injected alongside memories, context packs, files, and thread history.

That keeps workspace grounding inside service boundaries:

- no direct cross-database reads
- no workspace provider calls from chat
- workspace search can fail gracefully without breaking chat delivery

---

## Status and Workflow Concepts

### Connector status

- `CONNECTED`
- `DEGRADED`
- `DISCONNECTED`
- `PENDING_AUTH`
- `UNKNOWN`

### Action status

- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `EXECUTING`
- `EXECUTED`
- `FAILED`
- `EXPIRED`

---

## Key Environment Variables

| Variable | Purpose |
| --- | --- |
| `WORKSPACE_DATABASE_URL` | PostgreSQL connection string |
| `WORKSPACE_PORT` | HTTP port |
| `WORKSPACE_SERVICE_URL` | Internal service URL |
| `PG_WORKSPACE_USER` / `PG_WORKSPACE_PASSWORD` / `PG_WORKSPACE_DB` / `PG_WORKSPACE_PORT` | Database container config |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack OAuth |
| `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET` | Jira OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ENCRYPTION_KEY` | Token encryption |

---

## Related Docs

- [Services Index](services-index.md)
- [Inter-Service Communication](inter-service-communication.md)
- [API Reference](../12-reference/api-reference.md)
