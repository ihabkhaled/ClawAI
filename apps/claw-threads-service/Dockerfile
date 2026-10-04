FROM node:26-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json ./package.json
COPY tools/typescript/ ./tools/typescript/
COPY .npmrc ./.npmrc
COPY packages/ ./packages/
COPY apps/claw-threads-service/package.json ./apps/claw-threads-service/package.json
RUN npm install --ignore-scripts --legacy-peer-deps
RUN npm install --ignore-scripts --legacy-peer-deps --no-save \
  "@typescript/typescript-linux-x64@$(node -p "require('/app/node_modules/typescript7/package.json').version")"

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-threads-service/ ./apps/claw-threads-service/
RUN cd packages/shared-constants && npm run build \
 && cd ../shared-types && npm run build \
 && cd ../shared-utilities && npm run build \
 && cd ../shared-auth && npm run build
WORKDIR /app/apps/claw-threads-service
RUN npm run build

FROM node:26-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nestjs /app/apps/claw-threads-service/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/apps/claw-threads-service/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages /app/packages
USER nestjs
EXPOSE 4019
CMD ["node", "dist/main.js"]
