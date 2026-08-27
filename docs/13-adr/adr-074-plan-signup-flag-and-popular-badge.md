# ADR-074: The plan a signup receives and the plan the pricing page badges are two decisions

**Status**: Accepted
**Date**: 2026-08-27
**Deciders**: ClawAI core team
**Slice**: Billing — plan catalogue presentation

## Context

`Plan.isDefault` was doing two unrelated jobs.

`AuthManager.register` reads it to decide which plan a new account is granted.
`plan-tier-card.tsx` read the same flag to decide which tier gets the "Most
popular" ribbon on the public pricing page.

So the badge always followed the signup plan. With the seeded catalogue — where
`free` carries `isDefault` — the pricing page advertised the free tier as the
most popular one, which is both untrue and commercially backwards. An operator
who moved signup to a paid plan through `POST /admin/plans/:id/set-default` moved
the badge with it, without being told.

The two facts are unrelated. One is an entitlement decision about what a stranger
receives; the other is a marketing claim about what existing customers choose.

## Decision

**1. A second column, not a second meaning.**

`Plan.isPopular` is the marketing badge. `Plan.isDefault` keeps its original
meaning and is untouched.

**2. Single-winner is enforced by the database.**

`Plan.popularKey` is a nullable `@unique` column carrying the literal `'popular'`
while a plan holds the badge and `NULL` otherwise. Postgres treats every `NULL`
as distinct, so any number of plans can be un-badged while a second badged plan
is rejected by the database.

This is the same emulated partial-unique index `PlanPriceVersion.activeKey`
already uses, for the same reason: Prisma cannot express a partial unique index.

**Rejected: an application-level "unset the others, then set this one".** Two
administrators clicking at the same moment can interleave into a state where the
badge is on nobody, and nothing would notice. The transaction still clears the
others first — that is what makes the index usable rather than a source of
collisions — but the index is what makes the invariant true.

**3. The migration adds `isPopular` only, and must not write `isDefault`.**

`POST /admin/plans/:id/set-default` is a live operator endpoint. An install may
deliberately point signup at a paid plan; this one did. A migration that forced
`isDefault` onto a particular slug would silently change what every future signup
receives on those installs.

Moving the signup plan is therefore an operator action through the admin UI, per
install, and never a migration. `isPopular` is backfilled to slug `pro` where it
exists so the pricing page does not lose its badge the moment this lands, and the
offline pricing fallback matches so the page looks the same either way.

**4. The seeder is not version-bumped for this field.**

Existing installs get `isPopular` from the migration. Bumping the catalogue
version would re-run the whole seed over quotas an operator may have edited
since, which is a much larger blast radius than the field deserves. Fresh
installs take the value from `plan-catalog.json`.

**5. Neither flag is writable through the plan DTOs.**

Both stay behind their own endpoint — `set-default` and `set-popular` — following
the shape `isDefault` already had. A flag with a global invariant does not belong
in a general-purpose update body.

## Consequences

- The admin plans page has two buttons where it had one, and their labels say
  which decision they make: "Set as signup plan" and "Set as most popular".
- A plan can be badged without being active, deliberately: badging is a marketing
  statement, not a decision that anybody is about to be subscribed to it. This is
  why `makePopular` does not force `isActive`, unlike `makeDefault`.
- The pricing page can render with no badge at all — a legitimate state, and one
  that must not shift the layout.
- Two facts now have to be set on a fresh install instead of one.

## Revisit when

- A third presentational flag appears (a "best value" tier, a seasonal
  highlight). At three, this stops being two booleans and becomes a
  presentation-slot table.
