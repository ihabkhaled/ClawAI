# Frontend Security Headers & Content-Security-Policy

The Next.js frontend ships a strict, per-request **Content-Security-Policy**
plus a set of static hardening headers. This document explains where each
header is set, why, and how to change the policy safely.

## Where headers are set

| Header                                    | Set in                            | Why there                                                                     |
| ----------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `Content-Security-Policy`                 | `src/middleware.ts` (per request) | Carries a per-request nonce; must vary per response                           |
| `Strict-Transport-Security`               | `next.config.mjs` `headers()`     | Static; whole stack is HTTPS (mkcert / real certs)                            |
| `X-Content-Type-Options: nosniff`         | `next.config.mjs`                 | Static                                                                        |
| `X-Frame-Options: DENY`                   | `next.config.mjs`                 | Static (CSP `frame-ancestors 'none'` is the modern equivalent; both are sent) |
| `X-XSS-Protection: 0`                     | `next.config.mjs`                 | Legacy auditor disabled per OWASP; CSP is the real defence                    |
| `Referrer-Policy`                         | `next.config.mjs`                 | Static                                                                        |
| `Permissions-Policy`                      | `next.config.mjs`                 | Static; also disables `browsing-topics`                                       |
| `Cross-Origin-Opener-Policy: same-origin` | `next.config.mjs`                 | Static                                                                        |
| `X-Robots-Tag`                            | `src/middleware.ts`               | Non-public paths tagged `noindex`                                             |

## The CSP nonce flow

1. `middleware.ts` calls `generateCspNonce()` (Web Crypto, Edge-safe) once per request.
2. It builds the policy with `buildContentSecurityPolicy()` and sets the CSP on
   **both** the forwarded request headers and the response headers, plus an
   `x-nonce` request header.
3. `src/app/layout.tsx` reads `x-nonce` via `next/headers` and applies it to the
   inline theme-init `<script nonce=...>`. Next.js auto-nonces its own hydration
   scripts by reading the CSP from the request header.
4. `'strict-dynamic'` means any script loaded by a nonce-trusted script (the
   Next runtime, the AdSense loader) inherits trust — so we never enumerate
   script hosts.

### Tradeoff: nonce ⇒ dynamic rendering

A unique per-request nonce cannot live in a statically cached HTML file, so
reading it in the root layout opts pages into per-request server rendering
(homepage is `ƒ` in the build output, not `○`). This is the documented,
unavoidable cost of nonce-based CSP and does **not** hurt runtime performance
or Lighthouse — the server render is fast and sits behind nginx. File-based
metadata routes (`robots.txt`, `sitemap.xml`, `opengraph-image`, icons,
manifest) don't use the layout and stay fully static.

## AdSense interaction

`buildContentSecurityPolicy({ adsenseEnabled })` is driven from
`getAdSenseConfig()` in middleware: when AdSense is configured **and**
(review mode **or** serving enabled), `frame-src`, `img-src`, and `connect-src`
are widened to the Google ad hosts. Script hosts are never listed — the
nonce-trusted loader plus `'strict-dynamic'` covers them. With AdSense off
(the default), the strictest policy ships.

## Changing the policy

- Edit only `src/lib/security/content-security-policy.ts`.
- Add a test case to `src/lib/security/__tests__/content-security-policy.test.ts`.
- Never add `'unsafe-inline'` to `script-src`. `style-src 'unsafe-inline'` is
  intentional (Next/Tailwind inline styles) and does not permit script execution.
- Verify in a browser: open DevTools → Console; a broken policy surfaces as
  `Refused to execute inline script` / `Refused to load` errors.
