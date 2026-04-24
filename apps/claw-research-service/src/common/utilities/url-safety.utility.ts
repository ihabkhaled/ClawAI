/**
 * Anti-SSRF utilities. Prevents provider adapter calls from being redirected
 * to internal resources (127.0.0.1, RFC 1918 private ranges, AWS metadata
 * endpoint, link-local). Applied whenever the destination URL is even
 * partially user-controlled (custom provider baseUrl, scraped redirect
 * target, webhook callback origin).
 */

import {
  ALLOWED_OUTBOUND_PROTOCOLS,
  AWS_METADATA_IP,
  PRIVATE_HOSTNAMES,
} from '../constants/url-safety.constants';
import type { UrlSafetyOptions } from '../types/url-safety.types';

export function isPrivateOrLoopbackHost(host: string): boolean {
  if (host.length === 0) {
    return true;
  }
  const normalized = host.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(normalized)) {
    return true;
  }
  if (normalized === AWS_METADATA_IP) {
    return true;
  }

  if (!isIpv4(normalized)) {
    return false;
  }

  const parts = normalized.split('.').map((p) => Number.parseInt(p, 10));
  const [a, b] = parts;
  if (a === undefined || b === undefined) {
    return false;
  }
  if (a === 0 || a === 10 || a === 127) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  return false;
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

function hostMatchesAllowlist(host: string, allowed: string[]): boolean {
  const normalized = host.toLowerCase();
  for (const pattern of allowed) {
    const patternLower = pattern.toLowerCase();
    if (patternLower.startsWith('*.')) {
      const suffix = patternLower.slice(1);
      if (normalized.endsWith(suffix)) {
        return true;
      }
    } else if (normalized === patternLower) {
      return true;
    }
  }
  return false;
}

/**
 * Throws if the URL is malformed, uses a non-http(s) protocol, resolves to a
 * private/loopback/link-local host, or (when allowedHosts is provided) is not
 * on the allowlist.
 *
 * NOTE: this is a syntactic check plus IP-literal detection. It does NOT
 * perform DNS resolution. For full defense, adapters should also bind the
 * HTTP client to a safe agent that refuses to connect to private IPs after
 * DNS resolves them. The `http-client` wrapper in `@common/utilities` is
 * expected to be the next layer of defense.
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
  // Cloud metadata endpoints are never legitimate targets — even on
  // self-hosted deployments that otherwise allow private hosts.
  if (parsed.hostname.toLowerCase() === AWS_METADATA_IP) {
    throw new Error(`URL resolves to cloud-metadata endpoint: ${parsed.hostname}`);
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
