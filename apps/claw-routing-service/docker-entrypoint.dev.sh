#!/bin/sh
set -e
echo "Generating Prisma client..."
npx prisma generate 2>/dev/null || true
echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration skipped or failed (will retry on next restart)"
echo "Copying generated Prisma client to dist..."
mkdir -p dist/generated
cp -r src/generated/prisma dist/generated/prisma 2>/dev/null || true
echo "Starting dev server (tsgo --watch + tsc-alias --watch + nodemon)..."
exec npm run dev
