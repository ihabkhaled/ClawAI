#!/bin/sh
set -e
echo "Generating Prisma client..."
npx prisma generate 2>/dev/null || true
echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration skipped or failed (will retry on next restart)"
echo "Copying generated Prisma client to dist..."
# Replace the compiled copy outright. `cp -r SRC DEST` copies INTO DEST once
# DEST exists, so on every restart after the first it left the real index.js
# frozen and grew a nested prisma/ instead — a schema enum added later was
# then missing at runtime while src/ looked correct. Copying the CONTENTS of
# a freshly emptied directory behaves the same on first run and on restart.
rm -rf dist/generated/prisma
mkdir -p dist/generated/prisma
cp -R src/generated/prisma/. dist/generated/prisma/
echo "Running database seed..."
npx prisma db seed 2>&1 || echo "Seed skipped or already applied"
echo "Starting dev server (tsgo --watch + tsc-alias --watch + nodemon)..."
exec npm run dev
