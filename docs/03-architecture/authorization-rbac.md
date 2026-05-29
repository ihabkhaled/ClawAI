# Authorization & RBAC

## Overview

ClawAI enforces authorization at the backend (frontend guards are cosmetic). The
base layer is Role-Based Access Control via two NestJS guards from `shared-auth`,
applied across all backend services. The **Auth/RBAC/Plans/Quota flagship**
(2026-05) layers on top of this:

- A new **`USER`** role (default for self-registration) alongside the legacy
  ADMIN/OPERATOR/VIEWER. New users register as ACTIVE on the default **Free** plan.
- **Dynamic, DB-backed roles + permissions** — a fixed `Permission` code catalog
  (`@claw/shared-types`, 30 entries) granted to roles via the `RolePermission`
  table; admins create custom roles and toggle grants. Effective permissions =
  role grants ∩ plan feature-gates.
- **Plans + daily token quota + per-plan model access**, resolved fresh per
  request by the shared `EntitlementsAdapter` (Redis-cached, event-invalidated)
  so a plan/role change applies on the next request without re-issuing the JWT.
- **ADMIN bypasses** quota + model-access + plan checks entirely.

See [Flagship: Dynamic RBAC, Plans, Quota & Model Access](#flagship-dynamic-rbac-plans-quota--model-access)
below for the full model.

---

## Role Definitions

### ADMIN

Full platform access. Manages users, connectors, routing policies, and system settings.

Typical users: IT administrators, team leads, platform owners.

### OPERATOR

Standard usage access. Can use chat, manage own memories and files, view connectors and routing decisions (read-only).

Typical users: Developers, analysts, regular team members.

### VIEWER

Read-only access. Can view own chat threads but cannot create messages or modify anything.

Typical users: Auditors, observers, stakeholders needing visibility without write access.

---

## Permission Matrix

| Resource                | ADMIN       | OPERATOR    | VIEWER      |
| ----------------------- | ----------- | ----------- | ----------- |
| **Users**               | Full CRUD   | --          | --          |
| **System Settings**     | Full CRUD   | --          | --          |
| **Connectors**          | Full CRUD   | Read        | --          |
| **Routing Policies**    | Full CRUD   | Read        | --          |
| **Chat Threads (own)**  | Full CRUD   | Full CRUD   | Read        |
| **Chat Threads (all)**  | Full CRUD   | --          | --          |
| **Chat Messages (own)** | Full CRUD   | Full CRUD   | Read        |
| **Memories (own)**      | Full CRUD   | Full CRUD   | Read        |
| **Context Packs (own)** | Full CRUD   | Full CRUD   | Read        |
| **Files (own)**         | Full CRUD   | Full CRUD   | --          |
| **Audit Logs**          | Full access | Read        | --          |
| **Usage Ledger**        | Full access | Read        | --          |
| **Ollama Models**       | Full CRUD   | Read        | --          |
| **Model Catalog**       | Full access | Read + Pull | Read        |
| **Health Status**       | Full access | Full access | Full access |
| **Server Logs**         | Full access | --          | --          |
| **Client Logs**         | Full access | --          | --          |
| **Image Generation**    | Full access | Full access | --          |
| **File Generation**     | Full access | Full access | --          |

---

## Implementation

### AuthGuard (Global)

Applied to every endpoint across all 17 services. Part of the `shared-auth` package.

```
Request -> AuthGuard
  |
  +-- Check @Public() decorator -> Skip if present
  |
  +-- Extract JWT from Authorization header
  |
  +-- Verify signature (JWT_SECRET)
  |
  +-- Verify expiry
  |
  +-- Decode payload -> Attach to request.user
  |
  +-- Pass to next guard/handler
```

**Bypass**: Endpoints decorated with `@Public()` skip authentication entirely. Used for:

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /health` (all services)
- `POST /ollama/generate` (internal)

### RolesGuard (Per-Endpoint)

Applied to endpoints that require specific roles. Reads the `@Roles()` decorator.

```
Request -> RolesGuard
  |
  +-- Read @Roles() metadata from endpoint
  |
  +-- If no @Roles() -> Allow all authenticated users
  |
  +-- Compare request.user.role against allowed roles
  |
  +-- If role matches -> Allow
  |
  +-- If role does not match -> 403 Forbidden
```

### Decorators

```typescript
// Skip authentication entirely
@Public()

// Require specific roles
@Roles(UserRole.ADMIN)
@Roles(UserRole.ADMIN, UserRole.OPERATOR)

// Extract current user from request
@CurrentUser() user: JwtPayload
```

---

## Ownership Enforcement

Beyond role-based access, ClawAI enforces resource ownership at the service layer:

### User-Scoped Resources

| Resource      | Ownership Check                    |
| ------------- | ---------------------------------- |
| Chat Threads  | `thread.userId === currentUser.id` |
| Chat Messages | Via thread ownership               |
| Memories      | `memory.userId === currentUser.id` |
| Context Packs | `pack.userId === currentUser.id`   |
| Files         | `file.userId === currentUser.id`   |

### Enforcement Pattern

```
Controller: Extract userId from @CurrentUser()
  -> Service: Verify resource.userId === currentUser.id
    -> If mismatch: throw BusinessException(FORBIDDEN_*_ACCESS, 403)
    -> If match: proceed with operation
```

### Admin Override

ADMIN users can bypass ownership checks for administrative purposes (e.g., viewing any user's threads for compliance review).

---

## Error Responses

| Status | Code                          | When                                  |
| ------ | ----------------------------- | ------------------------------------- |
| 401    | UNAUTHORIZED                  | Missing, invalid, or expired JWT      |
| 403    | FORBIDDEN                     | Role not allowed for endpoint         |
| 403    | FORBIDDEN_THREAD_ACCESS       | Accessing another user's thread       |
| 403    | FORBIDDEN_MEMORY_ACCESS       | Accessing another user's memory       |
| 403    | FORBIDDEN_CONTEXT_PACK_ACCESS | Accessing another user's context pack |
| 403    | FORBIDDEN_FILE_ACCESS         | Accessing another user's file         |

---

## Security Considerations

1. **No role escalation**: Users cannot modify their own role. Only another ADMIN can change roles.
2. **No self-deactivation**: Users cannot deactivate their own account.
3. **Guards are global**: AuthGuard is registered at the application level, not per-module. Every endpoint is protected by default.
4. **Defense in depth**: Both guard-level (role check) and service-level (ownership check) enforcement exist. Even if a guard is misconfigured, the service layer validates ownership.
5. **Audit trail**: All 403 responses are logged. Repeated forbidden access attempts can be detected in audit logs.

---

## Flagship: Dynamic RBAC, Plans, Quota & Model Access

This section documents the SaaS-ification layer added in 2026-05.

### Roles & permissions (DB-backed, admin-editable)

- `Role` (slug unique, `isSystem`, `isAssignable`) + `RolePermission` (one row per
  granted permission) live in `claw_auth`. Seeded system roles: **ADMIN** (all
  permissions) and **USER** (own-scoped set). `User.roleId` FKs the role; the JWT
  carries the role slug only (`sub,email,role`) — entitlements are **not** embedded.
- `Permission` is a fixed code catalog in `@claw/shared-types`
  (`packages/shared-types/src/enums/permission.enum.ts`), 30 entries: `CHAT_*`,
  `MEMORY_*`, `CONTEXT_PACK_*`, `WORKSPACE_*`, `MODEL_USE_ALLOWED`, `ROUTER_USE`,
  `COMPARE_USE`, `JUDGE_USE`, and the `ADMIN_*` management permissions.
- Admin role/permission management (auth-service `roles` module, `@Roles(ADMIN)`):
  `GET/POST/PATCH/DELETE /api/v1/admin/roles`, `GET /api/v1/admin/roles/permissions`
  (catalog), `PUT /api/v1/admin/roles/:id/permissions` (set grants). System roles
  cannot be deleted; ADMIN cannot be stripped of `ADMIN_PERMISSIONS_MANAGE` (lockout
  guard).

### Plans, quota & per-plan model access

- `Plan` (name/slug/prices/`dailyTokenQuota`/feature gates: allowCompareMode,
  allowJudgeMode, allowWorkspaces, allowMemory, allowContextPacks), `PlanModelAccess`
  (provider/model + allowAsPrimary/Fallback/Judge/InCompare), `UserPlanAssignment`,
  `TokenUsageLedger`. Seeded plans: **free / pro / team**.
- Admin plan management (auth-service `plans` module, `@Roles(ADMIN)`) under
  `/api/v1/admin/plans` — CRUD, activate/deactivate, set-default, reorder,
  `PUT /:id/model-access`, assign-user.
- **Quota** is a Redis-atomic reserve→finalize→release counter keyed
  `quota:{userId}:{YYYY-MM-DD}` (TTL to end of day) backed by the durable
  `TokenUsageLedger`. chat-service reserves before the LLM call and finalizes after.

### Entitlements resolution (the adapter)

- auth-service is the source of truth. `GET /internal/users/:id/entitlements`
  (`@Public`, service-to-service) returns `{ role, isAdmin, permissions[], plan,
allowedModels[], allowedProviders[], quota{dailyLimit,used,remaining,unlimited} }`.
- The shared `@claw/shared-entitlements` `EntitlementsAdapter` resolves this
  fresh per request (Redis-cached, event-invalidated on plan/role/quota changes),
  plus helpers `hasPermission`, `hasPlanFeature`, `isModelAllowedForUsage`.
- The frontend uses the auth-guarded **`GET /api/v1/auth/me/entitlements`** (same
  aggregate, scoped to the caller) to render `/plan` and `/usage`.

### Enforcement points

| Layer                               | Enforcement                                                                                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| chat-service `AccessControlService` | 403 `MODEL_NOT_ALLOWED_FOR_PLAN` on a forbidden manual model; 429 `quota.dailyLimitExceeded` when the daily budget is exhausted. **Fail-open** on an entitlements outage (auth remains the hard backstop). ADMIN/unlimited pass. |
| routing-service AUTO path           | `applyPlanModelGate(decision, allowedModels)` drops off-plan candidates and promotes the first allowed fallback; empty `allowedModels` = allow-all (preserves the v1 hot path).                                                  |
| routing-service `RoutingController` | `@Roles(ADMIN, OPERATOR)` on the whole controller — `RoutingDecision` rows carry `messageContent` but no `userId`, so `decisions/detail/:id` is admin/operator-only to prevent a cross-user prompt leak.                         |

### ADMIN bypass

The `ADMIN` role bypasses Quota, ModelAccess and Plan checks entirely (no plan
assignment required). Chosen over a synthetic "unrestricted plan".
