#!/bin/sh
set -e
echo "Generating Prisma client..."
npx prisma generate
echo "Building..."
npm run build
echo "Copying generated client to dist..."
mkdir -p dist/generated
cp -r src/generated/prisma dist/generated/prisma
echo "Starting with watch mode..."
exec node dist/main.js
