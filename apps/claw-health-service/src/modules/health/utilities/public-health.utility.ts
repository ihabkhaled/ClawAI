import { UserRole } from '@claw/shared-types';
import { verifyUserAccessToken } from '@claw/shared-utilities';

import { BEARER_SCHEME } from '../constants/health.constants';
import { type AggregatedHealth, type PublicAggregatedHealth } from '../types/health.types';

/**
 * Strips an aggregated health report down to what an anonymous caller may see:
 * overall status, per-service up/down and counts. Error text (raw DNS and
 * connection errors naming internal hosts), timings and the dependency list
 * are dropped.
 */
export function toPublicHealth(health: AggregatedHealth): PublicAggregatedHealth {
  return {
    status: health.status,
    timestamp: health.timestamp,
    services: health.services.map((service) => ({
      name: service.name,
      status: service.status,
      responseTimeMs: null,
      error: null,
    })),
    summary: health.summary,
  };
}

/**
 * True only for a valid, unexpired admin access token in the Authorization
 * header. Never throws: anything else (missing, malformed, wrong role, no
 * secret configured) is simply "not an admin" and gets the reduced body.
 */
export function isAdminAuthorization(
  authorization: string | undefined,
  secret: string | undefined,
): boolean {
  if (!authorization || !secret) {
    return false;
  }
  const [scheme, token, ...rest] = authorization.split(' ');
  if (scheme !== BEARER_SCHEME || !token || rest.length > 0) {
    return false;
  }
  try {
    return verifyUserAccessToken(token, secret).role === UserRole.ADMIN;
  } catch {
    return false;
  }
}
