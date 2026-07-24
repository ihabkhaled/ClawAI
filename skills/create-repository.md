---
name: create-repository
summary: Write a pure data-access repository — one DB operation per method, no throw, returns data or null.
task_keywords:
  [
    repository,
    data access,
    prisma repository,
    mongoose repository,
    no throw,
    return null,
    one db operation,
    strip sensitive fields,
    query builder,
  ]
applies_to: [backend, apps/claw-<service>-service/src/modules/<domain>]
required_rules: [02-backend-rules, 08-security-rules]
required_context: [ai-context-pack, data-ownership]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [unit (jest *.spec.ts) with mocked Prisma/Mongoose client]
required_docs: [docs/04-backend/service-guide-<service>.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Repository

A repository is the only place Prisma/Mongoose is touched. Each method performs ONE database operation, returns data or null, and never throws — the service decides what a null means.

## When to use

- Adding persistence for a new model or a new query on an existing model.
- Encapsulating a Prisma/Mongoose call so no service or manager touches the ORM directly.

## When NOT to use

- You need branching business logic → that is the service's job.
- You need to call an external API → repositories never make network calls; use a manager.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — Repository Rules.
- [`../docs/04-backend/repository-layer-patterns.md`](../docs/04-backend/repository-layer-patterns.md) if present, else a sibling `*.repository.ts`.

## Repository discovery steps

1. Read a sibling `*.repository.ts` in the same service for the injected client and mapping style.
2. Confirm the Prisma model exists in `prisma/schema.prisma` (see [`./add-prisma-model.md`](./add-prisma-model.md)).
3. Identify which columns are sensitive and must be stripped from the returned shape.

## Tests-first plan

- Mock the Prisma/Mongoose client at the boundary; assert each method issues the expected query and maps the result.
- Cover the not-found path returning `null` (not a throw).

## Implementation steps

1. Inject the Prisma/Mongoose service; add a logger.
2. One method = one operation: `findById`, `findManyByUser`, `create`, `update`, `softDelete`, etc.
3. Return explicit types (never inferred); return `null` when a row is absent.
4. Strip sensitive columns (`encryptedConfig`, `encryptedTokens`, `passwordHash`) in the mapping before returning.
5. Use query-builder methods only — no raw SQL.
6. No `throw`; no external calls; keep methods ≤30 lines.
7. Extract any inline types to `types/`, enums to `src/common/enums/`.

## Security considerations

- Sensitive-field stripping happens HERE, in the repository mapping (per security rules), not in the service.
- Prisma ORM only — no raw SQL, preventing injection (OWASP A03).
- Never widen a query to cross another service's DB — each service owns its data.

## Failure modes

- Throwing in a repository → violates the no-throw rule and hides intent from the service.
- Returning the raw Prisma object → leaks internal/sensitive fields.
- More than one DB operation per method → hard to test and reason about.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Note new queries in `docs/04-backend/service-guide-<service>.md` if they change the data model surface.

## Definition of done

- One op per method, no throw, null on absence, sensitive fields stripped, mocked-client tests green.
