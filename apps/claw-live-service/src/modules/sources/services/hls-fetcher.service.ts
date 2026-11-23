import { BadGatewayException, Injectable } from '@nestjs/common';

import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { pinnedGet, PinnedRequestError } from '../../../common/utilities/pinned-request.utility';
import { HLS_FETCH_TIMEOUT_MS } from '../constants/sources.constants';
import type { HlsFetchedObject, HlsHostPin } from '../types/hls-proxy.types';
import { SourceUrlGuardService } from './source-url-guard.service';

/**
 * Bounded, host-pinned fetch of one HLS origin object (playlist or segment), shared by
 * the browser proxy and the processing worker. The guard runs on every call and returns
 * the validated public addresses; the connection is pinned to them (no DNS rebinding),
 * redirects are refused and the body is capped while it streams in.
 */
@Injectable()
export class HlsFetcherService {
  constructor(private readonly guard: SourceUrlGuardService) {}

  /** `pin` is the stream's declared host, or a host suffix list for a server-pulled platform CDN. */
  async fetchObject(url: URL, pin: HlsHostPin, maxBytes: number): Promise<HlsFetchedObject> {
    const addresses =
      typeof pin === 'string'
        ? await this.guard.assertSafe(url, pin)
        : await this.guard.assertSafeOnSuffixes(url, pin);
    try {
      const result = await pinnedGet(url, addresses, { timeoutMs: HLS_FETCH_TIMEOUT_MS, maxBytes });
      return { contentType: result.contentType, body: result.body, url };
    } catch (error: unknown) {
      const tooLarge = error instanceof PinnedRequestError && error.code === 'TOO_LARGE';
      throw new BadGatewayException(
        tooLarge ? LiveSourceErrorCode.UPSTREAM_TOO_LARGE : LiveSourceErrorCode.UPSTREAM_FAILED,
      );
    }
  }
}
