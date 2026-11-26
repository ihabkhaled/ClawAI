// ── Platform registry data (architecture section 1) ─────────────────────────
// Parsing only: no constant here is ever fetched at resolve time.

// YouTube (hosts and ids live in sources.constants.ts)
export const YOUTUBE_LIVE_CHAT_BASE_URL = 'https://www.youtube.com/live_chat?v=';

// Twitch
export const TWITCH_HOSTS: ReadonlySet<string> = new Set([
  'twitch.tv',
  'www.twitch.tv',
  'm.twitch.tv',
]);
export const TWITCH_CHANNEL_PATTERN = /^[A-Za-z0-9_]{3,25}$/u;
export const TWITCH_RESERVED_PATHS: ReadonlySet<string> = new Set([
  'videos',
  'directory',
  'p',
  'settings',
]);
export const TWITCH_WATCH_BASE_URL = 'https://www.twitch.tv/';
/** A past broadcast `twitch.tv/videos/<id>` (recorded; played by its own player). */
export const TWITCH_VIDEO_ID_PATTERN = /^\d{6,15}$/u;
export const TWITCH_VIDEO_PLAYER_BASE_URL = 'https://player.twitch.tv/?video=v';
/** A clip: `clips.twitch.tv/<slug>` or `twitch.tv/<channel>/clip/<slug>`. */
export const TWITCH_CLIPS_HOST = 'clips.twitch.tv';
export const TWITCH_CLIP_SLUG_PATTERN = /^[A-Za-z0-9_-]{4,100}$/u;
export const TWITCH_CLIPS_BASE_URL = 'https://clips.twitch.tv/';
export const TWITCH_PLAYER_BASE_URL = 'https://player.twitch.tv/?channel=';
export const TWITCH_PLAYER_QUERY = '&autoplay=true';
export const TWITCH_CHAT_BASE_URL = 'https://www.twitch.tv/embed/';
export const TWITCH_CHAT_SUFFIX = '/chat?darkpopout';

// Kick
export const KICK_HOSTS: ReadonlySet<string> = new Set(['kick.com', 'www.kick.com']);
export const KICK_USER_PATTERN = /^[A-Za-z0-9_-]{2,30}$/u;
export const KICK_RESERVED_PATHS: ReadonlySet<string> = new Set([
  'categories',
  'browse',
  'video',
  'clips',
]);
export const KICK_WATCH_BASE_URL = 'https://kick.com/';
/** A past broadcast `kick.com/<user>/videos/<uuid>` (recorded). */
export const KICK_VIDEO_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
export const KICK_PLAYER_BASE_URL = 'https://player.kick.com/';
export const KICK_PLAYER_QUERY = '?autoplay=true';
export const KICK_CHAT_BASE_URL = 'https://kick.com/popout/';
export const KICK_CHAT_SUFFIX = '/chat';

// Facebook
export const FACEBOOK_HOSTS: ReadonlySet<string> = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
]);
export const FACEBOOK_SHORT_HOST = 'fb.watch';
/** The app's share links: `share/v` (video), `share/r` (reel), `share/p` (post with a video). */
export const FACEBOOK_SHARE_KINDS: ReadonlySet<string> = new Set(['v', 'r', 'p']);
/** A share link redirects once to the real video page; that redirect must stay on this suffix. */
export const FACEBOOK_SHARE_REDIRECT_SUFFIX = 'facebook.com';
export const SHARE_REDIRECT_TIMEOUT_MS = 5000;
/**
 * The honest name the redirect check sends. Facebook answers its share links with the video
 * redirect for a plain client name, and with `/unsupportedbrowser` when there is none (2026-11-24).
 */
