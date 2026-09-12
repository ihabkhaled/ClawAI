/**
 * Anti-SSRF checks for any destination the platform did not choose itself.
 *
 * These got materially more important on 2026-09-11. Until then every URL the
 * fetcher saw had come from a search provider, so a syntactic check was a
 * defensible depth. Then the platform learned to open a URL the USER typed, and
 * "syntactic" stopped being a depth and became the whole defence against an
 * address someone picked on purpose.
 *
 * What this does NOT do, stated plainly so nobody assumes otherwise: it does
 * not resolve DNS. A hostname an attacker controls can resolve to 127.0.0.1 and
 * pass every check here. The layer that closes that is a socket-level guard in
 * the HTTP client, and it is not built yet — see TD-031 in
 * `docs/14-risk-debt/technical-debt.md`. Everything below is the syntactic
 * half, made as tight as syntax allows.
 */

import {
  ALLOWED_OUTBOUND_PROTOCOLS,
  CLOUD_METADATA_HOSTS,
  PRIVATE_HOST_SUFFIXES,
  PRIVATE_HOSTNAMES,
} from '../constants/url-safety.constants';
import type { UrlSafetyOptions } from '../types/url-safety.types';

/** Whether the host is a cloud metadata endpoint. Never allowed, anywhere. */
export function isCloudMetadataHost(host: string): boolean {
  return CLOUD_METADATA_HOSTS.has(stripBrackets(host).toLowerCase());
}

export function isPrivateOrLoopbackHost(host: string): boolean {
  if (host.length === 0) {
    return true;
  }
  const normalized = host.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(normalized)) {
    return true;
  }
  if (isCloudMetadataHost(normalized)) {
    return true;
  }
  if (PRIVATE_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return true;
  }
  // A bare label with no dot is a LAN name (`http://router/`, `http://vault/`),
  // which is never a public address.
  if (!normalized.includes('.') && !normalized.includes(':')) {
    return true;
  }
  if (isPrivateIpv6(normalized)) {
    return true;
  }
  const octets = parseIpv4(normalized);
  if (octets === null) {
    return false;
  }
  return isPrivateIpv4(octets);
}

function stripBrackets(host: string): string {
  return host.replace(/^\[/u, '').replace(/\]$/u, '');
}

/**
 * IPv4 octets from every spelling a URL parser accepts.
 *
 * `http://127.0.0.1/`, `http://2130706433/`, `http://0x7f.1/` and
 * `http://0177.0.0.1/` are the same host. A dotted-quad regex sees only the
 * first, which is how a decimal-encoded loopback address walks past a check
 * that looks correct.
 */
function parseIpv4(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length > 4 || parts.length === 0) {
    return null;
  }
  const numbers: number[] = [];
  for (const part of parts) {
    const value = parseIpPart(part);
    if (value === null) {
      return null;
    }
    numbers.push(value);
  }
  // Fewer than four parts means the last one carries the remaining octets
  // (`10.1` is 10.0.0.1), which is exactly the shorthand an attacker reaches
  // for. Expand it rather than declining to judge.
  const last = numbers.pop();
  if (last === undefined) {
    return null;
  }
  const remaining = 4 - numbers.length;
  if (last >= Math.pow(256, remaining)) {
    return null;
  }
  for (let index = remaining - 1; index >= 0; index -= 1) {
    numbers.push(Math.floor(last / Math.pow(256, index)) % 256);
  }
  return numbers;
}

function parseIpPart(part: string): number | null {
  if (part.length === 0) {
    return null;
  }
  let value: number;
  if (/^0[xX][0-9a-fA-F]+$/u.test(part)) {
    value = Number.parseInt(part.slice(2), 16);
  } else if (/^0[0-7]+$/u.test(part)) {
    value = Number.parseInt(part.slice(1), 8);
  } else if (/^\d+$/u.test(part)) {
    value = Number.parseInt(part, 10);
  } else {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

function isPrivateIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === undefined || b === undefined) {
    return true;
  }
  // 0.0.0.0/8 "this network", 10/8, 127/8 loopback.
  if (a === 0 || a === 10 || a === 127) {
    return true;
  }
  // 169.254/16 link-local, which includes every cloud metadata address.
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  // 100.64/10 carrier-grade NAT — reaches other tenants on shared hosting.
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  // 192.0.0/24 IETF protocol assignments, 192.0.2/24 TEST-NET-1.
  if (a === 192 && b === 0) {
    return true;
  }
  // 198.18/15 benchmarking range.
  if (a === 198 && (b === 18 || b === 19)) {
    return true;
  }
  // 224/4 multicast and 240/4 reserved, which includes 255.255.255.255.
  if (a >= 224) {
    return true;
  }
  return false;
}

