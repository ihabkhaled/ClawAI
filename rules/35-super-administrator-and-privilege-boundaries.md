# 35 — The Super Administrator and Privilege Boundaries

## Purpose

One account on every ClawAI install carries `User.isSuperAdmin`. A partial unique
index guarantees there is at most one, no HTTP path can grant or clear the flag,
and nothing re-creates it except a fresh seed against an empty admin table. That
account is the platform's floor: if it can be demoted, suspended, deleted, or
have its authority quietly hollowed out, every other administrative control on
the platform is decorative.

This rule exists because the invariant looked closed and was not. Five mutations
refused to touch the super administrator's row while four others reached the same
outcome by a different route — most simply, `PATCH /users/:id` accepted a `role`
field and never asked who was calling, so any administrator could promote
themselves and then act with the authority they had just granted.

The lesson generalises past this one flag: **protecting a row is only half a
privilege boundary. The other half is asking what the caller is allowed to do.**

## Applies to

Every mutation path in `claw-auth-service` that can change a user's role, status,
plan, password or existence; every path that can change a **system** role's
permission set; and every frontend surface that renders an administrative control
over a user.

## Mandatory rules

1. **Never write a second mutability predicate.** `resolveSuperAdminMutability`
   in `modules/users/service.utilities/super-admin-mutability.utility.ts` is the
   only one. It is pure, it takes a scope, and it is exhaustively tested. A new
   guarded path calls it; it does not re-derive the rule from
   `user.isSuperAdmin`.

2. **Every guarded call names its scope.** `SuperAdminMutationScope` distinguishes
   `PROFILE`, `ROLE`, `STATUS`, `DELETE`, `PLAN` and `TEMPORARY_PASSWORD`. A
   request body carrying several classes of change asserts each one separately —
   `PATCH /users/:id` carries profile, role and status, and all three are checked.

3. **The self-exemption is a set, not a boolean.**
   `SUPER_ADMIN_SELF_PERMITTED_SCOPES` holds `PROFILE` and nothing else. Adding a
   scope to that set is a product decision with an unrecoverable failure mode —
   it needs a dated decision row, not a code review nod.

4. **Target protection and actor authority ship together.** Any change that
   relaxes who may be mutated must, in the same change, state who may do the
   mutating. Reviewing them separately is how the original hole was created.

5. **An administrator-class mutation requires a super-administrator actor.**
   Creating an `ADMIN`, promoting to `ADMIN`, demoting an `ADMIN`, suspending or
   reactivating an `ADMIN`, and editing a **system** role's permission set all
   call `assertSuperAdminActor`. Mutations aimed at ordinary users do not, and
   must not — the gate is for administrator-class changes, not for all of them.

6. **Do not put `isSuperAdmin` in the access token.** It is read from the
   database. A claim would be absent from every already-issued token until it
   expired, which is precisely when a newly deployed gate needs it. See
   [ADR-073](../docs/13-adr/adr-073-super-administrator-authority.md).

7. **Cross-module reads go through the local repository, never through
   `UsersService`.** `UsersModule` imports `RolesModule` and `PlansModule`, so the
   reverse dependency is a cycle. `PlansRepository.findUserMutabilityFacts` and
   `RolesRepository.isSuperAdminActor` exist for exactly this. Same service, same
   database — this is not a cross-service database access.

8. **System-driven writes are exempt, and say so.** Billing entitlement events and
   plan retirement write `activePlanId` out of band and are deliberately not
   gated: a legitimate event that cannot be applied poisons a consumer retry loop
   rather than protecting anyone. Any new system-driven writer states its
   exemption in a comment at the write site. An exemption that exists only by
   omission is indistinguishable from a bug.

9. **Refusals carry one of exactly three codes**, and every one of them has a
   `t()` key in all 13 locales:

   | Code                      | Meaning                                                                     |
   | ------------------------- | --------------------------------------------------------------------------- |
   | `SUPER_ADMIN_IMMUTABLE`   | The target is the super administrator and you are not.                      |
   | `SUPER_ADMIN_SELF_LOCKED` | You are the super administrator, and this scope is never self-permitted.    |
   | `SUPER_ADMIN_REQUIRED`    | You lack super-administrator authority for an administrator-class mutation. |

   A refused mutation is `403`. A target that does not exist is `404` — absence is
   not a refusal, and conflating them tells an attacker which ids are real.

10. **Every refusal is logged as a structured `WARN`** with the actor, the target
    and the scope. Repeated attempts to mutate the super administrator are a
    security signal; a bare `throw` makes them invisible.

11. **The frontend decides per row, in a utility, not in TSX.** A component must
    not re-implement the capability rule with `user.isSuperAdmin ||` expressions.
    The acting user's identity must reach the table so "this row is the super
    administrator" and "this row is me" are distinguishable.

## Prohibited patterns

- A guarded path that checks `user.isSuperAdmin` inline instead of calling the
  predicate.
- Relaxing the target rule without stating the actor rule in the same change.
- A `@RequirePermissions`-free administrative controller. `RolesController` was
  gated on the `ADMIN` role enum alone; that is what let one administrator
  degrade every administrator.
- Adding a scope to `SUPER_ADMIN_SELF_PERMITTED_SCOPES` without a dated decision.
- Returning `403` for an unknown target id.

## Definition of done

- [ ] Every new mutation path calls `resolveSuperAdminMutability` with an explicit
      scope.
- [ ] Every administrator-class mutation calls `assertSuperAdminActor`.
- [ ] Both halves are asserted in `users.service.spec.ts` — a refusal test **and**
      a "the write did not happen" assertion.
- [ ] Every new refusal code has a `t()` key in all 13 locales and an entry in
      `api-error-message.utility.ts`.
- [ ] Any new system-driven writer states its exemption at the write site.

## See also

- [ADR-073](../docs/13-adr/adr-073-super-administrator-authority.md) — why one
  predicate plus one actor read, and why not a guard or a JWT claim.
- [`rules/16-authentication-and-authorization.md`](16-authentication-and-authorization.md)
  — ownership is checked in the service, RBAC only says who may call the endpoint.
- [`rules/09-backend-services.md`](09-backend-services.md) — ownership and
  permission checks live in the service layer.
