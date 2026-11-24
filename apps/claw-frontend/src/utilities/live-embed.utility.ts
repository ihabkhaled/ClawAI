import {
  LIVE_CHAT_ALLOWED_ORIGINS,
  LIVE_CHAT_EMBED_DOMAIN_PARAM,
  LIVE_CHAT_TWITCH_DARK_FLAG,
  LIVE_CHAT_TWITCH_DARK_FLAG_PATTERN,
  LIVE_CHAT_TWITCH_ORPHAN_AMPERSAND,
  LIVE_CHAT_YOUTUBE_DARK_PARAM,
  LIVE_EMBED_ALLOWED_ORIGINS,
  LIVE_EMBED_PARENT_PARAM,
} from '@/constants/live-embed.constants';
import { LIVE_PLATFORM_NAMES } from '@/constants/live.constants';
import { LiveCapability, LivePlatform } from '@/enums/live.enum';
import { ResolvedTheme } from '@/enums/theme.enum';
import type { LiveEmbedView, LivePlatformFields } from '@/types/live.types';

import { youtubeWatchUrl } from './live-request.utility';

/** The URL itself when it is https and its origin is in the allowlist; anything else is null. */
export function allowlistedLiveUrl(
  url: string | null | undefined,
  allowedOrigins: ReadonlyArray<string>,
): string | null {
  if (url === null || url === undefined || url === '') {
    return null;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && allowedOrigins.includes(parsed.origin) ? url : null;
  } catch {
    return null;
  }
}

/** Appends `name=<value>` to a URL as text, so flag-only params such as Twitch's `?darkpopout` stay as they are. */
export function appendLiveQueryParam(url: string, name: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${name}=${encodeURIComponent(value)}`;
}

/** The player iframe URL: allowlisted, plus `parent=<hostname>` when the platform needs it (Twitch). */
export function buildLivePlayerEmbedUrl(
  embedUrl: string | null,
  embedNeedsParent: boolean,
  hostname: string,
): string | null {
  const safe = allowlistedLiveUrl(embedUrl, LIVE_EMBED_ALLOWED_ORIGINS);
  if (safe === null) {
    return null;
  }
  return embedNeedsParent && hostname !== ''
    ? appendLiveQueryParam(safe, LIVE_EMBED_PARENT_PARAM, hostname)
    : safe;
}

/** The chat iframe URL: allowlisted, plus `parent` (Twitch) or `embed_domain` (YouTube). */
export function buildLiveChatEmbedUrl(
  fields: Pick<LivePlatformFields, 'chatEmbedUrl' | 'embedNeedsParent' | 'chatNeedsEmbedDomain'>,
  hostname: string,
): string | null {
  let url = allowlistedLiveUrl(fields.chatEmbedUrl, LIVE_CHAT_ALLOWED_ORIGINS);
  if (url === null || hostname === '') {
    return url;
  }
  if (fields.embedNeedsParent) {
    url = appendLiveQueryParam(url, LIVE_EMBED_PARENT_PARAM, hostname);
  }
  if (fields.chatNeedsEmbedDomain) {
    url = appendLiveQueryParam(url, LIVE_CHAT_EMBED_DOMAIN_PARAM, hostname);
  }
  return url;
}

/**
 * The chat URL in the page's theme. YouTube takes `dark_theme=1`, Twitch the `darkpopout` flag (the
 * server always sends it, so it is removed for light). Kick's popout chat is dark only.
 */
export function themeLiveChatUrl(
  url: string,
  platform: LivePlatform | null,
  theme: ResolvedTheme,
): string {
  const dark = theme === ResolvedTheme.DARK;
  if (platform === LivePlatform.YOUTUBE) {
    return dark ? appendLiveQueryParam(url, LIVE_CHAT_YOUTUBE_DARK_PARAM, '1') : url;
  }
  if (platform !== LivePlatform.TWITCH) {
    return url;
  }
  const plain = url
    .replace(LIVE_CHAT_TWITCH_DARK_FLAG_PATTERN, '')
    .replace(LIVE_CHAT_TWITCH_ORPHAN_AMPERSAND, '/chat?');
  if (!dark) {
    return plain;
  }
  return `${plain}${plain.includes('?') ? '&' : '?'}${LIVE_CHAT_TWITCH_DARK_FLAG}`;
}

/** The `color-scheme` of the chat document: Kick's popout is always dark, the others follow the page. */
export function liveChatColorScheme(
  platform: LivePlatform | null,
  theme: ResolvedTheme,
): ResolvedTheme {
  return platform === LivePlatform.KICK ? ResolvedTheme.DARK : theme;
}

/** A platform page for "Watch on" and "Open chat on": https only, never javascript: or data:. */
export function safeLiveWatchUrl(url: string | null | undefined): string | null {
  if (url === null || url === undefined || url === '') {
    return null;
  }
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** The brand name of a platform, or null (an HLS source, or a server older than batch 2). */
export function livePlatformName(platform: LivePlatform | null | undefined): string | null {
  return platform === null || platform === undefined ? null : LIVE_PLATFORM_NAMES[platform];
}

/**
 * Everything the player and side panel show for a session's platform. An HLS source (no platform)
 * gets no watch link; a YouTube session from an older server falls back to its nocookie embed's page.
 */
export function buildLiveEmbedView(
  session: LivePlatformFields & { embedUrl: string | null; capability: LiveCapability },
  hostname: string,
  theme: ResolvedTheme = ResolvedTheme.DARK,
): LiveEmbedView {
  const chatUrl = buildLiveChatEmbedUrl(session, hostname);
  const platformName = livePlatformName(session.platform);
  const watchUrl =
    safeLiveWatchUrl(session.watchUrl) ??
    (platformName === null ? null : youtubeWatchUrl(session.embedUrl));
  return {
    playerUrl:
      session.capability === LiveCapability.LINK_ONLY
        ? null
        : buildLivePlayerEmbedUrl(session.embedUrl, session.embedNeedsParent, hostname),
    chatUrl: chatUrl === null ? null : themeLiveChatUrl(chatUrl, session.platform, theme),
    chatColorScheme: liveChatColorScheme(session.platform, theme),
    watchUrl: platformName === null ? null : watchUrl,
    platformName,
  };
}
