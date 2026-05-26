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
  // The `typescript` package is aliased to `@typescript/native-preview` (TS 7),
  // which ships only the `tsgo` CLI and does NOT expose the TypeScript
  // compiler API that Next.js's built-in type-check step requires. SWC handles
  // the actual TS → JS transpile during `next build`. Run `npm run typecheck`
  // (which calls `tsgo --noEmit`) separately for type safety.
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint's `@typescript-eslint/parser` also requires the TypeScript
  // compiler API. Skip Next's build-time lint pass; run `npm run lint`
  // separately when needed (it currently falls back to the root TS install).
  eslint: {
    ignoreDuringBuilds: true,
  },
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
