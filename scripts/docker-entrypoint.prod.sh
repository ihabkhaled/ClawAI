#!/bin/sh
# Generic production entrypoint for Prisma-using NestJS services.
#
# Why this exists: in dev, docker-entrypoint.dev.sh runs `prisma migrate
# deploy` (and `db seed` for auth) before booting Nest. The prod
# Dockerfiles previously used a bare `CMD ["node", "dist/main.js"]`,
# which means migrations never ran on first boot — services crash-
# looped with `relation "public.<table>" does not exist`.
#
# This script runs migrations, optionally seeds (when SEED_ON_START=true),
# then exec's the service entrypoint. It is copied into every Prisma-
# using prod image and used as the CMD.
set -e

cd /app

echo "[entrypoint] prisma migrate deploy..."
# Migrations can fail on a brand-new install if Postgres is still
# booting. Retry a few times before giving up.
attempt=1
max_attempts=10
until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[entrypoint] migrate deploy failed after ${max_attempts} attempts — exiting"
    exit 1
  fi
  echo "[entrypoint] migrate deploy attempt ${attempt} failed, retrying in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done
echo "[entrypoint] migrations applied"

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] prisma db seed..."
  # Seed is idempotent (admin user upsert) — failures here shouldn't
  # block startup, but we want them in the logs.
  npx prisma db seed || echo "[entrypoint] seed reported a non-zero exit (continuing)"
fi

echo "[entrypoint] exec node dist/main.js"
exec node dist/main.js
