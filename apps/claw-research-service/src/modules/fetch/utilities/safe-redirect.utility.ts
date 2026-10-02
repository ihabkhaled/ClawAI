import { REDIRECT_STATUS_CODES } from '../../../common/constants/fetch.constants';
import { resolvePinnedAddress } from '../../../common/utilities/dns-guard.utility';
import {
  assertSafeOutboundUrl,
  isHostExplicitlyAllowlisted,
} from '../../../common/utilities/url-safety.utility';
import type { PinnedAddress } from '../../../common/types/ip-address.types';
import type {
  RedirectHop,
  SafeRedirectOptions,
  SafeRedirectResult,
} from '../types/safe-redirect.types';

/**
 * Follows redirects one hop at a time, running the anti-SSRF guard on EVERY
 * URL before it is requested — not only the first one and the last one.
 *
 * A client left to follow redirects itself (`redirect: 'follow'`) has already
 * connected to each intermediate host by the time anyone looks at the final
 * URL; a public page that 302s to `http://169.254.169.254/` has made the
 * request before a post-hoc check can refuse it. Here the request is never
 * sent. `send` must NOT follow redirects on its own.
 *
 * Every hop also resolves its host exactly once and passes the validated
 * address to `send`; a client that re-resolves the name instead of connecting
 * to that address reopens DNS rebinding.
 */
export async function followRedirectsSafely<T>(
  startUrl: string,
  send: (url: string, pin: PinnedAddress) => Promise<RedirectHop<T>>,
  options: SafeRedirectOptions,
): Promise<SafeRedirectResult<T>> {
  const chain: string[] = [];
  let currentUrl = startUrl;

  for (let hop = 0; hop <= options.maxRedirects; hop += 1) {
    const allowPrivate = isHostExplicitlyAllowlisted(currentUrl, options.allowlist);
    const safe = assertSafeOutboundUrl(currentUrl, { allowPrivateHosts: allowPrivate });
    // Resolve ONCE, validate every answer, and hand the checked address to
    // `send`, which must connect to exactly it (TD-031, DNS rebinding).
    const pin = await resolvePinnedAddress(safe.hostname, { allowPrivate });
    chain.push(safe.href);
    const exchange = await send(safe.href, pin);
    if (!REDIRECT_STATUS_CODES.has(exchange.status) || exchange.location === null) {
      return { response: exchange.response, finalUrl: safe.href, chain };
    }
    currentUrl = new URL(exchange.location, safe.href).href;
  }

  throw new Error(
    `Too many redirects (more than ${String(options.maxRedirects)}) starting at ${startUrl}`,
  );
}
