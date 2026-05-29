# RBAC / Permission-Matrix Hardening — Implementation Report

## Summary

ClawAI is hardened with a defense-in-depth permission system so that a normal
user (the `USER` / MEMBER role) can use only Chat, Workspaces (connect their own
accounts), the Desktop Agent, and their own account pages — and is blocked, both
in the sidebar and at the backend (HTTP 403), from every configuration / admin /
observability surface. Enforcement is driven by the existing admin-editable,
DB-backed role→permission matrix.

## Architecture

```
Permission catalog (shared-types/enums/permission.enum.ts)
  → auth-service permission resolver (GET /internal/users/:id/entitlements)
  → EntitlementsAdapter + PermissionGuard + @RequirePermissions (shared-entitlements)
  → backend: global PermissionGuard on config services + ownership scoping + audit log
  → frontend: resolved permissions from /auth/me → sidebar filter + route guard + landing
  → tests + docs
```

- **Source of truth:** the auth-service resolves a user's effective permissions
  from their DB role grants (`role_permissions`). Resolved fresh per request
  (not embedded in the JWT) so matrix changes apply on the next request.
- **ADMIN bypass:** the `ADMIN` role holds every permission (resolver + guard
  short-circuit). Legacy `OPERATOR`/`VIEWER` preserved; grant per-role via UI.

## What changed

### Foundation (commit `4af2119c`)

- `packages/shared-types` Permission catalog + FE mirror: added `FILES_USE`,
  `RESEARCH_USE`, `AGENT_USE`, `MODELS_CATALOG_VIEW`, `VIEW_DASHBOARD`,
  `ADMIN_WORKSPACE_AUTOMATION_MANAGE`.
- `packages/shared-entitlements`: new `PermissionGuard`, `@RequirePermissions`
  decorator, global `EntitlementsModule.forRoot`, DI tokens (+ unit tests).
- `USER` system role trimmed to a minimal self-service surface; seeds
  (`seed.ts`/`seed.js`) reconcile system-role grants to the seed on every run.

### Backend enforcement (commit `29eb45cc`)

- Wired `EntitlementsModule.forRoot({ authServiceUrl })` + `APP_GUARD`
  `PermissionGuard` (after Auth/Roles) + `AUTH_SERVICE_URL` AppConfig into 9
  services: connector, ollama, llamacpp, routing, audit, server-logs, research,
  memory, workspace.
- `@RequirePermissions(...)` on every admin/config endpoint per the
  [permission matrix](./page-api-permission-matrix.md); model-list reads,
  `/internal/*`, the `@Public` webhook receiver, and per-user workspace
  connect/sync flows kept OPEN.
- `PermissionGuard` returns the structured contract on deny
  (`{ errorCode: "INSUFFICIENT_PERMISSIONS", messageKey, requiredPermissions }`,
  or `UNAUTHORIZED` when unauthenticated) and audit-logs every denial
  (user, method, path, required perms, ip/ua) via the Pino → server-logs pipe.

### Frontend gating (commit `0dc50816`)

- `route-permissions.constants.ts` + `route-permission.utility.ts` (central
  route→permission map, longest-prefix wins).
- `sidebar-visibility.utility.ts` (recursive permission filter — hides parents
  whose children are all hidden) consumed by the sidebar controller hook.
- `use-route-permission-guard.ts` + `portal-content.tsx` render `AccessDenied`
  for blocked routes; default authenticated landing moved to `/chat`.

## Non-negotiable principles (status)

- ✅ Backend is the source of truth (frontend hiding is UX only).
- ✅ Default-deny for normal users; ambiguous pages blocked.
- ✅ No scattered raw role checks — permission keys + central guard; `ADMIN`
  short-circuit lives only in the guard/resolver.
- ✅ Workspace own-account connection allowed but ownership-scoped.
- ✅ Consistent 401/403 error contract.
- ✅ Denied attempts audit-logged (structured warn → MongoDB pipeline).

## Verification

- Static: full-repo `typecheck` (0 errors), `build` (0 errors), `test` (all
  suites pass) across all workspaces.
- Unit: `PermissionGuard` (8 cases — default-allow, ADMIN bypass, missing-perm
  403, fail-closed, AND-semantics, unauthenticated), FE route/sidebar/guard
  utilities + hooks.
- Live integration: `qa/test-rbac-permissions.sh` run against the rebuilt stack
  (auth + 9 config services + frontend; auth reseeded on start) — **19/19 PASS**:
  - MEMBER → **403** on `/connectors`, `/audits`, `/usage`, `/server-logs`,
    `/routing/policies`, `/admin/plans`, `/admin/roles`, `/research/runs`,
    `/workspace/ai-actions/policies`.
  - MEMBER → **200** on `/ollama/models` (chat picker), `/workspace/connectors`
    (own), `/chat-threads` (own), `/auth/me/entitlements`.
  - ADMIN → **200** on `/connectors`, `/audits`, `/routing/policies`,
    `/admin/plans`.
  - MEMBER entitlements = exactly `CHAT_USE, CHAT_READ_OWN, CHAT_DELETE_OWN,
WORKSPACE_CONNECT_OWN, WORKSPACE_READ_OWN, WORKSPACE_SYNC_OWN,
WORKSPACE_ACTION_OWN, MODEL_USE_ALLOWED, AGENT_USE` — no `ADMIN_*`.
- Docker logs: 0 critical errors (UnhandledPromiseRejection / FATAL / DI
  resolution / missing module) across all 10 rebuilt backend services.

## Assumptions / limitations

- **Roles:** kept the repo's existing `ADMIN / OPERATOR / VIEWER / USER` set
  rather than introducing `SUPER_ADMIN`; `ADMIN` already bypasses all gates and
  is the de-facto super-admin. Finer `view` vs `manage` permission splits can be
  added per resource on top of the current coarser keys without breaking the
  MEMBER-block guarantee.
- **Permission naming:** kept the repo's `SCREAMING_SNAKE` enum convention
  (centralized + typed) rather than dot-notation, per "follow repo convention".
- **Entitlements caching:** resolved fresh per request (no cache) for immediate
  correctness; config endpoints are low-traffic. A short TTL cache + event
  invalidation is a future optimization.
- **Files:** the `/files` page is hidden for MEMBER, but file-service upload
  endpoints stay open (chat attachments depend on them); they remain
  userId-scoped.
