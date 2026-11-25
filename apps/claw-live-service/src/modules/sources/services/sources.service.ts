import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { sha256Hex } from '../../../common/utilities/hash.utility';
import { LiveCapability, LiveSourceKind, type LiveStream } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import {
  FIXTURE_URL_PREFIX,
  HLS_PLAYLIST_EXTENSION,
  NON_PLATFORM_FIELDS,
  PRIVATE_ACCESS_SCOPE_PREFIX,
  PUBLIC_ACCESS_SCOPE,
} from '../constants/sources.constants';
import { ServerPullProbe } from '../../../common/enums/live-server-pull-probe.enum';
import type { PlatformMatch, PlatformResolution } from '../types/platform.types';
import type { ServerPullOutcome } from '../types/server-pull.types';
import type { SourceResolution } from '../types/source-resolution.types';
import {
  assertAnalysable,
  platformReasonCode,
  resolvePlatformUrl,
} from '../utilities/platform-registry.utility';
import { normalizeSourceUrl } from '../utilities/source-url.utility';
import { isYoutubeHandleUrl, liveChatEmbedUrl } from '../utilities/youtube-url.utility';
import { FixtureBroadcasterService } from './fixture-broadcaster.service';
import { RecordedVideoService } from './recorded-video.service';
import { ShareLinkService } from './share-link.service';
import { ServerPullResolverService } from './server-pull-resolver.service';
import { SourceUrlGuardService } from './source-url-guard.service';

/** Classifies a pasted URL (platform registry, HLS, fixture) and stores the LiveStream row (section 1). */
@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guard: SourceUrlGuardService,
    private readonly fixtures: FixtureBroadcasterService,
    private readonly serverPull: ServerPullResolverService,
    private readonly policy: LivePolicyService,
    private readonly recordedVideos: RecordedVideoService,
    private readonly shareLinks: ShareLinkService,
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
    const parsed = resolvePlatformUrl(url);
    if (parsed) {
      const platform = await this.shareLinks.follow(parsed);
      return this.resolvePlatform(platform, userId, await this.serverPullFor(platform));
    }
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
   * Whether a platform stream is server-pulled: NOT_ENABLED (refused platform, policy off or no
   * resolver; no network call), LIVE (the playlist answers), RECORDED (not live, but a recorded
   * video within the policy's length) or UNREACHABLE (offline, unreadable).
   * Link-only platforms are tried too: a readable one becomes SERVER_PULL or RECORDED.
   */
  private async serverPullFor({
    definition,
    match,
  }: PlatformResolution): Promise<ServerPullOutcome> {
    const off = { probe: ServerPullProbe.NOT_ENABLED, videoId: null };
    if (definition.capability === null) return off;
    if (!this.serverPull.supports(definition.platform)) return off;
    const { config } = await this.policy.active();
    if (!config.serverPullPlatforms.includes(definition.platform)) return off;
    const pull = await this.serverPull.probe(definition.platform, match);
    return pull !== null
      ? { probe: ServerPullProbe.LIVE, videoId: pull.videoId }
      : this.recordedFor(match, config.recordedVideoMaxSeconds);
  }

  /** A recorded video within `maxSeconds` is RECORDED; longer is refused; unreadable stays UNREACHABLE. */
  private async recordedFor(match: PlatformMatch, maxSeconds: number): Promise<ServerPullOutcome> {
    const unreachable = { probe: ServerPullProbe.UNREACHABLE, videoId: null };
    if (maxSeconds === 0) return unreachable;
    const recorded = await this.recordedVideos.probe(match.watchUrl);
    if (recorded === null) return unreachable;
    if (recorded.durationSeconds !== null && recorded.durationSeconds > maxSeconds) {
      throw new UnprocessableEntityException(LiveSourceErrorCode.RECORDED_TOO_LONG);
    }
    return {
      probe: ServerPullProbe.RECORDED,
      videoId: recorded.videoId,
      durationSeconds: recorded.durationSeconds,
      portrait: recorded.portrait,
    };
  }

  /**
   * A registry platform. SERVER_PULL streams are PUBLIC (one run shared by every viewer);
   * BROWSER_CAPTURE and RECORDED sources are scoped to the viewer (their own tab audio, their own
   * play-along position);
   * LINK_ONLY never gets a run.
   */
  private resolvePlatform(
    { definition, match }: PlatformResolution,
    userId: string,
    outcome: ServerPullOutcome,
  ): SourceResolution {
    const { probe, videoId } = outcome;
    const capability = this.capabilityFor(probe, assertAnalysable(definition));
    // Tab audio and a recorded video's play-along position are the viewer's own: never shared.
    const isPrivate =
      capability === LiveCapability.BROWSER_CAPTURE || capability === LiveCapability.RECORDED;
    const chatEmbedUrl = this.chatFor({ definition, match }, capability, probe, videoId);
    return {
      sourceKind: definition.sourceKind,
      capability,
      sourceIdentity: sha256Hex(`${definition.platform}:${match.id}`),
      accessScope: isPrivate ? `${PRIVATE_ACCESS_SCOPE_PREFIX}${userId}` : PUBLIC_ACCESS_SCOPE,
      normalizedUrl: match.watchUrl,
      declaredHost: new URL(match.watchUrl).host,
      embedUrl: match.embedUrl,
      reasonCode: platformReasonCode(capability, probe),
      platform: definition.platform,
      chatEmbedUrl,
      watchUrl: match.watchUrl,
      embedNeedsParent: definition.embedNeedsParent,
      chatNeedsEmbedDomain: definition.chatNeedsEmbedDomain && chatEmbedUrl !== null,
      durationSeconds: outcome.durationSeconds ?? null,
      // The site's frame size wins; else the link shape (reel, short, TikTok video).
      portrait: outcome.portrait ?? match.portrait ?? false,
    };
  }

  /** The live chat embed; a recorded video has none, a pulled channel gets its live video's chat. */
  private chatFor(
    { definition, match }: PlatformResolution,
    capability: LiveCapability,
    probe: ServerPullProbe,
    videoId: string | null,
  ): string | null {
    if (capability === LiveCapability.RECORDED) return null;
    const pulledVideoId = probe === ServerPullProbe.LIVE ? videoId : null;
    return liveChatEmbedUrl(definition.platform, match.chatEmbedUrl, pulledVideoId);
  }

  private capabilityFor(probe: ServerPullProbe, fallback: LiveCapability): LiveCapability {
    if (probe === ServerPullProbe.LIVE) return LiveCapability.SERVER_PULL;
    if (probe === ServerPullProbe.RECORDED) return LiveCapability.RECORDED;
    return fallback;
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
