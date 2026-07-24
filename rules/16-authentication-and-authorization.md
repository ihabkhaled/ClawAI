# 16 — Authentication and Authorization

## Purpose

Auth is uniform across all 17 services: one JWT model, one guard stack, one
permission catalog, one entitlement layer. Consistency here is a security
property — a service that rolls its own auth check is a hole.

## Applies to

Every service's HTTP surface, `@claw/shared-auth`, `@claw/shared-entitlements`,
and the frontend feature-gate hook.

## Mandatory rules

1. **Use the shared guard stack.** `AuthGuard` + `RolesGuard` from
   `@claw/shared-auth`, with `@Public`, `@Roles`, `@CurrentUser`, and permission
   decorators. Do not hand-roll token parsing in a controller/service.
2. **JWT + refresh-token rotation** (argon2 password hashing) is the auth model;
   tokens are Bearer headers, never URL query params, never logged.
3. **RBAC roles** are `ADMIN`, `OPERATOR`, `VIEWER`, `USER`. Route access is
   declared via decorators; USER defaults come from `USER_DEFAULT_PERMISSIONS` in
   `apps/claw-auth-service/src/common/constants/rbac.constants.ts`.
4. **Permissions come from the catalog** — `Permission` enum in
   `packages/shared-types/src/enums/permission.enum.ts`. Never compare against a raw
   permission string.
5. **Feature gates use entitlements.** Plan `allow*` flags (e.g. `allowCompareMode`,
   `allowJudgeMode`, `allowCriticReview`) are evaluated via `@claw/shared-entitlements`
   on the backend and `useFeatureGates` on the frontend — gate both ends.
6. **Ownership is checked in the service** (see [09](09-backend-services.md)) —
   RBAC says "may call this endpoint," ownership says "may act on this row."
7. **Internal service-to-service calls authenticate** with the service token /
   `ServiceTokenGuard`; do not leave internal endpoints open.

## Prohibited patterns

- Decoding/verifying a JWT inline instead of via `AuthGuard`.
- `if (permission === 'chat:use')` — string comparison instead of the enum.
- Gating a feature on the FE only (or BE only) — both are required.
- Trusting the caller's claimed userId over the authenticated principal.

## Correct pattern

```ts
// apps/claw-chat-service/src/modules/chat/chat.controller.ts
@RequirePermissions(Permission.COMPARE_USE)
@Post('parallel')
async compare(@Body() dto: CompareDto, @CurrentUser() user: AuthUser) {
  return this.compareService.run(user.id, dto); // entitlement + ownership checked in service
}
```

## Enforcement

- **Architecture test** — every non-`@Public` route resolves a guard.
- **Unit test** — permission/entitlement/ownership branches (401/403) asserted.
- **Knowledge check** — `.ai/manifests/permissions.json` mirrors the enum.

## Related skills

- [05-qa-toolkit](../skills/05-qa-toolkit.md) — 401/403 negative-path coverage.

## Related context

- Root `CLAUDE.md` — "Security", "Permission catalog", "Plan feature gates".

## Definition of done

- [ ] Routes protected by the shared guard stack + permission decorators.
- [ ] Permissions referenced via the enum, never string literals.
- [ ] Feature gated on both FE and BE via entitlements.
- [ ] Ownership verified in the service; internal calls authenticated.
