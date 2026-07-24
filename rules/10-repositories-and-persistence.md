# 10 — Repositories and Persistence

## Purpose

Repositories are the only place database queries live. Isolating persistence
behind a repository keeps services free of ORM detail, keeps queries reviewable,
and enforces the "each service owns its data" boundary.

## Applies to

`apps/claw-*/src/**/*.repository.ts`, Prisma schemas (`prisma/schema.prisma`),
Mongoose schemas (audit / client-logs / server-logs).

## Mandatory rules

1. **Pure data access only** — no business logic, no external API calls.
2. **NEVER throw.** Return data or `null`; the service decides what a miss means.
3. **One database operation per method**, using Prisma/Mongoose query builders —
   **no raw SQL**.
4. **Explicit return types** — do not rely on inferred Prisma types leaking out.
5. **A repository touches only its own service's DB.** No cross-service queries
   (see [03](03-microservice-boundaries.md)).
6. **Schema changes ship with a Prisma migration** (`npx prisma migrate dev --name <name>`)
   and, if new default data is needed, a seed update. Migrations are additive/reversible.
7. **No secrets returned in plain form** — encrypted columns (e.g. connector
   `encryptedConfig`) stay encrypted; decryption is a service/adapter concern.

## Prohibited patterns

- `throw` anywhere in a repository.
- `this.prisma.$queryRaw` for domain queries (raw SQL is banned).
- Business branching (`if (user.role === …)`) inside a repository method.
- A repository method performing two writes / a transaction of unrelated ops
  better expressed in the service.

## Correct pattern

```ts
// apps/claw-connector-service/src/modules/connectors/connector.repository.ts
async findById(id: string): Promise<Connector | null> {
  return this.prisma.connector.findUnique({ where: { id } }); // returns null, never throws
}
```

## Enforcement

- **ESLint** (repository-file restrictions) — bans `throw`, inline declarations.
- **Architecture test** — repositories are the only files importing the DB client;
  no raw-SQL calls.
- **CI job** — Prisma generate/migrate step validates schema + migration presence.

## Related skills

- [07-database-toolkit](../skills/07-database-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Repository Rules", "Data Models (Quick Reference)".
- `.ai/manifests/prisma-models.json`.

## Definition of done

- [ ] No throw / no business logic / no raw SQL in repositories.
- [ ] Methods return data or null with explicit types.
- [ ] Schema change accompanied by a migration (+ seed if needed).
- [ ] No cross-service DB access.
