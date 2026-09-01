FROM node:26-bookworm-slim AS base
# Debian base (not Alpine) — the TypeScript 7 npm compiler ships glibc-linked
# binaries with no musl variant. The builder runs the TypeScript 7 compiler, so every stage
# (and the runner, for native-module ABI compatibility) must be glibc.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/claw-ollama-service

FROM base AS deps
COPY package.json /app/package.json
COPY tools/typescript/ /app/tools/typescript/
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-ollama-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts --legacy-peer-deps && cd /app/apps/claw-ollama-service && npm install --ignore-scripts --legacy-peer-deps 2>/dev/null || true
# The root declares the compiler as an ALIAS (typescript7 -> npm:typescript).
# npm does not install an aliased package's platform optionalDependencies, so
# @typescript/typescript-<platform> never lands on disk and every shared-package
# build dies with "Unable to resolve @typescript/typescript-linux-x64".
#
# CI does not hit this because it installs from package-lock.json, which does
# record the binaries; these images install without the lock. The version is
# read back from the resolved compiler so it can never drift from it.
RUN cd /app && npm install --ignore-scripts --legacy-peer-deps --no-save \
  "@typescript/typescript-linux-x64@$(node -p "require('/app/node_modules/typescript7/package.json').version")"

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-ollama-service/ .
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
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/claw-ollama-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-ollama-service/package.json ./package.json
COPY --from=builder /app/apps/claw-ollama-service/prisma ./prisma
COPY --from=builder /app/apps/claw-ollama-service/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/packages /app/packages
COPY scripts/docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
RUN chmod +x /app/docker-entrypoint.prod.sh
USER nestjs
EXPOSE 4008
CMD ["sh", "/app/docker-entrypoint.prod.sh"]
