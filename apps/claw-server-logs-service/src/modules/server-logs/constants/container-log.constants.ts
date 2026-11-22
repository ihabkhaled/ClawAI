/**
 * Container log ingestion: every container's stdout/stderr, shipped by the
 * `log-shipper` (Vector) from Docker's json-file logs. Before this, only one
 * summary line per HTTP request reached the log store; every Nest `Logger`
 * line, stack trace, crash, nginx line and database error lived only in
 * `docker logs`, readable over SSH and lost on container recreate.
 */

/** Largest batch one ingest call may carry; Vector batches below this. */
export const CONTAINER_LOG_BATCH_MAX = 1_000;

/** A single line longer than this is cut; the store's message field caps at 5000. */
export const CONTAINER_LOG_MESSAGE_MAX_CHARS = 4_900;

/** Container names carry this prefix; the service name is what follows it. */
export const CONTAINER_NAME_PREFIX = 'claw-';

/** Scaled replicas append `-<n>` (claw-chat-service-412). */
export const CONTAINER_REPLICA_SUFFIX = /-\d+$/u;

/**
 * Nest's pretty format: `[Nest] 1  - 09/19/2026, 9:02:37 AM   WARN [Context] message`.
 * This is the head up to the dash; `parseNestPrettyLine` reads the rest by a scan. The one
 * regex it replaces (`-\s+.*?\s+(LOG|...)`) was flagged by CodeQL js/polynomial-redos: the lazy
 * gap and the blanks around it overlap, so a long run of tabs cost the square of its length.
 */
export const NEST_PRETTY_HEAD = /^\[Nest\]\s+\d+\s+-/u;

/** One whitespace character, as `\s` reads it. */
export const WHITESPACE_CHARACTER = /^\s$/u;

/**
 * ANSI colour codes Nest writes even to a pipe: ESC `[` parameters `m`. Stripped by a scan, so
 * no control character sits in a regex literal and no regex is built from a string.
 */
export const ANSI_ESCAPE = String.fromCodePoint(27);
/** One parameter character of an ANSI colour code. */
export const ANSI_COLOUR_PARAMETER = /^[0-9;]$/u;

/** pino's numeric levels to the store's level names. */
export const PINO_LEVELS: Readonly<Record<number, string>> = {
  10: 'DEBUG',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'ERROR',
};

/** Nest's level words to the store's level names. */
export const NEST_LEVELS: ReadonlyMap<string, string> = new Map([
  ['LOG', 'INFO'],
  ['VERBOSE', 'DEBUG'],
  ['DEBUG', 'DEBUG'],
  ['WARN', 'WARN'],
  ['ERROR', 'ERROR'],
  ['FATAL', 'ERROR'],
]);

/** Nest's level words. None is a prefix of another, so the first that fits is the only one. */
export const NEST_LEVEL_WORDS: readonly string[] = [...NEST_LEVELS.keys()];

/** Plain-text lines (nginx, Postgres, Redis...) are graded by these words. */
export const PLAIN_ERROR_WORDS = /\b(error|fatal|panic|exception|emerg|crit)\b/iu;
export const PLAIN_WARN_WORDS = /\b(warn|warning)\b/iu;

/** Marks a row as shipped from a container, not published by the app. */
export const CONTAINER_LOG_ACTION = 'container_log';

/** pino-pretty (dev): `[10:03:01.596] DEBUG (148): message`. */
export const PINO_PRETTY_LINE =
  /^\[\d{2}:\d{2}:\d{2}\.\d{3}\]\s+(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\s+\(\d+\):\s+(.*)$/su;

/** pino-pretty's level words to the store's level names. */
export const PINO_PRETTY_LEVELS: ReadonlyMap<string, string> = new Map([
  ['TRACE', 'DEBUG'],
  ['DEBUG', 'DEBUG'],
  ['INFO', 'INFO'],
  ['WARN', 'WARN'],
  ['ERROR', 'ERROR'],
  ['FATAL', 'ERROR'],
]);
