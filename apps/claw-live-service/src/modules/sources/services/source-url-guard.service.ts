import { lookup } from 'node:dns/promises';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { assertSafeRequestUrl } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import {
  isIpLiteral,
  isPublicIpAddress,
  unbracketHost,
} from '../../../common/utilities/network-address.utility';
import { HLS_DNS_TIMEOUT_MS } from '../constants/sources.constants';
import { sourceUrlShapeError } from '../utilities/source-url.utility';

/**
 * SSRF guard for every HLS origin request (architecture section 1): https only (http in
 * dev when LIVE_ALLOW_HTTP_SOURCES), no userinfo, allowed ports, an optional host pin,
 * and every address the host resolves to must be public. Returns the validated
 * addresses: the fetcher connects ONLY to them (no second DNS lookup, so no rebinding).
 */
@Injectable()
export class SourceUrlGuardService {
  async assertSafe(url: URL, pinnedHost?: string | null): Promise<string[]> {
    const shape = sourceUrlShapeError(url, AppConfig.get().LIVE_ALLOW_HTTP_SOURCES);
    if (shape) throw new UnprocessableEntityException(shape);
    if (pinnedHost !== undefined) {
      if (!pinnedHost || url.host !== pinnedHost) throw this.unsafe();
      // Proxy/worker fetch: the shared guard checks against the stream's declared host.
      try {
        assertSafeRequestUrl(url.href, new Set([pinnedHost]));
      } catch {
        throw this.unsafe();
      }
    }
    return this.publicAddresses(url);
  }

  /**
   * Server-pull fetch: the platform's CDN spreads a stream over many hosts of its own domain, so
   * the pin is a host suffix list (`ttvnw.net` admits `x.playlist.ttvnw.net`), never one host.
   */
  async assertSafeOnSuffixes(url: URL, suffixes: readonly string[]): Promise<string[]> {
    const shape = sourceUrlShapeError(url, false);
    if (shape) throw new UnprocessableEntityException(shape);
    const host = url.hostname.toLowerCase();
    if (!suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
      throw this.unsafe();
    }
    return this.publicAddresses(url);
  }

  /** Every address of the URL's host, all checked public (an IP literal must be public itself). */
  private async publicAddresses(url: URL): Promise<string[]> {
    const host = unbracketHost(url.hostname);
    if (isIpLiteral(host)) {
      if (!isPublicIpAddress(host)) throw this.unsafe();
      return [host];
    }
    const addresses = await this.resolveHost(host).catch(() => []);
    if (addresses.length === 0 || addresses.some((address) => !isPublicIpAddress(address))) {
      throw this.unsafe();
    }
    return addresses;
  }

  /** Every A/AAAA answer for a host name, bounded by a timeout. */
  async resolveHost(hostname: string): Promise<string[]> {
    const answers = await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('DNS_TIMEOUT')), HLS_DNS_TIMEOUT_MS).unref();
      }),
    ]);
    return answers.map((answer) => answer.address);
  }

  private unsafe(): UnprocessableEntityException {
    return new UnprocessableEntityException(LiveSourceErrorCode.SOURCE_UNSAFE);
  }
}
