# Database Migration Guide

How to create, apply, and manage database migrations across ClawAI's 9 PostgreSQL databases.

---

## Overview

- **ORM**: Prisma 5.22
- **9 PostgreSQL databases**: claw_auth, claw_chat, claw_connectors, claw_routing, claw_memory, claw_files, claw_ollama, claw_images, claw_file_generations
- **3 MongoDB databases**: claw_audit, claw_client_logs, claw_server_logs (no migrations — schema-on-write)
- Each service has its own Prisma schema at `apps/claw-<service>/prisma/schema.prisma`

---

## Creating a Migration

### 1. Modify the Prisma Schema

Edit the schema file for the target service:
```
apps/claw-<service>/prisma/schema.prisma
```

### 2. Generate the Migration

```bash
cd apps/claw-<service>
npx prisma migrate dev --name <descriptive-name>
```

Naming conventions:
- `add_<table>` — new table
- `add_<column>_to_<table>` — new column
- `remove_<column>_from_<table>` — column removal
- `alter_<column>_in_<table>` — column modification
- `add_index_on_<table>_<columns>` — new index

Example:
```bash
cd apps/claw-chat-service
npx prisma migrate dev --name add_feedback_to_messages
```

### 3. Generate Prisma Client

After migration, regenerate the client:
```bash
npx prisma generate
```

This creates typed client code in `src/generated/prisma/`.

---

## Applying Migrations

### Development (Local)

Migrations are applied automatically via `prisma migrate dev` during development.

### Docker (Dev and Prod)

Each service's Docker entrypoint runs:
```bash
npx prisma migrate deploy
```

This applies any pending migrations on container startup. No interactive prompts.

### Manual Application

```bash
cd apps/claw-<service>
npx prisma migrate deploy
```

---

## Rolling Back

Prisma does not have built-in rollback. To undo a migration:

1. Create a new migration that reverses the changes
2. Apply the new migration

```bash
# If you added a column and need to remove it
cd apps/claw-chat-service
# Edit schema.prisma to remove the column
npx prisma migrate dev --name remove_bad_column
```

For emergencies, you can reset the database (DESTROYS ALL DATA):
```bash
npx prisma migrate reset
```

---

## Seed Data

### Running Seeds

```bash
cd apps/claw-<service>
npx prisma db seed
# or
npx tsx prisma/seed.ts
```

### Existing Seeds

| Service | Seed File | What It Seeds |
|---------|-----------|---------------|
| auth | `prisma/seed.ts` | Default admin user |
| ollama | `prisma/seed-catalog.ts` | 30 model catalog entries |
| routing | `prisma/seed.ts` | Default routing policies (if any) |

### Creating a New Seed

1. Create `prisma/seed.ts` (or `prisma/seed-<name>.ts`)
2. Import the generated Prisma client
3. Use `prisma.$transaction` for atomic operations

```typescript
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.routingPolicy.upsert({
    where: { /* unique field */ },
    update: {},
    create: {
      name: 'Default AUTO Policy',
      routingMode: 'AUTO',
      priority: 0,
      isActive: true,
      config: {},
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

4. Add to `package.json` if using `prisma db seed`:
```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

---

## Migration Files

Migrations are stored in:
```
apps/claw-<service>/prisma/migrations/
  20260101120000_init/
    migration.sql
  20260115140000_add_feedback/
    migration.sql
  migration_lock.toml
```

Each migration is an SQL file. These are committed to git and should never be edited after creation.

---

## Database Reset

For development, reset a database completely:

```bash
cd apps/claw-<service>
npx prisma migrate reset
```

This:
1. Drops the database
2. Recreates it
3. Applies all migrations
4. Runs seed script

---

## Docker Database Management

### Creating a New PostgreSQL Instance

When adding a new service with its own database:

1. Add database container to all Docker compose files:
```yaml
pg-<service>:
  image: postgres:16
  environment:
    POSTGRES_USER: ${PG_<SERVICE>_USER}
    POSTGRES_PASSWORD: ${PG_<SERVICE>_PASSWORD}
    POSTGRES_DB: ${PG_<SERVICE>_DB}
  ports:
    - "${PG_<SERVICE>_PORT}:5432"
  volumes:
    - pg-<service>-data:/var/lib/postgresql/data
```

2. Add env vars to `.env`, `.env.example`, install scripts

3. Add volume to compose volumes section

4. Add DATABASE_URL to `.env`:
```
<SERVICE>_DATABASE_URL=postgresql://claw:claw_secret@pg-<service>:5432/claw_<service>?schema=public
```

---

## Best Practices

1. **Always use `prisma migrate dev`** for creating migrations — never write SQL by hand
2. **Test migrations** on a fresh database before deploying
3. **Use `upsert`** in seed scripts to make them idempotent
4. **Never edit** existing migration files — create new ones
5. **Commit** migration files to git
6. **Use descriptive names** for migrations
7. **One schema change per migration** when possible for easier rollback
8. **Add indexes** for any column used in WHERE, ORDER BY, or JOIN
9. **Use cascade deletes** in schema for parent-child relationships
10. **Run `prisma generate`** after schema changes to update the TypeScript client

---

## Troubleshooting

### Migration conflicts
If two developers create migrations from the same base:
```bash
npx prisma migrate resolve --applied <migration-name>
```

### Drift detection
Check if schema matches database:
```bash
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
```

### Database doesn't exist
```bash
npx prisma migrate dev --create-only
# Then manually create the database
createdb -U claw claw_<service>
npx prisma migrate deploy
```
