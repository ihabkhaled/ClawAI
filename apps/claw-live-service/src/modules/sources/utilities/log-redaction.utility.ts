import {
  LOG_URL_REDACTED_TAIL,
  YTDLP_ERROR_CATEGORIES,
  YTDLP_ERROR_OTHER,
} from '../constants/log-redaction.constants';

/**
 * A pasted link as it may appear in a log: its host only. Any path segment can be the secret
 * itself (a Google Drive file id, an Imgur or Streamable id, a Dropbox `rlkey`, a signed CDN token),
 * so none reaches a log line (security reviews 2026-11-26).
 */
export function logSafeUrl(value: string): string {
  try {
    return `${new URL(value).host}${LOG_URL_REDACTED_TAIL}`;
  } catch {
    return LOG_URL_REDACTED_TAIL;
  }
}

/** A platform match id (`host/path…` or `kind:id`) reduced to the part before its first `/` or `:`. */
export function logSafeId(id: string): string {
  const [head = ''] = id.split(/[/:]/u);
  return `${head}${LOG_URL_REDACTED_TAIL}`;
}

/**
 * What a failed yt-dlp run means, as a fixed word: its error text echoes the link and the video id,
 * so the text itself is never logged.
 */
export function ytdlpErrorCategory(stderr: string): string {
  return (
    YTDLP_ERROR_CATEGORIES.find(([, pattern]) => pattern.test(stderr))?.[0] ?? YTDLP_ERROR_OTHER
  );
}
