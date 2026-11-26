/** What replaces the rest of a link in a log line. */
export const LOG_URL_REDACTED_TAIL = '/…';
/** Any http(s) URL inside free text (tool output). */
export const LOG_URL_PATTERN = /https?:\/\/[^\s"'<>]+/gu;
