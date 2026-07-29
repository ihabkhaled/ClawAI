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
  // Next.js dev server (turbopack) rejects HMR WebSocket connections
  // whose Host header isn't an explicitly trusted dev origin. Without
  // this list, `wss://<host>/_next/webpack-hmr` fails repeatedly and
  // React hydration can stall waiting for HMR handshake on the first
  // navigation, producing an "infinite loading" UX.
  // localhost stays in the list so dev access via either host works.
  allowedDevOrigins: devOrigins,
  // The `typescript` dependency is aliased to `@typescript/native-preview`
  // (tsgo, TS 7), which ships the tsgo CLI but does NOT expose the TypeScript
  // compiler API Next's built-in type-check needs. SWC handles the TS → JS
  // transpile during the build; `npm run typecheck` (tsgo --noEmit) enforces
  // type safety separately, so we skip Next's type-check here.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Vercel restores .next/cache between deployments. Keep production build
    // caching opt-in to Vercel so local builds retain their current behavior.
    turbopackFileSystemCacheForBuild: process.env.VERCEL === '1',
  },
  // NOTE: Next 16 removed the `eslint` config key and the built-in `next lint`
  // pass, so there is no eslint block here. Linting runs via `npm run lint`.
  // On Vercel there is no nginx, so the reverse-proxy route map lives here.
  // Each destination comes from a *_SERVICE_URL environment variable written by
  // scripts/vercel/resolve-service-urls.mjs — never a hardcoded deployment URL.
  // A service with no URL set contributes no rewrite, which surfaces as a clean
  // 404 from Next rather than a proxy attempt against `undefined`.
  // Locally these variables are unset and the browser talks to nginx as before.
  async rewrites() {
    const routes = [
      ['AUTH_SERVICE_URL', ['auth', 'users', 'admin']],
      ['CHAT_SERVICE_URL', ['chat-threads', 'chat-messages']],
      ['CONNECTOR_SERVICE_URL', ['connectors']],
      ['ROUTING_SERVICE_URL', ['routing']],
      ['MEMORY_SERVICE_URL', ['memories', 'context-packs']],
      ['FILE_SERVICE_URL', ['files']],
      ['AUDIT_SERVICE_URL', ['audits', 'usage']],
      ['CLIENT_LOGS_SERVICE_URL', ['client-logs']],
      ['SERVER_LOGS_SERVICE_URL', ['server-logs']],
      ['IMAGE_SERVICE_URL', ['images']],
      ['FILE_GENERATION_SERVICE_URL', ['file-generations']],
      ['WORKSPACE_SERVICE_URL', ['workspace']],
      ['AGENT_SERVICE_URL', ['agent']],
      ['RESEARCH_SERVICE_URL', ['research']],
      ['HEALTH_SERVICE_URL', ['health']],
    ];

    const rewrites = [];
    for (const [variable, prefixes] of routes) {
      const base = (process.env[variable] || '').replace(/\/$/, '');
      if (base === '') continue;
      for (const prefix of prefixes) {
        rewrites.push({
          source: `/api/v1/${prefix}/:path*`,
          destination: `${base}/api/v1/${prefix}/:path*`,
        });
        rewrites.push({
          source: `/api/v1/${prefix}`,
          destination: `${base}/api/v1/${prefix}`,
        });
      }
    }
    return rewrites;
  },

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
};

export default nextConfig;
