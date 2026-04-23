# Skill: Database Toolkit

> Use this skill for Prisma migrations, DB inspection, seed data, and pgvector operations.

---

## Prisma Workflow

### Create Migration (Dev)

```bash
cd apps/claw-<service>-service

# Create and apply migration
npx prisma migrate dev --name <descriptive_name>

# Examples:
npx prisma migrate dev --name add_model_lifecycle_field
npx prisma migrate dev --name add_connector_base_url
npx prisma migrate dev --name create_routing_policy_table
```

### Apply Existing Migrations (Production/Docker)

```bash
# This runs automatically in the service Dockerfile entrypoint
npx prisma migrate deploy

# Manual run inside container
docker exec claw-chat-service npx prisma migrate deploy
```

### Reset DB (Dev only — destroys all data)

```bash
cd apps/claw-<service>-service
npx prisma migrate reset
```

### Generate Prisma Client (after schema changes)

```bash
cd apps/claw-<service>-service
npx prisma generate
```

### View DB in Prisma Studio

```bash
cd apps/claw-<service>-service
npx prisma studio
# Opens at http://localhost:5555
```

---

## PostgreSQL Quick Queries

```bash
# List all tables in a service DB
docker exec claw-db-chat psql -U claw_user -d claw_chat \
  -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Count records in any table
docker exec claw-db-connectors psql -U claw_user -d claw_connectors \
  -tAc 'SELECT COUNT(*) FROM "Connector";'

# Check table structure
docker exec claw-db-chat psql -U claw_user -d claw_chat \
  -c '\d "ChatMessage"'

# Get recent records
docker exec claw-db-chat psql -U claw_user -d claw_chat \
  -tAc 'SELECT id, role, provider, model, createdAt FROM "ChatMessage" ORDER BY "createdAt" DESC LIMIT 5;'

# Check if a value exists
docker exec claw-db-connectors psql -U claw_user -d claw_connectors \
  -tAc "SELECT COUNT(*) FROM \"ConnectorModel\" WHERE provider = 'OLLAMA';"

# Verify sensitive field is stored but NOT leaked
docker exec claw-db-connectors psql -U claw_user -d claw_connectors \
  -tAc "SELECT id, name, provider, \"encryptedConfig\" IS NOT NULL AS has_encrypted_config FROM \"Connector\";"
```

---

## Database Port Map

| Service   | Container          | DB Name               | Host Port |
| --------- | ------------------ | --------------------- | --------- |
| auth      | claw-db-auth       | claw_auth             | 5441      |
| chat      | claw-db-chat       | claw_chat             | 5442      |
| connector | claw-db-connectors | claw_connectors       | 5443      |
| routing   | claw-db-routing    | claw_routing          | 5444      |
| memory    | claw-db-memory     | claw_memory           | 5445      |
| file      | claw-db-file       | claw_files            | 5446      |
| ollama    | claw-db-ollama     | claw_ollama           | 5447      |
| image     | claw-db-image      | claw_images           | 5448      |
| file-gen  | claw-db-file-gen   | claw_file_generations | 5449      |
| agent     | claw-db-agent      | claw_agent            | 5450      |
| research  | claw-db-research   | claw_research         | 5451      |

```bash
# Direct host connection (useful for GUI tools like TablePlus)
psql postgresql://claw_user:claw_password@localhost:5442/claw_chat
```

---

## MongoDB Quick Queries

```bash
# Connect to MongoDB shell
docker exec -it claw-mongo mongosh

# Connect to specific DB
docker exec -it claw-mongo mongosh claw_audit
docker exec -it claw-mongo mongosh claw_logs_client
docker exec -it claw-mongo mongosh claw_logs_server

# Count documents
docker exec claw-mongo mongosh --quiet --eval \
  'db.getSiblingDB("claw_audit").auditLogs.countDocuments()'

# Get recent documents
docker exec claw-mongo mongosh claw_audit --eval \
  'db.auditLogs.find().sort({createdAt:-1}).limit(5).pretty()'

# Query by field
docker exec claw-mongo mongosh claw_audit --eval \
  'db.auditLogs.find({action: "CONNECTOR_CREATED"}).limit(3).pretty()'
```

---

## Seed Scripts

```bash
# Ollama model catalog seed (run after first migration)
cd apps/claw-ollama-service
npx tsx prisma/seed-catalog.ts

# Auth admin user seed (runs automatically on startup)
# But can also run manually:
cd apps/claw-auth-service
npx tsx prisma/seed.ts

# Routing policies seed
cd apps/claw-routing-service
npx tsx prisma/seed.ts
```

---

## pgvector Operations

The memory service uses pgvector for semantic search:

```bash
# Check pgvector extension is installed
docker exec claw-db-memory psql -U claw_user -d claw_memory \
  -tAc "SELECT extname FROM pg_extension WHERE extname = 'vector';"

# Check vector column exists
docker exec claw-db-memory psql -U claw_user -d claw_memory \
  -c '\d "MemoryRecord"' | grep embedding

# Count memories with embeddings
docker exec claw-db-memory psql -U claw_user -d claw_memory \
  -tAc 'SELECT COUNT(*) FROM "MemoryRecord" WHERE embedding IS NOT NULL;'
```

---

## Migration Naming Conventions

Good migration names:

```
add_<field>_to_<table>           → add_base_url_to_connector
create_<table>_table             → create_routing_policy_table
add_<index>_index_on_<table>     → add_user_id_index_on_chat_thread
rename_<old>_to_<new>_in_<table> → rename_config_to_encrypted_config
drop_<table>_table               → drop_legacy_sessions_table
```

---

## Common Prisma Schema Patterns

### Cuid IDs (standard)

```prisma
id String @id @default(cuid())
```

### Timestamps (always include)

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Soft delete (if needed)

```prisma
deletedAt DateTime?

@@index([deletedAt])
```

### pgvector embedding

```prisma
embedding Unsupported("vector(1536)")?

@@index([userId])
```

### Encrypted field pattern

```prisma
encryptedConfig String  // AES-256-GCM encrypted JSON blob
// NEVER return this field in API responses
```

### Enum with Prisma

```prisma
enum ConnectorStatus {
  PENDING
  HEALTHY
  DOWN
  DEGRADED
}
```
