import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { LiveSourceReasonCode } from '../../../common/enums/live-source-reason-code.enum';
import { sha256Hex } from '../../../common/utilities/hash.utility';
import { LiveCapability, LiveSourceKind, type LiveStream } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  FIXTURE_URL_PREFIX,
  HLS_PLAYLIST_EXTENSION,
  NON_PLATFORM_FIELDS,
  PRIVATE_ACCESS_SCOPE_PREFIX,
  PUBLIC_ACCESS_SCOPE,
} from '../constants/sources.constants';
import type { PlatformResolution } from '../types/platform.types';
import type { SourceResolution } from '../types/source-resolution.types';
import { resolvePlatformUrl } from '../utilities/platform-registry.utility';
import { normalizeSourceUrl } from '../utilities/source-url.utility';
import { isYoutubeHandleUrl } from '../utilities/youtube-url.utility';
import { FixtureBroadcasterService } from './fixture-broadcaster.service';
import { SourceUrlGuardService } from './source-url-guard.service';

/** Classifies a pasted URL (platform registry, HLS, fixture) and stores the LiveStream row (section 1). */
@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guard: SourceUrlGuardService,
    private readonly fixtures: FixtureBroadcasterService,
  ) {}

  async resolve(rawUrl: string, userId: string): Promise<SourceResolution> {
    const input = rawUrl.trim();
    if (input.startsWith(FIXTURE_URL_PREFIX)) return this.resolveFixture(input);
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new UnprocessableEntityException(LiveSourceErrorCode.SOURCE_UNSUPPORTED);
    }
    const platform = resolvePlatformUrl(url);
    if (platform) return this.resolvePlatform(platform, userId);
    if (isYoutubeHandleUrl(url)) {
      throw new UnprocessableEntityException(LiveSourceErrorCode.YOUTUBE_HANDLE_UNSUPPORTED);
    }
    if (url.pathname.toLowerCase().endsWith(HLS_PLAYLIST_EXTENSION)) {
      return this.resolveHls(url, userId);
    }
    throw new UnprocessableEntityException(LiveSourceErrorCode.SOURCE_UNSUPPORTED);
  }

  /** Create-or-refresh the LiveStream for a resolution (unique sourceIdentity + accessScope). */
  async upsertStream(resolution: SourceResolution): Promise<LiveStream> {
    const fields = {
      sourceKind: resolution.sourceKind,
      sourceUrl: resolution.normalizedUrl,
      declaredHost: resolution.declaredHost,
      capability: resolution.capability,
      platform: resolution.platform,
    };
    return this.prisma.liveStream.upsert({
      where: {
        sourceIdentity_accessScope: {
          sourceIdentity: resolution.sourceIdentity,
          accessScope: resolution.accessScope,
        },
      },
      create: {
        ...fields,
        sourceIdentity: resolution.sourceIdentity,
        accessScope: resolution.accessScope,
      },
      update: fields,
    });
  }

  private resolveFixture(input: string): SourceResolution {
    const name = input.slice(FIXTURE_URL_PREFIX.length);
    if (!this.fixtures.isFixtureName(name)) {
      throw new UnprocessableEntityException(LiveSourceErrorCode.SOURCE_UNSUPPORTED);
    }
    const normalizedUrl = `${FIXTURE_URL_PREFIX}${name}`;
    return {
      sourceKind: LiveSourceKind.FIXTURE,
      capability: LiveCapability.AUDIO_VISION,
      sourceIdentity: sha256Hex(normalizedUrl),
      accessScope: PUBLIC_ACCESS_SCOPE,
      normalizedUrl,
      declaredHost: null,
      embedUrl: null,
      reasonCode: null,
      ...NON_PLATFORM_FIELDS,
    };
  }

  /**
   * A registry platform (parsing only, no network call). BROWSER_CAPTURE sources are scoped
   * to the viewer (their own tab audio is never shared); LINK_ONLY never gets a run.
   */
  private resolvePlatform(
    { definition, match }: PlatformResolution,
    userId: string,
  ): SourceResolution {
    if (definition.refusalCode !== null || definition.capability === null) {
      throw new UnprocessableEntityException(
        definition.refusalCode ?? LiveSourceErrorCode.SOURCE_UNSUPPORTED,
      );
    }
    const capture = definition.capability === LiveCapability.BROWSER_CAPTURE;
    return {
      sourceKind: definition.sourceKind,
      capability: definition.capability,
      sourceIdentity: sha256Hex(`${definition.platform}:${match.id}`),
      accessScope: capture ? `${PRIVATE_ACCESS_SCOPE_PREFIX}${userId}` : PUBLIC_ACCESS_SCOPE,
      normalizedUrl: match.watchUrl,
      declaredHost: new URL(match.watchUrl).host,
      embedUrl: match.embedUrl,
      reasonCode: capture
        ? LiveSourceReasonCode.BROWSER_CAPTURE_AVAILABLE
        : LiveSourceReasonCode.LINK_ONLY_PLATFORM,
      platform: definition.platform,
      chatEmbedUrl: match.chatEmbedUrl,
      watchUrl: match.watchUrl,
      embedNeedsParent: definition.embedNeedsParent,
      chatNeedsEmbedDomain: definition.chatNeedsEmbedDomain && match.chatEmbedUrl !== null,
    };
  }

  private async resolveHls(url: URL, userId: string): Promise<SourceResolution> {
    await this.guard.assertSafe(url);
    const normalizedUrl = normalizeSourceUrl(url);
    const parsed = new URL(normalizedUrl);
    const accessScope =
      parsed.search === '' ? PUBLIC_ACCESS_SCOPE : `${PRIVATE_ACCESS_SCOPE_PREFIX}${userId}`;
    return {
      sourceKind: LiveSourceKind.HLS,
      capability: LiveCapability.AUDIO_VISION,
      sourceIdentity: sha256Hex(normalizedUrl),
      accessScope,
      normalizedUrl,
      declaredHost: parsed.host,
      embedUrl: null,
      reasonCode: null,
      ...NON_PLATFORM_FIELDS,
    };
  }
}
