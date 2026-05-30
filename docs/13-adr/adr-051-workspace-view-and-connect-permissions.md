# ADR-051: Narrow Workspace VIEW + CONNECT Permission Scope for USER

**Status**: Accepted
**Date**: 2026-05-30
**Deciders**: ClawAI core team

## Context

The workspace surface (`/api/v1/workspace/*`) shipped with a coarse
permission gate: every endpoint required either `@Roles(ADMIN, OPERATOR)`
or `@RequirePermissions(ADMIN_WORKSPACE_AUTOMATION_MANAGE)`. This blocked
the `USER` role entirely — even from listing providers or browsing the
admin-created provider-app-configs that define which OAuth client-ids are
available to connect against.

The product requirement after the 2026-05 Auth/RBAC/Plans flagship was:

> A self-registered user on the Free plan should be able to log in, open
> the workspace page, see "you can connect GitHub / Slack / Jira / …",
> pick a provider, and connect their own account. They should NOT be able
> to create or modify the OAuth client credentials (those are admin-managed),
> replay webhooks, edit suggestion rules, or write to AI action policies.

The legacy gate couldn't express that. Two options surfaced:

1. **Single coarse permission** `WORKSPACE_USER` that unlocks the whole
   user-facing slice of the API. Easy to grant, but every future
   user-facing addition becomes implicit — you can't withhold one
   sub-feature without rewriting the gate.
2. **Multiple narrow permissions** scoped to specific endpoint groups, so
   admins can withhold any single sub-feature via the role→permission
   matrix without code changes.

We also needed to NOT leak `encryptedSecret` from provider-app-configs
even when the read endpoint is exposed to a normal user — a second line
of defence beyond the permission check.

## Decision

Introduce two narrow, read-only permissions and grant both to USER by
default:

1. **`WORKSPACE_VIEW`** — Gates the workspace shell endpoints (provider
   catalog, the `/workspace` route tree). Granted to USER so members can
   see the page.

2. **`WORKSPACE_APP_CONFIG_VIEW`** — Gates `GET /workspace/provider-app-configs`
   and `GET /workspace/provider-app-configs/:id` ONLY. Returns
   `ProviderAppConfigPublic` (an explicit DTO type that omits
   `encryptedSecret`; exposes only `hasSecret: boolean`). Mutations
   (`POST/PUT/DELETE`) remain locked to
   `ADMIN_WORKSPACE_AUTOMATION_MANAGE`.

The existing `*_OWN` permissions (`WORKSPACE_CONNECT_OWN`,
`WORKSPACE_READ_OWN`, `WORKSPACE_SYNC_OWN`, `WORKSPACE_ACTION_OWN`) are
also granted to USER so they can actually use the surface they can now
see.

Both new permissions are added to `Permission` in
`@claw/shared-types/src/enums/permission.enum.ts` and to
`USER_DEFAULT_PERMISSIONS` in
`apps/claw-auth-service/src/common/constants/rbac.constants.ts`.

Controllers use BOTH guards in series: `@Roles(...)` (legacy role enum
gate for backwards compatibility) AND
`@RequirePermissions(Permission.XXX)` (modern entitlements check). The
sanitised `ProviderAppConfigPublic` DTO is the third line of defence.

## Alternatives considered

**Single `WORKSPACE_USER` coarse permission**. Rejected. Every future
read-only workspace endpoint would silently flip on for USER the moment
it landed in the codebase. We want explicit opt-in per capability so an
admin reading the role grid sees exactly what each role unlocks. It also
prevents the "we added a new admin endpoint and it leaked" failure mode
because admin endpoints don't share a permission with USER endpoints.

**Open `WORKSPACE_*` to OPERATOR and treat USER as a new OPERATOR**.
Rejected because OPERATOR has read access to admin observability (audit
logs, usage ledger) — USER MUST NOT see those. Roles are not a linear
hierarchy; the permission grid is the source of truth.

**Add the permissions but withhold them from `USER_DEFAULT_PERMISSIONS`,
require admin to grant per-user**. Rejected because the self-registration
funnel would be broken — a new user lands on `/workspace` and sees a 403
banner. The product goal explicitly is "USER can self-serve workspace
connections from day one"; if an admin wants stricter posture they can
revoke the permission in the matrix.

**Expose the full `ProviderAppConfig` row without
the `encryptedSecret` field by selecting fields at the repository layer**.
Rejected because the omission lives at the repository, which is far from
the controller's `@RequirePermissions` annotation — a future repository
refactor could silently re-add the field. The dedicated
`ProviderAppConfigPublic` type in
`src/modules/workspace/types/provider-config.types.ts` makes the omission
explicit and type-checked.

## Consequences

**Positive**
- USER can self-serve workspace connections without admin intervention.
- Admin keeps full control of provider-app-config creation and
  webhook/policy mutations.
- The per-permission gate composes with future workspace features — add
  a new admin-only endpoint, grant its own permission, default-off for
  USER, opt-in per role.
- Every workspace sub-route is now accessible to USER unless explicitly
  overridden by a more specific entry — the matrix table in
  `docs/04-backend/service-guide-workspace.md` is the canonical reference.
- The sanitised `ProviderAppConfigPublic` DTO is a permanent fix for the
  encryptedSecret-leak class of bug.

**Negative**
- Two new permissions in the catalog (now 32 entries). Every role-grant
  UI screen has two more checkboxes per role.
- Every workspace controller method now needs to specify BOTH `@Roles`
  AND `@RequirePermissions`. Easy to forget one. Mitigation: the
  workspace-service controllers were updated together in one commit and
  the `service-guide-workspace.md` matrix table is the cross-reference.
- USER can now see the existence (name + provider) of every admin-created
  provider-app-config. That's an intentional information leak — it
  enables the connect-own-account flow.

**Doesn't fix**
- USER still cannot create suggestion rules, AI action policies, or
  trigger sync dashboards. Those stay admin-only. If a future tier ("Team
  admin") needs them, a separate narrow permission can be added without
  touching this ADR.

## Verification

- `rbac.constants.spec.ts` asserts both new permissions are in
  `USER_DEFAULT_PERMISSIONS`.
- `workspace-provider-registry.controller.spec.ts` covers (a) USER lists
  provider-app-configs and receives `hasSecret` only, (b) USER POST
  returns 403, (c) ADMIN POST returns 201.
- `route-permission.utility.test.ts` validates the FE sidebar visibility
  logic for the new permissions.
- Manual QA: log in as USER, open `/workspace/app-configs`, confirm list
  renders and the create form is hidden; attempt curl POST returns 403.
