import {
  BIGO_HOSTS,
  BIGO_ID_PATTERN,
  BIGO_LANGUAGE_PATTERN,
  BIGO_WATCH_BASE_URL,
  BILIBILI_LIVE_HOST,
  BILIBILI_ROOM_PATTERN,
  BILIBILI_VIDEO_BASE_URL,
  BILIBILI_VIDEO_HOSTS,
  BILIBILI_VIDEO_ID_PATTERN,
  BILIBILI_WATCH_BASE_URL,
  CHZZK_CHANNEL_PATTERN,
  CHZZK_HOST,
  CHZZK_WATCH_BASE_URL,
  DISCORD_HOSTS,
  INSTAGRAM_HOSTS,
  INSTAGRAM_MEDIA_CODE_PATTERN,
  INSTAGRAM_MEDIA_KINDS,
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
  TIKTOK_ANY_USER_VIDEO_BASE_URL,
  TIKTOK_EMBED_BASE_URL,
  TIKTOK_HOSTS,
  TIKTOK_HTML_SUFFIX,
  TIKTOK_ID_PATH_PREFIXES,
  TIKTOK_SHORT_CODE_PATTERN,
  TIKTOK_SHORT_HOSTS,
  TIKTOK_USER_PATTERN,
  TIKTOK_VIDEO_ID_PATTERN,
  TIKTOK_WATCH_BASE_URL,
  TIKTOK_WATCH_SUFFIX,
} from '../constants/platforms.constants';
import type { PlatformMatch } from '../types/platform.types';
import { hostIn, matching, pathSegments } from './platform-url-helpers.utility';

// Parsers for platforms without an embeddable player (LINK_ONLY), plus Discord (refused).

function linkOnly(id: string, watchUrl: string): PlatformMatch {
  return { id, watchUrl, embedUrl: null, chatEmbedUrl: null };
}

/**
 * `tiktok.com/@<user>/live` or `tiktok.com/@<user>` (live), `tiktok.com/@<user>/video/<id>` (a
 * recorded video, with the official embed) and the share links `vt.tiktok.com/<code>`,
 * `vm.tiktok.com/<code>` and `tiktok.com/t/<code>`.
 */
/**
 * `/embed/<id>`, `/embed/v2/<id>`, `/player/v1/<id>` and `m.tiktok.com/v/<id>.html`: shapes yt-dlp has
 * no extractor for (2026-11-26), read as `www.tiktok.com/@/video/<id>`.
 */
function tiktokIdOnlyVideo(segments: readonly string[]): PlatformMatch | null {
  const [first, ...rest] = segments;
  if (first === undefined || !TIKTOK_ID_PATH_PREFIXES.has(first) || rest.length === 0) return null;
  const last = rest.at(-1) ?? '';
  const raw = last.endsWith(TIKTOK_HTML_SUFFIX) ? last.slice(0, -TIKTOK_HTML_SUFFIX.length) : last;
  const id = matching(raw, TIKTOK_VIDEO_ID_PATTERN);
  if (!id || rest.length > 2) return null;
  return {
    ...linkOnly(`video:${id}`, `${TIKTOK_ANY_USER_VIDEO_BASE_URL}${id}`),
    embedUrl: `${TIKTOK_EMBED_BASE_URL}${id}`,
    portrait: true,
  };
}

export function parseTiktokUrl(url: URL): PlatformMatch | null {
  const segments = pathSegments(url);
  if (hostIn(url, TIKTOK_SHORT_HOSTS) || (hostIn(url, TIKTOK_HOSTS) && segments[0] === 't')) {
    const code = matching(segments.at(-1), TIKTOK_SHORT_CODE_PATTERN);
    const short = segments.length === (segments[0] === 't' ? 2 : 1) ? code : null;
    return short
      ? { ...linkOnly(`short:${short}`, `${url.origin}${url.pathname}`), portrait: true }
      : null;
  }
  if (!hostIn(url, TIKTOK_HOSTS)) return null;
  const [first, second, third] = segments;
  const bare = tiktokIdOnlyVideo(segments);
  if (bare) return bare;
  if (!first?.startsWith('@')) return null;
  const user = matching(first.slice(1), TIKTOK_USER_PATTERN)?.toLowerCase();
  if (!user) return null;
  if (second === 'video') {
    const id = matching(third, TIKTOK_VIDEO_ID_PATTERN);
    return id
      ? {
          ...linkOnly(`video:${id}`, `${TIKTOK_WATCH_BASE_URL}${user}/video/${id}`),
          embedUrl: `${TIKTOK_EMBED_BASE_URL}${id}`,
          portrait: true,
        }
      : null;
  }
  return second !== undefined && second !== 'live'
    ? null
    : linkOnly(user, `${TIKTOK_WATCH_BASE_URL}${user}${TIKTOK_WATCH_SUFFIX}`);
}

/**
 * `instagram.com/<user>/live` or `instagram.com/<user>` (live), and a recorded reel or post
 * `instagram.com/{reel,reels,p,tv}/<code>` (with the official embed).
 */
export function parseInstagramUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, INSTAGRAM_HOSTS)) return null;
  const [first, second, third] = pathSegments(url);
  if (first === undefined) return null;
  const kind = INSTAGRAM_MEDIA_KINDS.get(first.toLowerCase());
  if (kind !== undefined) {
    const code = matching(second, INSTAGRAM_MEDIA_CODE_PATTERN);
    if (!code || third !== undefined) return null;
    const watchUrl = `${INSTAGRAM_WATCH_BASE_URL}${kind}/${code}/`;
    return {
      ...linkOnly(`media:${code}`, watchUrl),
      embedUrl: `${watchUrl}embed`,
      portrait: kind === 'reel',
    };
  }
  if (INSTAGRAM_RESERVED_PATHS.has(first.toLowerCase())) return null;
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
  if (hostIn(url, BILIBILI_VIDEO_HOSTS)) {
    const [first, second, third] = pathSegments(url);
    const id =
      first === 'video' && third === undefined ? matching(second, BILIBILI_VIDEO_ID_PATTERN) : null;
    return id ? linkOnly(`video:${id}`, `${BILIBILI_VIDEO_BASE_URL}${id}`) : null;
  }
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
