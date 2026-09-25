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
   **Media features are gated by the service that EXECUTES them**
   ([ADR-122](../docs/13-adr/adr-122-media-features-plan-gated-at-the-executing-service.md)):
   `allowImageGeneration` in image-service before any row / PAYG hold / provider
   call (every entry: generate, retry, retry-alternate), `allowHelperVision` in
   chat-service `VisionHelperManager` (low in the turn — ordinary chat never
   403s), `allowTextToSpeech` in the TTS endpoint, `maxVideoSeconds`
   (`null` unlimited, `0` disabled) in the video path. A courtesy check upstream
   (chat) is fine; it never replaces the executor's check. Paid gates fail
   CLOSED when auth-service cannot answer.
6. **Ownership is checked in the service** (see [09](09-backend-services.md)) —
   RBAC says "may call this endpoint," ownership says "may act on this row."
   A stranger gets the same 404 as a missing id. On an `@Sse` route the check is
   a guard, because a handler runs after Nest has already sent 200 —
   worked example: image-service `ImageGenerationOwnerGuard` (2026-09-25).
7. **Internal service-to-service calls authenticate** with the service token /
   `ServiceTokenGuard`; do not leave internal endpoints open.
8. **A session outlives many tabs, windows and flaky networks**
   ([ADR-106](../docs/13-adr/adr-106-multi-tab-sessions-and-remember-me.md)).
   - **Server:** a refresh token reused within `REFRESH_REUSE_GRACE_MS`
     (30 s) gets a sibling. Reuse after that, or of a revoked or expired
     token, revokes the family. Never widen the window without a threat
     review, and never drop reuse detection.
   - **Web client:** refresh only through `lib/session-refresh.ts`, which
     refreshes once per tab and one tab at a time, and adopts a token another
     tab already got.
   - **Storage is the truth:** a store setter that does not change the session
     reads the session fields from storage.
   - **Sign out only on a refusal** (400, 401 or 403 from `/auth/refresh`),
     never on offline, 5xx or 429.
9. **"Remember me" is a server-side lifetime, not only a UI flag.** It is
   `rememberMe` on login and `Session.persistent` in the database. Off means
   12 h sliding and signed out on browser close; on means `JWT_REFRESH_EXPIRY`.
   A client that does not send it keeps the long session.
10. **A narrow, purpose-scoped cookie (Grafana, ADR-115) is signed with a key
    DERIVED from `JWT_SECRET`, never `JWT_SECRET` itself**, under its own
    audience — so it can never verify as a user access token or vice versa.
    Its lifetime is capped at the session revocation cache's TTL (one
    access-token lifetime): a longer-lived cookie could outlive its own
    revocation entry. It is checked against the SAME revocation key every
    service's `SessionRevocationGuard` reads, and fails open on a Redis error
    exactly like that guard does.

## Prohibited patterns

- Decoding/verifying a JWT inline instead of via `AuthGuard`.
- `if (permission === 'chat:use')` — string comparison instead of the enum.
- Gating a feature on the FE only (or BE only) — both are required.
- Trusting the caller's claimed userId over the authenticated principal.
- A second refresh path, or a refresh outside the cross-tab lock. Two
  refreshes of one token signed every tab out.
- Persisting a tab's in-memory tokens from a setter that did not change them.
- Clearing auth storage because a refresh request failed to reach the server.

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
- **Root test** — `tools/__tests__/session-revocation-guard-registered.test.mjs`:
  every service with a global `AuthGuard` also registers
  `SessionRevocationGuard` after it, so a revoked session is refused instead of
  working until its token expires (TD-033, ADR-112).
- **Root test** — `tools/__tests__/auth-internal-controllers-guarded.test.mjs`:
  every `*-internal.controller.ts` in auth-service carries
  `@UseGuards(ServiceTokenGuard)`. Two of them once had no credential at all
  and relied on nginx not routing `/api/v1/internal` (TD-035).
- **Unit test** — permission/entitlement/ownership branches (401/403) asserted.
- **Knowledge check** — `.ai/manifests/permissions.json` mirrors the enum.

## Related skills

- [05-qa-toolkit](../skills/05-qa-toolkit.md) — 401/403 negative-path coverage.
- [debug-a-sign-out](../skills/debug-a-sign-out.md) — reproduce random sign-outs
  (two tabs, lost responses, offline, stale service worker) before touching code.

## Related context

- Root `CLAUDE.md` — "Security", "Permission catalog", "Plan feature gates".

## Definition of done

- [ ] Routes protected by the shared guard stack + permission decorators.
- [ ] Permissions referenced via the enum, never string literals.
- [ ] Feature gated on both FE and BE via entitlements.
- [ ] Ownership verified in the service; internal calls authenticated.
