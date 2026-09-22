/**
 * Hosts a provider-supplied image URL may never resolve to.
 *
 * A generated image sometimes arrives as a link rather than bytes — dall-e-2
 * and dall-e-3 answer that way — and that link is served from a per-request
 * blob host, not from the connector's configured `baseUrl`. There is therefore
 * no configured base whose host the download can be declared against, and
 * `declaredHost(url)` on the URL about to be fetched would be a tautology.
 *
 * What CAN be said about a legitimate provider image is that it lives on a
 * public host. This is the deny side of that statement: the loopback and
 * private ranges that would turn "download the image the provider named" into
 * a request against our own network.
 */
export const PRIVATE_IMAGE_DOWNLOAD_HOSTNAMES: ReadonlySet<string> = new Set([
  'localhost',
  '::1',
  '0.0.0.0',
]);

/** Shape of a bare IPv4 literal, so the octet ranges below can be read. */
export const IPV4_LITERAL_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/u;
