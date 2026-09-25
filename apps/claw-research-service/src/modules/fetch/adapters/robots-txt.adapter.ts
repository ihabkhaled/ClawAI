import { Injectable } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import {
  FETCH_MAX_REDIRECTS,
  RESEARCH_BOT_USER_AGENT,
} from '../../../common/constants/fetch.constants';
import { ImpersonatingHttpClient } from '../../../common/utilities/impit-client.utility';
import { TLS_IMPERSONATE_BROWSER } from '../constants/fetch-strategy.constants';
import {
  ROBOTS_FETCH_TIMEOUT_MS,
  ROBOTS_MAX_BYTES,
  ROBOTS_RETRY_IMPERSONATED_STATUSES,
} from '../constants/robots-policy.constants';
import { readBodyPrefix } from '../utilities/limited-body.utility';
import { followRedirectsSafely } from '../utilities/safe-redirect.utility';
import type { RobotsFetchOutcome } from '../types/robots-policy.types';

/**
 * Downloads an origin's robots.txt. Plain fetch first; when that is refused
 * with a status a fingerprinting WAF gives bots (401/403/503), once more
 * through the TLS-impersonating client — otherwise a site that 403s Node's
 * TLS stack would have its robots.txt read as "4xx = no rules" and every
 * Disallow in it silently ignored. Every redirect hop is SSRF-checked.
 * Never throws: a network failure is an outcome with `status: null`.
 */
@Injectable()
export class RobotsTxtAdapter {
  private readonly impersonating = new ImpersonatingHttpClient(TLS_IMPERSONATE_BROWSER);

  async fetchRobotsTxt(robotsUrl: string): Promise<RobotsFetchOutcome> {
    const plain = await this.tryPlain(robotsUrl);
    if (plain.status === null || !ROBOTS_RETRY_IMPERSONATED_STATUSES.has(plain.status)) {
      return plain;
    }
    const impersonated = await this.tryImpersonated(robotsUrl);
    return impersonated.status === null ? plain : impersonated;
  }

  private async tryPlain(robotsUrl: string): Promise<RobotsFetchOutcome> {
    try {
      const signal = AbortSignal.timeout(ROBOTS_FETCH_TIMEOUT_MS);
      const { response } = await followRedirectsSafely(
        robotsUrl,
        async (url) => {
          assertSafeRequestUrl(url, declaredHost(url));
          const hop = await fetch(url, {
            redirect: 'manual',
            signal,
            headers: { 'User-Agent': RESEARCH_BOT_USER_AGENT, Accept: 'text/plain' },
          });
          return { status: hop.status, location: hop.headers.get('location'), response: hop };
        },
        { maxRedirects: FETCH_MAX_REDIRECTS, allowlist: AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST },
      );
      const body = response.ok ? await this.readBody(response.body) : null;
      return { status: response.status, body, via: 'plain' };
    } catch {
      return { status: null, body: null, via: 'plain' };
    }
  }

  private async tryImpersonated(robotsUrl: string): Promise<RobotsFetchOutcome> {
    try {
      const { response } = await followRedirectsSafely(
        robotsUrl,
        async (url) => {
          const exchange = await this.impersonating.get(url, ROBOTS_FETCH_TIMEOUT_MS);
          return { status: exchange.status, location: exchange.location, response: exchange };
        },
        { maxRedirects: FETCH_MAX_REDIRECTS, allowlist: AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST },
      );
      const ok = response.status >= 200 && response.status < 300;
      const body = ok ? await this.readBody(response.body) : null;
      return { status: response.status, body, via: 'impersonated' };
    } catch {
      return { status: null, body: null, via: 'impersonated' };
    }
  }

  /** RFC 9309 §2.5: rules past the size limit are ignored, not an error. */
  private async readBody(body: ReadableStream<Uint8Array> | null): Promise<string> {
    return (await readBodyPrefix(body, ROBOTS_MAX_BYTES)).toString('utf8');
  }
}
