#!/bin/sh
set -e
echo "Generating Prisma client..."
npx prisma generate 2>/dev/null || true
echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration skipped or failed (will retry on next restart)"
echo "Initial build (tsgo TS 7 native preview)..."
/app/node_modules/.bin/tsgo -p tsconfig.build.json
echo "Copying generated Prisma client to dist..."
rm -rf dist/generated
mkdir -p dist/generated
cp -r src/generated/prisma dist/generated/prisma 2>/dev/null || true
echo "Starting service..."
exec node dist/main.js
