FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app/apps/claw-routing-service

FROM base AS deps
COPY package.json /app/package.json
COPY packages/ /app/packages/
COPY apps/claw-routing-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-routing-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-routing-service/ .
RUN npx prisma generate
RUN npm run build
RUN cp -r src/generated dist/generated 2>/dev/null || true

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/claw-routing-service/dist ./dist
COPY --from=builder /app/apps/claw-routing-service/node_modules ./node_modules
COPY --from=builder /app/apps/claw-routing-service/package.json ./package.json
COPY --from=builder /app/apps/claw-routing-service/prisma ./prisma
COPY --from=builder /app/packages /app/packages
USER nestjs
EXPOSE 4004
CMD ["node", "dist/main.js"]
