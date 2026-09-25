import impitModule, { type Browser as ImpitBrowser, type Impit } from 'impit';

import type { ImpersonatedExchange } from '../types/impit-client.types';

/**
 * The one wrapper around `impit` (rule 13): an HTTP client whose TLS
 * ClientHello, HTTP/2 settings and header order match a real Chrome, so a
 * WAF rule keyed on the JA3/JA4 or HTTP/2 fingerprint of Node's own TLS
 * stack does not fire. It changes HOW we look on the wire, not WHAT we are
 * allowed to fetch: robots.txt, the SSRF guard and the escalation policy run
 * exactly as for every other strategy.
 *
 * Redirects are never followed here — `followRedirectsSafely` does that one
 * hop at a time so each hop is SSRF-checked before it is requested. Cookies
 * are not kept between requests (no jar), so no session state leaks from one
 * user's fetch into another's.
 */
export class ImpersonatingHttpClient {
  private client: Impit | null = null;

  constructor(private readonly browser: ImpitBrowser) {}

  async get(url: string, timeoutMs: number): Promise<ImpersonatedExchange> {
    const response = await this.getClient().fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      status: response.status,
      location: response.headers.get('location'),
      contentType: response.headers.get('content-type'),
      body: response.body,
      decode: (bytes: Buffer): string => response.decodeBuffer(bytes),
    };
  }

  private getClient(): Impit {
    if (this.client === null) {
      // CommonJS package: reached through its default export (rule 13 §6).
      this.client = new impitModule.Impit({ browser: this.browser, followRedirects: false });
    }
    return this.client;
  }
}
