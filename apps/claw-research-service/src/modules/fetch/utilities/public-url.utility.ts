import {
  CREDENTIAL_QUERY_PARAMETERS,
  READER_PROXY_REFUSED_HOST_SUFFIXES,
} from '../constants/fetch-strategy.constants';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';

/**
 * Throws unless a URL is safe to hand to a THIRD-PARTY service (the reader
 * proxy): a public host — never a private one, even one the operator
 * allowlisted for our own fetchers — with no credentials in it, not a
 * signed-in-only app. Handing such a URL to someone else's server would
 * disclose it, and whatever token it carries, outside this deployment.
 */
export function assertPublicThirdPartyUrl(rawUrl: string): URL {
  const url = assertSafeOutboundUrl(rawUrl, { allowPrivateHosts: false });
  const host = url.hostname.toLowerCase();
  if (
    READER_PROXY_REFUSED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    )
  ) {
    throw new Error(`Refusing to send a signed-in-only site to a third-party reader: ${host}`);
  }
  for (const name of url.searchParams.keys()) {
    if (CREDENTIAL_QUERY_PARAMETERS.includes(name.toLowerCase())) {
      throw new Error(
        `Refusing to send a URL carrying credentials (${name}) to a third-party reader`,
      );
    }
  }
  return url;
}
