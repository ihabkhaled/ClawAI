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
import { isNonPublicIpv4, isNonPublicIpv6 } from './ip-address.utility';
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
  return octets === null ? false : isPrivateIpv4(octets);
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
  return isNonPublicIpv4(octets);
}

/**
 * IPv6 literals that are never public, judged on the address bytes.
 *
 * `http://[::1]/` is loopback and `http://[::ffff:127.0.0.1]/` is loopback
 * wearing an IPv4 costume; the URL parser rewrites the latter to
 * `[::ffff:7f00:1]`, which a dotted-quad regex never matched.
 */
function isPrivateIpv6(host: string): boolean {
  const bare = stripBrackets(host);
  return bare.includes(':') && isNonPublicIpv6(bare);
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
