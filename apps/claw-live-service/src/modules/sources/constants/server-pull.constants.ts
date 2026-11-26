import { LivePlatform } from '../../../generated/prisma';

/**
 * Server pull (ADR-221 addendum 2026-11-23, widened the same day by owner decision): the server
 * reads a live stream's public playlist so one run serves every viewer on any device. Twitch uses
 * its own player's token path; every other platform asks yt-dlp for the stream's HLS URL. Discord
 * has no public stream and stays refused. A platform yt-dlp cannot read falls back by itself.
 */
export const SERVER_PULL_PLATFORMS: readonly LivePlatform[] = Object.values(LivePlatform).filter(
  (platform) => platform !== LivePlatform.DISCORD,
);

/** The policy default when a stored policy version predates the field: every server-pull platform. */
export const SERVER_PULL_DEFAULT_PLATFORMS: readonly LivePlatform[] = SERVER_PULL_PLATFORMS;

/** yt-dlp on PATH (pinned in the Dockerfiles). Missing binary = pull unavailable, capture fallback. */
export const YTDLP_BINARY = 'yt-dlp';
/**
 * Fixed arguments: no user config, Node as the JS runtime (already in the image), every extractor
 * except `generic` (so a URL can never make it fetch an arbitrary host), live only, one line of output.
 * Only an HLS format is accepted: the worker reads HLS through the SSRF-guarded fetcher.
 */
export const YTDLP_ARGS: readonly string[] = [
  '--no-config',
  '--js-runtimes',
  'node',
  '--use-extractors',
  'default,-generic',
  '--no-playlist',
  // Live streams only: a recorded video (YouTube serves HLS for those too) prints nothing.
  '--match-filters',
  'is_live',
  '--no-warnings',
  '--quiet',
  '--socket-timeout',
  '10',
  '--cache-dir',
  '/tmp/yt-dlp-cache',
  '--format',
  'w[protocol^=m3u8]/ba[protocol^=m3u8]/b[protocol^=m3u8]',
  '--print',
  // The video id: a YouTube channel link gets its live chat from it (2026-11-24). Then the request
  // headers yt-dlp would send: some CDNs answer 403 without them (Roya, RaiPlay, Odysee, 2026-11-26).
  '%(protocol)s %(url)s %(id)s %(http_headers)j',
];
/** The only yt-dlp headers forwarded to a CDN (lower case): never a cookie or an authorization. */
export const YTDLP_FORWARDED_HEADERS: ReadonlySet<string> = new Set([
  'user-agent',
  'accept',
  'accept-language',
  'referer',
  'origin',
  'sec-fetch-mode',
]);
/** A forwarded header value: printable ASCII, bounded. */
export const YTDLP_HEADER_VALUE_PATTERN = /^[ -~]{1,512}$/u;
export const YTDLP_TIMEOUT_MS = 30_000;
export const YTDLP_MAX_OUTPUT_BYTES = 16 * 1024;
/** yt-dlp runs at once per replica; past it a resolve fails fast to the capture/link fallback. */
export const YTDLP_MAX_CONCURRENT = 4;
/** A run waits this long for a free slot before giving up (it used to give up at once). */
export const YTDLP_SLOT_WAIT_MS = 30_000;
export const YTDLP_SLOT_POLL_MS = 250;
/**
 * YouTube clients tried, in order, after the default one failed (bot check from a data-centre
 * address). `android_vr` returned live HLS and recorded videos from production on 2026-11-26 while
 * the default client was blocked; no cookies or accounts are ever used.
 */
export const YTDLP_YOUTUBE_CLIENT_FALLBACKS: readonly (readonly string[])[] = [
  ['--extractor-args', 'youtube:player_client=android_vr'],
  ['--extractor-args', 'youtube:player_client=android_vr,web_safari'],
];
/** yt-dlp's stderr when YouTube refused this server (bot check, reload, formats withheld). */
export const YTDLP_YOUTUBE_BLOCKED_PATTERN =
  /not a bot|--cookies|page needs to be reloaded|Requested format is not available|No video formats found/iu;
/** Hosts whose links get the YouTube client fallbacks. */
export const YTDLP_YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);
/** A resolved stream URL is reused this long (resolve-time probe, then the worker's first poll). */
export const SERVER_PULL_CACHE_TTL_MS = 60_000;
export const SERVER_PULL_CACHE_MAX_ENTRIES = 256;

export const TWITCH_GQL_URL = 'https://gql.twitch.tv/gql';
export const TWITCH_GQL_HOST_SUFFIXES: readonly string[] = ['gql.twitch.tv'];
// The client id the token call sends is LIVE_TWITCH_CLIENT_ID (env): Twitch's public web-player id.
// It is not kept in code because the secret scanner's twitch-api-token rule matches it.
export const TWITCH_PLAYBACK_TOKEN_QUERY =
  'query PlaybackAccessToken($login:String!){streamPlaybackAccessToken(channelName:$login,' +
  'params:{platform:"web",playerBackend:"mediaplayer",playerType:"site"}){value signature}}';
export const TWITCH_USHER_BASE_URL = 'https://usher.ttvnw.net/api/channel/hls/';
/** Every host a Twitch playlist or segment is served from (usher, playlist, CloudFront edges). */
export const TWITCH_CDN_HOST_SUFFIXES: readonly string[] = ['ttvnw.net', 'live-video.net'];
export const TWITCH_TOKEN_MAX_BYTES = 64 * 1024;
export const SERVER_PULL_REQUEST_TIMEOUT_MS = 5000;
/** A playlist failure re-resolves the token at most this often (tokens expire; a stream may end). */
export const SERVER_PULL_REFRESH_MIN_INTERVAL_MS = 30_000;
/** Upper bound of the usher `p` cache-buster, as the web player sends it. */
export const TWITCH_USHER_RANDOM_MAX = 9_999_999;
/** Country TLDs whose second level is public (`co.kr`, `com.br`): the host suffix keeps three labels. */
export const PUBLIC_SECOND_LEVEL_LABEL = /^(?:co|com|net|org|ne|or|go|ac)$/u;

/** A platform video id as yt-dlp prints it: letters, digits, `_` and `-` only. */
export const YTDLP_VIDEO_ID_PATTERN = /^[\w-]{1,64}$/u;

/** Resolve tries the server read once more after this pause when the first try failed. */
export const RESOLVE_RETRY_DELAY_MS = 2_000;

/** An HLS key line; any METHOD but NONE means encrypted segments the worker cannot decode. */
export const HLS_KEY_TAG = '#EXT-X-KEY:';
export const HLS_KEY_METHOD_NONE = 'METHOD=NONE';

/**
 * Reviewed CDN domains a platform's live playlist hands segments to besides its own (2026-11-26):
 * TikTok's master on tiktokcdn.com lists variants on realcrius.com; CBS News's ad-stitched playlist
 * on dai.google.com serves segments from cbsivideo.com. Only these are added to the host pin.
 */
export const SERVER_PULL_EXTRA_CDN_SUFFIXES: ReadonlyMap<LivePlatform, readonly string[]> = new Map(
  [
    [LivePlatform.TIKTOK, ['tiktokcdn.com', 'tiktokcdn-us.com', 'realcrius.com']],
    [LivePlatform.CBS_NEWS, ['cbsivideo.com']],
  ],
);
