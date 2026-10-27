import { stripLocaleFromPathname, withLocaleOf } from '@/utilities/locale.utility';
import { isThreadSlugSegment } from '@/utilities/thread-slug.utility';

/**
 * Pages under /threads that need an account. Everything else one segment deep is a public Thread
 * (its slug) or the public Board and discovery pages.
 */
const PRIVATE_THREAD_SEGMENTS: ReadonlySet<string> = new Set(['review', 'my', 'new', 'settings']);
const PUBLIC_THREAD_PAGES: ReadonlySet<string> = new Set(['board', 'discover']);

/**
 * Whether the page shows public Threads content to guests. Deliberately NOT `isPublicPath`: that
 * function reads the whole marketing content registry (megabytes of prose in 13 languages), and
 * this file is imported by the shared HTTP client, so every page would ship that registry
 * (the Lighthouse "missing source map for a large script" failure of 2026-10-27).
 */
export function isPublicThreadsPage(pathname: string): boolean {
  const segments = stripLocaleFromPathname(pathname).split('/').filter(Boolean);
  const [first, second] = segments;
  if (first !== 'threads' || second === undefined || segments.length !== 2) {
    return false;
  }
  if (PUBLIC_THREAD_PAGES.has(second)) {
    return true;
  }
  return !PRIVATE_THREAD_SEGMENTS.has(second) && isThreadSlugSegment(second);
}

/**
 * A public Threads page reads its data for guests too, so a dead session is dropped quietly and the
 * page stays as a guest view. Every other page redirects to the sign-in page.
 */
export function redirectToLoginUnlessPublicPage(): void {
  if (typeof window === 'undefined' || isPublicThreadsPage(window.location.pathname)) {
    return;
  }
  window.location.href = withLocaleOf('/login', window.location.pathname);
}
