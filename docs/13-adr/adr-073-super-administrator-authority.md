# ADR-073: Super-administrator authority is one scope predicate plus one actor read

**Status**: Accepted
**Date**: 2026-08-27
**Deciders**: ClawAI core team
**Slice**: Admin controls — privilege boundaries

## Context

`User.isSuperAdmin` has existed since 2026-08-12, guaranteed unique by a partial
index (`users_single_super_admin_idx ... WHERE is_super_admin = true`) and
settable only by seed and migration — no HTTP path can grant or clear it. Five
admin mutations already refused to touch that row through a private helper,
`UsersService.assertMutableUser`.

That looked like a closed invariant. It was not, for three reasons.

**The actor half was missing on four paths.** `changeRole` asked "is the caller
the super administrator?" before promoting anyone to `ADMIN`. `PATCH /users/:id`
accepted the same `role` field, and the same `status` field, and asked nothing —
so any holder of `ADMIN_USERS_MANAGE` could promote themselves to `ADMIN` through
the generic update endpoint and then act with the authority they had just
granted themselves. `POST /users` could mint a peer administrator outright, with
no actor parameter at all. Deactivate and reactivate could suspend another
administrator. And `PUT /admin/roles/:id/permissions` was gated on the `ADMIN`
role enum alone — no `@RequirePermissions` on any route in that controller — so
one administrator could strip `ADMIN_USERS_MANAGE` from the `ADMIN` system role
and degrade every administrator, including the super administrator, without ever
touching the super administrator's user row.

Target protection without actor authority is decorative. The attacker promotes
themselves first, then acts.

**The target half was absolute.** `assertMutableUser` took no actor, so the super
administrator could not edit their own row, could not reach any admin surface
about themselves, and could not delete their own account. "Immutable to everyone"
is not the requirement; "immutable to everyone else" is.

**Protection stopped at the module boundary.** `PlansService.assignUserToPlan`,
the plan-retirement transaction and the RabbitMQ entitlement applier all write
`activePlanId` on any row. The admin table disabled the plan control for the
super administrator; the endpoint accepted the call anyway.

## Decision

**1. One pure scope predicate decides the target question.**

`resolveSuperAdminMutability({ target, actorId, scope })` in
`modules/users/service.utilities/super-admin-mutability.utility.ts` returns
`allowed`, `IMMUTABLE_TO_OTHERS`, or `LOCKED_FOR_SELF`. It is pure, it is
exhaustively tested against every scope, and it is the only place the
self-exemption exists.

The self-exemption and the actor gate are decided together, in one reviewable
pair, because they interact: a naive `actorId === target.id` exemption bolted on
to an ungated actor path is an escalation, not a relaxation.

**2. The exemption is per scope, not blanket.**

`SUPER_ADMIN_SELF_PERMITTED_SCOPES` contains `PROFILE` and nothing else. Role,
status, delete, plan and administrator-issued password rotation stay refused even
when the actor is the super administrator. The reasoning is asymmetric risk:
renaming yourself is reversible; deactivating or deleting the only row the
partial unique index will ever allow is not recoverable through the product at
all — only a fresh seed against an empty admin table re-creates it.

The super administrator still changes their own password through
`/users/me/password`, which proves knowledge of the current one. That is a better
path than an admin-surface rotation, not a worse one.

**3. The actor question stays a database read.**

`UsersService.assertSuperAdminActor` reads the row. It is not duplicated, and no
`isSuperAdmin` claim is added to the access token.

**Rejected: put the claim in the JWT.** It would remove a read per guarded call,
and it was rejected because every already-issued access token would lack the
claim until it expired — so the claim would be absent exactly when the gate was
first deployed, and the gate would fail open or fail closed for a window nobody
chose. A read against a primary-key lookup is cheap; a token migration is not.

**Rejected: a `@SuperAdminOnly` guard or decorator.** Two of the six protected
paths need the _target_ row, which a guard does not have without a second read,
and one of them (`updateUser`) needs a different answer per field in the same
request body. A decorator would have handled the two simplest cases and pushed
the other four back into the services anyway.

**4. Cross-module target protection reads through the local repository.**

`PlansRepository.findUserMutabilityFacts` and
`RolesRepository.isSuperAdminActor` each read the two fields they need. They do
not import `UsersService`, because `UsersModule` already imports both
`RolesModule` and `PlansModule` — an administrator-created account needs the
signup plan and the matching `roleId` — so the reverse dependency would be a
cycle. Same service, same database, so this stays well inside the ownership
boundary that forbids _cross-service_ database access.

**5. System-driven writes are exempt, and the exemption is written down.**

Billing entitlement events and plan retirement write `activePlanId` out of band.
They are deliberately not gated: a legitimate event that cannot be applied does
not protect anybody, it poisons a consumer retry loop. The exemption is named in
the code, not implied by its absence.

**6. Three refusal codes, not one.**

`SUPER_ADMIN_IMMUTABLE` (wrong actor for this target), `SUPER_ADMIN_SELF_LOCKED`
(right actor, wrong scope) and `SUPER_ADMIN_REQUIRED` (actor lacks authority for
an administrator-class mutation). One code could not distinguish "you may never
do this" from "you may do this, but not to yourself", and the second message is
the one that stops a super administrator filing a bug about their own row.

Every refusal is logged as a structured `WARN`. Repeated attempts to mutate the
super administrator are a security signal and were previously invisible.

## Consequences

- An ordinary `ADMIN` can no longer promote themselves, mint a peer
  administrator, suspend another administrator, reassign the super
  administrator's plan, or edit a system role's grant set.
- The super administrator can edit their own profile through the admin surface
  for the first time, and still cannot lock themselves out.
- Each guarded administrator-class mutation costs one extra primary-key read.
- The partial unique index remains invisible to `schema.prisma`, because Prisma
  cannot express a partial unique index. A future `prisma migrate dev` diff can
  propose dropping it. This is recorded as known debt in
  `docs/04-backend/service-guide-auth.md`; it is not introduced by this decision.
- `RolesController` now requires `ADMIN_PERMISSIONS_MANAGE` on every route. Any
  operator who granted a custom role access to role management without that
  permission loses it, which is the intended correction.

## Revisit when

- An access-token migration happens for another reason — the claim becomes cheap
  at that point, and decision 3 should be re-opened.
- A second protected principal appears (a break-glass account, an owner tier). At
  two, the scope table generalises; at one, it is correctly a special case.
