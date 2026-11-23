import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { pinnedGet } from '../../../common/utilities/pinned-request.utility';
import { runBoundedProcess } from '../../../common/utilities/process.utility';
import { LivePlatform } from '../../../generated/prisma';
import {
  SERVER_PULL_CACHE_MAX_ENTRIES,
  SERVER_PULL_CACHE_TTL_MS,
  SERVER_PULL_PLATFORMS,
  SERVER_PULL_REQUEST_TIMEOUT_MS,
  TWITCH_CDN_HOST_SUFFIXES,
  TWITCH_GQL_HOST_SUFFIXES,
  TWITCH_GQL_URL,
  TWITCH_PLAYBACK_TOKEN_QUERY,
  TWITCH_TOKEN_MAX_BYTES,
  TWITCH_USHER_BASE_URL,
  TWITCH_USHER_RANDOM_MAX,
  YTDLP_ARGS,
  YTDLP_BINARY,
  YTDLP_MAX_CONCURRENT,
  YTDLP_MAX_OUTPUT_BYTES,
  YTDLP_TIMEOUT_MS,
} from '../constants/server-pull.constants';
import { HLS_PLAYLIST_MAX_BYTES } from '../constants/sources.constants';
import type { PlatformMatch } from '../types/platform.types';
import type { ResolvedPull } from '../types/server-pull.types';
import { parseYtdlpStreamLine, streamHostSuffix } from '../utilities/server-pull-url.utility';
import { parseTwitchPlaybackToken } from '../utilities/twitch-playback-token.utility';
import { HlsFetcherService } from './hls-fetcher.service';
import { SourceUrlGuardService } from './source-url-guard.service';

/**
 * Turns a platform stream into its live HLS playlist (server pull). Twitch: the token its own web
 * player asks for (when LIVE_TWITCH_CLIENT_ID is set). Every other platform, and Twitch without the
 * id: yt-dlp on the canonical watch URL we built, never the raw input. Every playlist and segment
 * is then fetched through the SSRF guard. Null = not live or unreadable: the caller falls back.
 *
 * Results are cached briefly (and concurrent asks share one lookup), so the resolve-time probe and
 * the worker's first poll spawn yt-dlp once.
 */
@Injectable()
export class ServerPullResolverService {
  private readonly cache = new Map<string, { at: number; pull: Promise<ResolvedPull | null> }>();
  private ytdlpRunning = 0;

  constructor(
    private readonly guard: SourceUrlGuardService,
    private readonly fetcher: HlsFetcherService,
  ) {}

  supports(platform: LivePlatform | null): boolean {
    return platform !== null && SERVER_PULL_PLATFORMS.includes(platform);
  }

  /** The stream's playlist; `fresh` skips the cache (the worker's token refresh). */
  async resolve(
    platform: LivePlatform | null,
    match: PlatformMatch,
    fresh = false,
  ): Promise<ResolvedPull | null> {
    if (platform === null || !this.supports(platform)) return null;
    const key = `${platform}:${match.id}`;
    const cached = this.cache.get(key);
    if (!fresh && cached && Date.now() - cached.at < SERVER_PULL_CACHE_TTL_MS) return cached.pull;
    const pull = this.lookup(platform, match).catch(() => null);
    this.remember(key, pull);
    return pull;
  }

  /** True when the playlist resolves AND answers (an offline channel gets none or a 404). */
  async probe(platform: LivePlatform | null, match: PlatformMatch): Promise<boolean> {
    const pull = await this.resolve(platform, match);
    return pull === null
      ? false
      : this.fetcher
          .fetchObject(pull.playlist, pull.hostSuffixes, HLS_PLAYLIST_MAX_BYTES)
          .then(() => true)
          .catch(() => false);
  }

  private lookup(platform: LivePlatform, match: PlatformMatch): Promise<ResolvedPull | null> {
    return platform === LivePlatform.TWITCH && AppConfig.get().LIVE_TWITCH_CLIENT_ID !== ''
      ? this.resolveTwitch(match.id)
      : this.resolveWithYtdlp(match.watchUrl);
  }

  private remember(key: string, pull: Promise<ResolvedPull | null>): void {
    this.cache.delete(key);
    this.cache.set(key, { at: Date.now(), pull });
    const oldest = this.cache.keys().next().value;
    if (this.cache.size > SERVER_PULL_CACHE_MAX_ENTRIES && oldest !== undefined) {
      this.cache.delete(oldest);
    }
  }

  /**
   * yt-dlp prints the chosen HLS format's protocol and URL; no shell, argv only, bounded in time,
   * output and concurrency (a full slot table answers null at once: the caller falls back).
   */
  private async resolveWithYtdlp(watchUrl: string): Promise<ResolvedPull | null> {
    if (this.ytdlpRunning >= YTDLP_MAX_CONCURRENT) return null;
    this.ytdlpRunning += 1;
    const result = await runBoundedProcess(YTDLP_BINARY, [...YTDLP_ARGS, '--', watchUrl], {
      timeoutMs: YTDLP_TIMEOUT_MS,
      maxOutputBytes: YTDLP_MAX_OUTPUT_BYTES,
    }).finally(() => {
      this.ytdlpRunning -= 1;
    });
    const playlist =
      result.exitCode === 0 ? parseYtdlpStreamLine(result.stdout.toString('utf8')) : null;
    return playlist === null ? null : { playlist, hostSuffixes: [streamHostSuffix(playlist)] };
  }

  /** The anonymous playback token the twitch.tv player asks for, then the usher master playlist. */
  private async resolveTwitch(login: string): Promise<ResolvedPull | null> {
    const gql = new URL(TWITCH_GQL_URL);
    const addresses = await this.guard.assertSafeOnSuffixes(gql, TWITCH_GQL_HOST_SUFFIXES);
    const reply = await pinnedGet(gql, addresses, {
      method: 'POST',
      timeoutMs: SERVER_PULL_REQUEST_TIMEOUT_MS,
      maxBytes: TWITCH_TOKEN_MAX_BYTES,
      headers: {
        'client-id': AppConfig.get().LIVE_TWITCH_CLIENT_ID,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'PlaybackAccessToken',
        query: TWITCH_PLAYBACK_TOKEN_QUERY,
        variables: { login },
      }),
    });
    const playback = parseTwitchPlaybackToken(reply.body.toString('utf8'));
    if (playback === null) return null;
    const playlist = new URL(`${TWITCH_USHER_BASE_URL}${encodeURIComponent(login)}.m3u8`);
    playlist.searchParams.set('sig', playback.signature);
    playlist.searchParams.set('token', playback.value);
    playlist.searchParams.set('allow_source', 'true');
    playlist.searchParams.set('allow_audio_only', 'true');
    playlist.searchParams.set('p', String(randomInt(TWITCH_USHER_RANDOM_MAX)));
    return { playlist, hostSuffixes: TWITCH_CDN_HOST_SUFFIXES };
  }
}