/**
 * IPv6 ranges that are never public.
 *
 * `http://[::1]/` is loopback and `http://[::ffff:127.0.0.1]/` is loopback
 * wearing an IPv4 costume — the second gets past anything checking for IPv4
 * shapes, because the host is not one.
 */
function isPrivateIpv6(host: string): boolean {
  const bare = stripBrackets(host);
  if (!bare.includes(':')) {
    return false;
  }
  const lower = bare.toLowerCase();
  if (lower === '::1' || lower === '::') {
    return true;
  }
  // IPv4-mapped and IPv4-compatible forms carry a dotted quad in the tail.
  const mapped = /^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/u.exec(lower);
  const mappedIpv4 = mapped?.[1];
  if (mappedIpv4 !== undefined) {
    const octets = parseIpv4(mappedIpv4);
    return octets === null ? true : isPrivateIpv4(octets);
  }
  // fc00::/7 unique-local and fe80::/10 link-local.
  if (/^f[cd][0-9a-f]{2}:/u.test(lower) || /^fe[89ab][0-9a-f]:/u.test(lower)) {
    return true;
  }
  return false;
}

function hostMatchesAllowlist(host: string, allowed: readonly string[]): boolean {
  const normalized = host.toLowerCase();
  for (const pattern of allowed) {
    const patternLower = pattern.trim().toLowerCase();
    if (patternLower.length === 0) {
      continue;
    }
    if (patternLower.startsWith('*.')) {
      const suffix = patternLower.slice(1);
      if (normalized.endsWith(suffix) && normalized.length > suffix.length) {
        return true;
      }
    } else if (normalized === patternLower) {
      return true;
    }
  }
  return false;
}

/**
 * Whether the operator named this exact host in the domain allowlist — the
 * ONLY thing that unlocks a private address for an outbound fetch. Shared by
 * every fetch adapter (`HttpFetchAdapter`, `HeadlessFetchAdapter`) so the
 * decision has exactly one implementation: two adapters computing "is this
 * host allowlisted" independently is how they'd eventually disagree about
 * which URLs a self-hosted deployment is allowed to reach internally.
 */
export function isHostExplicitlyAllowlisted(rawUrl: string, allowlist: readonly string[]): boolean {
  if (allowlist.length === 0) {
    return false;
  }
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return hostMatchesAllowlist(host, allowlist);
}

/**
 * Throws unless the URL is a plain http(s) address on a public host.
 *
 * `allowPrivateHosts` is a deliberate escape hatch for a self-hosted deployment
 * that indexes internal resources. It does NOT lift the cloud-metadata block,
 * and it must never be set for a URL a user supplied — see the call site in
 * `HttpFetchAdapter`, which now requires the host to be on the operator's
 * explicit allowlist before private addresses are permitted at all.
 */
export function assertSafeOutboundUrl(rawUrl: string, options: UrlSafetyOptions = {}): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (!ALLOWED_OUTBOUND_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Unsupported protocol ${parsed.protocol} for ${rawUrl}`);
  }
  // Credentials in a URL are a redirect-laundering trick as often as they are a
  // real login, and nothing here has any use for them.
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    throw new Error('URL must not contain embedded credentials');
  }
  // Checked before the private-host branch, so it holds even when private hosts
  // are deliberately permitted.
  if (isCloudMetadataHost(parsed.hostname)) {
    throw new Error(`URL resolves to a cloud-metadata endpoint: ${parsed.hostname}`);
  }
  if (options.allowPrivateHosts !== true && isPrivateOrLoopbackHost(parsed.hostname)) {
    throw new Error(`URL resolves to a private/loopback host: ${parsed.hostname}`);
  }
  if (
    options.allowedHosts !== undefined &&
    options.allowedHosts.length > 0 &&
    !hostMatchesAllowlist(parsed.hostname, options.allowedHosts)
  ) {
    throw new Error(
      `Host ${parsed.hostname} is not on the allowlist (${options.allowedHosts.join(', ')})`,
    );
  }
  return parsed;
}
