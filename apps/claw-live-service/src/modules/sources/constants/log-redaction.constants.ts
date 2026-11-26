/** What replaces the rest of a link in a log line. */
export const LOG_URL_REDACTED_TAIL = '/…';

/** A failed yt-dlp run's error text, as a fixed category for the log (first match wins). */
export const YTDLP_ERROR_CATEGORIES: readonly (readonly [string, RegExp])[] = [
  ['bot-check', /not a bot|--cookies|page needs to be reloaded/iu],
  ['not-live', /not (?:currently )?live|is offline|no live|has ended/iu],
  ['geo-blocked', /geo.?restrict|not available (?:from|in) your (?:location|country)/iu],
  ['login-required', /log ?in|sign ?in|private|18\+|age/iu],
  ['not-found', /not found|404|does not exist|no video|unavailable/iu],
  ['no-extractor', /no suitable extractor|unsupported url/iu],
  ['forbidden', /403|forbidden/iu],
  ['timeout', /timed? ?out/iu],
];
export const YTDLP_ERROR_OTHER = 'other';
