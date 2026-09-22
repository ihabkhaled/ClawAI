import { declaredHost } from '@claw/shared-utilities';

import {
  IPV4_LITERAL_PATTERN,
  PRIVATE_IMAGE_DOWNLOAD_HOSTNAMES,
} from '../constants/provider-image-download.constants';

/**
 * The allowlist for downloading an image the PROVIDER named.
 *
 * Every other outbound call in this service goes to a host somebody configured:
 * a `*_SERVICE_URL`, a connector's `baseUrl`, a constant. `assertSafeRequestUrl`
 * checks those against an allowlist because an allowlist is answerable there.
 * This one call is different. dall-e-2 and dall-e-3 return a LINK instead of
 * base64, and that link points at a per-request blob host which is not
 * `api.openai.com` and cannot be enumerated in advance. Declaring the host of
 * the URL we are about to fetch would allowlist whatever the response said,
 * which is not a check at all.
 *
 * So the check here is the other shape — the one research-service uses for a
 * URL a user typed: accept any PUBLIC host, refuse every private, loopback and
 * link-local one. That is what actually constrains this call; the returned set
 * then lets `assertSafeRequestUrl` do the rest (protocol, embedded
 * credentials, cloud metadata, no redirect following) instead of standing the
 * whole guard down.
 *
 * It is a syntactic check on the host, not a DNS resolution, so a public name
 * that resolves to a private address still gets through. That residual gap is
 * the platform-wide one recorded as TD-031, and it needs a connect-time agent,
 * not a third copy of this function.
 *
 * Throws rather than returning an empty set: a malformed or private-facing
 * image URL is a refused download, not a silently unallowlisted one.
 */
export function providerImageDownloadHosts(url: string): ReadonlySet<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('providerImageDownloadHosts: refusing an image URL that is not absolute');
  }
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    throw new Error(
      `providerImageDownloadHosts: refusing a private image host: ${parsed.hostname}`,
    );
  }
  return declaredHost(url);
}

function isPrivateOrLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized.length === 0 || PRIVATE_IMAGE_DOWNLOAD_HOSTNAMES.has(normalized)) {
    return true;
  }
  if (!IPV4_LITERAL_PATTERN.test(normalized)) {
    return false;
  }
  const [a, b] = normalized.split('.').map((part) => Number.parseInt(part, 10));
  if (a === undefined || b === undefined) {
    return true;
  }
  if (a === 0 || a === 10 || a === 127) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  return a === 172 && b >= 16 && b <= 31 ? true : a === 192 && b === 168;
}
