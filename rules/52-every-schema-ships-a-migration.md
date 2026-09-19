# Rule 52 — Every Prisma schema ships its migrations

**Why**: file-generation-service ran on `prisma db push` in dev and never
shipped a migration. Production's database held only `_prisma_migrations`,
so the `file_generations` table never existed and every AI file request failed
at its first insert. See
[ADR-104](../docs/13-adr/adr-104-expiring-owner-only-file-downloads.md).

1. **A schema change needs a migration**, created in the same commit with
   `prisma migrate dev` or `prisma migrate diff`. Never `db push` a schema
   other people will deploy.
2. **A service's first migration is a full `init`**
   (`prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`).
   It is not an `ALTER` on tables that production does not have.
3. **Enforced by** `tools/__tests__/prisma-migrations-present.test.mjs`: any
   app with `prisma/schema.prisma` and no `migrations/*/migration.sql` fails
   the run.
4. **To verify a service in production:** run `\dt` on its database. Only
   `_prisma_migrations` means this failure.
