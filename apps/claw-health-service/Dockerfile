FROM node:26-alpine AS base
WORKDIR /app/apps/claw-health-service

FROM base AS deps
COPY package.json /app/package.json
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-health-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-health-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-health-service/ .
RUN cd /app/packages/shared-types && npx tsc \
 && cd /app/packages/shared-constants && npx tsc \
 && cd /app/packages/shared-rabbitmq && npx tsc \
 && cd /app/packages/shared-auth && npx tsc \
 && cd /app/packages/shared-utilities && npx tsc
RUN npm run build

FROM node:26-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/claw-health-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-health-service/package.json ./package.json
COPY --from=builder /app/packages /app/packages
USER nestjs
EXPOSE 4009
CMD ["node", "dist/main.js"]
