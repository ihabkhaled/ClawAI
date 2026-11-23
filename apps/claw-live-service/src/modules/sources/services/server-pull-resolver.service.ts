import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { pinnedGet } from '../../../common/utilities/pinned-request.utility';
import { LivePlatform } from '../../../generated/prisma';
import {
  SERVER_PULL_PLATFORMS,
  SERVER_PULL_REQUEST_TIMEOUT_MS,
  TWITCH_CDN_HOST_SUFFIXES,
  TWITCH_GQL_HOST_SUFFIXES,
  TWITCH_GQL_URL,
  TWITCH_PLAYBACK_TOKEN_QUERY,
  TWITCH_TOKEN_MAX_BYTES,
  TWITCH_USHER_BASE_URL,
  TWITCH_USHER_RANDOM_MAX,
  TWITCH_WEB_CLIENT_ID,
} from '../constants/server-pull.constants';
import { HLS_PLAYLIST_MAX_BYTES } from '../constants/sources.constants';
import { parseTwitchPlaybackToken } from '../utilities/twitch-playback-token.utility';
import { HlsFetcherService } from './hls-fetcher.service';
import { SourceUrlGuardService } from './source-url-guard.service';

/**
 * Turns a platform stream id into its live master playlist URL (server pull). Every request goes
 * through the SSRF guard and a DNS-pinned connection, like any HLS origin. Null = not live,
 * refused or unreachable: the caller falls back to browser capture, it never retries harder.
 */
@Injectable()
export class ServerPullResolverService {
  constructor(
    private readonly guard: SourceUrlGuardService,
    private readonly fetcher: HlsFetcherService,
  ) {}

  supports(platform: LivePlatform | null): boolean {
    return platform !== null && SERVER_PULL_PLATFORMS.includes(platform);
  }

  /** Hosts the worker may fetch a pulled stream's playlists and segments from. */
  hostSuffixes(platform: LivePlatform | null): readonly string[] | null {
    return platform === LivePlatform.TWITCH ? TWITCH_CDN_HOST_SUFFIXES : null;
  }

  async resolvePlaylist(platform: LivePlatform | null, id: string): Promise<URL | null> {
    return platform === LivePlatform.TWITCH ? this.resolveTwitch(id).catch(() => null) : null;
  }

  /** True when the playlist resolves AND answers (a channel that is offline gets a 404). */
  async probe(platform: LivePlatform | null, id: string): Promise<boolean> {
    const playlist = await this.resolvePlaylist(platform, id);
    const suffixes = this.hostSuffixes(platform);
    return playlist === null || suffixes === null
      ? false
      : this.fetcher
          .fetchObject(playlist, suffixes, HLS_PLAYLIST_MAX_BYTES)
          .then(() => true)
          .catch(() => false);
  }

  /** The anonymous playback token the twitch.tv player asks for, then the usher master playlist. */
  private async resolveTwitch(login: string): Promise<URL | null> {
    const gql = new URL(TWITCH_GQL_URL);
    const addresses = await this.guard.assertSafeOnSuffixes(gql, TWITCH_GQL_HOST_SUFFIXES);
    const reply = await pinnedGet(gql, addresses, {
      method: 'POST',
      timeoutMs: SERVER_PULL_REQUEST_TIMEOUT_MS,
      maxBytes: TWITCH_TOKEN_MAX_BYTES,
      headers: { 'client-id': TWITCH_WEB_CLIENT_ID, 'content-type': 'application/json' },
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
    return playlist;
  }
}
