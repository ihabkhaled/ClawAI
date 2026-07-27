# Permission Map

**38 permissions** gate every feature. Source of truth: the `Permission` enum in
`packages/shared-types` (`.ai/manifests/permissions.json`). Enforced by
`@claw/shared-auth` (`AuthGuard` + `RolesGuard` + `RequirePermissions`) on
services, and by the `useFeatureGates` hook on the frontend.

## Roles

RBAC roles: **ADMIN, OPERATOR, VIEWER, USER**. Permissions are granted per role;
admins manage grants via `PUT /api/v1/admin/roles/:id/permissions`.

## The 38 permissions (from the manifest)

**Chat / models**
`CHAT_USE`, `CHAT_READ_OWN`, `CHAT_DELETE_OWN`, `COMPARE_USE`, `JUDGE_USE`,
`ROUTER_USE`, `MODEL_USE_ALLOWED`, `MODELS_CATALOG_VIEW`

**Memory / context**
`MEMORY_USE`, `MEMORY_CREATE_OWN`, `MEMORY_READ_OWN`, `MEMORY_UPDATE_OWN`,
`MEMORY_DELETE_OWN`, `CONTEXT_PACK_CREATE_OWN`, `CONTEXT_PACK_READ_OWN`,
`CONTEXT_PACK_UPDATE_OWN`, `CONTEXT_PACK_DELETE_OWN`

**Files / research / agent**
`FILES_USE`, `RESEARCH_USE`, `AGENT_USE`

**Workspace**
`WORKSPACE_VIEW`, `WORKSPACE_APP_CONFIG_VIEW`, `WORKSPACE_CONNECT_OWN`,
`WORKSPACE_READ_OWN`, `WORKSPACE_SYNC_OWN`, `WORKSPACE_ACTION_OWN`

**Dashboard**
`VIEW_DASHBOARD`

**Admin (management)**
`ADMIN_USERS_MANAGE`, `ADMIN_PLANS_MANAGE`, `ADMIN_PERMISSIONS_MANAGE`,
`ADMIN_CONNECTORS_MANAGE`, `ADMIN_MODELS_MANAGE`, `ADMIN_ROUTING_MANAGE`,
`ADMIN_WORKSPACE_AUTOMATION_MANAGE`, `ADMIN_WORKSPACES_VIEW`, `ADMIN_USAGE_VIEW`,
`ADMIN_LOGS_VIEW`, `ADMIN_SYSTEM_VIEW`

`ADMIN_PLANS_MANAGE` is the server-side gate for plan CRUD, immutable price
versions, subscriber counts, provider-cost and margin dashboards, refunds, and
manual reconciliation. Hiding the `/admin/billing` or plan-price navigation is
only a usability measure; each auth-service and payment-service endpoint must
enforce the permission independently.

## USER default grants

Seeded from `USER_DEFAULT_PERMISSIONS` in
`apps/claw-auth-service/src/common/constants/rbac.constants.ts`: `CHAT_USE`,
`CHAT_READ_OWN`, `CHAT_DELETE_OWN`, `WORKSPACE_VIEW`, `WORKSPACE_APP_CONFIG_VIEW`,
`WORKSPACE_CONNECT_OWN`, `WORKSPACE_READ_OWN`, `WORKSPACE_SYNC_OWN`,
`WORKSPACE_ACTION_OWN`, `MODEL_USE_ALLOWED`, `AGENT_USE`, `RESEARCH_USE`.
Everything else (memory/context management pages, files, observability, admin) is
withheld by default and admin-grantable per role.

## `_OWN` vs `ADMIN_*` vs `_VIEW`

- **`*_OWN`** — the user acts on their own records only (service validates
  ownership).
- **`ADMIN_*_MANAGE`** — full mutate/delete across all users; ADMIN-gated.
- **`*_VIEW` (narrow read)** — e.g. `WORKSPACE_VIEW` + `WORKSPACE_APP_CONFIG_VIEW`
  let USER browse the workspace shell and admin-created provider-app-configs
  (sanitised, no secrets) but not mutate them — write/delete stays behind
  `ADMIN_WORKSPACE_AUTOMATION_MANAGE`.

## Plan entitlement gates (separate from permissions)

Distinct from RBAC permissions: `@claw/shared-entitlements` `Plan.allow*` flags —
`allowCompareMode`, `allowJudgeMode`, `allowCriticReview`, `allowResearchMode`,
`allowWorkspaces`, `allowMemory`, `allowContextPacks`. A feature can require BOTH
a permission (role can do it) AND an entitlement (plan allows it). Critic always
requires Judge (`allowCriticReview` ⇒ `allowJudgeMode`, DTO-enforced).

## How to add a permission

1. Add to the `Permission` enum in `packages/shared-types`.
2. Seed the grant in auth-service RBAC constants (which roles get it by default).
3. Guard the endpoint with `RequirePermissions(...)`.
4. Gate the FE via `useFeatureGates` / permission checks; add i18n for any new
   UI. This is the authentication-security pack in
   [task-router.md](task-router.md).
