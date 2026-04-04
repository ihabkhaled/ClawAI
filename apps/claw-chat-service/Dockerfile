FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json ./
RUN npm install --ignore-scripts
RUN npx prisma generate 2>/dev/null || true

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nestjs
EXPOSE 4002

CMD ["node", "dist/main.js"]
