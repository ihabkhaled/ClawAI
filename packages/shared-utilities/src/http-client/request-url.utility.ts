import { FORBIDDEN_REQUEST_HOSTS } from './request-url.constants';

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
 *  - Any host outside `allowedHosts`, when a caller passes one.
 *    `internalHostAllowlist()` builds that set from this process's own
 *    environment for callers that only ever talk to configured services. It is
 *    NOT the default: this client also carries calls to a constant host (the
 *    FX providers, Paymob) and to hosts an admin configured in a connector, so
 *    defaulting to the environment would refuse legitimate traffic. Closing
 *    that per caller is TD-037.
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
  // Opt-in, and deliberately not defaulted to the environment: this client
  // also carries calls whose host is a constant (the FX providers, Paymob) or
  // comes from an admin-configured connector, so an environment-only default
  // would refuse legitimate traffic. A caller that knows its destinations
  // passes them; see TD-037 for closing that gap caller by caller.
  if (allowedHosts !== undefined && allowedHosts.size > 0 && !allowedHosts.has(parsed.host)) {
    throw new Error(`httpRequest: refusing a host this service does not call: ${parsed.host}`);
  }
  return parsed;
}
