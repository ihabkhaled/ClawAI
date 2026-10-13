FROM node:26-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json ./package.json
COPY tools/typescript/ ./tools/typescript/
COPY .npmrc ./.npmrc
COPY packages/ ./packages/
COPY apps/claw-plugin-service/package.json ./apps/claw-plugin-service/package.json
RUN npm install --ignore-scripts --legacy-peer-deps
RUN npm install --ignore-scripts --legacy-peer-deps --no-save \
  "@typescript/typescript-linux-x64@$(node -p "require('/app/node_modules/typescript7/package.json').version")"

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-plugin-service/ ./apps/claw-plugin-service/
RUN cd /app/packages/shared-constants && npm run build \
 && cd /app/packages/shared-types && npm run build \
 && cd /app/packages/shared-utilities && npm run build \
 && cd /app/packages/shared-rabbitmq && npm run build \
 && cd /app/packages/shared-auth && npm run build \
 && cd /app/packages/shared-entitlements && npm run build
WORKDIR /app/apps/claw-plugin-service
RUN npm run build

FROM node:26-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
# Patch what the base image ships: Debian packages and the bundled npm carry fixed HIGH/CRITICAL CVEs
# (perl-base, brace-expansion) that the Trivy image scan in CI fails on.
RUN apt-get update && apt-get upgrade -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g npm@latest --no-audit --no-fund
RUN addgroup --system --gid 1001 nestjs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nestjs /app/apps/claw-plugin-service/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/apps/claw-plugin-service/package.json ./package.json
COPY --from=builder --chown=nestjs:nestjs /app/apps/claw-plugin-service/prisma ./prisma
COPY --from=builder --chown=nestjs:nestjs /app/apps/claw-plugin-service/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
# The bundled npm ships brace-expansion 5.0.9 (HIGH CVE, fixed in 5.0.10): swap in the patched copy the
# install resolved (same major, same balanced-match). The native TypeScript compiler is a build tool built
# with a Go runtime that carries stdlib CVEs; the service never runs it, so it does not ship.
COPY --from=builder /app/node_modules/brace-expansion /usr/local/lib/node_modules/npm/node_modules/brace-expansion
RUN rm -f /app/node_modules/@typescript/typescript-linux-x64/lib/tsc
# Two more HIGH CVEs with fixed releases: undici inside the bundled npm, and deepmerge-ts that Prisma's config
# loader pins exactly. Same-major patch for undici; deepmerge-ts 8 keeps the mergeDeep API Prisma uses.
RUN mkdir /tmp/patch && cd /tmp/patch   && npm pack undici@6.28.1 deepmerge-ts@8.0.0 --silent   && mkdir u d && tar -xzf undici-6.28.1.tgz -C u && tar -xzf deepmerge-ts-8.0.0.tgz -C d   && rm -rf /usr/local/lib/node_modules/npm/node_modules/undici /app/node_modules/deepmerge-ts   && cp -r u/package /usr/local/lib/node_modules/npm/node_modules/undici   && cp -r d/package /app/node_modules/deepmerge-ts   && rm -rf /tmp/patch /root/.npm
RUN chown -R nestjs:nestjs /app/node_modules/@prisma/engines
COPY --from=builder /app/packages /app/packages
COPY scripts/docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
RUN chmod +x /app/docker-entrypoint.prod.sh
USER nestjs
EXPOSE 4021
CMD ["sh", "/app/docker-entrypoint.prod.sh"]