export const SHARE_REDIRECT_USER_AGENT = 'ClawAI-LinkCheck/1.0';
export const SHARE_REDIRECT_MAX_BYTES = 256 * 1024;
export const FACEBOOK_VIDEO_ID_PATTERN = /^\d{5,25}$/u;
export const FACEBOOK_PAGE_PATTERN = /^[A-Za-z0-9.\-_]{1,80}$/u;
export const FACEBOOK_SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{4,20}$/u;
export const FACEBOOK_WATCH_BASE_URL = 'https://www.facebook.com/';
export const FACEBOOK_WATCH_QUERY_URL = 'https://www.facebook.com/watch/?v=';
export const FACEBOOK_SHORT_BASE_URL = 'https://fb.watch/';
export const FACEBOOK_PLAYER_BASE_URL = 'https://www.facebook.com/plugins/video.php?href=';
export const FACEBOOK_PLAYER_QUERY = '&show_text=false&autoplay=true';

// TikTok
export const TIKTOK_HOSTS: ReadonlySet<string> = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
]);
export const TIKTOK_USER_PATTERN = /^[A-Za-z0-9_.]{2,24}$/u;
export const TIKTOK_WATCH_BASE_URL = 'https://www.tiktok.com/@';
export const TIKTOK_WATCH_SUFFIX = '/live';
/** The app's share-link hosts (`vt.` and `vm.`); `tiktok.com/t/<code>` is the web form. */
export const TIKTOK_SHORT_HOSTS: ReadonlySet<string> = new Set(['vt.tiktok.com', 'vm.tiktok.com']);
/** Share codes: `ZSsYongoV`, and newer ones up to ~20 characters with `-`/`_` (owner link 2026-11-26). */
export const TIKTOK_SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{5,32}$/u;
export const TIKTOK_VIDEO_ID_PATTERN = /^\d{10,25}$/u;
export const TIKTOK_EMBED_BASE_URL = 'https://www.tiktok.com/embed/v2/';
/** A video read without its author: yt-dlp reads `www.tiktok.com/@/video/<id>` (2026-11-26). */
export const TIKTOK_ANY_USER_VIDEO_BASE_URL = 'https://www.tiktok.com/@/video/';
/** Path prefixes that carry a video id: `/embed/<id>`, `/embed/v2/<id>`, `/player/v1/<id>`, `/v/<id>.html`. */
export const TIKTOK_ID_PATH_PREFIXES: ReadonlySet<string> = new Set(['embed', 'player', 'v']);
/** The `.html` ending of an `m.tiktok.com/v/<id>.html` link (where a vm short link lands). */
export const TIKTOK_HTML_SUFFIX = '.html';

// Instagram
export const INSTAGRAM_HOSTS: ReadonlySet<string> = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
]);
export const INSTAGRAM_USER_PATTERN = /^[A-Za-z0-9_.]{1,30}$/u;
export const INSTAGRAM_RESERVED_PATHS: ReadonlySet<string> = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'accounts',
  'tv',
  'direct',
]);
export const INSTAGRAM_WATCH_BASE_URL = 'https://www.instagram.com/';
export const INSTAGRAM_WATCH_SUFFIX = '/live/';
/** A recorded reel or post path segment → its canonical segment (`reels` is an alias of `reel`). */
export const INSTAGRAM_MEDIA_KINDS: ReadonlyMap<string, string> = new Map([
  ['reel', 'reel'],
  ['reels', 'reel'],
  ['p', 'p'],
  ['tv', 'tv'],
]);
export const INSTAGRAM_MEDIA_CODE_PATTERN = /^[A-Za-z0-9_-]{5,40}$/u;

// Rumble
export const RUMBLE_HOSTS: ReadonlySet<string> = new Set(['rumble.com', 'www.rumble.com']);
/** `v<id>-<slug>.html`: captures the `v<id>` part. */
export const RUMBLE_VIDEO_PATTERN = /^(v[a-z0-9]{3,12})-[A-Za-z0-9-]{1,200}\.html$/u;
export const RUMBLE_CHANNEL_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;
export const RUMBLE_WATCH_BASE_URL = 'https://rumble.com/';

// BIGO LIVE
export const BIGO_HOSTS: ReadonlySet<string> = new Set(['bigo.tv', 'www.bigo.tv']);
export const BIGO_ID_PATTERN = /^[A-Za-z0-9_]{2,32}$/u;
/** A locale path segment: `en` or `zh-Hans`. */
export const BIGO_LANGUAGE_PATTERN = /^[a-z]{2}$|^[a-z]{2}-[A-Za-z]{2,4}$/u;
export const BIGO_WATCH_BASE_URL = 'https://www.bigo.tv/';

