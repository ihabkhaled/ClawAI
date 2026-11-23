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
  '%(protocol)s %(url)s',
];
export const YTDLP_TIMEOUT_MS = 30_000;
export const YTDLP_MAX_OUTPUT_BYTES = 16 * 1024;
/** yt-dlp runs at once per replica; past it a resolve fails fast to the capture/link fallback. */
export const YTDLP_MAX_CONCURRENT = 4;
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
