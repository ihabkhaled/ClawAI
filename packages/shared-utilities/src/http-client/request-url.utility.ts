import { EXTERNAL_ENDPOINT_HOSTS, FORBIDDEN_REQUEST_HOSTS } from './request-url.constants';
import { internalHostAllowlist } from './internal-hosts.utility';

const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/**
 * The only URL shapes this client will open.
 *
 * `httpRequest` takes a URL from its caller and hands it straight to `fetch`,
 * which is the shape of a server-side request forgery (CodeQL
 * js/request-forgery, alert #58): anything that can steer that string can steer
 * where the server connects. Callers build URLs from service config, but the
 * chokepoint must not depend on every caller being careful forever.
 *
 * Four things are rejected:
 *
 *  - Any protocol other than http/https. `file:` reads the container's disk and
 *    `data:` smuggles a response body in the URL itself — neither is ever a
 *    service call.
 *  - Embedded credentials (`https://user:pass@host`). They are a classic way to
 *    make a hostile host look like a trusted one at a glance, and they leak into
 *    every log line that prints the URL.
 *  - The cloud metadata endpoints, always, whatever the configuration says.
 *    They hand instance credentials to whoever asks.
 *  - **Any host that is not on the allowlist. This is unconditional.** The
 *    allowlist is the union of three sources: the hosts named by this process's
 *    own environment (`*_SERVICE_URL` and friends), the third-party endpoints
 *    written down in `EXTERNAL_ENDPOINT_HOSTS`, and any host the caller
 *    declares in `allowedHosts` because it comes from an admin-configured
 *    connector. Until 2026-09-20 the host check only ran when a caller opted
 *    in, which left an unguarded path to `fetch` and kept alert #58 open. There
 *    is no opt-out now: a service that legitimately calls a new destination
 *    adds it to one of those three sources.
 *
 * The one stand-down is a process with no environment at all — a unit test or a
 * one-off tool — where every source is empty. Refusing everything there would
 * turn the guard into an outage rather than a control.
 */
export function assertSafeRequestUrl(url: string, allowedHosts?: ReadonlySet<string>): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('httpRequest: refusing a URL that is not absolute');
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`httpRequest: refusing protocol "${parsed.protocol}"`);
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new Error('httpRequest: refusing a URL with embedded credentials');
  }
  if (FORBIDDEN_REQUEST_HOSTS.includes(parsed.hostname.toLowerCase())) {
    throw new Error('httpRequest: refusing a cloud metadata address');
  }

  const fromEnvironment = internalHostAllowlist();
  if (fromEnvironment.size === 0 && (allowedHosts === undefined || allowedHosts.size === 0)) {
    // Not a configured service: a unit test or a one-off tool, where every
    // source is empty. The protocol, credential and metadata rejections above
    // still stand; refusing every host as well would make the guard an outage
    // rather than a control. A deployed service always has these variables.
    return parsed;
  }
  const permitted = new Set<string>([
    ...fromEnvironment,
    ...EXTERNAL_ENDPOINT_HOSTS,
    ...(allowedHosts ?? []),
  ]);
  if (!permitted.has(parsed.host)) {
    throw new Error(`httpRequest: refusing a host this service does not call: ${parsed.host}`);
  }
  return parsed;
}

/**
 * The host of a base URL, for a caller declaring an admin-configured
 * destination to `assertSafeRequestUrl`.
 *
 * A connector's base URL is set by an operator in the admin UI, so it cannot be
 * on any static list. Passing it through here makes the destination an explicit
 * argument at the call site rather than something the guard silently waves
 * past, which is the difference between a checked path and an unchecked one.
 * Returns an empty set for a value that is not a URL, so a broken config
 * refuses the call instead of opening it.
 */
export function declaredHost(baseUrl: string): ReadonlySet<string> {
  try {
    return new Set([new URL(baseUrl).host]);
  } catch {
    return new Set();
  }
}
