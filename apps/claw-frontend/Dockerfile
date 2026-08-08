# The frontend is an npm workspace of the monorepo, and its package.json
# depends on @claw/shared-types. Installing from an app-only build context makes
# npm treat that as a public registry package and the install dies on a 404, so
# every stage below works from the repo root — the same reason Dockerfile.dev
# and every service Dockerfile do. Build context is `..` (see
# docker/docker-compose.prod.services.yml).
FROM node:26-alpine AS base
WORKDIR /app

# Install dependencies from the monorepo root so npm resolves @claw/* to the
# local workspaces instead of the public registry.
FROM base AS deps
COPY package.json ./package.json
COPY tools/typescript/ ./tools/typescript/
COPY package-lock.json ./package-lock.json
COPY .npmrc ./.npmrc
COPY packages/ ./packages/
COPY apps/claw-frontend/package.json ./apps/claw-frontend/package.json
# No --legacy-peer-deps. The repository's own .npmrc spells out why: peer
# conflicts here are resolved with npm `overrides` in package.json, because
# legacy-peer-deps silently strips transitive deps from the install tree. It did
# exactly that to this image — `next` never landed in node_modules and the
# production build died with `sh: next: not found` (exit 127), while all 18
# service images, which install without the flag, built fine.
RUN npm install --ignore-scripts

# Build
FROM base AS builder
COPY --from=deps /app /app
COPY apps/claw-frontend/ ./apps/claw-frontend/

# @claw/shared-types resolves through its `main`/`types` fields to dist/, which
# is gitignored, so it has to be compiled before Next traces the imports.
RUN cd /app/packages/shared-types && npm run build \
 && cd /app/packages/shared-entitlements && npm run build

WORKDIR /app/apps/claw-frontend

# NEXT_PUBLIC_* values are INLINED INTO THE CLIENT BUNDLE AT BUILD TIME.
#
# This is the part that catches people: putting one in .env or compose `env_file`
# makes it visible to the Node process at runtime, but the browser never reads
# that — Next replaced `process.env.NEXT_PUBLIC_X` with a literal during
# `npm run build`. If the value was absent then, the literal is `undefined`
# forever, and no amount of restarting the container changes it.
#
# That is exactly how PayPal checkout broke: NEXT_PUBLIC_PAYPAL_CLIENT_ID was
# set in .env and present in `docker exec claw-frontend printenv`, yet the
# client bundle carried `undefined`, so the SDK loader rejected with "PayPal
# client ID is not configured" and the dialog showed "We could not load the
# secure payment form".
#
# So EVERY NEXT_PUBLIC_* the client references must be declared here AND passed
# as a build arg in docker/docker-compose.prod.services.yml. Adding a new one to
# .env alone is not enough — it must be added in both places, and the image
# rebuilt (not restarted) for the change to reach a browser.
#
# These are public by definition: they ship to every visitor in the JS bundle.
# Never pass a secret through this path — PAYPAL_CLIENT_SECRET and friends stay
# server-side, read at runtime by the payment service.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID=
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=${NEXT_PUBLIC_PAYPAL_CLIENT_ID}

ARG NEXT_PUBLIC_ADSENSE_CLIENT_ID=
ENV NEXT_PUBLIC_ADSENSE_CLIENT_ID=${NEXT_PUBLIC_ADSENSE_CLIENT_ID}
ARG NEXT_PUBLIC_ADSENSE_SERVING_ENABLED=
ENV NEXT_PUBLIC_ADSENSE_SERVING_ENABLED=${NEXT_PUBLIC_ADSENSE_SERVING_ENABLED}
ARG NEXT_PUBLIC_ADSENSE_REVIEW_MODE=
ENV NEXT_PUBLIC_ADSENSE_REVIEW_MODE=${NEXT_PUBLIC_ADSENSE_REVIEW_MODE}
ARG NEXT_PUBLIC_ADSENSE_HOME_SLOT=
ENV NEXT_PUBLIC_ADSENSE_HOME_SLOT=${NEXT_PUBLIC_ADSENSE_HOME_SLOT}
ARG NEXT_PUBLIC_ADSENSE_CONTENT_SLOT=
ENV NEXT_PUBLIC_ADSENSE_CONTENT_SLOT=${NEXT_PUBLIC_ADSENSE_CONTENT_SLOT}
ARG NEXT_PUBLIC_ADSENSE_SHARED_CHAT_TOP_SLOT=
ENV NEXT_PUBLIC_ADSENSE_SHARED_CHAT_TOP_SLOT=${NEXT_PUBLIC_ADSENSE_SHARED_CHAT_TOP_SLOT}
ARG NEXT_PUBLIC_ADSENSE_SHARED_CHAT_INLINE_SLOT=
ENV NEXT_PUBLIC_ADSENSE_SHARED_CHAT_INLINE_SLOT=${NEXT_PUBLIC_ADSENSE_SHARED_CHAT_INLINE_SLOT}
ARG NEXT_PUBLIC_ADSENSE_SHARED_CHAT_BOTTOM_SLOT=
ENV NEXT_PUBLIC_ADSENSE_SHARED_CHAT_BOTTOM_SLOT=${NEXT_PUBLIC_ADSENSE_SHARED_CHAT_BOTTOM_SLOT}

ARG NEXT_PUBLIC_SOCIAL_X_URL=
ENV NEXT_PUBLIC_SOCIAL_X_URL=${NEXT_PUBLIC_SOCIAL_X_URL}
ARG NEXT_PUBLIC_SOCIAL_LINKEDIN_URL=
ENV NEXT_PUBLIC_SOCIAL_LINKEDIN_URL=${NEXT_PUBLIC_SOCIAL_LINKEDIN_URL}
ARG NEXT_PUBLIC_SOCIAL_DISCORD_URL=
ENV NEXT_PUBLIC_SOCIAL_DISCORD_URL=${NEXT_PUBLIC_SOCIAL_DISCORD_URL}

ARG NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=
ENV NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=${NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED}

RUN npm run build

# Production
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# `outputFileTracingRoot` in next.config.mjs is the monorepo root, so the
# standalone bundle keeps the workspace layout: node_modules/ at the top and the
# server entrypoint under apps/claw-frontend/.
COPY --from=builder /app/apps/claw-frontend/.next/standalone ./
COPY --from=builder /app/apps/claw-frontend/.next/static ./apps/claw-frontend/.next/static
COPY --from=builder /app/apps/claw-frontend/public ./apps/claw-frontend/public

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/claw-frontend/server.js"]
