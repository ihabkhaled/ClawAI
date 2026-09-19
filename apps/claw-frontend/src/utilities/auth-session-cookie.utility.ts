import { AUTH_MARKER_COOKIE } from '@/constants/auth.constants';

/**
 * The browser-session marker: a cookie with no expiry, which the browser drops
 * when it closes. It carries no secret, only "a login happened in this browser
 * session".
 */
export function markBrowserSession(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${AUTH_MARKER_COOKIE}=1; path=/; SameSite=Lax; Secure`;
}

export function clearBrowserSessionMarker(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${AUTH_MARKER_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function hasBrowserSessionMarker(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.cookie
    .split(';')
    .some((part) => part.trim().startsWith(`${AUTH_MARKER_COOKIE}=1`));
}
