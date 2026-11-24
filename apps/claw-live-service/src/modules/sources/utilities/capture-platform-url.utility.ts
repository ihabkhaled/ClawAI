import {
  FACEBOOK_HOSTS,
  FACEBOOK_PAGE_PATTERN,
  FACEBOOK_PLAYER_BASE_URL,
  FACEBOOK_PLAYER_QUERY,
  FACEBOOK_SHARE_KINDS,
  FACEBOOK_SHARE_REDIRECT_SUFFIX,
  FACEBOOK_SHORT_BASE_URL,
  FACEBOOK_SHORT_CODE_PATTERN,
  FACEBOOK_SHORT_HOST,
  FACEBOOK_VIDEO_ID_PATTERN,
  FACEBOOK_WATCH_BASE_URL,
  FACEBOOK_WATCH_QUERY_URL,
  KICK_CHAT_BASE_URL,
  KICK_CHAT_SUFFIX,
  KICK_HOSTS,
  KICK_PLAYER_BASE_URL,
  KICK_PLAYER_QUERY,
  KICK_RESERVED_PATHS,
  KICK_USER_PATTERN,
  KICK_VIDEO_ID_PATTERN,
  KICK_WATCH_BASE_URL,
  TWITCH_CHANNEL_PATTERN,
  TWITCH_CHAT_BASE_URL,
  TWITCH_CHAT_SUFFIX,
  TWITCH_CLIP_SLUG_PATTERN,
  TWITCH_CLIPS_BASE_URL,
  TWITCH_CLIPS_HOST,
  TWITCH_HOSTS,
  TWITCH_PLAYER_BASE_URL,
  TWITCH_PLAYER_QUERY,
  TWITCH_RESERVED_PATHS,
  TWITCH_VIDEO_ID_PATTERN,
  TWITCH_VIDEO_PLAYER_BASE_URL,
  TWITCH_WATCH_BASE_URL,
} from '../constants/platforms.constants';
import type { PlatformMatch } from '../types/platform.types';
import { hostIn, matching, pathSegments } from './platform-url-helpers.utility';

// Parsers for the platforms with an official player embed (BROWSER_CAPTURE).

/** A recorded Twitch link: a past broadcast (with its player) or a clip; null otherwise. */
function parseTwitchRecording(url: URL, segments: string[]): PlatformMatch | null {
  const [first, second, third] = segments;
  if (url.hostname.toLowerCase() === TWITCH_CLIPS_HOST || second === 'clip') {
    const slug = matching(
      url.hostname.toLowerCase() === TWITCH_CLIPS_HOST ? first : third,
      TWITCH_CLIP_SLUG_PATTERN,
    );
    return slug
      ? {
          id: `clip:${slug}`,
          watchUrl: `${TWITCH_CLIPS_BASE_URL}${slug}`,
          embedUrl: null,
          chatEmbedUrl: null,
        }
      : null;
  }
  if (first !== 'videos') return null;
  const video = matching(second, TWITCH_VIDEO_ID_PATTERN);
  return video
    ? {
        id: `video:${video}`,
        watchUrl: `${TWITCH_WATCH_BASE_URL}videos/${video}`,
        embedUrl: `${TWITCH_VIDEO_PLAYER_BASE_URL}${video}${TWITCH_PLAYER_QUERY}`,
        chatEmbedUrl: null,
      }
    : null;
}

/**
 * `twitch.tv/<channel>` (live; the frontend appends `&parent=<hostname>` to player and chat), a
 * past broadcast `twitch.tv/videos/<id>` and a clip (`clips.twitch.tv/<slug>`,
 * `twitch.tv/<channel>/clip/<slug>`).
 */
export function parseTwitchUrl(url: URL): PlatformMatch | null {
  const host = url.hostname.toLowerCase();
  if (!hostIn(url, TWITCH_HOSTS) && host !== TWITCH_CLIPS_HOST) return null;
  const segments = pathSegments(url);
  const recording = parseTwitchRecording(url, segments);
  if (recording !== null || host === TWITCH_CLIPS_HOST) return recording;
  const first = segments[0];
  if (first === undefined || TWITCH_RESERVED_PATHS.has(first.toLowerCase())) return null;
  const channel = matching(first, TWITCH_CHANNEL_PATTERN)?.toLowerCase();
  if (!channel) return null;
  return {
    id: channel,
    watchUrl: `${TWITCH_WATCH_BASE_URL}${channel}`,
    embedUrl: `${TWITCH_PLAYER_BASE_URL}${channel}${TWITCH_PLAYER_QUERY}`,
    chatEmbedUrl: `${TWITCH_CHAT_BASE_URL}${channel}${TWITCH_CHAT_SUFFIX}`,
  };
}

