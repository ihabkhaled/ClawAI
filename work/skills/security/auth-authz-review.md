---
id: auth-authz-review
title: Auth + authz review
category: security
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - security-lead
---

# Auth + authz review

## Purpose

Authentication proves who; authorization proves what's allowed. Confusing them is how IDOR and privilege escalation ship.

## Workflow

1. For every new endpoint, decide: Public? Authenticated? Role-gated?
2. Public → `@Public()` decorator (rare; explicit).
3. Authenticated → default (AuthGuard global).
4. Role-gated → `@Roles(UserRole.ADMIN, UserRole.OPERATOR)`.
5. Ownership check: in the service, verify the authenticated user owns the requested resource — NEVER trust `userId` from the request body.
6. For dual-auth endpoints (e.g. agent service), confirm the right guard is applied.

## Strict rules

- **MUST** classify every endpoint's auth mode.
- **MUST** check ownership in the service layer for user-scoped resources. **BLOCKER** if missing.
- **MUST NOT** accept `userId` from request body as the authority.
- **MUST NOT** use `@Public()` on write endpoints unless explicitly reviewed.

## Anti-patterns

- `@Public() @Post('/admin/reset')` → mass compromise.
- Service trusting `body.userId` → IDOR.
- Admin endpoint with no `@Roles` → any authenticated user hits it.

## Validation checklist

- [ ] Every endpoint's auth mode documented
- [ ] Ownership checked in service
- [ ] `@Roles` on admin endpoints
- [ ] QA asserts 401 unauth + 403 wrong role

## Quality gate

| Check              | Blocker? | Evidence          |
| ------------------ | -------- | ----------------- |
| 401 for unauth     | yes      | QA script         |
| 403 for wrong role | yes      | QA script         |
| Ownership tests    | yes      | Integration tests |

## Definition of done

1. Guards + roles applied.
2. QA asserts negative paths.
3. Ownership tested.

## References

- `CLAUDE.md` — Security section, RBAC
- `packages/shared-auth`
