import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check for auth token in cookies or we rely on client-side auth guard
  // Since we use Zustand with localStorage (client-side), middleware provides
  // a lightweight check via a cookie that gets set on login
  const authToken = request.cookies.get("claw-auth-token")?.value;

  if (!authToken) {
    // Allow the request through — the client-side auth guard will handle
    // the redirect if needed. This avoids SSR/localStorage mismatch issues.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next (static files)
     * - favicon, images, assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
