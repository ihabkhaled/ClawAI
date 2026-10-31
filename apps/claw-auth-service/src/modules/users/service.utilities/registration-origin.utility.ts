import { isIP } from 'node:net';
import { normalizeIpAddress, resolveClientAddress } from '@claw/shared-auth';
import { lookupCountryCode } from '../../../common/utilities/geoip.utility';
import {
  EMPTY_REGISTRATION_ORIGIN,
  MAX_IP_ADDRESS_LENGTH,
} from '../constants/user-admin.constants';
import { type RegistrationOrigin } from '../types/user-admin.types';

/** False for loopback, private, link-local, CGNAT, multicast and unspecified ranges: asking where those are is meaningless. */
export function isPublicRoutableIp(candidate: string): boolean {
  const version = isIP(candidate);
  if (version === 4) {
    const [first = 0, second = 0] = candidate.split('.').map(Number);
    if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
    if (first === 172 && second >= 16 && second <= 31) return false;
    if (first === 192 && second === 168) return false;
    if (first === 100 && second >= 64 && second <= 127) return false;
    if (first === 169 && second === 254) return false;
    return true;
  }
  if (version === 6) {
    const lowered = candidate.toLowerCase();
    const reserved =
      lowered === '::' ||
      lowered === '::1' ||
      /^f[cd]/.test(lowered) ||
      /^fe[89ab]/.test(lowered) ||
      lowered.startsWith('ff');
    return !reserved;
  }
  return false;
}

/**
 * Where a sign-up came from. The address is the one the platform's single
 * trusted-proxy rule resolves (X-Real-IP from nginx, else the socket peer;
 * X-Forwarded-For is never read, its left end is client-typed). The country is
 * looked up OFFLINE, only for a public address; the address never leaves the
 * process.
 */
export async function resolveRegistrationOrigin(
  headers: Record<string, string | string[] | undefined>,
  socketAddress: string | undefined,
): Promise<RegistrationOrigin> {
  const client = await resolveClientAddress(headers, socketAddress);
  const ip = client === null ? null : normalizeIpAddress(client.address);
  if (ip === null || ip.length > MAX_IP_ADDRESS_LENGTH) return EMPTY_REGISTRATION_ORIGIN;
  return { ip, countryCode: isPublicRoutableIp(ip) ? lookupCountryCode(ip) : null };
}
