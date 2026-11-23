import { LivePlatform } from '../../../generated/prisma';

/**
 * Server pull (ADR-221 addendum 2026-11-23): the server reads a platform's PUBLIC playlist the
 * same way that platform's own web player does, so one run serves every viewer on any device.
 * Only platforms that hand an anonymous player a playlist without any bypass are listed: YouTube
 * gives none without impersonating a client to dodge its attestation, and Kick refuses server
 * requests outright. Neither is worked around; they stay browser capture.
 */
export const SERVER_PULL_PLATFORMS: readonly LivePlatform[] = [LivePlatform.TWITCH];

/** The policy default when a stored policy version predates the field. */
export const SERVER_PULL_DEFAULT_PLATFORMS: readonly LivePlatform[] = [LivePlatform.TWITCH];

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