/** `kick.com/<user>` (live) or a past broadcast `kick.com/<user>/videos/<uuid>`. */
export function parseKickUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, KICK_HOSTS)) return null;
  const [first, second, third] = pathSegments(url);
  if (first === undefined || KICK_RESERVED_PATHS.has(first.toLowerCase())) return null;
  const user = matching(first, KICK_USER_PATTERN)?.toLowerCase();
  if (!user) return null;
  if (second === 'videos') {
    const video = matching(third?.toLowerCase(), KICK_VIDEO_ID_PATTERN);
    return video
      ? {
          id: `video:${video}`,
          watchUrl: `${KICK_WATCH_BASE_URL}${user}/videos/${video}`,
          embedUrl: null,
          chatEmbedUrl: null,
        }
      : null;
  }
  return {
    id: user,
    watchUrl: `${KICK_WATCH_BASE_URL}${user}`,
    embedUrl: `${KICK_PLAYER_BASE_URL}${user}${KICK_PLAYER_QUERY}`,
    chatEmbedUrl: `${KICK_CHAT_BASE_URL}${user}${KICK_CHAT_SUFFIX}`,
  };
}

function facebookMatch(id: string, watchUrl: string): PlatformMatch {
  return {
    id,
    watchUrl,
    embedUrl: `${FACEBOOK_PLAYER_BASE_URL}${encodeURIComponent(watchUrl)}${FACEBOOK_PLAYER_QUERY}`,
    chatEmbedUrl: null,
  };
}

/**
 * `facebook.com/<page>/videos/[<slug>/]<id>`, `facebook.com/watch/?v=<id>`,
 * `facebook.com/watch/live/?v=<id>`, `facebook.com/reel/<id>`, the app's share links
 * `facebook.com/share/{v,r,p}/<code>` and `fb.watch/<code>`. No chat embed exists.
 */
export function parseFacebookUrl(url: URL): PlatformMatch | null {
  const segments = pathSegments(url);
  if (url.hostname.toLowerCase() === FACEBOOK_SHORT_HOST) {
    const code = matching(segments[0], FACEBOOK_SHORT_CODE_PATTERN);
    return code ? facebookMatch(`fb.watch:${code}`, `${FACEBOOK_SHORT_BASE_URL}${code}/`) : null;
  }
  if (!hostIn(url, FACEBOOK_HOSTS)) return null;
  const isWatch =
    segments[0] === 'watch' &&
    (segments.length === 1 || (segments.length === 2 && segments[1] === 'live'));
  if (isWatch) {
    const id = matching(url.searchParams.get('v') ?? undefined, FACEBOOK_VIDEO_ID_PATTERN);
    return id ? facebookMatch(id, `${FACEBOOK_WATCH_QUERY_URL}${id}`) : null;
  }
  const [first, second] = segments;
  if (first === 'share' && second !== undefined && FACEBOOK_SHARE_KINDS.has(second)) {
    const code = matching(segments[2], FACEBOOK_SHORT_CODE_PATTERN);
    if (!code) return null;
    const share = facebookMatch(
      `share:${second}:${code}`,
      `${FACEBOOK_WATCH_BASE_URL}share/${second}/${code}/`,
    );
    return { ...share, shareRedirectSuffix: FACEBOOK_SHARE_REDIRECT_SUFFIX };
  }
  if (first === 'reel') {
    const id = matching(second, FACEBOOK_VIDEO_ID_PATTERN);
    return id ? facebookMatch(id, `${FACEBOOK_WATCH_BASE_URL}reel/${id}`) : null;
  }
  const page = matching(first, FACEBOOK_PAGE_PATTERN);
  // `<page>/videos/<id>` or `<page>/videos/<title-slug>/<id>`.
  const isVideo = second === 'videos' && segments.length <= 4;
  const id = isVideo ? matching(segments.at(-1), FACEBOOK_VIDEO_ID_PATTERN) : null;
  return page && id ? facebookMatch(id, `${FACEBOOK_WATCH_BASE_URL}${page}/videos/${id}`) : null;
}
