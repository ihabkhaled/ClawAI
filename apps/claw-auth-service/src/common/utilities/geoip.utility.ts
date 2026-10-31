import geoip from 'geoip-country';
import { COUNTRY_CODE_PATTERN } from '../constants/geoip.constants';

/**
 * Offline IP-to-country lookup (bundled MaxMind GeoLite2 country data through
 * `geoip-country`). No network call, so a user's address is never sent to a
 * third party. Returns an upper-case ISO 3166-1 alpha-2 code, or null when the
 * address is unknown. Wrapped here so no service imports the library directly.
 */
export function lookupCountryCode(ip: string): string | null {
  try {
    const code = geoip.lookup(ip)?.country;
    return typeof code === 'string' && COUNTRY_CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}
