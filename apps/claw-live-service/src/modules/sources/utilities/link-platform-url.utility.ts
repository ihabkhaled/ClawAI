import {
  BIGO_HOSTS,
  BIGO_ID_PATTERN,
  BIGO_LANGUAGE_PATTERN,
  BIGO_WATCH_BASE_URL,
  BILIBILI_LIVE_HOST,
  BILIBILI_ROOM_PATTERN,
  BILIBILI_WATCH_BASE_URL,
  CHZZK_CHANNEL_PATTERN,
  CHZZK_HOST,
  CHZZK_WATCH_BASE_URL,
  DISCORD_HOSTS,
  INSTAGRAM_HOSTS,
  INSTAGRAM_RESERVED_PATHS,
  INSTAGRAM_USER_PATTERN,
  INSTAGRAM_WATCH_BASE_URL,
  INSTAGRAM_WATCH_SUFFIX,
  LINKEDIN_HOSTS,
  LINKEDIN_ID_PATTERN,
  LINKEDIN_LIVE_PREFIXES,
  LINKEDIN_WATCH_BASE_URL,
  NIMO_HOSTS,
  NIMO_RESERVED_PATHS,
  NIMO_USER_PATTERN,
  NIMO_WATCH_BASE_URL,
  RUMBLE_CHANNEL_PATTERN,
  RUMBLE_HOSTS,
  RUMBLE_VIDEO_PATTERN,
  RUMBLE_WATCH_BASE_URL,
  SOOP_BROADCAST_NO_PATTERN,
  SOOP_HOSTS,
  SOOP_ID_PATTERN,
  SOOP_WATCH_BASE_URL,
  TELEGRAM_CHANNEL_PATTERN,
  TELEGRAM_HOSTS,
  TELEGRAM_LIVE_PARAMS,
  TELEGRAM_WATCH_BASE_URL,
  TIKTOK_HOSTS,
  TIKTOK_USER_PATTERN,
  TIKTOK_WATCH_BASE_URL,
  TIKTOK_WATCH_SUFFIX,
} from '../constants/platforms.constants';
import type { PlatformMatch } from '../types/platform.types';
import { hostIn, matching, pathSegments } from './platform-url-helpers.utility';

// Parsers for platforms without an embeddable player (LINK_ONLY), plus Discord (refused).

function linkOnly(id: string, watchUrl: string): PlatformMatch {
  return { id, watchUrl, embedUrl: null, chatEmbedUrl: null };
}

/** `tiktok.com/@<user>/live` or `tiktok.com/@<user>`. */
export function parseTiktokUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, TIKTOK_HOSTS)) return null;
  const [first, second] = pathSegments(url);
  if (!first?.startsWith('@') || (second !== undefined && second !== 'live')) return null;
  const user = matching(first.slice(1), TIKTOK_USER_PATTERN)?.toLowerCase();
  return user ? linkOnly(user, `${TIKTOK_WATCH_BASE_URL}${user}${TIKTOK_WATCH_SUFFIX}`) : null;
}

/** `instagram.com/<user>/live` or `instagram.com/<user>`. */
export function parseInstagramUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, INSTAGRAM_HOSTS)) return null;
  const [first, second] = pathSegments(url);
  if (first === undefined || INSTAGRAM_RESERVED_PATHS.has(first.toLowerCase())) return null;
  if (second !== undefined && second !== 'live') return null;
  const user = matching(first, INSTAGRAM_USER_PATTERN)?.toLowerCase();
  return user
    ? linkOnly(user, `${INSTAGRAM_WATCH_BASE_URL}${user}${INSTAGRAM_WATCH_SUFFIX}`)
    : null;
}

/** `rumble.com/v<id>-<slug>.html` or `rumble.com/c/<channel>/live`. */
export function parseRumbleUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, RUMBLE_HOSTS)) return null;
  const segments = pathSegments(url);
  const video = segments.length === 1 ? RUMBLE_VIDEO_PATTERN.exec(segments[0] ?? '') : null;
  if (video?.[1]) return linkOnly(video[1], `${RUMBLE_WATCH_BASE_URL}${segments[0] ?? ''}`);
  if (segments.length !== 3 || segments[0] !== 'c' || segments[2] !== 'live') return null;
  const channel = matching(segments[1], RUMBLE_CHANNEL_PATTERN);
  return channel ? linkOnly(`c:${channel}`, `${RUMBLE_WATCH_BASE_URL}c/${channel}/live`) : null;
}

