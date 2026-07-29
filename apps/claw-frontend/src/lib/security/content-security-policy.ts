import type { ContentSecurityPolicyOptions } from '@/types/security.types';

// Google ad domains that the browser must be allowed to frame / fetch from
// when the AdSense loader is (or may be) injected. script-src relies on
// 'strict-dynamic': once the nonce-trusted loader runs, the scripts it
// inserts inherit trust, so we do NOT list script hosts here. frame-src,
// img-src, and connect-src are NOT covered by strict-dynamic and must name
// the hosts explicitly. These are only added when AdSense can actually load.
const GOOGLE_AD_FRAME_HOSTS: ReadonlyArray<string> = [
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://www.google.com',
];

const GOOGLE_AD_CONNECT_HOSTS: ReadonlyArray<string> = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://www.google-analytics.com',
];

// Only needed in DEVELOPMENT. Production script-src uses 'strict-dynamic',
// under which host allowlists are ignored entirely and trust flows from the
// nonce on the loader tag instead.
const GOOGLE_AD_SCRIPT_HOSTS: ReadonlyArray<string> = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
];

const GOOGLE_AD_IMG_HOSTS: ReadonlyArray<string> = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
];

const PAYMOB_SCRIPT_HOST = 'https://cdn.jsdelivr.net';
const PAYMOB_CHECKOUT_HOSTS: ReadonlyArray<string> = [
  'https://accept.paymob.com',
  'https://eg.checkout.paymob.com',
];
const PAYPAL_SCRIPT_HOST = 'https://www.paypal.com';
const PAYPAL_CHECKOUT_HOSTS: ReadonlyArray<string> = [
  'https://www.paypal.com',
  'https://www.paypalobjects.com',
  'https://*.paypal.com',
];

// Generates a fresh, cryptographically-random nonce for a single response.
// Uses Web Crypto so it runs on both the Edge (middleware) and Node runtimes.
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// Builds the Content-Security-Policy header value.
//
// - Production script-src is strict: only 'self' + the per-request nonce,
//   with 'strict-dynamic' so framework/ad scripts loaded by trusted code
//   inherit trust. No 'unsafe-inline', no host allowlist for scripts.
// - Development adds 'unsafe-eval' (React Refresh / Turbopack HMR) and
//   ws:/wss: connect sources (HMR socket).
// - style-src keeps 'unsafe-inline' because Next.js and Tailwind inject
//   inline <style> blocks that cannot carry a nonce reliably; this is the
//   documented, accepted relaxation and does not enable script execution.
export function buildContentSecurityPolicy(options: ContentSecurityPolicyOptions): string {
  const { nonce, isDev, adsenseEnabled, upgradeInsecureRequests } = options;

  // In development we must NOT emit a nonce or 'strict-dynamic': a CSP3 browser
  // ignores 'unsafe-inline' the moment a nonce/hash is present, which would
  // block Next.js/Turbopack HMR + React Refresh inline scripts. Dev therefore
  // gets a deliberately relaxed script-src. Production is strict: nonce +
  // 'strict-dynamic', no 'unsafe-inline', no 'unsafe-eval'.
  // Development has no 'strict-dynamic', so the AdSense loader is NOT covered by
  // nonce-inherited trust and 'self' does not match a Google host — the script
  // tag renders but the browser blocks it, which looks exactly like AdSense
  // "not being implemented". Dev therefore names the loader host explicitly.
  // Production needs no host here: 'strict-dynamic' means the nonce-carrying
  // loader is trusted and everything it inserts inherits that trust.
  const scriptSrc = isDev
    ? [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        PAYMOB_SCRIPT_HOST,
        PAYPAL_SCRIPT_HOST,
        ...(adsenseEnabled ? GOOGLE_AD_SCRIPT_HOSTS : []),
      ]
    : ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];

  const connectSrc = [
    "'self'",
    ...(isDev ? ['ws:', 'wss:'] : []),
    ...(adsenseEnabled ? GOOGLE_AD_CONNECT_HOSTS : []),
    ...PAYMOB_CHECKOUT_HOSTS,
    ...PAYPAL_CHECKOUT_HOSTS,
  ];

  const frameSrc = [
    "'self'",
    ...PAYMOB_CHECKOUT_HOSTS,
    ...PAYPAL_CHECKOUT_HOSTS,
    ...(adsenseEnabled ? GOOGLE_AD_FRAME_HOSTS : []),
  ];

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    ...PAYMOB_CHECKOUT_HOSTS,
    ...PAYPAL_CHECKOUT_HOSTS,
    ...(adsenseEnabled ? GOOGLE_AD_IMG_HOSTS : []),
  ];

  const directives: ReadonlyArray<string> = [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgSrc.join(' ')}`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc.join(' ')}`,
    `frame-src ${frameSrc.join(' ')}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
    ...(!isDev && upgradeInsecureRequests ? ['upgrade-insecure-requests'] : []),
  ];

  return directives.join('; ');
}
