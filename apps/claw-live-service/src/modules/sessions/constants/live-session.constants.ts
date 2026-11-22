import { LiveSessionState } from '../../../generated/prisma';

/**
 * Languages a viewer may pick: the 13 app locales plus common ones. A request
 * is matched case-insensitively and stored in the spelling below, so the
 * translation worker and the SSE filter see one canonical tag per language.
 */
export const LIVE_SESSION_LANGUAGES: readonly string[] = [
  'ar',
  'de',
  'en',
  'es',
  'fa',
  'fr',
  'hi',
  'it',
  'ja',
  'pt',
  'ru',
  'th',
  'zh',
  'en-GB',
  'en-US',
  'pt-BR',
  'pt-PT',
  'zh-CN',
  'zh-TW',
  'es-419',
  'bn',
  'cs',
  'da',
  'el',
  'fi',
  'he',
  'hu',
  'id',
  'ko',
  'ms',
  'nl',
  'no',
  'pl',
  'ro',
  'sv',
  'sw',
  'tl',
  'tr',
  'uk',
  'ur',
  'vi',
];

/** Redis ZSET of sessionId → last heartbeat epoch ms, per run (architecture doc section 3). */
export const LIVE_PRESENCE_KEY_PREFIX = 'live:presence:';
export const LIVE_PRESENCE_TTL_SECONDS = 21_600;

/** Last accrued epoch ms per (user, run): two devices on one run never count twice. */
export const LIVE_ACCRUAL_KEY_PREFIX = 'live:accrual:';
export const LIVE_ACCRUAL_TTL_MS = 3_600_000;

/** Attempts of the compare-and-set accrual before giving up on one heartbeat. */
export const LIVE_ACCRUAL_CAS_ATTEMPTS = 3;

/** Session starts per user per clock hour. */
export const LIVE_HOURLY_KEY_PREFIX = 'live:sessions:hour:';
export const LIVE_HOURLY_TTL_SECONDS = 3600;

/** No heartbeat for this long = network loss: the reaper detaches the session. */
export const LIVE_PRESENCE_STALE_MS = 30_000;

/** A heartbeat gap longer than this accrues nothing. */
export const LIVE_HEARTBEAT_MAX_GAP_MS = 15_000;

/** Most seconds one heartbeat can accrue. */
export const LIVE_ACCRUAL_CAP_MS = 15_000;

/** A DELAYED run still counts while its last commit is at most this old. */
export const LIVE_DELAYED_TOLERANCE_MS = 20_000;

/**
 * Slack when deciding whether the stored accrual mark belongs to this session's
 * last heartbeat (the sub-second remainder) or is stale.
 */
export const LIVE_ACCRUAL_REMAINDER_SLACK_MS = 1000;

/** Media-time slack when deciding whether playback continued or jumped. */
export const LIVE_COVERAGE_TOLERANCE_MS = 5000;

/** Most full blocks one heartbeat settles. */
export const LIVE_MAX_BLOCKS_PER_HEARTBEAT = 3;

/** Reaper cadence, its cross-replica lock and batch size. */
export const LIVE_REAPER_INTERVAL_MS = 5000;
export const LIVE_REAPER_LOCK_KEY = 'live:reaper:lock';
export const LIVE_REAPER_LOCK_TTL_MS = 15_000;
export const LIVE_REAPER_BATCH = 100;

/** Deletes the lock only when this replica still owns it. KEYS[1] lock, ARGV[1] owner token. */
export const LIVE_LOCK_RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

/**
 * Compare-and-set of the accrual mark. KEYS[1] accrual key; ARGV[1] expected
 * value ('' when absent), ARGV[2] new value, ARGV[3] ttl ms. Returns 1 on success.
 */
export const LIVE_ACCRUAL_CAS_SCRIPT = `
local current = redis.call('GET', KEYS[1]) or ''
if current ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'PX', tonumber(ARGV[3]))
return 1
`;

/** Lifetime of the sendBeacon close token returned at session creation. */
export const LIVE_CLOSE_TOKEN_TTL_MS = 12 * 3_600_000;

/** Domain separation for the close-token HMAC (keyed with JWT_SECRET). */
export const LIVE_CLOSE_TOKEN_CONTEXT = 'claw-live-close-v1';

/** Largest beacon body read when the token arrives as text/plain. */
export const LIVE_BEACON_MAX_BYTES = 4096;

/** Sessions that still count as open (concurrency limit, reaper). */
export const LIVE_OPEN_SESSION_STATES: readonly LiveSessionState[] = [
  LiveSessionState.CONNECTING,
  LiveSessionState.ACTIVE,
  LiveSessionState.PAUSED,
  LiveSessionState.CREDITS_REQUIRED,
  LiveSessionState.GRACE,
  LiveSessionState.EXHAUSTED,
];

/** States in which a playing viewer accrues billable AI seconds. */
export const LIVE_ACCRUING_STATES: readonly LiveSessionState[] = [
  LiveSessionState.ACTIVE,
  LiveSessionState.GRACE,
];

/** States whose pending seconds are settled when the session closes. */
export const LIVE_SETTLE_ON_CLOSE_STATES: readonly LiveSessionState[] = [
  LiveSessionState.ACTIVE,
  LiveSessionState.GRACE,
  LiveSessionState.PAUSED,
  LiveSessionState.CONNECTING,
];

/** Public playback path of an HLS/FIXTURE stream (the same-origin proxy entry). */
export const LIVE_PLAYBACK_PATH_PREFIX = '/api/v1/live/streams/';
export const LIVE_PLAYBACK_PATH_SUFFIX = '/hls/index.m3u8';
