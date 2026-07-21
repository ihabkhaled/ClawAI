#!/usr/bin/env bash
#
# Vercel build entry point for a ClawAI NestJS service.
#
# Vercel caps `buildCommand` in vercel.json at 256 characters, and the real
# command (static stub + shared packages + prisma generate + workspace build)
# is well past that. So vercel.json calls this script instead:
#
#   bash ../../scripts/vercel/build-service.sh <workspace-name>
#
# Runs with the working directory set to the project's rootDirectory
# (apps/<service>), which is how Vercel invokes the build command.

set -euo pipefail

WORKSPACE="${1:?usage: build-service.sh <workspace-name>}"
SERVICE_DIR="$(pwd)"
REPO_ROOT="$(cd ../.. && pwd)"

echo "==> building ${WORKSPACE}"
echo "    service dir: ${SERVICE_DIR}"

# Vercel rejects an output directory that is missing OR empty, and the Nest
# projects emit no static assets — everything is served by api/index.js. Give
# it a one-line page so the bare domain has something to answer with. Nest
# serves under /api/v1, so this shadows no route.
#
# Skipped for Next.js, which outputs to .next and owns a real public/ directory
# we must not write into.
if [ -f "${SERVICE_DIR}/next.config.mjs" ] || [ -f "${SERVICE_DIR}/next.config.js" ]; then
  echo "==> Next.js project — leaving public/ alone"
else
  mkdir -p "${SERVICE_DIR}/public"
  printf '<!doctype html><title>%s</title><p>ClawAI API service. Health: /api/v1/health\n' \
    "${WORKSPACE}" > "${SERVICE_DIR}/public/index.html"
fi

cd "${REPO_ROOT}"

echo "==> building shared packages"
npm run vercel:build:shared

# Generated Prisma clients are gitignored, so a fresh Vercel checkout has none.
# `npx prisma generate` rather than the npm script: not every service defines
# a prisma:generate script.
if [ -f "${SERVICE_DIR}/prisma/schema.prisma" ]; then
  echo "==> generating prisma client"
  (cd "${SERVICE_DIR}" && npx prisma generate)
fi

echo "==> compiling ${WORKSPACE}"
npm run build --workspace="${WORKSPACE}"

# The Prisma client is generated into src/generated/prisma as plain .js/.d.ts.
# tsgo only compiles .ts, so it never lands in dist/, and the compiled
# dist/infrastructure/database/prisma/prisma.service.js fails at runtime with
# "Cannot find module '../../../generated/prisma'". The Dockerfile has always
# done this copy (see apps/*/Dockerfile); the Vercel build needs it too.
if [ -d "${SERVICE_DIR}/src/generated" ]; then
  echo "==> copying generated Prisma client into dist/"
  mkdir -p "${SERVICE_DIR}/dist/generated"
  cp -r "${SERVICE_DIR}/src/generated/." "${SERVICE_DIR}/dist/generated/"
  ls "${SERVICE_DIR}/dist/generated"
fi

echo "==> done"
