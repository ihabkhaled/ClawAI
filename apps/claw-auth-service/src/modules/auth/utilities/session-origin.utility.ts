import { clipUserAgent, parseUserAgent } from '../../../common/utilities/user-agent.utility';
import { resolveRegistrationOrigin } from '../../users/service.utilities/registration-origin.utility';
import type { Session } from '../../../generated/prisma';
import type { RequestHeaders, SessionOrigin } from '../types/session.types';

/**
 * Where a login came from. The address is the one the platform's single
 * trusted-proxy rule resolves (X-Real-IP from nginx, never X-Forwarded-For) and the
 * country is looked up offline, exactly as for registration (ADR-200). The user
 * agent is clipped, control characters removed, then parsed for display (ADR-204).
 */
export async function resolveSessionOrigin(
  headers: RequestHeaders,
  socketAddress: string | undefined,
): Promise<SessionOrigin> {
  const origin = await resolveRegistrationOrigin(headers, socketAddress);
  const rawAgent = headers['user-agent'];
  const userAgent = clipUserAgent(Array.isArray(rawAgent) ? rawAgent[0] : rawAgent);
  const parsed = parseUserAgent(userAgent);
  return {
    ipAddress: origin.ip,
    countryCode: origin.countryCode,
    userAgent,
    os: parsed.os,
    browser: parsed.browser,
    deviceKind: userAgent === null ? null : parsed.deviceKind,
  };
}

/** The origin columns of a session row: what a new row of the same family copies. */
export function originOf(session: Session): SessionOrigin {
  return {
    ipAddress: session.ipAddress,
    countryCode: session.countryCode,
    userAgent: session.userAgent,
    os: session.os,
    browser: session.browser,
    deviceKind: session.deviceKind,
  };
}
