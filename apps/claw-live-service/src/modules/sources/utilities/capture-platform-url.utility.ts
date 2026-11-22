import {
  FACEBOOK_HOSTS,
  FACEBOOK_PAGE_PATTERN,
  FACEBOOK_PLAYER_BASE_URL,
  FACEBOOK_PLAYER_QUERY,
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
  KICK_WATCH_BASE_URL,
  TWITCH_CHANNEL_PATTERN,
  TWITCH_CHAT_BASE_URL,
  TWITCH_CHAT_SUFFIX,
  TWITCH_HOSTS,
  TWITCH_PLAYER_BASE_URL,
  TWITCH_PLAYER_QUERY,
  TWITCH_RESERVED_PATHS,
  TWITCH_WATCH_BASE_URL,
} from '../constants/platforms.constants';
import type { PlatformMatch } from '../types/platform.types';
import { hostIn, matching, pathSegments } from './platform-url-helpers.utility';

// Parsers for the platforms with an official player embed (BROWSER_CAPTURE).

/** `twitch.tv/<channel>`; the frontend appends `&parent=<hostname>` to player and chat. */
export function parseTwitchUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, TWITCH_HOSTS)) return null;
  const first = pathSegments(url)[0];
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

/** `kick.com/<user>`. */
export function parseKickUrl(url: URL): PlatformMatch | null {
  if (!hostIn(url, KICK_HOSTS)) return null;
  const first = pathSegments(url)[0];
  if (first === undefined || KICK_RESERVED_PATHS.has(first.toLowerCase())) return null;
  const user = matching(first, KICK_USER_PATTERN)?.toLowerCase();
  if (!user) return null;
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
 * `facebook.com/<page>/videos/<id>`, `facebook.com/watch/?v=<id>`,
 * `facebook.com/watch/live/?v=<id>` and `fb.watch/<code>`. No chat embed exists.
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
  const page = matching(segments[0], FACEBOOK_PAGE_PATTERN);
  const id = segments[1] === 'videos' ? matching(segments[2], FACEBOOK_VIDEO_ID_PATTERN) : null;
  return page && id ? facebookMatch(id, `${FACEBOOK_WATCH_BASE_URL}${page}/videos/${id}`) : null;
}
