import { REDIRECT_STATUS_CODES } from '../../../common/constants/fetch.constants';
import {
  assertSafeOutboundUrl,
  isHostExplicitlyAllowlisted,
} from '../../../common/utilities/url-safety.utility';
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
 */
export async function followRedirectsSafely<T>(
  startUrl: string,
  send: (url: string) => Promise<RedirectHop<T>>,
  options: SafeRedirectOptions,
): Promise<SafeRedirectResult<T>> {
  const chain: string[] = [];
  let currentUrl = startUrl;

  for (let hop = 0; hop <= options.maxRedirects; hop += 1) {
    const safe = assertSafeOutboundUrl(currentUrl, {
      allowPrivateHosts: isHostExplicitlyAllowlisted(currentUrl, options.allowlist),
    });
    chain.push(safe.href);
    const exchange = await send(safe.href);
    if (!REDIRECT_STATUS_CODES.has(exchange.status) || exchange.location === null) {
      return { response: exchange.response, finalUrl: safe.href, chain };
    }
    currentUrl = new URL(exchange.location, safe.href).href;
  }

  throw new Error(
    `Too many redirects (more than ${String(options.maxRedirects)}) starting at ${startUrl}`,
  );
}
