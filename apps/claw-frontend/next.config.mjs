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
  // NOTE: Next 16 removed the `eslint` config key and the built-in `next lint`
  // pass, so there is no eslint block here. Linting runs via `npm run lint`.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
