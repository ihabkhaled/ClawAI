import { LivePlatform } from '../../../generated/prisma';
import {
  DAILYMOTION_EMBED_BASE_URL,
  DAILYMOTION_SHORT_HOST,
  VIDEO_PLATFORM_MAX_SEGMENTS,
  VIDEO_PLATFORM_SEGMENT_PATTERN,
  VIMEO_EMBED_BASE_URL,
  VIMEO_VIDEO_ID_PATTERN,
} from '../constants/video-platforms.constants';
import type { PlatformMatch, VideoPlatformHosts } from '../types/platform.types';
import { pathSegments } from './platform-url-helpers.utility';

/** The official player for a Dailymotion or Vimeo video; null for every other platform. */
function videoEmbedUrl(platform: LivePlatform, url: URL, segments: string[]): string | null {
  if (platform === LivePlatform.DAILYMOTION) {
    const short = url.hostname.toLowerCase() === DAILYMOTION_SHORT_HOST;
    // `dai.ly/<id>` or `dailymotion.com/video/<id>`.
    const id = short ? segments[0] : segments[1];
    const isVideo = short || segments[0] === 'video';
    return isVideo && id ? `${DAILYMOTION_EMBED_BASE_URL}${encodeURIComponent(id)}` : null;
  }
  if (platform === LivePlatform.VIMEO) {
    const id = segments.find((segment) => VIMEO_VIDEO_ID_PATTERN.test(segment));
    return id ? `${VIMEO_EMBED_BASE_URL}${id}` : null;
  }
  return null;
}

/**
 * A link on one of the host-matched platforms: any path of plain id segments (plus the query
 * params the platform needs) is accepted as written; yt-dlp later decides whether the server can
 * read it. The id is host + path, so `www.` and the bare host give the same stream.
 */
export function parseVideoPlatformUrl(url: URL, row: VideoPlatformHosts): PlatformMatch | null {
  const host = url.hostname.toLowerCase();
  if (!row.hosts.includes(host)) return null;
  const segments = pathSegments(url);
  if (segments.length > VIDEO_PLATFORM_MAX_SEGMENTS) return null;
  if (!segments.every((segment) => VIDEO_PLATFORM_SEGMENT_PATTERN.test(segment))) return null;
  // Kept as written (only when plain): yt-dlp matches e.g. Weibo's `fid=1034:4797` literally.
  const kept = (row.keepQuery ?? [])
    .map((name) => [name, url.searchParams.get(name)] as const)
    .filter(([, value]) => value !== null && VIDEO_PLATFORM_SEGMENT_PATTERN.test(value))
    .map(([name, value]) => `${name}=${String(value)}`);
  if (segments.length === 0 && kept.length === 0) return null;
  // Every segment already passed the plain-id pattern (no `/ ? # %` or space), so it is kept as
  // written: yt-dlp matches Odysee's `@channel:1/title:2` literally.
  const path = segments.join('/');
  const query = kept.length > 0 ? `?${kept.join('&')}` : '';
  return {
    id: `${host.replace(/^www\./u, '')}/${path}${query}`,
    watchUrl: `https://${host}/${path}${query}`,
    embedUrl: videoEmbedUrl(row.platform, url, segments),
    chatEmbedUrl: null,
  };
}
