import { resolve } from 'node:path';

// ── Source resolution ────────────────────────────────────────────────────────

/** Hosts whose URLs are YouTube videos (PLAYER_ONLY: never downloaded or analysed). */
export const YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
export const YOUTUBE_SHORT_HOST = 'youtu.be';
/** Path prefixes carrying the video id as the next segment. */
export const YOUTUBE_ID_PATH_PREFIXES: readonly string[] = ['live', 'embed', 'shorts', 'v'];
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/u;
export const YOUTUBE_EMBED_BASE_URL = 'https://www.youtube-nocookie.com/embed/';
/** A channel's current live stream through YouTube's own embed (no lookup, no scraping). */
export const YOUTUBE_CHANNEL_LIVE_EMBED_URL = 'https://www.youtube-nocookie.com/embed/live_stream';
export const YOUTUBE_CHANNEL_URL_BASE = 'https://www.youtube.com/channel/';
/** A channel id: "UC" plus 22 URL-safe characters. */
export const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/u;
/**
 * Handle and vanity channel links (@name, /c/name, /user/name). Turning one into a channel id needs
 * the Data API or a page fetch (scraping is forbidden by III.E.6), so they are refused with a clear code.
 */
export const YOUTUBE_HANDLE_PATH_PREFIXES: readonly string[] = ['c', 'user'];
export const YOUTUBE_EMBED_QUERY = '?autoplay=1&playsinline=1';
export const YOUTUBE_WATCH_BASE_URL = 'https://www.youtube.com/watch?v=';
export const YOUTUBE_DECLARED_HOST = 'www.youtube.com';

export const FIXTURE_URL_PREFIX = 'fixture:';
/** Admin-enabled fixtures: name → file under FIXTURES_DIR. Only these names resolve. */
export const LIVE_FIXTURE_FILES: Readonly<Record<string, string>> = {
  'live-demo': 'live-demo.mp4',
};
/** Bundled fixture media (apps/claw-live-service/fixtures, copied next to dist in the image). */
export const FIXTURES_DIR = resolve(process.cwd(), 'fixtures');

export const HLS_PLAYLIST_EXTENSION = '.m3u8';
export const PUBLIC_ACCESS_SCOPE = 'PUBLIC';
export const PRIVATE_ACCESS_SCOPE_PREFIX = 'PRIVATE:';

// ── SSRF guard ──────────────────────────────────────────────────────────────

/** Ports an HLS origin may use; '' is the scheme default. */
export const HLS_ALLOWED_PORTS: ReadonlySet<string> = new Set(['', '443', '8443']);
export const HLS_DNS_TIMEOUT_MS = 3000;

// ── HLS proxy ───────────────────────────────────────────────────────────────

export const HLS_PLAYLIST_MAX_BYTES = 1024 * 1024;
export const HLS_SEGMENT_MAX_BYTES = 20 * 1024 * 1024;
export const HLS_FETCH_TIMEOUT_MS = 10_000;
/** Content types passed through from an origin (lower-case, parameters stripped). */
export const HLS_PLAYLIST_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'audio/mpegurl',
  'audio/x-mpegurl',
]);
export const HLS_SEGMENT_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'video/mp2t',
  'video/mp4',
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'application/octet-stream',
]);
export const HLS_PLAYLIST_CONTENT_TYPE = 'application/vnd.apple.mpegurl';
export const HLS_SEGMENT_FALLBACK_CONTENT_TYPE = 'video/mp2t';
export const HLS_PROXY_PATH_PREFIX = '/api/v1/live/streams/';
export const HLS_PROXY_ENTRY_FILE = 'index.m3u8';

// ── Fixture broadcaster ─────────────────────────────────────────────────────

export const FFMPEG_BINARY = 'ffmpeg';
export const FIXTURE_PLAYLIST_FILE = 'index.m3u8';
export const FIXTURE_SEGMENT_FILE_PATTERN = /^seg\d{1,9}\.ts$/u;
export const FIXTURE_SEGMENT_TEMPLATE = 'seg%d.ts';
export const FIXTURE_TEMP_PREFIX = 'claw-live-fixture-';
export const FIXTURE_HLS_SEGMENT_SECONDS = 4;
export const FIXTURE_HLS_LIST_SIZE = 150;
export const FIXTURE_IDLE_STOP_MS = 5 * 60_000;
export const FIXTURE_IDLE_SWEEP_MS = 30_000;
export const FIXTURE_READY_TIMEOUT_MS = 20_000;
export const FIXTURE_READY_POLL_MS = 250;
