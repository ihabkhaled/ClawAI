FROM node:26-bookworm-slim AS base
# Debian base (not Alpine) — @typescript/native-preview ships glibc-linked
# binaries with no musl variant. The builder runs tsgo, so every stage
# (and the runner, for native-module ABI compatibility) must be glibc.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/claw-auth-service

FROM base AS deps
COPY package.json /app/package.json
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-auth-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-auth-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-auth-service/ .
RUN cd /app/packages/shared-types && npx tsgo \
 && cd /app/packages/shared-constants && npx tsgo \
 && cd /app/packages/shared-rabbitmq && npx tsgo \
 && cd /app/packages/shared-auth && npx tsgo \
 && cd /app/packages/shared-utilities && npx tsgo
RUN npx prisma generate
RUN npm run build
RUN mkdir -p dist/generated && cp -r src/generated/prisma dist/generated/prisma
RUN cp -r src/generated dist/generated 2>/dev/null || true

FROM node:26-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/claw-auth-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-auth-service/package.json ./package.json
COPY --from=builder /app/apps/claw-auth-service/prisma ./prisma
COPY --from=builder /app/apps/claw-auth-service/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/packages /app/packages
COPY scripts/docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
RUN chmod +x /app/docker-entrypoint.prod.sh
USER nestjs
EXPOSE 4001
CMD ["sh", "/app/docker-entrypoint.prod.sh"]
