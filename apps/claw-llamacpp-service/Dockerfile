# Production multi-stage build for claw-llamacpp-service.
#
# IMPORTANT: must use a glibc-based image (Debian) NOT Alpine.
# llama-server (downloaded at runtime from ggml-org/llama.cpp GitHub releases)
# is glibc-linked and references symbols (__res_init, pthread_cond_clockwait,
# __wmemcpy_chk) that musl + gcompat cannot satisfy. See
# .claude/Integrations/llamacpp__QA_output.md for the diagnosis.
FROM node:26-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/claw-llamacpp-service

FROM base AS deps
COPY package.json /app/package.json
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-llamacpp-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-llamacpp-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-llamacpp-service/ .
RUN cd /app/packages/shared-types && npx tsc \
 && cd /app/packages/shared-constants && npx tsc \
 && cd /app/packages/shared-rabbitmq && npx tsc \
 && cd /app/packages/shared-auth && npx tsc \
 && cd /app/packages/shared-utilities && npx tsc
RUN npx prisma generate
RUN npm run build
RUN mkdir -p dist/generated && cp -r src/generated/prisma dist/generated/prisma
RUN cp -r src/generated dist/generated 2>/dev/null || true

# Final stage MUST also be Debian-glibc so the downloaded llama-server can run.
# Runtime apt deps are the same set the dev image needs to extract release
# archives + dlopen the OpenMP runtime.
FROM node:26-bookworm-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       openssl \
       curl \
       ca-certificates \
       tar \
       xz-utils \
       unzip \
       libgomp1 \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 1001 nestjs && useradd --system --uid 1001 --gid 1001 nestjs
COPY --from=builder /app/apps/claw-llamacpp-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-llamacpp-service/package.json ./package.json
COPY --from=builder /app/apps/claw-llamacpp-service/prisma ./prisma
COPY --from=builder /app/apps/claw-llamacpp-service/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/packages /app/packages
COPY scripts/docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
RUN chmod +x /app/docker-entrypoint.prod.sh
USER nestjs
EXPOSE 4017
CMD ["sh", "/app/docker-entrypoint.prod.sh"]
