FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app/apps/claw-agent-service

FROM base AS deps
COPY package.json /app/package.json
COPY packages/ /app/packages/
COPY apps/claw-agent-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-agent-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-agent-service/ .
RUN cd /app/packages/shared-types && npx tsc \
 && cd /app/packages/shared-constants && npx tsc \
 && cd /app/packages/shared-rabbitmq && npx tsc \
 && cd /app/packages/shared-auth && npx tsc \
 && cd /app/packages/shared-utilities && npx tsc
RUN npx prisma generate
RUN npm run build
RUN cp -r src/generated dist/generated 2>/dev/null || true

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/claw-agent-service/dist ./dist
COPY --from=builder /app/apps/claw-agent-service/node_modules ./node_modules
COPY --from=builder /app/apps/claw-agent-service/package.json ./package.json
COPY --from=builder /app/apps/claw-agent-service/prisma ./prisma
COPY --from=builder /app/packages /app/packages
USER nestjs
EXPOSE 4015
CMD ["node", "dist/main.js"]
