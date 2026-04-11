# Deployment Guide

> Dev vs prod setup, SSL, scaling considerations, monitoring, and backup.

---

## 1. Development Setup

### Prerequisites

| Software     | Version | Purpose                        |
| ------------ | ------- | ------------------------------ |
| Node.js      | >= 20   | Running services locally       |
| Docker       | >= 24   | Container runtime              |
| Docker Compose | >= 2  | Container orchestration        |
| Git          | >= 2.40 | Version control                |

### Quick Start (Docker)

```bash
# 1. Clone the repository
git clone <repo-url> && cd Claw

# 2. Copy environment config
cp .env.example .env
# Edit .env with your values

# 3. Start everything
docker compose -f docker-compose.dev.yml up -d

# 4. Wait for services to be healthy (~2-5 minutes first run)
docker compose -f docker-compose.dev.yml ps

# 5. Access the application
# Frontend: http://localhost:3000
# API (via nginx): http://localhost:4000
# RabbitMQ Management: http://localhost:15672
```

### Quick Start (Install Scripts)

```bash
# Linux/macOS
./scripts/install.sh

# Windows PowerShell
.\scripts\install.ps1
```

The install scripts:
1. Check prerequisites (Node.js, Docker, Docker Compose)
2. Install npm dependencies
3. Generate a `.env` file with default values
4. Build shared packages
5. Start Docker containers
6. Wait for health checks

### First-Run Considerations

- Ollama model downloads take 10-30 minutes (~10 GB total)
- PostgreSQL databases are created automatically
- Prisma migrations run on container startup
- Seed data (admin user, default policies) is applied on first startup

---

## 2. Production Setup

### Using Production Compose

```bash
# Single file
docker compose -f docker-compose.yml up -d

# Or via management script
./scripts/claw.sh --prod up
```

### Key Differences from Dev

| Aspect              | Development                      | Production                      |
| ------------------- | -------------------------------- | ------------------------------- |
| Dockerfile          | `Dockerfile.dev`                 | `Dockerfile`                    |
| Source mounts        | Yes (hot reload)                | No (baked into image)           |
| Dependencies        | All (dev + prod)                 | Production only                 |
| Next.js             | Turbopack dev server             | Optimized static build          |
| Port exposure       | All ports to host                | Only nginx (4000)               |
| Restart policy      | `unless-stopped`                 | `always`                        |
| NODE_ENV            | `development`                    | `production`                    |
| Source maps          | Enabled                         | Disabled                        |

### Production Environment Variables

Critical variables to configure for production:

```bash
# Security (MUST change from defaults)
JWT_SECRET=<random-64-char-hex>
ENCRYPTION_KEY=<random-64-char-hex>
ADMIN_PASSWORD=<strong-password>

# Database passwords (MUST change from defaults)
PG_AUTH_PASSWORD=<strong-password>
PG_CHAT_PASSWORD=<strong-password>
# ... (all 9 PostgreSQL instances)
MONGO_PASSWORD=<strong-password>
RABBITMQ_DEFAULT_PASS=<strong-password>

# CORS (restrict to your domain)
CORS_ORIGINS=https://your-domain.com

# Frontend URL
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 3. SSL/TLS Configuration

For production, add SSL termination at the Nginx layer:

### Option A: SSL in Nginx

Add to `infra/nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # ... existing location blocks
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

Mount certificates in Docker Compose:
```yaml
volumes:
  - ./ssl/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
  - ./ssl/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
```

### Option B: Reverse Proxy (Recommended)

Use Cloudflare, AWS ALB, or Traefik in front of Nginx for SSL termination. This simplifies certificate management and provides DDoS protection.

---

## 4. Scaling Considerations

### Horizontal Scaling

Backend services are stateless and can be scaled horizontally:

```bash
docker compose -f docker-compose.yml up -d --scale chat-service=3
```

Update Nginx to load-balance:
```nginx
upstream chat-backend {
    server chat-service-1:4002;
    server chat-service-2:4002;
    server chat-service-3:4002;
}
```

### Vertical Scaling

For Ollama, increasing GPU memory allows larger models. Check model requirements against available VRAM.

### Database Scaling

- PostgreSQL: Consider connection pooling (PgBouncer) for high-traffic services
- MongoDB: Enable replica sets for audit/log durability
- Redis: Redis Cluster for high-availability caching

---

## 5. Monitoring

### Health Checks

The health service (port 4009) aggregates health from all services:

```bash
curl http://localhost:4000/api/v1/health
```

Returns status for each service (HEALTHY, DEGRADED, UNHEALTHY) with response times.

### Container Monitoring

```bash
# Check all container statuses
docker compose -f docker-compose.dev.yml ps

# Resource usage
docker stats

# Specific service health
docker inspect --format='{{json .State.Health}}' claw-chat-service
```

### Log Monitoring

Services emit structured JSON logs (Pino):

```bash
# Follow service logs
docker compose logs -f chat-service

# Last 100 lines
docker compose logs --tail=100 routing-service
```

The server-logs-service (port 4011) stores backend logs in MongoDB with 30-day TTL, accessible via the frontend Logs page.

---

## 6. Backup Strategy

### Database Backups

```bash
# PostgreSQL backup (single database)
docker exec claw-pg-chat pg_dump -U claw claw_chat > backup_chat_$(date +%Y%m%d).sql

# PostgreSQL backup (all databases)
for db in auth chat connector routing memory files ollama images file-generations; do
  docker exec claw-pg-${db} pg_dump -U claw claw_${db} > backup_${db}_$(date +%Y%m%d).sql
done

# MongoDB backup
docker exec claw-mongodb mongodump --out /tmp/backup
docker cp claw-mongodb:/tmp/backup ./mongo_backup_$(date +%Y%m%d)

# Redis backup (if persistence enabled)
docker exec claw-redis redis-cli BGSAVE
docker cp claw-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### Restore

```bash
# PostgreSQL restore
docker exec -i claw-pg-chat psql -U claw claw_chat < backup_chat_20260411.sql

# MongoDB restore
docker cp ./mongo_backup claw-mongodb:/tmp/restore
docker exec claw-mongodb mongorestore /tmp/restore
```

### Volume Backups

```bash
# Backup a Docker volume
docker run --rm -v claw_pg-chat-data:/data -v $(pwd):/backup alpine tar czf /backup/pg-chat-data.tar.gz -C /data .

# Restore a Docker volume
docker run --rm -v claw_pg-chat-data:/data -v $(pwd):/backup alpine tar xzf /backup/pg-chat-data.tar.gz -C /data
```

### Ollama Models

Ollama models are stored in the `ollama-data` volume. Back up this volume or rely on re-pulling from the registry (models are public).

---

## 7. Maintenance Tasks

### Database Migrations

Prisma migrations run automatically on container startup. For manual migrations:

```bash
docker exec -it claw-chat-service npx prisma migrate deploy
```

### Log Rotation

- MongoDB logs: 30-day TTL index automatically deletes old entries
- Docker container logs: Configure Docker daemon log driver with max-size/max-file

### Volume Cleanup

```bash
# Remove unused volumes
docker volume prune

# Remove all ClawAI volumes (DESTRUCTIVE)
docker compose -f docker-compose.dev.yml down -v
```
