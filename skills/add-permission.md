---
name: add-permission
summary: Add a Permission enum value in shared-types, wire RBAC defaults, and gate endpoints with it.
task_keywords:
  [
    permission,
    rbac,
    permission enum,
    requirepermissions,
    user default permissions,
    roles guard,
    authorize endpoint,
    grant permission,
    access control,
  ]
applies_to: [backend, packages/shared-types, apps/claw-auth-service]
required_rules: [08-security-rules, 02-backend-rules]
required_context: [authorization-rbac, ai-context-pack]
affected_workspaces: [packages/shared-types, apps/claw-auth-service, apps/claw-<service>-service]
required_tests: [guard/permission spec, qa auth matrix (401/403)]
required_docs: [docs/03-architecture/authorization-rbac.md, CLAUDE.md]
validation_lane: cd packages/shared-types && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add a Permission

Permissions are the source of truth for endpoint authorization. The enum lives in `packages/shared-types/src/enums/permission.enum.ts`; role defaults are seeded in auth-service; guards from `@claw/shared-auth` enforce them.

## When to use

- A new endpoint or action needs its own authorization gate distinct from existing permissions.
- A role's default grant set must change.

## When NOT to use

- The existing permission already covers the action — reuse it.
- You only need role gating (ADMIN/OPERATOR/VIEWER) with no new capability → `@Roles()` may suffice.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/08-security-rules.md`](../rules/08-security-rules.md) — Auth & Authorization.
- [`../docs/03-architecture/authorization-rbac.md`](../docs/03-architecture/authorization-rbac.md).

## Repository discovery steps

1. Read `packages/shared-types/src/enums/permission.enum.ts` to see the naming convention (`<DOMAIN>_<ACTION>`).
2. Read `apps/claw-auth-service/src/common/constants/rbac.constants.ts` — `USER_DEFAULT_PERMISSIONS` and any role default sets.
3. Grep for `RequirePermissions(` usage to mirror how endpoints apply it.

## Tests-first plan

- Guard spec: a user WITH the permission passes; WITHOUT it gets 403; unauthenticated gets 401.
- Extend `qa/test-<service>.sh` auth matrix with the new permission's 401/403 cases.

## Implementation steps

1. Add the enum member to `permission.enum.ts` following `<DOMAIN>_<ACTION>` naming.
2. Decide the default grants: if USER should have it by default, add to `USER_DEFAULT_PERMISSIONS`; otherwise leave it admin-grantable per role via `PUT /api/v1/admin/roles/:id/permissions`.
3. Gate the endpoint(s) with `@RequirePermissions(Permission.<NEW>)` from `@claw/shared-auth` alongside `AuthGuard`/`RolesGuard`.
4. If the permission unlocks FE UI, wire the FE feature-gate/`useFeatureGates` hook and types.
5. Rebuild `packages/shared-types` so consuming services pick up the enum (fresh checkout needs the built dist).

## Security considerations

- Withhold by default: grant new capabilities narrowly, never broaden USER defaults without cause (least privilege, OWASP A01).
- Read-only vs mutating permissions are separate — do not let a view permission authorize writes.
- Never gate a sensitive endpoint by role alone if a permission is warranted.

## Failure modes

- Enum added but the shared-types dist not rebuilt → consumer services fail to resolve `@claw/shared-types`.
- Forgetting the CI matrix/build-step edits if this is a brand-new shared package (not the case for shared-types itself, which already exists).
- Endpoint left ungated → broken access control.

## Validation commands

```bash
cd packages/shared-types && npm run typecheck && npm run lint && npm test && npm run build
# then gate the consuming service and run its lane:
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Update `docs/03-architecture/authorization-rbac.md` and the Permission catalog section in root `CLAUDE.md`.

## Definition of done

- Enum added, defaults decided, endpoints gated, shared-types rebuilt, auth matrix tests green, docs updated.
