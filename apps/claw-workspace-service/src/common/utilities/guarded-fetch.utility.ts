import { isIP } from 'node:net';

import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import {
  DOWNLOAD_HOP_PROTOCOL,
  DOWNLOAD_REDIRECT_STATUSES,
} from '../constants/guarded-fetch.constants';
import { isPrivateOrLoopbackHost } from './url-safety.utility';

/**
 * The one door every outbound HTTP call in workspace-service goes through
 * (TD-040). Provider adapters, the OAuth app probe and the internal service
 * clients call these instead of `fetch`, and
 * `tools/__tests__/service-fetch-url-guarded.test.mjs` fails the build when a
 * bare `fetch(` appears anywhere else in the service.
 *
 * `declaredBase` is where the caller says this request is going: a provider
 * base-URL literal from `workspace.constants.ts`, an admin-configured provider
 * base (self-hosted GitLab), or a `*_SERVICE_URL` from AppConfig. It is always
 * the BASE the URL was built from, never the URL itself and never a value a
 * user typed or a payload carried — declaring the destination's own host would
 * make every URL authorise itself.
 *
 * Two checks run, and both must pass:
 *
 *  1. `assertSafeRequestUrl` — the platform guard: http(s) only, no embedded
 *     credentials, never a cloud-metadata address, and a host on the allowlist
 *     (this process's `*_SERVICE_URL`-style env hosts ∪ `EXTERNAL_ENDPOINT_HOSTS`
 *     ∪ the declared base's host).
 *  2. The host must be EXACTLY the declared base's host. The platform allowlist
 *     also holds every internal service this process talks to, so on its own it
 *     would let a mis-built GitLab URL carry a user's GitLab token to
 *     `claw-auth-service`. Nearly every call here carries a provider token or
 *     the inter-service secret, so "some host we know" is not enough.
 *
 * Redirects are refused (`redirect: 'error'`): a 3xx would carry the token to
 * a destination nothing checked. The one endpoint that legitimately redirects
 * — a file download — uses `guardedDownloadFetch`, below.
 *
 * Throws (as a rejected promise) before any network I/O when a check fails, so
 * callers' existing catch blocks turn a refusal into the same result as an
 * unreachable provider. The message names only the host, never the URL.
 */
export async function guardedFetch(
  declaredBase: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const target = checkedRequestUrl(declaredBase, url);
  return fetch(target.href, { ...init, redirect: 'error' });
}

/**
 * `guardedFetch` for a file-download endpoint that answers with one redirect
 * to a pre-authenticated CDN URL — Microsoft Graph's `/content` is the case:
 * it replies 302 with a short-lived `*.sharepoint.com` / `*.1drv.com` link
 * whose host differs per tenant and per request, so no allowlist can name it.
 *
 * The first request is checked exactly like `guardedFetch`. Its redirect is
 * followed at most once, and only when the hop is https, a DNS name (never an
 * IP literal) and not a private or loopback host — the "any public host, never
 * a private one" check a response-supplied URL needs. The hop is sent with NO
 * headers: the link is pre-authenticated, and our bearer token must never
 * reach a host the provider chose at runtime. A second redirect is refused.
 */
export async function guardedDownloadFetch(
  declaredBase: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const target = checkedRequestUrl(declaredBase, url);
  const first = await fetch(target.href, { ...init, redirect: 'manual' });
  if (!DOWNLOAD_REDIRECT_STATUSES.has(first.status)) {
    return first;
  }
  const location = first.headers.get('location');
  if (location === null) {
    return first;
  }
  const hop = checkedDownloadHop(location, target);
  return fetch(hop.href, { signal: init.signal, redirect: 'error' });
}

/**
 * Both checks `guardedFetch` documents, without the network call. Exported so
 * a caller that must hand a URL to something other than `fetch` can check it
 * the same way.
 */
export function checkedRequestUrl(declaredBase: string, url: string): URL {
  const declared = declaredHost(declaredBase);
  const target = assertSafeRequestUrl(url, declared);
  if (!declared.has(target.host)) {
    throw new Error(
      `outbound request refused: ${target.host} is not the host this call was declared for`,
    );
  }
  return target;
}

function checkedDownloadHop(location: string, from: URL): URL {
  let hop: URL;
  try {
    hop = new URL(location, from);
  } catch {
    throw new Error('download redirect refused: the Location header is not a URL');
  }
  const hostname = hop.hostname.toLowerCase();
  // A WHATWG URL keeps an IPv6 hostname in brackets, so a bracket IS an IPv6
  // literal; isIP catches IPv4 (including the forms URL already normalised).
  const isIpLiteral = hostname.startsWith('[') || isIP(hostname) !== 0;
  if (
    hop.protocol !== DOWNLOAD_HOP_PROTOCOL ||
    hop.username !== '' ||
    hop.password !== '' ||
    isIpLiteral ||
    isPrivateOrLoopbackHost(hostname)
  ) {
    // The URL itself is never echoed: a pre-authenticated link IS a credential.
    throw new Error(
      `download redirect refused: ${hop.protocol}//${hop.host} is not a public https host`,
    );
  }
  return hop;
}
