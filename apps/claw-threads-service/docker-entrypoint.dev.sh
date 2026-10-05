#!/bin/sh
set -e
npm run prisma:generate
npx prisma migrate deploy
rm -rf dist/generated/prisma
mkdir -p dist/generated/prisma
cp -R src/generated/prisma/. dist/generated/prisma/
exec npm run dev
