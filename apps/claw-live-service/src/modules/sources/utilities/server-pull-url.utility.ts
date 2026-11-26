import {
  HLS_KEY_METHOD_NONE,
  HLS_KEY_TAG,
  PUBLIC_SECOND_LEVEL_LABEL,
  YTDLP_FORWARDED_HEADERS,
  YTDLP_HEADER_VALUE_PATTERN,
  YTDLP_VIDEO_ID_PATTERN,
  YTDLP_YOUTUBE_HOSTS,
} from '../constants/server-pull.constants';
import type { YtdlpStreamLine } from '../types/server-pull.types';

/**
 * The host suffix a pulled stream's playlists and segments may come from: the resolved URL's
 * registrable domain (`manifest.googlevideo.com` → `googlevideo.com`). The SSRF guard still
 * refuses any private address under it.
 */
export function streamHostSuffix(url: URL): string {
  const labels = url.hostname.toLowerCase().split('.');
  const last = labels.at(-1) ?? '';
  const second = labels.at(-2) ?? '';
  const keep = last.length === 2 && PUBLIC_SECOND_LEVEL_LABEL.test(second) ? 3 : 2;
  return labels.slice(-keep).join('.');
}

/**
 * The allow-listed headers of yt-dlp's `%(http_headers)j` (lower-case names): some CDNs answer 403
 * without the page's Referer or user agent (Roya, RaiPlay, Odysee, 2026-11-26). Never a cookie or
 * an authorization; {} when absent or not a JSON object.
 */
export function forwardedHeaders(json: string): Readonly<Record<string, string>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  const headers = new Map<string, string>();
  for (const [name, value] of Object.entries(parsed)) {
    const key = name.toLowerCase();
    if (!YTDLP_FORWARDED_HEADERS.has(key) || typeof value !== 'string') continue;
    if (YTDLP_HEADER_VALUE_PATTERN.test(value)) headers.set(key, value);
  }
  return Object.fromEntries(headers);
}

/**
 * Parses yt-dlp's `--print "%(protocol)s %(url)s %(id)s %(http_headers)j"` line: an https HLS URL,
 * the video id (null when absent or not a plain id) and the headers to send with it, else null.
 */
export function parseYtdlpStreamLine(output: string): YtdlpStreamLine | null {
  const line = output.trim().split('\n')[0] ?? '';
  const [protocol, raw, id, ...headerParts] = line.split(' ');
  if (protocol === undefined || raw === undefined || !protocol.startsWith('m3u8')) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    return {
      url,
      videoId: id !== undefined && YTDLP_VIDEO_ID_PATTERN.test(id) ? id : null,
      headers: forwardedHeaders(headerParts.join(' ')),
    };
  } catch {
    return null;
  }
}

/** True when the playlist's segments are encrypted (`#EXT-X-KEY` with a METHOD other than NONE). */
export function isEncryptedPlaylist(text: string): boolean {
  return text
    .split('\n')
    .some((line) => line.startsWith(HLS_KEY_TAG) && !line.includes(HLS_KEY_METHOD_NONE));
}

/** True for a YouTube link (it gets the YouTube client fallbacks when the default one is blocked). */
export function isYoutubeWatchUrl(watchUrl: string): boolean {
  try {
    return YTDLP_YOUTUBE_HOSTS.has(new URL(watchUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}
