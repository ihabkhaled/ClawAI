#!/bin/sh
set -e
echo "Generating Prisma client..."
npx prisma generate 2>/dev/null || true
echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration skipped or failed (will retry on next restart)"
echo "Initial build..."
npx nest build 2>&1 || { echo "Build failed, retrying..."; npx tsc; }
echo "Copying generated client to dist..."
rm -rf dist/generated && mkdir -p dist/generated
cp -r src/generated/prisma dist/generated/prisma 2>/dev/null || true
echo "Starting TypeScript watcher (background)..."
npx tsc --watch --preserveWatchOutput > /dev/null 2>&1 &
echo "Starting dev server (auto-restart on dist changes)..."
exec node --watch dist/main.js
