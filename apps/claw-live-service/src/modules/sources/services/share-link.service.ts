import { Injectable, Logger } from '@nestjs/common';

import { pinnedGet, PinnedRequestError } from '../../../common/utilities/pinned-request.utility';
import {
  SHARE_REDIRECT_MAX_BYTES,
  SHARE_REDIRECT_TIMEOUT_MS,
  SHARE_REDIRECT_USER_AGENT,
} from '../constants/platforms.constants';
import type { PlatformResolution } from '../types/platform.types';
import { resolvePlatformUrl } from '../utilities/platform-registry.utility';
import { SourceUrlGuardService } from './source-url-guard.service';

/**
 * An app share link (`facebook.com/share/v/<code>`) names no video: the platform answers it with
 * one redirect to the real page, and yt-dlp's own extractors only know the real page. This follows
 * that ONE redirect through the SSRF guard (public address, DNS pinned, host on the platform's
 * suffix) and re-parses the target with the registry; the result must be the same platform and
 * not another share link. Anything else keeps the share link as it was (the server then cannot read
 * it and the viewer falls back, exactly as before).
 */
@Injectable()
export class ShareLinkService {
  private readonly logger = new Logger(ShareLinkService.name);

  constructor(private readonly guard: SourceUrlGuardService) {}

  async follow(resolution: PlatformResolution): Promise<PlatformResolution> {
    const suffix = resolution.match.shareRedirectSuffix;
    if (suffix === undefined) return resolution;
    const location = await this.redirectTarget(new URL(resolution.match.watchUrl), suffix);
    const target = location === null ? null : resolvePlatformUrl(location);
    const usable =
      target !== null &&
      target.definition.platform === resolution.definition.platform &&
      target.match.shareRedirectSuffix === undefined;
    if (!usable) {
      this.logger.warn(`share link ${resolution.match.id} did not lead to a video page`);
      return resolution;
    }
    return target;
  }

  /** The Location of the share link's redirect when it stays on `suffix`, else null. */
  private async redirectTarget(url: URL, suffix: string): Promise<URL | null> {
    try {
      const addresses = await this.guard.assertSafeOnSuffixes(url, [suffix]);
      await pinnedGet(url, addresses, {
        timeoutMs: SHARE_REDIRECT_TIMEOUT_MS,
        maxBytes: SHARE_REDIRECT_MAX_BYTES,
        headers: { 'user-agent': SHARE_REDIRECT_USER_AGENT },
      });
      return null;
    } catch (error: unknown) {
      if (!(error instanceof PinnedRequestError) || error.location === null) return null;
      const target = new URL(error.location, url);
      const host = target.hostname.toLowerCase();
      const onSuffix = host === suffix || host.endsWith(`.${suffix}`);
      return onSuffix && target.protocol === 'https:' ? target : null;
    }
  }
}
