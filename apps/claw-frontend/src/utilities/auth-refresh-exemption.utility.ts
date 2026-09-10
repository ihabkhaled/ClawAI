import { AUTH_REFRESH_EXEMPT_PATHS } from '@/constants';

/**
 * Whether a request URL is allowed to trigger the token-refresh flow.
 *
 * A shared predicate rather than an inline `.some()` in the interceptor, so the
 * behaviour can be tested at the seam that decides it. A test that re-derives
 * the check from the constant proves only the constant's contents; it stays
 * green if the interceptor stops consulting it at all.
 */
export function isAuthRefreshExemptPath(url: string): boolean {
  return AUTH_REFRESH_EXEMPT_PATHS.some((exempt) => url.includes(exempt));
}
