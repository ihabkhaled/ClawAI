# Release Migrations and Seeding

How schema and data changes reach production without corrupting it.

## Two safe paths, not one

| Path                 | When                  | Guard                                                  |
| -------------------- | --------------------- | ------------------------------------------------------ |
| Container start      | every service boot    | `_prisma_migrations` ledger + PostgreSQL advisory lock |
| One-shot release job | before a deploy rolls | the same guards, run once, ahead of the fleet          |

Both are safe. The release job exists because running migrations **before any
replica starts** means a rolling deploy never has two schema versions live at the
same moment, and a failed migration aborts the release rather than half-starting
the fleet.

```bash
npm run migrate:all       # prisma migrate deploy for all 14 database-owning services
npm run seed:versioned    # versioned data seeders, exactly once each
npm run release:prepare   # both, in order
```

The service list is **derived** from which apps ship a `prisma/schema.prisma`,
so a newly added service cannot be forgotten here.

## Why running seeders on every boot is safe

Every seeder is keyed `(name, version)` in a `seed_executions` table with a
checksum. Two independent guards, because either alone is insufficient:

1. **A PostgreSQL advisory lock** serialises concurrent starters. Without it two
   replicas booting together both read "not yet seeded" and both insert.
2. **The `seed_executions` row** makes the _second_ run a no-op. The lock only
   orders the racers; this is what stops re-execution.

A completed seeder never runs again. That is what makes it safe to leave seeding
in the startup path — restarting a production replica cannot re-seed over
administrator-edited rows.

**A changed seed requires a NEW version.** Editing a completed seeder and hoping
it re-runs is the exact failure mode this design prevents; the checksum turns
that mistake into a loud warning instead of silent drift.

## Administrator edits are never overwritten

The plan-catalog seeder compares each existing row against the pre-billing
system-seed fingerprint:

- still matching → safely upgraded to the new baseline
- edited by an administrator → **left exactly as set**, with only genuinely new
  columns backfilled, and the preservation reported in the logs

Pre-billing manual plan assignments become `MIGRATION` grants. They are **not**
converted into paid subscriptions — fabricating a payment that never happened
would corrupt every revenue report downstream.

## Verified behaviour

Proven against real PostgreSQL 16 rather than asserted:

| Property                                  | Result                                       |
| ----------------------------------------- | -------------------------------------------- |
| First run applies the catalog             | 7 plans, 13 price versions, 49 feature rules |
| Second run                                | skipped (`already-completed`)                |
| Two concurrent runs                       | both skipped, no duplicate rows              |
| Second ACTIVE price for one plan+interval | rejected by the database unique index        |
| Administrator-edited `pro`                | quota and description preserved verbatim     |
| Untouched `free`                          | upgraded to the new baseline                 |
| `migrate deploy` twice                    | second run reports no pending migrations     |

## Release order

1. Back up databases.
2. Build immutable images.
3. `npm run migrate:all` — abort the release if it fails.
4. `npm run seed:versioned`.
5. Deploy the payment service; verify `/health` reports each gateway's
   `configured` boolean.
6. Deploy auth and routing.
7. Deploy frontend and nginx.
8. Enable gateways in sandbox; run smoke tests.
9. Enable production gateways **only** after merchant approval and a verified
   webhook round-trip.
10. Watch reconciliation and margin dashboards.

## Rollback

Distinguish the cases — they have different answers:

| Situation             | Action                                                      |
| --------------------- | ----------------------------------------------------------- |
| Bad application build | roll the image back; schema stays forward                   |
| Bad migration         | **forward-only repair**, never a destructive down-migration |
| Gateway misbehaving   | disable that gateway's credentials; the other keeps serving |
| Entitlement drift     | re-run reconciliation; the inbox is idempotent              |

**Financial records are never destructively rolled back.** Payment tables are
append-oriented; corrections are compensating transactions, not rewrites. A
refund is a new row, not an edited one — otherwise the ledger stops matching the
money that actually moved.
