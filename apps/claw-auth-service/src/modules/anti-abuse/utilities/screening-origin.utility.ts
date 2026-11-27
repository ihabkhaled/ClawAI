import { clipUserAgent } from '../../../common/utilities/user-agent.utility';
import { resolveRegistrationOrigin } from '../../users/service.utilities/registration-origin.utility';
import type { RequestHeaders, SessionOrigin } from '../../auth/types/session.types';
import type { ScreeningOrigin } from '../types/device.types';

/**
 * Where a sign-up came from: the trusted-proxy client address (X-Real-IP from
 * nginx only, never X-Forwarded-For), its offline country, and the clipped user
 * agent. Personal data: it reaches the user row and the security event only.
 */
export async function resolveScreeningOrigin(
  headers: RequestHeaders,
  socketAddress: string | undefined,
): Promise<ScreeningOrigin> {
  const origin = await resolveRegistrationOrigin(headers, socketAddress);
  const rawAgent = headers['user-agent'];
  return {
    ip: origin.ip,
    countryCode: origin.countryCode,
    userAgent: clipUserAgent(Array.isArray(rawAgent) ? rawAgent[0] : rawAgent),
  };
}

/** The same three facts from a login's session origin; all null when it has none. */
export function screeningOriginOf(origin: SessionOrigin | undefined): ScreeningOrigin {
  return {
    ip: origin?.ipAddress ?? null,
    countryCode: origin?.countryCode ?? null,
    userAgent: origin?.userAgent ?? null,
  };
}