/** `bigo.tv/<id>` or `www.bigo.tv/<lang>/<id>`. */
export function parseBigoUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, BIGO_HOSTS)) return null;
  const segments = pathSegments(url);
  let candidate: string | undefined;
  if (segments.length === 1) candidate = segments[0];
  else if (segments.length === 2 && BIGO_LANGUAGE_PATTERN.test(segments[0] ?? '')) {
    candidate = segments[1];
  }
  const id = matching(candidate, BIGO_ID_PATTERN);
  return id ? linkOnly(id, `${BIGO_WATCH_BASE_URL}${id}`) : null;
}

/** `linkedin.com/events/…`, `linkedin.com/video/live/…`, `linkedin.com/feed/update/…`. */
export function parseLinkedinUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, LINKEDIN_HOSTS)) return null;
  const segments = pathSegments(url);
  const prefix = LINKEDIN_LIVE_PREFIXES.find((parts) =>
    parts.every((part, index) => segments.at(index) === part),
  );
  if (!prefix) return null;
  const id = matching(segments.at(prefix.length), LINKEDIN_ID_PATTERN);
  if (!id) return null;
  const path = `${prefix.join('/')}/${encodeURIComponent(id)}`;
  return linkOnly(path, `${LINKEDIN_WATCH_BASE_URL}${path}/`);
}

/** `t.me/<channel>?livestream` (also `?videochat` and `?voicechat`). */
export function parseTelegramUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, TELEGRAM_HOSTS)) return null;
  const segments = pathSegments(url);
  const param = TELEGRAM_LIVE_PARAMS.find((name) => url.searchParams.has(name));
  if (segments.length !== 1 || !param) return null;
  const channel = matching(segments[0], TELEGRAM_CHANNEL_PATTERN)?.toLowerCase();
  return channel ? linkOnly(channel, `${TELEGRAM_WATCH_BASE_URL}${channel}?${param}`) : null;
}

/** `live.bilibili.com/<room>`. */
export function parseBilibiliUrl(url: URL): PlatformMatch | null {
  if (url.hostname.toLowerCase() !== BILIBILI_LIVE_HOST) return null;
  const segments = pathSegments(url);
  const room = segments.length === 1 ? matching(segments[0], BILIBILI_ROOM_PATTERN) : null;
  return room ? linkOnly(room, `${BILIBILI_WATCH_BASE_URL}${room}`) : null;
}

/** `chzzk.naver.com/live/<channelId>` or `chzzk.naver.com/<channelId>`. */
export function parseChzzkUrl(url: URL): PlatformMatch | null {
  if (url.hostname.toLowerCase() !== CHZZK_HOST) return null;
  const segments = pathSegments(url);
  const candidate = segments[0] === 'live' ? segments[1] : segments[0];
  const extra = segments.length > (segments[0] === 'live' ? 2 : 1);
  const channel = extra ? null : matching(candidate?.toLowerCase(), CHZZK_CHANNEL_PATTERN);
  return channel ? linkOnly(channel, `${CHZZK_WATCH_BASE_URL}${channel}`) : null;
}

/** `sooplive.co.kr/<id>`, `play.sooplive.co.kr/<id>[/<broadNo>]` and the legacy afreecatv.com links. */
export function parseSoopUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, SOOP_HOSTS)) return null;
  const segments = pathSegments(url);
  if (segments.length < 1 || segments.length > 2) return null;
  if (segments.length === 2 && !SOOP_BROADCAST_NO_PATTERN.test(segments[1] ?? '')) return null;
  const id = matching(segments[0], SOOP_ID_PATTERN)?.toLowerCase();
  return id ? linkOnly(id, `${SOOP_WATCH_BASE_URL}${id}`) : null;
}

/** `nimo.tv/<user>`. */
export function parseNimoUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, NIMO_HOSTS)) return null;
  const segments = pathSegments(url);
  const first = segments[0];
  if (segments.length !== 1 || first === undefined) return null;
  if (NIMO_RESERVED_PATHS.has(first.toLowerCase())) return null;
  const user = matching(first, NIMO_USER_PATTERN)?.toLowerCase();
  return user ? linkOnly(user, `${NIMO_WATCH_BASE_URL}${user}`) : null;
}

/** Any Discord link: matched only so it can be refused with LIVE_DISCORD_PRIVATE. */
export function parseDiscordUrl(url: URL): PlatformMatch | null {
  return hostIn(url, DISCORD_HOSTS) ? linkOnly('discord', url.origin) : null;
}
