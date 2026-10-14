import { Injectable } from '@nestjs/common';

import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import {
  EGRESS_ALLOWED_PORTS,
  EGRESS_DENIED_REQUEST_HEADER_PREFIXES,
  EGRESS_DENIED_REQUEST_HEADERS,
  EGRESS_MAX_REDIRECTS_FOLLOWED,
  REDIRECT_STATUS_CODES,
} from '../constants/egress.constants';
import { EgressError } from '../errors/egress.error';
import { HostResolver } from '../resolvers/host-resolver';
import { EgressTransport } from '../transports/egress.transport';
import {
  type CheckedUrl,
  type EgressRequest,
  type EgressResponse,
  type ResolvedTarget,
} from '../types/egress.types';
import { assertPublicUrl } from '../utilities/assert-public-url.utility';
import { interleaveFamilies } from '../utilities/interleave-families.utility';
import { isPublicIpAddress } from '../utilities/is-public-ip-address.utility';

/**
 * The only code in this service that opens a socket to a host a user or a manifest named.
 *
 * Every request: (1) the URL passes the syntax rules, (2) the host is on the caller's allow-list
 * when it has one, (3) DNS is resolved HERE and every answer must be public, (4) the connection
 * is pinned to the validated address, so the answer cannot change between check and connect
 * (DNS rebinding), (5) a redirect is refused, or followed only when the caller asked and then
 * re-checked from step 1 for the new URL. Nothing a user can send reaches a request header.
 */
@Injectable()
export class SafeEgressManager {
  constructor(
    private readonly resolver: HostResolver,
    private readonly transport: EgressTransport,
  ) {}

  /** Steps 1 to 3 without sending anything: used at registration and before every call. */
  async resolveTarget(
    rawUrl: string,
    allowedPorts: readonly number[] = EGRESS_ALLOWED_PORTS,
    allowedHosts?: ReadonlySet<string>,
  ): Promise<ResolvedTarget> {
    const checked = assertPublicUrl(rawUrl, { allowedPorts });
    this.assertHostAllowed(checked, allowedHosts);
    const answers = await this.resolver.resolveAll(checked.host);
    const addresses = [...new Set(answers)];
    if (addresses.length === 0) throw new EgressError(EgressErrorCode.DNS_FAILURE, 'no answers');
    const refused = addresses.find((address) => !isPublicIpAddress(address));
    if (refused !== undefined) {
      throw new EgressError(EgressErrorCode.BLOCKED_ADDRESS, `${checked.host} -> ${refused}`);
    }
    const ordered = interleaveFamilies(addresses);
    const first = ordered[0];
    if (first === undefined) throw new EgressError(EgressErrorCode.DNS_FAILURE, 'no answers');
    return { ...checked, address: first.address, family: first.family, addresses: ordered };
  }

  async request(input: EgressRequest): Promise<EgressResponse> {
    this.assertHeaders(input.headers);
    const maxRedirects = Math.min(input.maxRedirects ?? 0, EGRESS_MAX_REDIRECTS_FOLLOWED);
    let url = input.url;
    for (let hop = 0; ; hop += 1) {
      const response = await this.sendOnce(url, input);
      if (!REDIRECT_STATUS_CODES.includes(response.status)) return response;
      if (maxRedirects === 0 || input.method !== 'GET') {
        throw new EgressError(
          EgressErrorCode.REDIRECT_BLOCKED,
          `status ${String(response.status)}`,
        );
      }
      if (hop >= maxRedirects) throw new EgressError(EgressErrorCode.TOO_MANY_REDIRECTS);
      url = this.nextUrl(url, response.headers['location']);
    }
  }

  private async sendOnce(url: string, input: EgressRequest): Promise<EgressResponse> {
    const target = await this.resolveTarget(url, input.allowedPorts, input.allowedHosts);
    return this.transport.send({
      host: target.host,
      port: target.port,
      path: `${target.url.pathname}${target.url.search}`,
      method: input.method,
      headers: input.headers,
      body: input.body,
      address: target.address,
      family: target.family,
      addresses: target.addresses,
      timeoutMs: input.timeoutMs,
      maxResponseBytes: input.maxResponseBytes,
      signal: input.signal,
      stopWhen: input.stopWhen,
    });
  }

  private nextUrl(current: string, location: string | undefined): string {
    if (location === undefined || location === '') {
      throw new EgressError(EgressErrorCode.REDIRECT_BLOCKED, 'redirect without a location');
    }
    try {
      return new URL(location, current).toString();
    } catch {
      throw new EgressError(EgressErrorCode.REDIRECT_BLOCKED, 'unparseable redirect location');
    }
  }

  private assertHostAllowed(
    checked: CheckedUrl,
    allowedHosts: ReadonlySet<string> | undefined,
  ): void {
    if (allowedHosts !== undefined && !allowedHosts.has(checked.host)) {
      throw new EgressError(EgressErrorCode.HOST_NOT_ALLOWED, checked.host);
    }
  }

  private assertHeaders(headers: Record<string, string>): void {
    for (const [name, value] of Object.entries(headers)) {
      const lower = name.toLowerCase();
      const denied =
        EGRESS_DENIED_REQUEST_HEADERS.includes(lower) ||
        EGRESS_DENIED_REQUEST_HEADER_PREFIXES.some((prefix) => lower.startsWith(prefix));
      if (denied || /[\r\n]/.test(name) || /[\r\n]/.test(value)) {
        throw new EgressError(EgressErrorCode.INVALID_REQUEST, `header ${lower}`);
      }
    }
  }
}
