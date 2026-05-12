#!/bin/sh
set -e
echo "Rebuilding shared packages (bind-mounted source may be ahead of image-built dist)..."
for pkg in shared-types shared-constants shared-rabbitmq shared-auth shared-utilities; do
  if [ -d "/app/packages/$pkg" ]; then
    echo "  → $pkg"
    (cd "/app/packages/$pkg" && npx tsc 2>&1) || echo "  ! $pkg build failed (continuing)"
  fi
done
echo "Generating Prisma client..."
npx prisma generate 2>/dev/null || true
echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration skipped or failed (will retry on next restart)"
echo "Initial build..."
npx nest build 2>&1 || { echo "Build failed, retrying..."; npx tsc; }
echo "Copying generated client to dist..."
rm -rf dist/generated
mkdir -p dist/generated
cp -r src/generated/prisma dist/generated/prisma 2>/dev/null || true
echo "Starting dev server (nest start --watch)..."
exec npx nest start --watch
