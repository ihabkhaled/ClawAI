# Runbook: Database Backup and Recovery

## Overview

ClawAI uses 9 PostgreSQL databases and 1 MongoDB instance (3 databases). Each service owns its database. This runbook covers backup, restore, and migration rollback procedures.

## PostgreSQL Databases

| Database          | Service    | Contains                           |
| ----------------- | ---------- | ---------------------------------- |
| claw_auth         | auth       | Users, sessions, settings          |
| claw_chat         | chat       | Threads, messages, attachments     |
| claw_connectors   | connector  | Connectors, models, health events  |
| claw_routing      | routing    | Decisions, policies                |
| claw_memory       | memory     | Memory records, context packs      |
| claw_files        | file       | File metadata, chunks              |
| claw_ollama       | ollama     | Local models, pull jobs, catalog   |
| claw_images       | image      | Image generation records           |
| claw_file_gen     | file-gen   | File generation records            |

### Backup a Single Database

```bash
# Identify the postgres container
docker compose -f docker-compose.dev.yml ps | grep postgres

# Backup using pg_dump
docker compose -f docker-compose.dev.yml exec postgres-chat \
  pg_dump -U claw_chat_user claw_chat > backup_chat_$(date +%Y%m%d_%H%M%S).sql
```

### Backup All PostgreSQL Databases

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

declare -A DBS=(
  ["postgres-auth"]="claw_auth:claw_auth_user"
  ["postgres-chat"]="claw_chat:claw_chat_user"
  ["postgres-connector"]="claw_connectors:claw_connectors_user"
  ["postgres-routing"]="claw_routing:claw_routing_user"
  ["postgres-memory"]="claw_memory:claw_memory_user"
  ["postgres-file"]="claw_files:claw_files_user"
  ["postgres-ollama"]="claw_ollama:claw_ollama_user"
  ["postgres-image"]="claw_images:claw_images_user"
  ["postgres-file-gen"]="claw_file_gen:claw_file_gen_user"
)

for container in "${!DBS[@]}"; do
  IFS=':' read -r db user <<< "${DBS[$container]}"
  echo "Backing up $db..."
  docker compose -f docker-compose.dev.yml exec -T "$container" \
    pg_dump -U "$user" "$db" > "$BACKUP_DIR/${db}.sql"
done
echo "Backups saved to $BACKUP_DIR"
```

### Restore a PostgreSQL Database

```bash
# Stop the service that uses the database
docker compose -f docker-compose.dev.yml stop chat-service

# Drop and recreate the database
docker compose -f docker-compose.dev.yml exec postgres-chat \
  psql -U claw_chat_user -d postgres -c "DROP DATABASE IF EXISTS claw_chat;"
docker compose -f docker-compose.dev.yml exec postgres-chat \
  psql -U claw_chat_user -d postgres -c "CREATE DATABASE claw_chat OWNER claw_chat_user;"

# Restore from backup
docker compose -f docker-compose.dev.yml exec -T postgres-chat \
  psql -U claw_chat_user claw_chat < backup_chat_20250101_120000.sql

# Restart the service
docker compose -f docker-compose.dev.yml start chat-service
```

### Prisma Migration Rollback

If a migration caused issues:

```bash
# Check current migration status
docker compose -f docker-compose.dev.yml exec chat-service \
  npx prisma migrate status

# List applied migrations
docker compose -f docker-compose.dev.yml exec chat-service \
  npx prisma migrate status --schema=prisma/schema.prisma

# Mark a migration as rolled back (manual SQL required)
# 1. Write the reverse SQL
# 2. Execute it against the database
# 3. Delete the migration record from _prisma_migrations table:
docker compose -f docker-compose.dev.yml exec postgres-chat \
  psql -U claw_chat_user claw_chat -c \
  "DELETE FROM _prisma_migrations WHERE migration_name = '20250101120000_problematic_migration';"

# 4. Delete the migration directory from prisma/migrations/
# 5. Restart the service
```

## MongoDB Databases

| Database  | Service      | Contains                    |
| --------- | ------------ | --------------------------- |
| claw_audit| audit        | Audit logs, usage ledger    |
| claw_logs | client-logs  | Frontend logs (TTL 30d)     |
| claw_logs | server-logs  | Backend logs (TTL 30d)      |

### Backup MongoDB

```bash
# Backup all MongoDB databases
docker compose -f docker-compose.dev.yml exec mongodb \
  mongodump --username claw_user --password "$MONGO_PASSWORD" \
  --authenticationDatabase admin --out /tmp/mongodump

# Copy to host
docker compose -f docker-compose.dev.yml cp \
  mongodb:/tmp/mongodump ./backups/mongodump_$(date +%Y%m%d)
```

### Restore MongoDB

```bash
# Copy backup to container
docker compose -f docker-compose.dev.yml cp \
  ./backups/mongodump_20250101 mongodb:/tmp/mongodump

# Restore
docker compose -f docker-compose.dev.yml exec mongodb \
  mongorestore --username claw_user --password "$MONGO_PASSWORD" \
  --authenticationDatabase admin /tmp/mongodump

# Restart affected services
docker compose -f docker-compose.dev.yml restart audit-service client-logs-service server-logs-service
```

## Data Volume Management

### List Volumes

```bash
docker volume ls | grep claw
```

### Volume Backup (Complete)

```bash
# Backup a named volume
docker run --rm -v claw_postgres-chat-data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-chat-data.tar.gz -C /data .
```

### Volume Restore

```bash
# Restore a named volume
docker run --rm -v claw_postgres-chat-data:/data -v $(pwd)/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres-chat-data.tar.gz"
```

## Emergency: Complete Data Reset

If you need to start fresh (destroys all data):

```bash
# Stop everything
docker compose -f docker-compose.dev.yml down

# Remove all volumes
docker compose -f docker-compose.dev.yml down -v

# Start fresh
docker compose -f docker-compose.dev.yml up -d

# Re-run seeds
docker compose -f docker-compose.dev.yml exec ollama-service npx tsx prisma/seed-catalog.ts
```

## Prevention

- Schedule daily backups of all PostgreSQL databases
- MongoDB logs have a 30-day TTL and do not need regular backups
- Test restore procedures quarterly
- Never run `prisma migrate dev` in production -- use `prisma migrate deploy`
- Keep migration files in version control -- never delete applied migrations
