import { LOG_URL_PATTERN, LOG_URL_REDACTED_TAIL } from '../constants/log-redaction.constants';

/**
 * A pasted link as it may appear in a log: host and first path segment only. Share links are
 * secrets (Google Drive file ids, Dropbox `rlkey`, signed CDN tokens), so the rest never reaches
 * a log line (security review 2026-11-26).
 */
export function logSafeUrl(value: string): string {
  try {
    const url = new URL(value);
    const first = url.pathname.split('/').find((segment) => segment !== '') ?? '';
    return `${url.host}/${first}${LOG_URL_REDACTED_TAIL}`;
  } catch {
    return LOG_URL_REDACTED_TAIL;
  }
}

/** A platform match id (`host/path…`) reduced the same way as a link. */
export function logSafeId(id: string): string {
  const [host = '', first = ''] = id.split('/');
  return `${host}/${first}${LOG_URL_REDACTED_TAIL}`;
}

/** Tool output with every URL inside reduced to its host (yt-dlp errors echo the full link). */
export function logSafeText(text: string): string {
  return text.replaceAll(LOG_URL_PATTERN, (raw) => logSafeUrl(raw));
}
