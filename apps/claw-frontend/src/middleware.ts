import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isPublicPath } from '@/utilities/route-visibility.utility';

const PUBLIC_AUTH_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const response = NextResponse.next();

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
    /*
     * Match all request paths except:
     * - api routes
     * - _next (static files)
     * - favicon, images, assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)',
  ],
};