// LinkedIn Live
export const LINKEDIN_HOSTS: ReadonlySet<string> = new Set(['linkedin.com', 'www.linkedin.com']);
/** Path prefixes of a LinkedIn live link; the next segment is the event or post id. */
export const LINKEDIN_LIVE_PREFIXES: readonly (readonly string[])[] = [
  ['events'],
  ['video', 'live'],
  ['feed', 'update'],
  // A post with a video (recorded, 2026-11-26): `linkedin.com/posts/<slug>`.
  ['posts'],
];
export const LINKEDIN_ID_PATTERN = /^[A-Za-z0-9:_%-]{1,200}$/u;
export const LINKEDIN_WATCH_BASE_URL = 'https://www.linkedin.com/';

// Telegram
export const TELEGRAM_HOSTS: ReadonlySet<string> = new Set(['t.me', 'telegram.me']);
export const TELEGRAM_CHANNEL_PATTERN = /^[A-Za-z0-9_]{5,32}$/u;
export const TELEGRAM_LIVE_PARAMS: readonly string[] = ['livestream', 'videochat', 'voicechat'];
export const TELEGRAM_WATCH_BASE_URL = 'https://t.me/';

// Bilibili Live
export const BILIBILI_LIVE_HOST = 'live.bilibili.com';
export const BILIBILI_ROOM_PATTERN = /^\d{1,12}$/u;
export const BILIBILI_WATCH_BASE_URL = 'https://live.bilibili.com/';
/** Recorded Bilibili videos (2026-11-26): `www.bilibili.com/video/<BV…|av…>`. */
export const BILIBILI_VIDEO_HOSTS: ReadonlySet<string> = new Set([
  'bilibili.com',
  'www.bilibili.com',
  'm.bilibili.com',
]);
export const BILIBILI_VIDEO_ID_PATTERN = /^(?:BV[0-9A-Za-z]{10}|av\d{1,12})$/u;
export const BILIBILI_VIDEO_BASE_URL = 'https://www.bilibili.com/video/';

// CHZZK
export const CHZZK_HOST = 'chzzk.naver.com';
export const CHZZK_CHANNEL_PATTERN = /^[a-f0-9]{32}$/u;
export const CHZZK_WATCH_BASE_URL = 'https://chzzk.naver.com/live/';

// SOOP Korea (formerly AfreecaTV)
export const SOOP_HOSTS: ReadonlySet<string> = new Set([
  'sooplive.com',
  'www.sooplive.com',
  'play.sooplive.com',
  'sooplive.co.kr',
  'www.sooplive.co.kr',
  'ch.sooplive.co.kr',
  'play.sooplive.co.kr',
  'afreecatv.com',
  'www.afreecatv.com',
  'bj.afreecatv.com',
  'play.afreecatv.com',
]);
/** The optional broadcast number after the id on play.sooplive.co.kr. */
export const SOOP_BROADCAST_NO_PATTERN = /^\d{1,15}$/u;
export const SOOP_ID_PATTERN = /^[A-Za-z0-9_]{3,20}$/u;
/** The only form yt-dlp reads today (2026-11-26): the `.co.kr` and afreecatv links are rewritten to it. */
export const SOOP_WATCH_BASE_URL = 'https://play.sooplive.com/';

// Nimo TV
export const NIMO_HOSTS: ReadonlySet<string> = new Set(['nimo.tv', 'www.nimo.tv', 'm.nimo.tv']);
export const NIMO_USER_PATTERN = /^[A-Za-z0-9_-]{2,40}$/u;
export const NIMO_RESERVED_PATHS: ReadonlySet<string> = new Set([
  'lives',
  'game',
  'fragments',
  'search',
]);
export const NIMO_WATCH_BASE_URL = 'https://www.nimo.tv/';

// Discord (refused: Go Live has no public link)
export const DISCORD_HOSTS: ReadonlySet<string> = new Set([
  'discord.com',
  'www.discord.com',
  'discord.gg',
  'discordapp.com',
  'www.discordapp.com',
]);
