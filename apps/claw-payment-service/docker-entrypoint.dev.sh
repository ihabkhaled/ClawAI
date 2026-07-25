#!/bin/sh
set -e
echo "Generating Prisma client..."
npx prisma generate 2>/dev/null || true
echo "Running database migrations..."
# `prisma migrate deploy` is idempotent: it consults the _prisma_migrations
# ledger and applies only what is unapplied. Restarting the container therefore
# applies nothing new. Concurrent replicas are serialized by the advisory lock
# taken in ReleaseBootstrapService before any versioned data seeder runs.
npx prisma migrate deploy 2>&1 || echo "Migration skipped or failed (will retry on next restart)"
echo "Copying generated Prisma client to dist..."
mkdir -p dist/generated
cp -r src/generated/prisma dist/generated/prisma 2>/dev/null || true
echo "Starting dev server (tsgo --watch + tsc-alias --watch + nodemon)..."
exec npm run dev
