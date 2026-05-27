FROM node:26-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app/apps/claw-file-service

FROM base AS deps
COPY package.json /app/package.json
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-file-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-file-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-file-service/ .
RUN cd /app/packages/shared-types && npx tsc \
 && cd /app/packages/shared-constants && npx tsc \
 && cd /app/packages/shared-rabbitmq && npx tsc \
 && cd /app/packages/shared-auth && npx tsc \
 && cd /app/packages/shared-utilities && npx tsc
RUN npx prisma generate
RUN npm run build
RUN mkdir -p dist/generated && cp -r src/generated/prisma dist/generated/prisma
RUN cp -r src/generated dist/generated 2>/dev/null || true

FROM node:26-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/claw-file-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-file-service/package.json ./package.json
COPY --from=builder /app/apps/claw-file-service/prisma ./prisma
COPY --from=builder /app/packages /app/packages
USER nestjs
EXPOSE 4006
CMD ["node", "dist/main.js"]
