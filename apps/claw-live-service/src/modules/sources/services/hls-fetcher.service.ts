import { Injectable } from '@nestjs/common';

import { pinnedGet } from '../../../common/utilities/pinned-request.utility';
import { HLS_FETCH_TIMEOUT_MS } from '../constants/sources.constants';
import type { HlsFetchedObject, HlsHostPin } from '../types/hls-proxy.types';
import { followableRedirect, upstreamError } from '../utilities/hls-redirect.utility';
import { SourceUrlGuardService } from './source-url-guard.service';

/**
 * Bounded, host-pinned fetch of one HLS origin object (playlist or segment), shared by
 * the browser proxy and the processing worker. The guard runs on every call and returns
 * the validated public addresses; the connection is pinned to them (no DNS rebinding),
 * redirects are refused for a declared host (a CDN pin may follow a few, see `fetchObject`) and
 * the body is capped while it streams in.
 */
@Injectable()
export class HlsFetcherService {
  constructor(private readonly guard: SourceUrlGuardService) {}

  /**
   * `pin` is the stream's declared host, or a host suffix list for a server-pulled platform CDN.
   * A declared host never follows a redirect. A CDN pin follows at most `HLS_MAX_REDIRECTS`, each
   * one https and re-checked on the same suffixes (YouTube 302s every segment to another
   * `*.googlevideo.com` edge; before 2026-11-24 such a stream polled forever with no audio).
   */
  async fetchObject(url: URL, pin: HlsHostPin, maxBytes: number): Promise<HlsFetchedObject> {
    let current = url;
    for (let hop = 0; ; hop += 1) {
      const addresses =
        typeof pin === 'string'
          ? await this.guard.assertSafe(current, pin)
          : await this.guard.assertSafeOnSuffixes(current, pin);
      try {
        const result = await pinnedGet(current, addresses, {
          timeoutMs: HLS_FETCH_TIMEOUT_MS,
          maxBytes,
        });
        return { contentType: result.contentType, body: result.body, url: current };
      } catch (error: unknown) {
        const next = followableRedirect(error, current, pin, hop);
        if (next === null) throw upstreamError(error);
        current = next;
      }
    }
  }
}
