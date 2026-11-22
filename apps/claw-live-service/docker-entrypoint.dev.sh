#!/bin/sh
set -e
npm run prisma:generate
npx prisma migrate deploy
rm -rf dist/generated/prisma
mkdir -p dist/generated/prisma
cp -R src/generated/prisma/. dist/generated/prisma/
node prisma/seeders/live-policy.seeder.cjs || echo "[entrypoint] live policy seed reported a non-zero exit (continuing)"
exec npm run dev
