# Hot Reload Matrix

> What changes need restart vs rebuild vs nothing, and the Prisma migration flow.

---

## 1. Hot Reload Decision Matrix

| Change Type               | Action Required                                   | Downtime | Command                                                  |
| ------------------------- | ------------------------------------------------- | -------- | -------------------------------------------------------- |
| Backend source (`src/`)   | None -- auto-detected by `node --watch`           | 0s       | (automatic)                                              |
| Frontend source (`src/`)  | None -- auto-detected by Turbopack HMR            | 0s       | (automatic)                                              |
| Prisma schema             | Rebuild container (migration runs in entrypoint)  | ~30s     | `docker compose up -d --build <service>`                 |
| `package.json` deps       | Rebuild container                                 | ~60s     | `docker compose up -d --build <service>`                 |
| Dockerfile changes        | Rebuild container                                 | ~60s     | `docker compose up -d --build <service>`                 |
| Docker Compose config     | Recreate containers                               | ~10s     | `docker compose up -d`                                   |
| `.env` values             | Restart containers                                | ~5s      | `docker compose restart <service>`                       |
| Shared packages           | Rebuild package + restart dependents              | ~30s     | See section 3                                            |
| Nginx config              | Restart nginx                                     | ~2s      | `docker compose restart nginx`                           |
| New test files             | None -- test runner watches automatically         | 0s       | (automatic in watch mode)                                |

---

## 2. How Hot Reload Works

### Backend Services (NestJS)

Services with Prisma (auth, chat, connector, routing, memory, file, ollama, image, file-generation) use a Docker entrypoint script:

```bash
# docker-entrypoint.dev.sh
npx prisma migrate deploy    # Apply pending migrations
node --watch dist/main.js    # Start with file watching
```

`node --watch` monitors the `src/` directory (mounted from host) and restarts the process when files change.

Services without Prisma (audit, health, client-logs, server-logs) run `npm run dev` directly.

### Frontend (Next.js)

Next.js 16 with Turbopack provides instant HMR (Hot Module Replacement):

- React component changes are reflected without page reload
- CSS changes are injected without reload
- Page route changes may require a soft navigation

The `src/` and `public/` directories are mounted from the host.

### What Gets Mounted (Dev Only)

```yaml
# Backend service volumes
- ./apps/claw-<service>/src:/app/apps/claw-<service>/src
- ./apps/claw-<service>/prisma:/app/apps/claw-<service>/prisma

# Frontend volumes
- ./apps/claw-frontend/src:/app/src
- ./apps/claw-frontend/public:/app/public

# Nginx config
- ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

---

## 3. Shared Package Changes

Shared packages (`packages/shared-*`) are NOT mounted as volumes. They are copied into the container at build time. To propagate changes:

```bash
# 1. Make changes in packages/shared-types (or other shared package)

# 2. Rebuild the affected services
docker compose -f docker-compose.dev.yml up -d --build chat-service routing-service

# OR rebuild all services
docker compose -f docker-compose.dev.yml up -d --build
```

**Build order matters** for shared packages:

```
1. packages/shared-types      (no dependencies)
2. packages/shared-constants  (depends on shared-types)
3. packages/shared-rabbitmq   (depends on shared-types, shared-constants)
4. packages/shared-auth       (depends on shared-types, shared-constants)
```

---

## 4. Prisma Migration Flow

### Adding a New Migration (Development)

```bash
# 1. Edit the Prisma schema
# apps/claw-chat-service/prisma/schema.prisma

# 2. Generate and apply migration
cd apps/claw-chat-service
npx prisma migrate dev --name add_new_field

# 3. The migration file is created in prisma/migrations/
# 4. Rebuild the container to apply
docker compose -f docker-compose.dev.yml up -d --build chat-service
```

### Automatic Migration on Container Start

The dev entrypoint runs `npx prisma migrate deploy` before starting the application. This applies any pending migrations automatically when:

- The container is rebuilt (`docker compose up -d --build`)
- A new migration file is added to the `prisma/` directory (which is mounted)

### Migration Troubleshooting

```bash
# Check migration status
docker exec claw-chat-service npx prisma migrate status

# Reset database (DESTRUCTIVE)
docker exec claw-chat-service npx prisma migrate reset --force

# Apply migrations manually
docker exec claw-chat-service npx prisma migrate deploy
```

---

## 5. Common Scenarios

### "I changed a service method"

Nothing to do. `node --watch` auto-restarts.

### "I added a new npm dependency"

```bash
docker compose -f docker-compose.dev.yml up -d --build <service-name>
```

### "I changed a Prisma schema"

```bash
# Create migration locally
cd apps/claw-<service> && npx prisma migrate dev --name description

# Rebuild container to apply
docker compose -f docker-compose.dev.yml up -d --build <service-name>
```

### "I changed an environment variable"

```bash
docker compose -f docker-compose.dev.yml restart <service-name>
```

### "I changed the nginx config"

```bash
docker compose -f docker-compose.dev.yml restart nginx
```

### "I changed a shared package"

```bash
docker compose -f docker-compose.dev.yml up -d --build <all-affected-services>
```

### "I changed a Docker Compose file"

```bash
docker compose -f docker-compose.dev.yml up -d
# Docker detects config changes and recreates affected containers
```

### "I added a new service"

```bash
# Full rebuild required
docker compose -f docker-compose.dev.yml up -d --build
```

---

## 6. Important Notes

- **Never use `docker compose build`** alone -- always follow with `up -d` to apply
- **Restart vs Rebuild**: Use `restart` for env changes, `--build` for code/dependency changes
- **Hot reload does NOT work for**: shared packages, Dockerfiles, compose config, or new dependencies
- **Frontend tests** may have issues with Node.js v24+ due to rollup native binaries -- run inside Docker or use the vitest process cache
