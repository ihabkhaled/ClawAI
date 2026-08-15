FROM node:26-bookworm-slim AS base
# Debian base (not Alpine) — the TypeScript 7 npm compiler ships glibc-linked
# binaries with no musl variant. The builder runs the TypeScript 7 compiler, so every stage
# (and the runner, for native-module ABI compatibility) must be glibc.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/claw-file-service

FROM base AS deps
COPY package.json /app/package.json
COPY tools/typescript/ /app/tools/typescript/
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-file-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-file-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-file-service/ .
RUN cd /app/packages/shared-constants && npm run build \
 && cd /app/packages/shared-types && npm run build \
 && cd /app/packages/shared-utilities && npm run build \
 && cd /app/packages/shared-rabbitmq && npm run build \
 && cd /app/packages/shared-auth && npm run build \
 && cd /app/packages/shared-entitlements && npm run build
RUN npx prisma generate
RUN npm run build
RUN mkdir -p dist/generated && cp -r src/generated/prisma dist/generated/prisma
RUN cp -r src/generated dist/generated 2>/dev/null || true

FROM node:26-bookworm-slim AS runner
# util-linux gives us `runuser`, which the wrapper entrypoint uses to drop
# from root to nestjs after chowning the upload volume (Debian has no
# su-exec; runuser is the bookworm-native equivalent, matching llamacpp).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget util-linux \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
# Pre-create the upload tree with nestjs ownership so brand-new
# named volumes inherit it on first mount (docker copies image-side
# directory contents + ownership into an empty volume). Existing
# volumes that already have root ownership are fixed by the entrypoint.
RUN mkdir -p /data/files && chown -R nestjs:nestjs /data
COPY --from=builder /app/apps/claw-file-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-file-service/package.json ./package.json
COPY --from=builder /app/apps/claw-file-service/prisma ./prisma
COPY --from=builder /app/apps/claw-file-service/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/packages /app/packages
COPY scripts/docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
COPY apps/claw-file-service/docker-entrypoint.prod.sh /app/docker-entrypoint.file.sh
RUN chmod +x /app/docker-entrypoint.prod.sh /app/docker-entrypoint.file.sh
# Stay root — the file wrapper entrypoint chowns the upload volume
# (which docker creates as root) and then exec's runuser to drop to
# nestjs before NestJS boots. See docker-entrypoint.prod.sh for rationale.
EXPOSE 4006
CMD ["sh", "/app/docker-entrypoint.file.sh"]
