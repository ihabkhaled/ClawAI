/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
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
