FROM node:26-bookworm-slim AS base
# Debian base (not Alpine) — @typescript/native-preview ships glibc-linked
# binaries with no musl variant. The builder runs tsgo, so every stage
# (and the runner, for native-module ABI compatibility) must be glibc.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/claw-audit-service

FROM base AS deps
COPY package.json /app/package.json
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-audit-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-audit-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-audit-service/ .
RUN cd /app/packages/shared-types && npx tsgo \
 && cd /app/packages/shared-constants && npx tsgo \
 && cd /app/packages/shared-utilities && npx tsgo \
 && cd /app/packages/shared-rabbitmq && npx tsgo \
 && cd /app/packages/shared-auth && npx tsgo \
 && cd /app/packages/shared-entitlements && npx tsgo
RUN npm run build

FROM node:26-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/claw-audit-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-audit-service/package.json ./package.json
COPY --from=builder /app/packages /app/packages
USER nestjs
EXPOSE 4007
CMD ["node", "dist/main.js"]
