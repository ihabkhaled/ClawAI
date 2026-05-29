# Normal User (MEMBER) Access Contract

This is the authoritative statement of what a self-registered normal user — the
`USER` system role — can and cannot do in ClawAI. It is enforced by the backend
permission matrix (the source of truth) and mirrored in the frontend for UX.

## A normal user CAN

- Use **Chat** (`CHAT_USE`, `CHAT_READ_OWN`, `CHAT_DELETE_OWN`) — including the
  model picker, which reads the available-model list (`MODEL_USE_ALLOWED`).
- Use **Workspaces** and connect **their own** external accounts (GitHub, Slack,
  Jira, Drive, Gmail, …) inside a workspace they own: connect / sync / search /
  run actions on their own connectors (`WORKSPACE_CONNECT_OWN`,
  `WORKSPACE_READ_OWN`, `WORKSPACE_SYNC_OWN`, `WORKSPACE_ACTION_OWN`). Every
  query is ownership-scoped to the caller.
- Use the **Desktop Agent** if their plan allows it (`AGENT_USE`).
- Manage their **own account**: profile, settings, plan view, usage view.

## A normal user CANNOT (hidden from sidebar AND blocked with HTTP 403)

- **Connectors** — global connector management, secrets, OAuth client/app
  configuration (`ADMIN_CONNECTORS_MANAGE`).
- **Models / Routing** configuration, model pulls, routing policies, replay
  (`MODELS_CATALOG_VIEW`, `ADMIN_MODELS_MANAGE`, `ADMIN_ROUTING_MANAGE`).
- **Memory / Context** management pages (`MEMORY_USE`, `CONTEXT_PACK_READ_OWN`).
  (Chat still assembles memory/context automatically via internal endpoints.)
- **Files** management page, **Research** (`FILES_USE`, `RESEARCH_USE`).
- **Observability / Audits / Logs / Usage analytics**
  (`ADMIN_SYSTEM_VIEW`, `ADMIN_LOGS_VIEW`, `ADMIN_USAGE_VIEW`).
- **Admin** — users, roles, plans, permission matrix, workspace automation
  (ai-action policies, suggestion rules, webhook deliveries)
  (`ADMIN_USERS_MANAGE`, `ADMIN_PLANS_MANAGE`, `ADMIN_PERMISSIONS_MANAGE`,
  `ADMIN_WORKSPACE_AUTOMATION_MANAGE`, `ADMIN_WORKSPACES_VIEW`).
- **Dashboard** landing (`VIEW_DASHBOARD`) — normal users land on `/chat`.
- The **advanced chat labs** (compare, consensus, escalation, repair, decompose,
  best-of-n, verify, pipeline, cost-ensemble, role-pack) — gated by
  `COMPARE_USE` / `JUDGE_USE` / `ROUTER_USE`.

## Enforcement layers (defense in depth)

1. **Backend (source of truth):** `PermissionGuard` (`@claw/shared-entitlements`)
   resolves the caller's effective permissions from the auth-service
   role→permission matrix and returns `403 INSUFFICIENT_PERMISSIONS` when a
   `@RequirePermissions(...)` route is not satisfied. Resource queries are also
   ownership-scoped. `ADMIN` bypasses via its role; denials are audit-logged.
2. **Frontend (UX only):** the sidebar is recursively filtered by the user's
   resolved permissions, and a route guard renders `AccessDenied` for blocked
   paths. This never grants access the backend would refuse.

## Tunability

Everything above is the **seed default** for the `USER` system role. An admin can
grant or revoke any permission per role (including custom roles) in
`/admin/roles`; the change applies on the user's next request (entitlements are
resolved fresh, not embedded in the JWT).
