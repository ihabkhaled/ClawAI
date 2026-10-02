import { isIP } from 'node:net';

import { IPV4_MAPPED_IPV6_PREFIX, THROTTLE_REAL_IP_HEADER } from './throttle-tracker.constants';
import type { ClientAddress } from './throttle-tracker.types';
import { isTrustedProxyAddress } from './trusted-proxy';

/**
 * A literal IP address, trimmed and with an IPv4-mapped IPv6 prefix removed,
 * or null when the value is not an address at all.
 */
export function normalizeIpAddress(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  const unmapped = trimmed.startsWith(IPV4_MAPPED_IPV6_PREFIX)
    ? trimmed.slice(IPV4_MAPPED_IPV6_PREFIX.length)
    : trimmed;
  return isIP(unmapped) === 0 ? null : unmapped;
}

/**
 * The address a request is counted against — the ONE rule every limiter
 * shares (global throttler, auth-service and agent-service sign-in limits).
 *
 * X-Real-IP is believed only when the socket peer is a trusted proxy
 * (`isTrustedProxyAddress`): nginx overwrites that header, anyone else could
 * have typed it. Otherwise the peer itself is the subject. An unknown peer is
 * never trusted. X-Forwarded-For is never read: its left-most entry is
 * client-controlled. Null when nothing identifies the caller.
 */
export async function resolveClientAddress(
  headers: Record<string, string | string[] | undefined>,
  socketAddress: string | undefined,
): Promise<ClientAddress | null> {
  const peer = normalizeIpAddress(socketAddress);
  if (peer === null) {
    return null;
  }
  const { [THROTTLE_REAL_IP_HEADER]: raw } = headers;
  const realIp = normalizeIpAddress(Array.isArray(raw) ? raw[0] : raw);
  const viaProxy = realIp !== null && (await isTrustedProxyAddress(peer));
  return viaProxy ? { address: realIp, viaProxy } : { address: peer, viaProxy };
}
