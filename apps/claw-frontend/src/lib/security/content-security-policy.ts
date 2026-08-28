import {
  ANALYTICS_CONNECT_HOSTS,
  ANALYTICS_FRAME_HOSTS,
  ANALYTICS_IMG_HOSTS,
  GTM_HOST,
} from '@/constants/analytics.constants';
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
  // Same beacon as in GOOGLE_AD_CONNECT_HOSTS: it is reached both by fetch and
  // from an invisible iframe, and naming it in only one of the two directives
  // leaves it blocked half the time.
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
];

const GOOGLE_AD_CONNECT_HOSTS: ReadonlyArray<string> = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://www.google-analytics.com',
  // AdSense's invalid-traffic ("sodar") beacon. Observed being blocked in the
  // browser console with the ad script otherwise working, because a blocked
  // connect-src fails silently from the page's point of view: ads still render,
  // so nothing looks wrong, while the signal Google uses to tell real traffic
  // from fraudulent traffic never arrives. That signal protects the ad account,
  // which is the same thing the image moderation exists to protect.
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
];

const VSCODE_LOOPBACK_CONNECT_HOSTS: ReadonlyArray<string> = ['http://127.0.0.1:*'];

// Only needed in DEVELOPMENT. Production script-src uses 'strict-dynamic',
// under which host allowlists are ignored entirely and trust flows from the
// nonce on the loader tag instead.
const GOOGLE_AD_SCRIPT_HOSTS: ReadonlyArray<string> = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  // The invalid-traffic beacon is fetched AND loaded as a script
  // (sodar/sodar2.js). Production does not need it named here — strict-dynamic
  // lets the nonce-trusted AdSense loader vouch for what it inserts — but
  // development has no strict-dynamic, so without this the console fills with
  // blocked-script errors that look like a broken ad integration.
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
];

const GOOGLE_AD_IMG_HOSTS: ReadonlyArray<string> = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  // The invalid-traffic beacon again. It reports over FOUR directives — an
  // image pixel (/pagead/sodar?...), a script (sodar2.js), a fetch, and an
  // iframe — and each one was found only after the previous was unblocked,
  // because the browser reports whichever it reaches first. Adding a Google ad
  // host to one directive is rarely finished.
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
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
        // Development has no 'strict-dynamic', so the GTM loader is not covered
        // by nonce-inherited trust and must be named explicitly — otherwise the
        // tag renders and the browser blocks it, which looks exactly like GTM
        // not being installed.
        GTM_HOST,
        ...(adsenseEnabled ? GOOGLE_AD_SCRIPT_HOSTS : []),
      ]
    : [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        // Google supports AdSense under strict CSP with these fallback tokens.
        // CSP3 browsers ignore them when nonce + strict-dynamic are present;
        // older browsers use them to keep dynamically loaded ad code working.
        ...(adsenseEnabled ? ["'unsafe-inline'", "'unsafe-eval'", 'https:', 'http:'] : []),
      ];

  const connectSrc = [
    "'self'",
    // GTM and GA4 beacon their payloads to these; strict-dynamic covers script
    // loading only, so a measurement send is blocked unless named here.
    ...ANALYTICS_CONNECT_HOSTS,
    ...VSCODE_LOOPBACK_CONNECT_HOSTS,
    ...(isDev ? ['ws:', 'wss:'] : []),
    ...(adsenseEnabled ? GOOGLE_AD_CONNECT_HOSTS : []),
    ...PAYMOB_CHECKOUT_HOSTS,
    ...PAYPAL_CHECKOUT_HOSTS,
  ];

  const frameSrc = [
    "'self'",
    // The GTM <noscript> fallback is an iframe.
    ...ANALYTICS_FRAME_HOSTS,
    ...PAYMOB_CHECKOUT_HOSTS,
    ...PAYPAL_CHECKOUT_HOSTS,
    ...(adsenseEnabled ? GOOGLE_AD_FRAME_HOSTS : []),
  ];

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    // Measurement pixels are images as far as the policy is concerned.
    ...ANALYTICS_IMG_HOSTS,
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
