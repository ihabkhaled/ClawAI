FROM node:26-bookworm-slim AS base
# Debian base (not Alpine) — the TypeScript 7 npm compiler ships glibc-linked
# binaries with no musl variant. The builder runs the TypeScript 7 compiler, so every stage
# (and the runner, for native-module ABI compatibility) must be glibc.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/claw-research-service

FROM base AS deps
COPY package.json /app/package.json\nCOPY tools/typescript/ /app/tools/typescript/
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-research-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-research-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-research-service/ .
RUN cd /app/packages/shared-types && npm run build \
 && cd /app/packages/shared-constants && npm run build \
 && cd /app/packages/shared-utilities && npm run build \
 && cd /app/packages/shared-rabbitmq && npm run build \
 && cd /app/packages/shared-auth && npm run build \
 && cd /app/packages/shared-entitlements && npm run build
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
COPY --from=builder /app/apps/claw-research-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-research-service/package.json ./package.json
COPY --from=builder /app/apps/claw-research-service/prisma ./prisma
COPY --from=builder /app/apps/claw-research-service/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/packages /app/packages
COPY scripts/docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
RUN chmod +x /app/docker-entrypoint.prod.sh
USER nestjs
EXPOSE 4016
CMD ["sh", "/app/docker-entrypoint.prod.sh"]
