import {
  EXPIRY_PATTERN,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '../constants/token-session.constants';

/**
 * A jsonwebtoken duration ('15m', '1h', '30s') in seconds, or `fallback`.
 *
 * Used for the token lifetimes and, since TD-033, for how long a revoked
 * session stays in the revocation cache: exactly as long as an access token
 * signed the moment before the revocation can still be presented.
 */
export function expirySeconds(expiry: string, fallback: number): number {
  const match = EXPIRY_PATTERN.exec(expiry);
  if (!match) {
    return fallback;
  }

  const value = Number.parseInt(match[1] ?? '', 10);
  switch (match[2]) {
    case 'd':
      return value * SECONDS_PER_DAY;
    case 'h':
      return value * SECONDS_PER_HOUR;
    case 'm':
      return value * SECONDS_PER_MINUTE;
    case 's':
      return value;
    default:
      return fallback;
  }
}
