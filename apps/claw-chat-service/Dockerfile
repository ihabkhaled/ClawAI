FROM node:26-bookworm-slim AS base
# Debian base (not Alpine) — the TypeScript 7 npm compiler ships glibc-linked
# binaries with no musl variant. Alpine would fail to load the TypeScript 7 compiler.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/claw-chat-service

FROM base AS deps
COPY package.json /app/package.json\nCOPY tools/typescript/ /app/tools/typescript/
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-chat-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-chat-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-chat-service/ .
RUN cd /app/packages/shared-types && npm run build \
 && cd /app/packages/shared-constants && npm run build \
 && cd /app/packages/shared-utilities && npm run build \
 && cd /app/packages/shared-rabbitmq && npm run build \
 && cd /app/packages/shared-auth && npm run build \
 && cd /app/packages/shared-entitlements && npm run build
RUN npx prisma generate
# npm run build = the TypeScript 7 compiler -p tsconfig.build.json && node scripts/rewrite-paths.mjs dist && node scripts/copy-assets.mjs
RUN npm run build
RUN mkdir -p dist/generated && cp -r src/generated/prisma dist/generated/prisma

FROM node:26-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/claw-chat-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-chat-service/package.json ./package.json
COPY --from=builder /app/apps/claw-chat-service/prisma ./prisma
COPY --from=builder /app/apps/claw-chat-service/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/packages /app/packages
COPY scripts/docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
RUN chmod +x /app/docker-entrypoint.prod.sh
USER nestjs
EXPOSE 4002
CMD ["sh", "/app/docker-entrypoint.prod.sh"]
