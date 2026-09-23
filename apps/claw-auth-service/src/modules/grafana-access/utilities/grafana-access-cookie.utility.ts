import {
  GRAFANA_ACCESS_COOKIE_NAME,
  GRAFANA_ACCESS_COOKIE_PATH,
} from '../constants/grafana-access.constants';
import type { GrafanaAccessCookieOptions } from '../types/grafana-access.types';

/**
 * The Grafana access cookie's value from a raw `Cookie` header, or null.
 *
 * Hand-parsed because this service has no cookie middleware and needs exactly
 * one cookie from exactly one route. The header also carries every other
 * cookie the browser holds for the path — the value of those is never read,
 * returned or logged.
 */
export function readGrafanaAccessCookie(cookieHeader: string | undefined): string | null {
  if (cookieHeader === undefined || cookieHeader.length === 0) {
    return null;
  }
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    if (part.slice(0, separator).trim() === GRAFANA_ACCESS_COOKIE_NAME) {
      const value = part.slice(separator + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

/**
 * httpOnly so page script cannot read it; Secure because the site is HTTPS
 * only; SameSite=Lax so a link from elsewhere still opens Grafana but a
 * cross-site POST cannot ride on it; Path=/grafana so no other route ever
 * receives it. `maxAge` is milliseconds, as Express expects.
 */
export function grafanaAccessCookieOptions(maxAgeSeconds: number): GrafanaAccessCookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: GRAFANA_ACCESS_COOKIE_PATH,
    maxAge: maxAgeSeconds * 1000,
  };
}
