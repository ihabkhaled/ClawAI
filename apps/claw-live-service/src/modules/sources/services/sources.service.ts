import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { LiveSourceReasonCode } from '../../../common/enums/live-source-reason-code.enum';
import { sha256Hex } from '../../../common/utilities/hash.utility';
import { LiveCapability, LiveSourceKind, type LiveStream } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  FIXTURE_URL_PREFIX,
  HLS_PLAYLIST_EXTENSION,
  PRIVATE_ACCESS_SCOPE_PREFIX,
  PUBLIC_ACCESS_SCOPE,
  YOUTUBE_CHANNEL_LIVE_EMBED_URL,
  YOUTUBE_CHANNEL_URL_BASE,
  YOUTUBE_DECLARED_HOST,
  YOUTUBE_EMBED_BASE_URL,
  YOUTUBE_EMBED_QUERY,
  YOUTUBE_WATCH_BASE_URL,
} from '../constants/sources.constants';
import type { SourceResolution } from '../types/source-resolution.types';
import { normalizeSourceUrl } from '../utilities/source-url.utility';
import {
  extractYoutubeChannelId,
  extractYoutubeId,
  isYoutubeHandleUrl,
} from '../utilities/youtube-url.utility';
import { FixtureBroadcasterService } from './fixture-broadcaster.service';
import { SourceUrlGuardService } from './source-url-guard.service';

/** Classifies a pasted URL into a source kind and stores the LiveStream row (section 1). */
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
    const youtubeId = extractYoutubeId(url);
    if (youtubeId) return this.resolveYoutube(youtubeId);
    const channelId = extractYoutubeChannelId(url);
    if (channelId) return this.resolveYoutubeChannel(channelId);
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
    };
  }

  private resolveYoutube(videoId: string): SourceResolution {
    return {
      sourceKind: LiveSourceKind.YOUTUBE,
      capability: LiveCapability.PLAYER_ONLY,
      sourceIdentity: sha256Hex(`youtube:${videoId}`),
      accessScope: PUBLIC_ACCESS_SCOPE,
      normalizedUrl: `${YOUTUBE_WATCH_BASE_URL}${videoId}`,
      declaredHost: YOUTUBE_DECLARED_HOST,
      embedUrl: `${YOUTUBE_EMBED_BASE_URL}${videoId}${YOUTUBE_EMBED_QUERY}`,
      reasonCode: LiveSourceReasonCode.YOUTUBE_ANALYSIS_NOT_PERMITTED,
    };
  }

  /** A channel's current live stream, played through YouTube's `live_stream` embed (player only). */
  private resolveYoutubeChannel(channelId: string): SourceResolution {
    return {
      sourceKind: LiveSourceKind.YOUTUBE,
      capability: LiveCapability.PLAYER_ONLY,
      sourceIdentity: sha256Hex(`youtube-channel:${channelId}`),
      accessScope: PUBLIC_ACCESS_SCOPE,
      normalizedUrl: `${YOUTUBE_CHANNEL_URL_BASE}${channelId}/live`,
      declaredHost: YOUTUBE_DECLARED_HOST,
      embedUrl: `${YOUTUBE_CHANNEL_LIVE_EMBED_URL}?channel=${channelId}&autoplay=1&playsinline=1`,
      reasonCode: LiveSourceReasonCode.YOUTUBE_ANALYSIS_NOT_PERMITTED,
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
    };
  }
}
