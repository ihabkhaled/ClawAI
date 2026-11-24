import { YOUTUBE_EMBED_ORIGIN } from '@/constants/marketing-videos.constants';

/**
 * Origins a live player iframe may load (the server's `embedUrl`). Anything else is refused, so a
 * bad or tampered URL can never frame an arbitrary page. Kept apart from live.constants so the CSP
 * builder (middleware) imports only these strings.
 */
export const LIVE_EMBED_ALLOWED_ORIGINS: ReadonlyArray<string> = [
  YOUTUBE_EMBED_ORIGIN,
  'https://player.twitch.tv',
  'https://player.kick.com',
  'https://www.facebook.com',
  // Recorded videos (ADR-221 batch 6): the platforms' official players.
  'https://www.instagram.com',
  'https://www.tiktok.com',
  'https://www.dailymotion.com',
  'https://player.vimeo.com',
];

/** Origins a live chat iframe may load (`chatEmbedUrl`). YouTube live chat is only served from www.youtube.com. */
export const LIVE_CHAT_ALLOWED_ORIGINS: ReadonlyArray<string> = [
  'https://www.youtube.com',
  'https://www.twitch.tv',
  'https://kick.com',
];

/** Every live player and chat origin, in the order the CSP `frame-src` names them. */
export const LIVE_FRAME_ORIGINS: ReadonlyArray<string> = [
  ...new Set([...LIVE_EMBED_ALLOWED_ORIGINS, ...LIVE_CHAT_ALLOWED_ORIGINS]),
];

/** Twitch refuses to play or show chat unless the embedding page's hostname is passed as `parent`. */
export const LIVE_EMBED_PARENT_PARAM = 'parent';

/** YouTube live chat refuses to render unless the embedding page's hostname is passed as `embed_domain`. */
export const LIVE_CHAT_EMBED_DOMAIN_PARAM = 'embed_domain';

export const LIVE_EMBED_IFRAME_ALLOW = 'autoplay; encrypted-media; picture-in-picture; fullscreen';

/** YouTube live chat renders its dark skin only when asked (`dark_theme=1`); light is its default. */
export const LIVE_CHAT_YOUTUBE_DARK_PARAM = 'dark_theme';

/** Twitch chat's dark skin is the flag-only `darkpopout` param; without it Twitch chat is light. */
export const LIVE_CHAT_TWITCH_DARK_FLAG = 'darkpopout';

/** Matches the `darkpopout` flag the server may already have put on a Twitch chat URL. */
export const LIVE_CHAT_TWITCH_DARK_FLAG_PATTERN = /[?&]darkpopout(?=&|$)/u;

/** After `?darkpopout` is removed, the next param starts with `&`; this turns it back into `?`. */
export const LIVE_CHAT_TWITCH_ORPHAN_AMPERSAND = /\/chat&/u;
