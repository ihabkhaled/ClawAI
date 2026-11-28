import { assertSafeRequestUrl } from '@claw/shared-utilities';

import { RESEARCH_BOT_USER_AGENT } from '../../../common/constants/fetch.constants';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import { readLimitedBody } from '../../fetch/utilities/limited-body.utility';
import { pinnedFetch } from '../../fetch/utilities/pinned-fetch.utility';
import { followRedirectsSafely } from '../../fetch/utilities/safe-redirect.utility';
import {
  PLATFORM_API_FIXED_HOSTS,
  PLATFORM_API_MAX_BYTES,
  PLATFORM_API_MAX_REDIRECTS,
  PLATFORM_WIKIPEDIA_HOST_PATTERN,
} from '../constants/platform-api.constants';
import { PlatformHostRefusedError } from '../errors/platform-host-refused.error';
import type { PlatformHttpOptions } from '../types/platform.types';

/** Whether a host may be called by a platform adapter: the fixed list or a Wikipedia edition. */
export function isPlatformApiHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return (
    PLATFORM_API_FIXED_HOSTS.has(normalized) || PLATFORM_WIKIPEDIA_HOST_PATTERN.test(normalized)
  );
}

/**
 * Throws `PlatformHostRefusedError` unless the URL is https, on an allow-listed
 * host, and passes the shared SSRF guard (no credentials, no private or
 * metadata address). Returns the allowed host set for the chokepoint check.
 */
export function assertPlatformApiUrl(url: string): ReadonlySet<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PlatformHostRefusedError('(unparseable)');
  }
  if (parsed.protocol !== 'https:' || parsed.port !== '' || !isPlatformApiHost(parsed.hostname)) {
    throw new PlatformHostRefusedError(parsed.host);
  }
  const allowed = new Set([parsed.hostname.toLowerCase()]);
  try {
    assertSafeOutboundUrl(url, { allowedHosts: [...allowed] });
  } catch {
    throw new PlatformHostRefusedError(parsed.host);
  }
  return allowed;
}

/**
 * One GET to an official platform API, as text.
 *
 * The host is checked BEFORE the metering hook runs and before anything is
 * sent, so a refused URL costs no unit and makes no request. Redirects are
 * followed hop by hop (`followRedirectsSafely`: each hop SSRF-checked and
 * DNS-pinned) and every hop must be allow-listed too. One deadline (`signal`)
 * covers the whole call; the body is read up to `PLATFORM_API_MAX_BYTES`.
 * Only a 2xx answer is a result.
 */
export async function platformApiGet(url: string, options: PlatformHttpOptions): Promise<string> {
  assertPlatformApiUrl(url);
  await options.onNetworkCall?.();
  const { response } = await followRedirectsSafely(
    url,
    async (hopUrl, pin) => {
      assertSafeRequestUrl(hopUrl, assertPlatformApiUrl(hopUrl));
      const hop = await pinnedFetch(hopUrl, pin, {
        signal: options.signal,
        headers: { 'User-Agent': RESEARCH_BOT_USER_AGENT, Accept: options.accept },
      });
      return { status: hop.status, location: hop.headers.get('location'), response: hop };
    },
    { maxRedirects: PLATFORM_API_MAX_REDIRECTS, allowlist: [] },
  );
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`${options.label} API answered HTTP ${String(response.status)}`);
  }
  const bytes = await readLimitedBody(response.body, PLATFORM_API_MAX_BYTES);
  return bytes.toString('utf8');
}
