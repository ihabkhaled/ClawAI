import { Readable } from 'node:stream';
import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';

import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { LiveSessionState, LiveSourceKind, type LiveStream } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  FIXTURE_PLAYLIST_FILE,
  FIXTURE_URL_PREFIX,
  HLS_PLAYLIST_CONTENT_TYPE,
  HLS_PLAYLIST_CONTENT_TYPES,
  HLS_PLAYLIST_EXTENSION,
  HLS_PLAYLIST_MAX_BYTES,
  HLS_PROXY_ENTRY_FILE,
  HLS_SEGMENT_CONTENT_TYPES,
  HLS_SEGMENT_FALLBACK_CONTENT_TYPE,
  HLS_SEGMENT_MAX_BYTES,
} from '../constants/sources.constants';
import type { HlsFetchedObject, HlsProxyReply } from '../types/hls-proxy.types';
import { decodeHlsProxyTarget } from '../utilities/hls-proxy-url.utility';
import { rewritePlaylist } from '../utilities/playlist-rewrite.utility';
import { FixtureBroadcasterService } from './fixture-broadcaster.service';
import { HlsFetcherService } from './hls-fetcher.service';

/**
 * Same-origin HLS proxy (architecture section 1). Only a caller holding a non-DETACHED
 * viewer session on the stream is served (404 otherwise, never revealing the stream);
 * only the stream's declared host is fetched; playlists are rewritten so every URI
 * points back here. FIXTURE streams are served from the local broadcaster.
 */
@Injectable()
export class HlsProxyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: HlsFetcherService,
    private readonly fixtures: FixtureBroadcasterService,
  ) {}

  /** `GET …/hls/:file` — the entry playlist, or a fixture segment file. */
  async file(streamId: string, userId: string, file: string): Promise<HlsProxyReply> {
    const stream = await this.authorizedStream(streamId, userId);
    if (stream.sourceKind === LiveSourceKind.FIXTURE) return this.fixtureFile(stream, file);
    if (file !== HLS_PROXY_ENTRY_FILE)
      throw new NotFoundException(LiveSourceErrorCode.STREAM_NOT_FOUND);
    return this.fetchAndServe(new URL(stream.sourceUrl), stream);
  }

  /** `GET …/hls/p?u=<base64url>` — one rewritten origin URI of an HLS stream. */
  async proxied(
    streamId: string,
    userId: string,
    encoded: string | undefined,
  ): Promise<HlsProxyReply> {
    const stream = await this.authorizedStream(streamId, userId);
    const target = decodeHlsProxyTarget(encoded);
    if (stream.sourceKind !== LiveSourceKind.HLS || target?.host !== stream.declaredHost) {
      throw new NotFoundException(LiveSourceErrorCode.STREAM_NOT_FOUND);
    }
    return this.fetchAndServe(target, stream);
  }

  private async authorizedStream(streamId: string, userId: string): Promise<LiveStream> {
    const session = await this.prisma.liveViewerSession.findFirst({
      where: { streamId, userId, state: { not: LiveSessionState.DETACHED } },
      select: { id: true },
    });
    const stream = session
      ? await this.prisma.liveStream.findUnique({ where: { id: streamId } })
      : null;
    if (!stream || stream.sourceKind === LiveSourceKind.YOUTUBE) {
      throw new NotFoundException(LiveSourceErrorCode.STREAM_NOT_FOUND);
    }
    return stream;
  }

  private async fixtureFile(stream: LiveStream, file: string): Promise<HlsProxyReply> {
    const name = stream.sourceUrl.slice(FIXTURE_URL_PREFIX.length);
    const body = await this.fixtures.readFile(name, file);
    const contentType =
      file === FIXTURE_PLAYLIST_FILE
        ? HLS_PLAYLIST_CONTENT_TYPE
        : HLS_SEGMENT_FALLBACK_CONTENT_TYPE;
    return { contentType, body: Readable.from([body]) };
  }

  private async fetchAndServe(url: URL, stream: LiveStream): Promise<HlsProxyReply> {
    const host = stream.declaredHost;
    if (!host) throw new NotFoundException(LiveSourceErrorCode.STREAM_NOT_FOUND);
    const isPlaylistUrl = url.pathname.toLowerCase().endsWith(HLS_PLAYLIST_EXTENSION);
    const fetched = await this.fetcher.fetchObject(
      url,
      host,
      isPlaylistUrl ? HLS_PLAYLIST_MAX_BYTES : HLS_SEGMENT_MAX_BYTES,
    );
    if (this.isPlaylist(fetched)) return this.servePlaylist(fetched, stream.id, host);
    if (!HLS_SEGMENT_CONTENT_TYPES.has(fetched.contentType)) {
      throw new BadGatewayException(LiveSourceErrorCode.UPSTREAM_CONTENT_TYPE);
    }
    return { contentType: fetched.contentType, body: Readable.from([fetched.body]) };
  }

  private isPlaylist(fetched: HlsFetchedObject): boolean {
    const looksLikePlaylist = fetched.body.subarray(0, 7).toString('utf8') === '#EXTM3U';
    return (
      looksLikePlaylist &&
      (HLS_PLAYLIST_CONTENT_TYPES.has(fetched.contentType) ||
        fetched.contentType === 'application/octet-stream')
    );
  }

  private servePlaylist(fetched: HlsFetchedObject, streamId: string, host: string): HlsProxyReply {
    if (fetched.body.length > HLS_PLAYLIST_MAX_BYTES) {
      throw new BadGatewayException(LiveSourceErrorCode.UPSTREAM_TOO_LARGE);
    }
    const rewritten = rewritePlaylist(fetched.body.toString('utf8'), fetched.url, streamId, host);
    if (rewritten.rejected > 0) throw new BadGatewayException(LiveSourceErrorCode.UPSTREAM_FAILED);
    return {
      contentType: HLS_PLAYLIST_CONTENT_TYPE,
      body: Readable.from([Buffer.from(rewritten.text, 'utf8')]),
    };
  }
}
