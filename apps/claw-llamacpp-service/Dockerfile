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
COPY tools/typescript/ /app/tools/typescript/
COPY .npmrc /app/.npmrc
COPY packages/ /app/packages/
COPY apps/claw-llamacpp-service/package.json ./package.json
RUN cd /app && npm install --ignore-scripts && cd /app/apps/claw-llamacpp-service && npm install --ignore-scripts 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-llamacpp-service/ .
RUN cd /app/packages/shared-types && npm run build \
 && cd /app/packages/shared-constants && npm run build \
 && cd /app/packages/shared-utilities && npm run build \
 && cd /app/packages/shared-rabbitmq && npm run build \
 && cd /app/packages/shared-auth && npm run build \
 && cd /app/packages/shared-entitlements && npm run build
RUN npx prisma generate
RUN npm run build
RUN mkdir -p dist/generated && cp -r src/generated/prisma dist/generated/prisma
RUN cp -r src/generated dist/generated 2>/dev/null || true

# Final stage MUST also be Debian-glibc so the downloaded llama-server can run.
# Runtime apt deps are the same set the dev image needs to extract release
# archives + dlopen the OpenMP runtime.
FROM node:26-bookworm-slim AS runner
# util-linux gives us `runuser` which the entrypoint uses to drop privileges
# from root to nestjs after fixing volume ownership. Pre-installed on
# bookworm-slim base; explicit `apt-get install util-linux` is belt-and-
# suspenders so future base-image slimming doesn't break the entrypoint.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       openssl \
       curl \
       ca-certificates \
       tar \
       xz-utils \
       unzip \
       libgomp1 \
       util-linux \
       libvulkan1 \
       mesa-vulkan-drivers \
  && rm -rf /var/lib/apt/lists/*
# libvulkan1 + mesa-vulkan-drivers let the Linux Vulkan llama-server build
# load NVIDIA / AMD Vulkan ICDs at runtime. On NVIDIA hosts the ICD is
# mounted by nvidia-container-toolkit when NVIDIA_DRIVER_CAPABILITIES
# includes `graphics`. mesa-vulkan-drivers covers AMD/Intel iGPU paths.
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 1001 nestjs && useradd --system --uid 1001 --gid 1001 nestjs
# Pre-create the llamacpp data tree with nestjs ownership so brand-new
# named volumes inherit it on first mount (docker copies image-side
# directory contents + ownership into an empty volume). Existing
# volumes that already have root ownership are fixed by the entrypoint.
RUN mkdir -p /var/lib/claw/llamacpp/bin /var/lib/claw/llamacpp/models \
             /var/lib/claw/llamacpp/tmp /var/lib/claw/llamacpp/cache \
  && chown -R nestjs:nestjs /var/lib/claw
COPY --from=builder /app/apps/claw-llamacpp-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/claw-llamacpp-service/package.json ./package.json
COPY --from=builder /app/apps/claw-llamacpp-service/prisma ./prisma
COPY --from=builder /app/apps/claw-llamacpp-service/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/packages /app/packages
COPY scripts/docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
COPY apps/claw-llamacpp-service/docker-entrypoint.prod.sh /app/docker-entrypoint.llamacpp.sh
RUN chmod +x /app/docker-entrypoint.prod.sh /app/docker-entrypoint.llamacpp.sh
# Stay root here — the llamacpp wrapper entrypoint chowns the data volume
# (which docker creates as root) and then exec's runuser to drop to nestjs
# before NestJS boots. See docker-entrypoint.prod.sh for the full rationale.
EXPOSE 4017
CMD ["sh", "/app/docker-entrypoint.llamacpp.sh"]
