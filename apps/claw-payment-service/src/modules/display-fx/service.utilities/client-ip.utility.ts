import { createHash } from 'node:crypto';

import { TRUSTED_CLIENT_IP_HEADER } from '../constants/display-fx.constants';

// Deriving a client address that is actually trustworthy.
//
// `X-Forwarded-For` is NOT usable here. nginx sets it with
// `$proxy_add_x_forwarded_for`, which APPENDS the real address to whatever the
// client sent — so its left-most entry is attacker-controlled, forever, by
// design. `X-Real-IP` is set to `$remote_addr` and therefore overwritten on
// every request, which is what makes it the only header worth reading.
export function resolveTrustedClientIp(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const raw = headers[TRUSTED_CLIENT_IP_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) {
    return null;
  }
  const candidate = value.trim();
  return isPublicRoutableIp(candidate) ? candidate : null;
}

// A private, loopback or link-local address means local development, a health
// check, or traffic that never crossed the internet. Asking a geo API where
// 172.18.0.4 is would spend a request to be told nothing.
export function isPublicRoutableIp(candidate: string): boolean {
  if (!isIpv4(candidate) && !isIpv6(candidate)) {
    return false;
  }
  if (isIpv4(candidate)) {
    const octets = candidate.split('.').map(Number);
    const first = octets[0] ?? 0;
    const second = octets[1] ?? 0;
    if (first === 10 || first === 127 || first === 0) {
      return false;
    }
    if (first === 172 && second >= 16 && second <= 31) {
      return false;
    }
    if (first === 192 && second === 168) {
      return false;
    }
    // Carrier-grade NAT and link-local.
    if (first === 100 && second >= 64 && second <= 127) {
      return false;
    }
    if (first === 169 && second === 254) {
      return false;
    }
    return true;
  }
  const lowered = candidate.toLowerCase();
  // ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local.
  return !(lowered === '::1' || /^f[cd]/.test(lowered) || lowered.startsWith('fe80'));
}

function isIpv4(candidate: string): boolean {
  const parts = candidate.split('.');
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isIpv6(candidate: string): boolean {
  return candidate.includes(':') && /^[0-9a-f:]{2,45}$/i.test(candidate);
}

// Cache key for a geo result.
//
// The address is hashed and never stored. The whole point of IP geolocation
// here is a currency default; keeping a durable record of who visited from
// where would be a privacy cost paid for a cosmetic feature.
export function hashClientIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}
