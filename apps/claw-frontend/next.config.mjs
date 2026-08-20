import path from 'node:path';

/** @type {import('next').NextConfig} */
// The user-configured hostname (claw.local by default). Wildcard form is only
// added when the value looks like a DNS name (skipped for bare IPs).
const clawHost = process.env.CLAW_HOSTNAME || 'claw.local';
const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(clawHost);
const devOrigins = ['localhost', '127.0.0.1', clawHost];
if (!isIpv4) devOrigins.push(`*.${clawHost}`);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  // This app is one workspace of a monorepo and imports @claw/shared-types from
  // packages/, which lives above the app directory. Pinning the tracing root to
  // the repo root keeps those files in the standalone bundle and — more
  // importantly — makes the bundle layout deterministic rather than inferred:
  // the production Dockerfile's runner stage copies from and starts
  // apps/claw-frontend/server.js on the strength of this value.
  outputFileTracingRoot: path.join(import.meta.dirname, '..', '..'),
  // Next.js dev server (turbopack) rejects HMR WebSocket connections
  // whose Host header isn't an explicitly trusted dev origin. Without
  // this list, `wss://<host>/_next/webpack-hmr` fails repeatedly and
  // React hydration can stall waiting for HMR handshake on the first
  // navigation, producing an "infinite loading" UX.
  // localhost stays in the list so dev access via either host works.
  allowedDevOrigins: devOrigins,
  // The `typescript` dependency is aliased to `the TypeScript 7 npm compiler`
  // (the TypeScript 7 compiler, TS 7), which ships the the TypeScript 7 compiler CLI but does NOT expose the TypeScript
  // compiler API Next's built-in type-check needs. SWC handles the TS → JS
  // transpile during the build; `npm run typecheck` (the TypeScript 7 compiler --noEmit) enforces
  // type safety separately, so we skip Next's type-check here.
  typescript: {
    ignoreBuildErrors: true,
  },
  // NOTE: Next 16 removed the `eslint` config key and the built-in `next lint`
  // pass, so there is no eslint block here. Linting runs via `npm run lint`.
  // All deployments (local dev and self-hosted production) run behind nginx,
  // which proxies /api/v1/* to each backend service — see
  // infra/nginx/nginx.conf. This app never proxies API routes itself.

  // Static, request-independent security headers. The per-request
  // Content-Security-Policy (with its nonce) is set in middleware.ts because
  // it must vary per response. HSTS is safe here: the whole stack is HTTPS
  // (mkcert locally, real certs in prod) — see docs/08-runtime-devops/tls-setup.md.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Modern browsers dropped the legacy XSS auditor; `0` disables it
            // explicitly, which is the current OWASP guidance (the old filter
            // could itself be abused). CSP is the real XSS defence.
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/:locale/billing',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      {
        source: '/:locale/billing/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      {
        source: '/billing',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      {
        source: '/billing/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const devApiProxyTarget = process.env.CLAW_DEV_API_PROXY_TARGET?.replace(/\/$/, '');
    if (!devApiProxyTarget) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${devApiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
