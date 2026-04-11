# ADR-005: Prisma ORM

## Status

Accepted (2025-Q1)

## Context

Nine of the thirteen backend services use PostgreSQL. The team needed an ORM or query builder that provides:

- **Type safety**: Queries should be type-checked at compile time, not just at runtime.
- **Migration management**: Schema changes should be tracked, versioned, and reproducible.
- **pgvector support**: The memory service uses vector similarity search for RAG-style context retrieval.
- **Developer experience**: Autocomplete for table names, column names, and relation traversals.

## Decision

Use Prisma 5.x as the ORM for all PostgreSQL services. Each service has its own `prisma/schema.prisma` file, its own migration history, and its own generated client.

### Key Patterns

- **Schema-first**: Define models in `schema.prisma`, generate the client, then use in code.
- **Per-service isolation**: Each service has its own Prisma schema, migration directory, and generated client. No shared schemas.
- **Repository pattern**: All Prisma calls are confined to `*.repository.ts` files. Services and controllers never import `PrismaClient` directly.
- **No raw SQL**: All queries use Prisma's query builder. This prevents SQL injection and ensures type safety.
- **Migration in entrypoint**: Docker containers run `prisma migrate deploy` on startup, ensuring the database schema is always up to date.

## Consequences

### Positive

- **Full type safety**: Generated types match the schema exactly. A column rename produces compile-time errors in all affected queries.
- **Excellent autocomplete**: The generated client provides autocomplete for every field, relation, filter, and sort option.
- **Declarative schema**: The `.prisma` schema file is human-readable and serves as documentation for the data model.
- **Migration tracking**: Each migration is a timestamped SQL file, reviewable in code review and reproducible across environments.
- **pgvector support**: Prisma supports custom types and raw queries for vector operations when needed via `$queryRaw`.
- **Introspection**: `prisma db pull` can reverse-engineer an existing database into a schema file.

### Negative

- **Generated client size**: The generated client adds to the Docker image size (typically 5-10 MB per service).
- **Cold start**: The first query after starting the service has higher latency due to Prisma Client initialization.
- **Raw query escape hatch**: Complex queries (e.g., pgvector similarity search with custom scoring) require `$queryRaw`, which loses type safety.
- **N+1 risk**: Prisma's lazy relation loading can cause N+1 queries if not using `include` or `select` explicitly. The repository pattern mitigates this by making data access explicit.
- **Migration coordination**: In Docker, services must wait for the database to be ready before running migrations. Handled via `depends_on` with healthchecks.

## Alternatives Considered

### TypeORM

The most popular NestJS ORM. Uses decorators on entity classes. However, TypeORM's query builder has weaker type safety than Prisma (many queries return `any`), and its migration system is less predictable (auto-synchronize mode can cause data loss). Rejected for inferior type safety.

### Sequelize

Mature ORM with good PostgreSQL support. However, its TypeScript support is bolted on rather than native, and the decorator-based model definition is verbose. Rejected for inferior developer experience.

### Drizzle ORM

Lightweight, SQL-like query builder with excellent TypeScript inference. A strong contender, but at the time of evaluation it was newer with less ecosystem support and fewer migration tools. Could revisit for services where Prisma's overhead is a concern.

### Knex.js (Query Builder Only)

Lightweight query builder without an ORM layer. Provides full SQL control but requires manual type definitions for every query result. Rejected because the team wanted schema-driven type generation.
