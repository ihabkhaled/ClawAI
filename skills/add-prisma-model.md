---
name: add-prisma-model
summary: Add a Prisma model to a service schema, then its repository and types.
task_keywords:
  [
    prisma model,
    schema.prisma,
    add table,
    new model,
    prisma client,
    repository for model,
    data model,
    pgvector,
    relation,
  ]
applies_to:
  [backend, apps/claw-<service>-service/prisma, apps/claw-<service>-service/src/modules/<domain>]
required_rules: [02-backend-rules, 08-security-rules]
required_context: [data-ownership, ai-context-pack]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [repository spec with mocked client]
required_docs: [docs/06-data/database-reference.md, service CLAUDE.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add a Prisma Model

Each service owns its PostgreSQL schema in `apps/claw-<service>-service/prisma/schema.prisma`. Adding a model means editing the schema, generating the client, migrating, and adding a repository — never crossing another service's DB.

## When to use

- A new persisted entity is needed inside a service's bounded context.
- Extending an existing model with new columns/relations.

## When NOT to use

- The data conceptually belongs to another service — that service owns it; integrate via HTTP or events.
- You only need a derived/ephemeral value → compute it, don't persist.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md), [`../docs/03-architecture/data-ownership.md`](../docs/03-architecture/data-ownership.md).
- The service's existing `prisma/schema.prisma` for naming + relation conventions.

## Repository discovery steps

1. Read `prisma/schema.prisma` for the `provider`, existing models, enum + index conventions.
2. Check whether the change is additive (safe) or requires a backfill.
3. Identify which columns are sensitive and must be stripped in the repository mapping.

## Tests-first plan

- Repository spec with a mocked Prisma client: assert create/find/update/delete map correctly and null-on-absence holds.

## Implementation steps

1. Add the `model` block to `schema.prisma` — explicit `@id`, timestamps (`createdAt`/`updatedAt`), relations, and indexes.
2. Prefer additive columns (nullable or defaulted) so the migration is reversible; see [`./add-migration.md`](./add-migration.md).
3. Run `npx prisma generate` then `npx prisma migrate dev --name <name>` inside the service dir.
4. Add a repository (`<name>.repository.ts`) exposing one DB op per method, returning data-or-null, stripping sensitive fields — per [`./create-repository.md`](./create-repository.md).
5. Add explicit types to `types/` (do not export raw Prisma types across the service boundary if they leak fields).
6. If a service is user-facing, sync the FE type in `apps/claw-frontend/src/types/` to mirror BE field names verbatim.

## Security considerations

- Sensitive columns (encrypted blobs, hashes) are stored encrypted and stripped in the repository response mapping.
- Prisma ORM only — no raw SQL (OWASP A03).
- Never add a foreign key across service databases; each service owns its data.

## Failure modes

- Editing schema but forgetting `prisma generate`/`migrate` → runtime client mismatch.
- Destructive column drop/rename without a backfill → data loss on deploy.
- Returning the raw model with sensitive fields intact.

## Validation commands

```bash
cd apps/claw-<service>-service && npx prisma generate && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Update `docs/06-data/database-reference.md` and the Data Models section in the service `CLAUDE.md`.

## Definition of done

- Model added, client generated, migration created (additive/reversible), repository + types in place, tests green, docs updated.
