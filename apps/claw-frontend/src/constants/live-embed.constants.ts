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
