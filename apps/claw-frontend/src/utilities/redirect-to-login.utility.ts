import { isPublicPath } from '@/utilities/route-visibility.utility';

/**
 * A public page (a Thread, the Board) reads its data for guests too, so a dead session is dropped
 * quietly and the page stays as a guest view. Only a page that needs login redirects.
 */
export function redirectToLoginUnlessPublicPage(): void {
  if (typeof window === 'undefined' || isPublicPath(window.location.pathname)) {
    return;
  }
  window.location.href = '/login';
}
