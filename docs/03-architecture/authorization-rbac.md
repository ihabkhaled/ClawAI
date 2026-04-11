# Authorization & RBAC

## Overview

ClawAI enforces Role-Based Access Control (RBAC) with three roles: ADMIN, OPERATOR, and VIEWER. Authorization is implemented through two NestJS guards from the `shared-auth` package, applied across all 13 backend services.

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

| Resource | ADMIN | OPERATOR | VIEWER |
| --- | --- | --- | --- |
| **Users** | Full CRUD | -- | -- |
| **System Settings** | Full CRUD | -- | -- |
| **Connectors** | Full CRUD | Read | -- |
| **Routing Policies** | Full CRUD | Read | -- |
| **Chat Threads (own)** | Full CRUD | Full CRUD | Read |
| **Chat Threads (all)** | Full CRUD | -- | -- |
| **Chat Messages (own)** | Full CRUD | Full CRUD | Read |
| **Memories (own)** | Full CRUD | Full CRUD | Read |
| **Context Packs (own)** | Full CRUD | Full CRUD | Read |
| **Files (own)** | Full CRUD | Full CRUD | -- |
| **Audit Logs** | Full access | Read | -- |
| **Usage Ledger** | Full access | Read | -- |
| **Ollama Models** | Full CRUD | Read | -- |
| **Model Catalog** | Full access | Read + Pull | Read |
| **Health Status** | Full access | Full access | Full access |
| **Server Logs** | Full access | -- | -- |
| **Client Logs** | Full access | -- | -- |
| **Image Generation** | Full access | Full access | -- |
| **File Generation** | Full access | Full access | -- |

---

## Implementation

### AuthGuard (Global)

Applied to every endpoint across all 13 services. Part of the `shared-auth` package.

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

| Resource | Ownership Check |
| --- | --- |
| Chat Threads | `thread.userId === currentUser.id` |
| Chat Messages | Via thread ownership |
| Memories | `memory.userId === currentUser.id` |
| Context Packs | `pack.userId === currentUser.id` |
| Files | `file.userId === currentUser.id` |

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

| Status | Code | When |
| --- | --- | --- |
| 401 | UNAUTHORIZED | Missing, invalid, or expired JWT |
| 403 | FORBIDDEN | Role not allowed for endpoint |
| 403 | FORBIDDEN_THREAD_ACCESS | Accessing another user's thread |
| 403 | FORBIDDEN_MEMORY_ACCESS | Accessing another user's memory |
| 403 | FORBIDDEN_CONTEXT_PACK_ACCESS | Accessing another user's context pack |
| 403 | FORBIDDEN_FILE_ACCESS | Accessing another user's file |

---

## Security Considerations

1. **No role escalation**: Users cannot modify their own role. Only another ADMIN can change roles.
2. **No self-deactivation**: Users cannot deactivate their own account.
3. **Guards are global**: AuthGuard is registered at the application level, not per-module. Every endpoint is protected by default.
4. **Defense in depth**: Both guard-level (role check) and service-level (ownership check) enforcement exist. Even if a guard is misconfigured, the service layer validates ownership.
5. **Audit trail**: All 403 responses are logged. Repeated forbidden access attempts can be detected in audit logs.
