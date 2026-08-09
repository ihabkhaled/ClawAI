import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  LOCALE_NEUTRAL_PREFIXES,
  LOCALE_PREFERENCE_COOKIE,
  LOCALE_REQUEST_HEADER,
} from '@/constants/locale-routing.constants';
import { getAdSenseConfig } from '@/lib/adsense/adsense-config';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import {
  buildContentSecurityPolicy,
  generateCspNonce,
} from '@/lib/security/content-security-policy';
import {
  isSupportedLocale,
  localisePath,
  parseLocaleFromPathname,
  stripLocaleFromPathname,
} from '@/utilities/locale.utility';
import { isPublicPath } from '@/utilities/route-visibility.utility';

const PUBLIC_AUTH_PATHS = ['/login', '/register'];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const locale = parseLocaleFromPathname(pathname);
  const isLocaleNeutral = LOCALE_NEUTRAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const apparentLocale = /^\/([A-Za-z]{2})(?:\/|$)/u.exec(pathname)?.[1];

  if (
    apparentLocale !== undefined &&
    isSupportedLocale(apparentLocale) &&
    apparentLocale !== apparentLocale.toLowerCase()
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${apparentLocale.toLowerCase()}${pathname.slice(3)}`;
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (
    locale === null &&
    apparentLocale === undefined &&
    pathname !== '/' &&
    !isLocaleNeutral &&
    (request.method === 'GET' || request.method === 'HEAD')
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = localisePath(pathname, DEFAULT_LOCALE);
    return NextResponse.redirect(redirectUrl, 308);
  }

  const applicationPath = locale === null ? pathname : stripLocaleFromPathname(pathname);
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some(
    (path) => applicationPath === path || applicationPath.startsWith(`${path}/`),
  );

  // Per-request nonce authorises the inline theme-init script and lets Next
  // nonce its own hydration scripts, so script-src can stay strict (no
  // 'unsafe-inline'). The nonce rides on a request header the root layout
  // reads via next/headers.
  const nonce = generateCspNonce();
  const adsense = getAdSenseConfig();
  const adsenseEnabled = adsense.isConfigured && (adsense.reviewMode || adsense.servingEnabled);
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV !== 'production',
    adsenseEnabled,
    upgradeInsecureRequests: request.nextUrl.protocol === 'https:',
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  const requestLocale = locale ?? (pathname === '/' ? DEFAULT_LOCALE : null);
  if (requestLocale !== null) {
    requestHeaders.set(LOCALE_REQUEST_HEADER, requestLocale);
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = applicationPath;
  const response =
    locale === null
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  if (locale !== null) {
    response.cookies.set(LOCALE_PREFERENCE_COOKIE, locale, {
      httpOnly: false,
      maxAge: 31_536_000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  // Enforce non-indexability at the response-header level for every path
  // that is not an explicitly registered public page. This is the backstop
  // for `metadata.robots` exports (which don't cover non-HTML responses and
  // can be omitted by mistake on a new route) — never rely on robots.txt or
  // metadata exports alone. Unknown/unregistered routes fall through to
  // noindex here by construction (isPublicPath defaults to false).
  if (!isPublicPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  if (isPublicAuthPath) {
    return response;
  }

  // Portal routes: rely on the client-side auth guard rather than gating
  // here — Zustand + localStorage state isn't available during SSR/edge
  // middleware, so a missing `claw-auth-token` marker cookie does not by
  // itself mean the visitor is unauthenticated (see Phase D for the planned
  // httpOnly-cookie-based session migration that will make this check
  // authoritative).
  return response;
}

export const config = {
  matcher: [
    '/:locale/feed.xml',
    '/:locale/feeds/:feed.xml',
    /*
     * Match all request paths except:
     * - api routes
     * - _next (static files)
     * - public files with an extension (images, fonts, and other assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|ads\\.txt$|robots\\.txt$|sitemap\\.xml$|.*\\..*$).*)',
  ],
};
