import { YOUTUBE_LIVE_CHAT_BASE_URL } from '../constants/platforms.constants';
import {
  YOUTUBE_CHANNEL_ID_PATTERN,
  YOUTUBE_CHANNEL_LIVE_EMBED_URL,
  YOUTUBE_CHANNEL_URL_BASE,
  YOUTUBE_EMBED_BASE_URL,
  YOUTUBE_EMBED_QUERY,
  YOUTUBE_HANDLE_PATH_PREFIXES,
  YOUTUBE_HOSTS,
  YOUTUBE_ID_PATH_PREFIXES,
  YOUTUBE_ID_PATTERN,
  YOUTUBE_SHORT_HOST,
  YOUTUBE_WATCH_BASE_URL,
} from '../constants/sources.constants';
import type { PlatformMatch } from '../types/platform.types';

function validId(candidate: string | null | undefined): string | null {
  return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * The 11-character video id of a YouTube URL (watch, live/, youtu.be, embed, shorts),
 * or null when the URL is not a YouTube video.
 */
export function extractYoutubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter((segment) => segment !== '');
  if (host === YOUTUBE_SHORT_HOST) return validId(segments[0]);
  if (!YOUTUBE_HOSTS.has(host)) return null;
  if (segments[0] === 'watch') return validId(url.searchParams.get('v'));
  return segments[0] && YOUTUBE_ID_PATH_PREFIXES.includes(segments[0])
    ? validId(segments[1])
    : null;
}

/** The channel id of a `/channel/UC…` or `/channel/UC…/live` link, or null. */
export function extractYoutubeChannelId(url: URL): string | null {
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
  const segments = url.pathname.split('/').filter((segment) => segment !== '');
  if (segments[0] !== 'channel' || !segments[1]) return null;
  return YOUTUBE_CHANNEL_ID_PATTERN.test(segments[1]) ? segments[1] : null;
}

/** True for a YouTube handle or vanity channel link (@name, /c/name, /user/name). */
export function isYoutubeHandleUrl(url: URL): boolean {
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return false;
  const first = url.pathname.split('/').find((segment) => segment !== '') ?? '';
  return first.startsWith('@') || YOUTUBE_HANDLE_PATH_PREFIXES.includes(first);
}

/** A YouTube video link as a registry match: nocookie player plus the official live-chat embed. */
export function parseYoutubeVideoUrl(url: URL): PlatformMatch | null {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  return {
    id: videoId,
    watchUrl: `${YOUTUBE_WATCH_BASE_URL}${videoId}`,
    embedUrl: `${YOUTUBE_EMBED_BASE_URL}${videoId}${YOUTUBE_EMBED_QUERY}`,
    chatEmbedUrl: `${YOUTUBE_LIVE_CHAT_BASE_URL}${videoId}`,
  };
}

/** A `/channel/UC…` link as a registry match: the `live_stream` embed, no chat (it needs a video id). */
export function parseYoutubeChannelUrl(url: URL): PlatformMatch | null {
  const channelId = extractYoutubeChannelId(url);
  if (!channelId) return null;
  return {
    id: `channel:${channelId}`,
    watchUrl: `${YOUTUBE_CHANNEL_URL_BASE}${channelId}/live`,
    embedUrl: `${YOUTUBE_CHANNEL_LIVE_EMBED_URL}?channel=${channelId}&autoplay=1&playsinline=1`,
    chatEmbedUrl: null,
  };
}
