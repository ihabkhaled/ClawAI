# The frontend is an npm workspace of the monorepo, and its package.json
# depends on @claw/shared-types. Installing from an app-only build context makes
# npm treat that as a public registry package and the install dies on a 404, so
# every stage below works from the repo root — the same reason Dockerfile.dev
# and every service Dockerfile do. Build context is `..` (see
# docker/docker-compose.prod.services.yml).
FROM node:26-alpine AS base
WORKDIR /app

# Install dependencies from the monorepo root so npm resolves @claw/* to the
# local workspaces instead of the public registry.
FROM base AS deps
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY .npmrc ./.npmrc
COPY packages/ ./packages/
COPY apps/claw-frontend/package.json ./apps/claw-frontend/package.json
# No --legacy-peer-deps. The repository's own .npmrc spells out why: peer
# conflicts here are resolved with npm `overrides` in package.json, because
# legacy-peer-deps silently strips transitive deps from the install tree. It did
# exactly that to this image — `next` never landed in node_modules and the
# production build died with `sh: next: not found` (exit 127), while all 18
# service images, which install without the flag, built fine.
RUN npm install --ignore-scripts

# Build
FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-frontend/ ./apps/claw-frontend/

# @claw/shared-types resolves through its `main`/`types` fields to dist/, which
# is gitignored, so it has to be compiled before Next traces the imports.
RUN cd /app/packages/shared-types && npx tsgo \
 && cd /app/packages/shared-entitlements && npx tsgo

WORKDIR /app/apps/claw-frontend

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# Production
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# `outputFileTracingRoot` in next.config.mjs is the monorepo root, so the
# standalone bundle keeps the workspace layout: node_modules/ at the top and the
# server entrypoint under apps/claw-frontend/.
COPY --from=builder /app/apps/claw-frontend/.next/standalone ./
COPY --from=builder /app/apps/claw-frontend/.next/static ./apps/claw-frontend/.next/static
COPY --from=builder /app/apps/claw-frontend/public ./apps/claw-frontend/public

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/claw-frontend/server.js"]
