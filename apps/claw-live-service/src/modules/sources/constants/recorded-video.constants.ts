// Recorded videos (ADR-221 batch 6, owner decision 2026-11-24): a reel, post or past stream is
// downloaded once by yt-dlp into the run's temp dir, then played along at normal speed.

/** Policy default (`recordedVideoMaxSeconds`): 3 hours. */
export const RECORDED_VIDEO_DEFAULT_MAX_SECONDS = 10_800;
/** No policy version may allow more than 12 hours. */
export const RECORDED_VIDEO_MAX_SECONDS_CEILING = 43_200;

/**
 * The resolve-time check: is this link a recorded video yt-dlp can read, and how long is it?
 * Same safety flags as the live probe (no config, no generic extractor, the canonical URL we
 * built); prints `<is_live> <duration> <id>` and downloads nothing.
 */
export const YTDLP_RECORDED_PROBE_ARGS: readonly string[] = [
  '--no-config',
  '--js-runtimes',
  'node',
  '--use-extractors',
  'default,-generic',
  '--no-playlist',
  '--no-warnings',
  '--quiet',
  '--socket-timeout',
  '10',
  '--cache-dir',
  '/tmp/yt-dlp-cache',
  '--skip-download',
  '--print',
  '%(is_live)s %(duration)s %(id)s %(extractor_key)s',
];
/**
 * A live extractor that reports no length is a live room the server cannot pull (Huya serves FLV,
 * 2026-11-25), never a recorded video.
 */
export const YTDLP_LIVE_EXTRACTOR_PATTERN = /live/iu;

/**
 * The worker's download: smallest video that still gives a readable frame plus the audio (vision
 * modes), or the audio alone (AUDIO). Bounded by size; the file lands in the run's temp dir.
 */
export const YTDLP_RECORDED_VISION_FORMAT = 'b[height<=480]/bv*[height<=480]+ba/wv*+ba/b/ba';
export const YTDLP_RECORDED_AUDIO_FORMAT = 'ba/b[height<=480]/wv*+ba/b';
export const YTDLP_RECORDED_DOWNLOAD_ARGS: readonly string[] = [
  '--no-config',
  '--js-runtimes',
  'node',
  '--use-extractors',
  'default,-generic',
  '--no-playlist',
  '--no-warnings',
  '--quiet',
  '--no-progress',
  '--no-part',
  '--socket-timeout',
  '15',
  '--cache-dir',
  '/tmp/yt-dlp-cache',
  '--max-filesize',
  '1500M',
  '--merge-output-format',
  'mkv',
  '--print',
  'after_move:filepath',
];
/** A 3-hour video at 480p downloads in a few minutes; past this the run fails honestly. */
export const YTDLP_RECORDED_DOWNLOAD_TIMEOUT_MS = 15 * 60_000;
export const YTDLP_RECORDED_OUTPUT_TEMPLATE = 'media.%(ext)s';
/** yt-dlp prints `NA` for a field the site does not report. */
export const YTDLP_MISSING_FIELD = 'NA';

/** At most this much new audio is cut per poll, so one poll never blocks the lease renewal. */
export const RECORDED_MAX_CHUNKS_PER_POLL = 3;
/** ffmpeg seeks into the local file and decodes one chunk, bounded like every other decode. */
export const RECORDED_FRAME_FILE = 'frame.jpg';
