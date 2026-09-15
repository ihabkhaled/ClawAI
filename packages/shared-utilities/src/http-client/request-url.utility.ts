const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/**
 * The only URL shapes this client will open.
 *
 * `httpRequest` takes a URL from its caller and hands it straight to `fetch`,
 * which is the shape of a server-side request forgery: anything that can steer
 * that string can steer where the server connects. Callers here build URLs from
 * service config, but the chokepoint should not depend on every caller being
 * careful forever.
 *
 * Two things are rejected:
 *
 *  - Any protocol other than http/https. `file:` reads the container's disk and
 *    `data:` smuggles a response body in the URL itself — neither is ever a
 *    service call.
 *  - Embedded credentials (`https://user:pass@host`). They are a classic way to
 *    make a hostile host look like a trusted one at a glance, and they leak into
 *    every log line that prints the URL.
 *
 * Host allow-listing is deliberately NOT done here: these are internal calls to
 * container hostnames that vary per deployment, and a list maintained in a
 * shared package would either be wrong or be bypassed.
 */
export function assertSafeRequestUrl(url: string): URL {
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
  return parsed;
}
